/**
 * 认证控制器
 * Authentication Controller
 *
 * @description 处理用户注册、登录、登出、令牌刷新等认证相关 API
 *              Handles registration, login, logout, token refresh endpoints
 * @module controllers/auth
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@/config/database.js';
import { redisClient } from '@/config/redis.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateReferralCode,
} from '@/middleware/auth.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';
import { sendVerificationEmail } from '@/services/notification.service.js';

/**
 * @typedef {Object} RegisterRequest
 * @property {string} email - 邮箱地址
 * @property {string} password - 密码
 * @property {string} [first_name] - 名字
 * @property {string} [last_name] - 姓氏
 * @property {string} [phone] - 手机号
 * @property {string} [referral_code] - 推荐码
 */

/**
 * @typedef {Object} LoginRequest
 * @property {string} email_or_phone - 邮箱或手机号
 * @property {string} password - 密码
 */

/**
 * @typedef {Object} AuthResponse
 * @property {boolean} success - 是否成功
 * @property {string} message - 响应消息
 * @property {string} access_token - 访问令牌
 * @property {string} refresh_token - 刷新令牌
 * @property {object} user - 用户信息
 */

/**
 * 用户注册
 * User Registration
 *
 * @route POST /api/v1/auth/register
 * @access Public
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, first_name, last_name, phone, referral_code } = req.body;

  // 1. 检查邮箱是否已注册 / Check if email already registered
  const existingUser = await queryOne(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser) {
    throw new AppError('该邮箱已被注册 / Email already registered', 409, true, 'EMAIL_EXISTS');
  }

  // 2. 检查手机号是否已注册 / Check if phone already registered
  if (phone) {
    const existingPhone = await queryOne(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );
    if (existingPhone) {
      throw new AppError('该手机号已被注册 / Phone already registered', 409, true, 'PHONE_EXISTS');
    }
  }

  // 3. 验证推荐码 / Verify referral code
  let referredBy: string | undefined;
  if (referral_code) {
    const referrer = await queryOne(
      'SELECT id FROM users WHERE referral_code = $1',
      [referral_code.toUpperCase()]
    );
    if (!referrer) {
      throw new AppError('无效的推荐码 / Invalid referral code', 400, true, 'INVALID_REFERRAL_CODE');
    }
    referredBy = referrer.id;
  }

  // 4. 密码加密 / Hash password
  const passwordHash = await hashPassword(password);

  // 5. 生成唯一推荐码 / Generate unique referral code
  const newReferralCode = await generateReferralCode();

  // 6. 生成邮箱验证令牌 / Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');

  // 7. 创建用户 / Create user
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, email_verification_token, referral_code, referred_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, first_name, last_name, phone, role, status, email_verified, created_at`,
    [
      email.toLowerCase(),
      passwordHash,
      first_name || null,
      last_name || null,
      phone || null,
      emailVerificationToken,
      newReferralCode,
      referredBy,
    ]
  );

  const user = result.rows[0];

  // 8. 发送验证邮件 / Send verification email
  try {
    await sendVerificationEmail(user.email, emailVerificationToken, user.first_name);
  } catch (error) {
    logger.warn('Failed to send verification email / 发送验证邮件失败', { error });
  }

  logger.info(`User registered: ${user.email}`);

  // 9. 返回响应
  res.status(201).json({
    success: true,
    message: '注册成功！请查收验证邮件 / Registration successful! Please check your email for verification.',
    message_zh: '注册成功！请查收验证邮件。',
    data: {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
        email_verified: user.email_verified,
      },
    },
  });
});

/**
 * 用户登录
 * User Login
 *
 * @route POST /api/v1/auth/login
 * @access Public
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email_or_phone, password } = req.body;
  const clientId = req.headers['x-client-id'] as string || 'web';

  // 1. 查找用户（支持邮箱或手机号登录）/ Find user by email or phone
  const result = await queryOne(
    `SELECT id, email, password_hash, first_name, last_name, phone, role, status,
            email_verified, failed_login_attempts, locked_until
     FROM users WHERE email = $1 OR phone = $1`,
    [email_or_phone]
  );

  if (!result) {
    throw new AppError('邮箱/手机号或密码错误 / Invalid email or password', 401, true, 'INVALID_CREDENTIALS');
  }

  const user = result as any;

  // 2. 检查账户是否被锁定 / Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError(
      '账户已锁定，请稍后再试 / Account locked, please try again later',
      423,
      true,
      'ACCOUNT_LOCKED'
    );
  }

  // 3. 验证密码 / Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    // 增加失败次数 / Increment failed login attempts
    const newAttempts = (user.failed_login_attempts || 0) + 1;
    const lockedUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // 5次锁定15分钟

    await query(
      'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
      [newAttempts, lockedUntil, user.id]
    );

    throw new AppError(
      '邮箱/手机号或密码错误 / Invalid email or password',
      401,
      true,
      'INVALID_CREDENTIALS'
    );
  }

  // 4. 检查账户状态 / Check account status
  if (user.status === 'suspended') {
    throw new AppError('账户已被暂停 / Account suspended', 403, true, 'ACCOUNT_SUSPENDED');
  }

  // 5. 重置登录失败次数并更新登录信息
  //    Reset failed attempts and update login info
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent') || '';

  await query(
    `UPDATE users SET
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      last_login_ip = $1
     WHERE id = $2`,
    [ipAddress, user.id]
  );

  // 6. 生成 Token / Generate tokens
  const accessToken = generateAccessToken(user, clientId);
  const refreshToken = generateRefreshToken(user);

  // 7. 存储会话信息 / Store session info
  const sessionId = uuidv4();
  const sessionExpiry = 7 * 24 * 60 * 60; // 7天

  await redisClient.setex(
    `session:${sessionId}`,
    sessionExpiry,
    JSON.stringify({
      userId: user.id,
      clientId,
      refreshToken,
    })
  );

  // 8. 将旧会话加入刷新令牌黑名单（如果需要单点登录）
  //    Add old session to refresh token blacklist (for SSO)

  logger.info(`User logged in: ${user.email}`);

  // 9. 返回响应
  res.json({
    success: true,
    message: '登录成功 / Login successful',
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
        email_verified: user.email_verified,
      },
    },
  });
});

/**
 * 刷新访问令牌
 * Refresh Access Token
 *
 * @route POST /api/v1/auth/refresh
 * @access Public
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new AppError('缺少刷新令牌 / Refresh token required', 401, true, 'NO_REFRESH_TOKEN');
  }

  // 1. 验证刷新令牌 / Verify refresh token
  const decoded = verifyToken(refresh_token, true);

  // 2. 检查会话是否存在 / Check if session exists
  // 注意：这里简化处理，实际应该通过会话ID查找
  const user = await queryOne(
    'SELECT id, email, role, status FROM users WHERE id = $1 AND deleted_at IS NULL',
    [decoded.id]
  );

  if (!user || user.status !== 'active') {
    throw new AppError('无效的刷新令牌 / Invalid refresh token', 401, true, 'INVALID_REFRESH_TOKEN');
  }

  // 3. 生成新的访问令牌 / Generate new access token
  const accessToken = generateAccessToken(user);

  res.json({
    success: true,
    data: {
      access_token: accessToken,
      expires_in: 900,
    },
  });
});

/**
 * 用户登出
 * User Logout
 *
 * @route POST /api/v1/auth/logout
 * @access Private
 */
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // 将当前访问令牌加入黑名单（Redis中设置过期时间等于令牌过期时间）
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = verifyToken(token);
      // 使用令牌的 jti 或过期时间来设置黑名单
      // 这里简化：记录登出时间戳，验证时对比
      const tokenExpiry = 15 * 60; // 15 minutes
      await redisClient.setex(
        `blacklist:token:${token}`,
        tokenExpiry,
        'logout'
      );
    } catch {
      // Token 已过期或无效，无需处理
    }
  }

  logger.info(`User logged out: ${req.user?.email}`);

  res.json({
    success: true,
    message: '登出成功 / Logout successful',
  });
});

