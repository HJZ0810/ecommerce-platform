/**
 * 认证中间件
 * Authentication Middleware
 *
 * @description 处理 JWT 认证、权限验证、令牌刷新
 *              Handles JWT authentication, permission verification, token refresh
 * @module middleware/auth
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { queryOne } from '@/config/database.js';
import { AppError } from './errorHandler.js';
import type { User } from '@/types/user.types.js';

/**
 * 扩展 Express Request 类型，添加 user 属性
 */
declare global {
  namespace Express {
    interface Request {
      /** 当前认证用户 / Current authenticated user */
      user?: User;
      /** 客户端 ID（用于多端管理）/ Client ID for multi-device management */
      clientId?: string;
    }
  }
}

/**
 * JWT 配置
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '15m';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * 生成访问令牌 (Access Token)
 * Generate access token
 *
 * @param {User} user - 用户对象
 * @param {string} [clientId] - 客户端ID
 * @returns {string} JWT token
 */
export function generateAccessToken(user: User, clientId?: string): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    clientId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
    issuer: 'ecommerce-platform',
    audience: 'ecommerce-api',
  });
}

/**
 * 生成刷新令牌 (Refresh Token)
 * Generate refresh token
 *
 * @param {User} user - 用户对象
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES,
    issuer: 'ecommerce-platform',
    audience: 'ecommerce-api',
  });
}

/**
 * 验证 JWT 令牌
 * Verify JWT token
 *
 * @param {string} token - JWT token
 * @param {boolean} isRefresh - 是否为刷新令牌
 * @returns {object} 解码后的 payload
 * @throws {AppError} 认证失败时抛出
 */
export function verifyToken(token: string, isRefresh: boolean = false): any {
  const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET;

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'ecommerce-platform',
      audience: 'ecommerce-api',
    }) as any;

    return decoded;
  } catch (error) {
    if ((error as jwt.TokenExpiredError).name === 'TokenExpiredError') {
      throw new AppError('Token 已过期 / Token expired', 401, true, 'TOKEN_EXPIRED');
    }
    if ((error as jwt.TokenExpiredError).name === 'JsonWebTokenError') {
      throw new AppError('无效的 Token / Invalid token', 401, true, 'INVALID_TOKEN');
    }
    throw new AppError('Token 验证失败 / Token verification failed', 401, true, 'TOKEN_VERIFICATION_FAILED');
  }
}

/**
 * 认证中间件 - 验证 JWT Token
 * Authentication middleware - verify JWT token
 *
 * @description 从 Authorization header 或 cookie 中提取并验证 JWT
 *              Extract and verify JWT from Authorization header or cookie
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. 从请求头获取 Token / Get token from request header
    let token = req.headers.authorization?.replace('Bearer ', '');

    // 2. 从 Cookie 获取 Token（用于 Web 应用）/ Get from cookie
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AppError('未提供认证令牌 / No authentication token provided', 401, true, 'NO_TOKEN');
    }

    // 3. 验证 Token / Verify token
    const decoded = verifyToken(token);

    // 4. 查询用户信息（确保用户仍存在且活跃）
    //    Query user info (ensure user still exists and is active)
    const user = await queryOne<User>(
      'SELECT id, email, role, status, email_verified FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.id]
    );

    if (!user) {
      throw new AppError('用户不存在 / User not found', 401, true, 'USER_NOT_FOUND');
    }

    if (user.status === 'suspended') {
      throw new AppError('账户已被暂停 / Account suspended', 403, true, 'ACCOUNT_SUSPENDED');
    }

    if (user.status === 'pending_verification') {
      throw new AppError('请先验证邮箱 / Please verify your email first', 403, true, 'EMAIL_NOT_VERIFIED');
    }

    // 5. 将用户信息附加到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
      status: user.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 可选认证 - 不强制要求登录
 * Optional authentication - login not required
 *
 * @description 如果提供了有效的 Token 则附加用户信息，否则继续
 *              Attach user info if valid token provided, otherwise continue
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');

    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    const user = await queryOne<User>(
      'SELECT id, email, role, status FROM users WHERE id = $1 AND deleted_at IS NULL AND status = $2',
      [decoded.id, 'active']
    );

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    }

    next();
  } catch {
    next();
  }
};

/**
 * 角色权限验证中间件
 * Role-based access control middleware
 *
 * @description 验证用户是否具有所需角色
 *              Verify user has required role
 * @param {...string} roles - 允许的角色列表
 *
 * @example
 * router.get('/admin/dashboard', authenticate, authorize('admin', 'super_admin'), adminController.getDashboard);
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('未认证 / Not authenticated', 401, true, 'NOT_AUTHENTICATED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        '权限不足 / Insufficient permissions',
        403,
        true,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    next();
  };
};

/**
 * 自验证中间件 - 确保用户只能访问自己的资源
 * Self-verification middleware - ensure user can only access own resources
 */
export const selfOrAdmin = (resourceUserIdParam: string = 'userId'): any => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('未认证 / Not authenticated', 401, true, 'NOT_AUTHENTICATED');
    }

    const resourceUserId = req.params[resourceUserIdParam];
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (!isAdmin && req.user.id !== resourceUserId) {
      throw new AppError(
        '只能访问自己的资源 / Can only access own resources',
        403,
        true,
        'FORBIDDEN_SELF'
      );
    }

    next();
  };
};

/**
 * 密码加密
 * Hash password
 *
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 加密后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 密码验证
 * Compare password with hash
 *
 * @param {string} password - 明文密码
 * @param {string} hash - 加密后的密码
 * @returns {Promise<boolean>} 是否匹配
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成唯一推荐码
 * Generate unique referral code
 *
 * @returns {Promise<string>} 8位唯一推荐码
 */
export async function generateReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
  let code: string;
  let exists: boolean;

  do {
    code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const result = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE referral_code = $1',
      [code]
    );
    exists = !!result;
  } while (exists);

  return code;
}
