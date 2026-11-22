/**
 * 认证路由
 * Authentication Routes
 *
 * @description 定义所有认证相关的 API 端点
 *              Defines all authentication API endpoints
 * @module routes/authRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

// Import controllers
import {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  requestEmailVerification,
  forgotPassword,
  resetPassword,
  changePassword,
} from '@/controllers/auth.controller.js';

// Import middleware
import { authenticate, asyncHandler } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest } from '@/middleware/validator.js';

const router = Router();

// ============================================================
// 注册和登录 / Registration and Login
// ============================================================

/**
 * @route POST /api/v1/auth/register
 * @summary 用户注册 / User registration
 * @access Public
 */
router.post(
  '/register',
  validateRequest({
    body: {
      email: Joi.string().email().required().messages({
        'any.required': '邮箱为必填项 / Email is required',
        'string.email': '邮箱格式不正确 / Invalid email format',
      }),
      password: Joi.string().min(8).required().messages({
        'any.required': '密码为必填项 / Password is required',
        'string.min': '密码至少8位 / Password must be at least 8 characters',
      }),
      first_name: Joi.string().max(100).allow(''),
      last_name: Joi.string().max(100).allow(''),
      phone: Joi.string().max(20).allow(''),
      referral_code: Joi.string().max(20).allow(''),
    },
  }),
  errorAsyncHandler(register)
);

/**
 * @route POST /api/v1/auth/login
 * @summary 用户登录 / User login
 * @access Public
 */
router.post(
  '/login',
  validateRequest({
    body: {
      email_or_phone: Joi.string().required().messages({
        'any.required': '邮箱或手机号为必填项 / Email or phone is required',
      }),
      password: Joi.string().required().messages({
        'any.required': '密码为必填项 / Password is required',
      }),
    },
  }),
  errorAsyncHandler(login)
);

/**
 * @route POST /api/v1/auth/refresh
 * @summary 刷新访问令牌 / Refresh access token
 * @access Public
 */
router.post(
  '/refresh',
  validateRequest({
    body: {
      refresh_token: Joi.string().required(),
    },
  }),
  errorAsyncHandler(refreshToken)
);

/**
 * @route POST /api/v1/auth/logout
 * @summary 用户登出 / User logout
 * @access Private
 */
router.post('/logout', authenticate, errorAsyncHandler(logout));

// ============================================================
// 邮箱验证 / Email Verification
// ============================================================

/**
 * @route POST /api/v1/auth/verify-email/request
 * @summary 请求发送验证邮件 / Request email verification
 * @access Private
 */
router.post('/verify-email/request', authenticate, errorAsyncHandler(requestEmailVerification));

/**
 * @route POST /api/v1/auth/verify-email/confirm
 * @summary 确认邮箱验证 / Confirm email verification
 * @access Public
 */
router.post(
  '/verify-email/confirm',
  validateRequest({
    body: {
      token: Joi.string().required(),
    },
  }),
  errorAsyncHandler(verifyEmail)
);

// ============================================================
// 密码管理 / Password Management
// ============================================================

/**
 * @route POST /api/v1/auth/password/forgot
 * @summary 忘记密码 - 请求重置链接 / Forgot password
 * @access Public
 */
router.post(
  '/password/forgot',
  validateRequest({
    body: {
      email: Joi.string().email().required(),
    },
  }),
  errorAsyncHandler(forgotPassword)
);

/**
 * @route POST /api/v1/auth/password/reset
 * @summary 重置密码 / Reset password
 * @access Public
 */
router.post(
  '/password/reset',
  validateRequest({
    body: {
      token: Joi.string().required(),
      new_password: Joi.string().min(8).required(),
    },
  }),
  errorAsyncHandler(resetPassword)
);

/**
 * @route POST /api/v1/auth/password/change
 * @summary 修改密码（需登录）/ Change password (requires login)
 * @access Private
 */
router.post(
  '/password/change',
  authenticate,
  validateRequest({
    body: {
      current_password: Joi.string().required(),
      new_password: Joi.string().min(8).required(),
    },
  }),
  errorAsyncHandler(changePassword)
);

export default router;