/**
 * 请求邮箱验证
 * Request Email Verification
 *
 * @route POST /api/v1/auth/verify-email/request
 * @access Private
 */
export const requestEmailVerification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  if (user.email_verified) {
    res.json({
      success: true,
      message: '邮箱已验证 / Email already verified',
    });
    return;
  }

  // 生成新的验证令牌
  const verificationToken = crypto.randomBytes(32).toString('hex');

  await query(
    'UPDATE users SET email_verification_token = $1 WHERE id = $2',
    [verificationToken, user.id]
  );

  await sendVerificationEmail(user.email, verificationToken, user.first_name);

  res.json({
    success: true,
    message: '验证邮件已发送 / Verification email sent',
  });
});

/**
 * 验证邮箱
 * Verify Email
 *
 * @route POST /api/v1/auth/verify-email/confirm
 * @access Public
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;

  const user = await queryOne(
    'SELECT id, email, first_name FROM users WHERE email_verification_token = $1 AND deleted_at IS NULL',
    [token]
  );

  if (!user) {
    throw new AppError('无效的验证令牌 / Invalid verification token', 400, true, 'INVALID_TOKEN');
  }

  await query(
    'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, status = $1, updated_at = NOW() WHERE id = $2',
    ['active', (user as any).id]
  );

  logger.info(`Email verified: ${(user as any).email}`);

  res.json({
    success: true,
    message: '邮箱验证成功 / Email verified successfully',
    data: {
      user: {
        id: (user as any).id,
        email: (user as any).email,
        first_name: (user as any).first_name,
        email_verified: true,
      },
    },
  });
});

/**
 * 请求密码重置
 * Request Password Reset
 *
 * @route POST /api/v1/auth/password/forgot
 * @access Public
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const user = await queryOne(
    'SELECT id, email, first_name FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email.toLowerCase()]
  );

  // 无论用户是否存在都返回成功（防止枚举攻击）
  // Always return success to prevent email enumeration
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1小时过期

    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, (user as any).id]
    );

    // TODO: 发送密码重置邮件 / Send password reset email
    logger.info(`Password reset requested for: ${email}`);
  }

  res.json({
    success: true,
    message: '如果邮箱存在，重置链接已发送 / If the email exists, a reset link has been sent',
  });
});

/**
 * 重置密码
 * Reset Password
 *
 * @route POST /api/v1/auth/password/reset
 * @access Public
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token, new_password } = req.body;

  const user = await queryOne(
    'SELECT id, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW() AND deleted_at IS NULL',
    [token]
  );

  if (!user) {
    throw new AppError('无效或过期的重置令牌 / Invalid or expired reset token', 400, true, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(new_password);

  await query(
    `UPDATE users SET
      password_hash = $1,
      password_reset_token = NULL,
      password_reset_expires = NULL,
      updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, (user as any).id]
  );

  logger.info(`Password reset for: ${(user as any).email}`);

  res.json({
    success: true,
    message: '密码重置成功 / Password reset successful',
  });
});

/**
 * 修改密码（需登录）
 * Change Password (requires login)
 *
 * @route POST /api/v1/auth/password/change
 * @access Private
 */
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { current_password, new_password } = req.body;
  const userId = req.user!.id;

  // 1. 获取当前密码哈希 / Get current password hash
  const user = await queryOne(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (!user) {
    throw new AppError('用户不存在 / User not found', 404, true, 'USER_NOT_FOUND');
  }

  // 2. 验证当前密码 / Verify current password
  const isValid = await comparePassword(current_password, (user as any).password_hash);
  if (!isValid) {
    throw new AppError('当前密码错误 / Current password is incorrect', 400, true, 'INVALID_CURRENT_PASSWORD');
  }

  // 3. 设置新密码 / Set new password
  const newPasswordHash = await hashPassword(new_password);

  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newPasswordHash, userId]
  );

  logger.info(`Password changed for user: ${userId}`);

  res.json({
    success: true,
    message: '密码修改成功 / Password changed successfully',
  });
});
