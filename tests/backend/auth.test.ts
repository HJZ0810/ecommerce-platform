/**
 * 认证控制器测试 / Auth Controller Tests
 * @description 测试用户注册、登录、登出等认证功能
 * @module tests/backend/auth.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock dependencies
vi.mock('@/config/database.js', () => ({
  queryOne: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn((fn) => fn({ query: vi.fn(), queryOne: vi.fn() })),
}));

vi.mock('@/config/redis.js', () => ({
  redisClient: { setex: vi.fn(), del: vi.fn() },
}));

vi.mock('@/middleware/auth.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  comparePassword: vi.fn().mockResolvedValue(true),
  generateReferralCode: vi.fn().mockResolvedValue('ABCD1234'),
}));

vi.mock('@/services/notification.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/middleware/errorHandler.js', () => ({
  AppError: class extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 500) { super(message); this.statusCode = statusCode; }
  },
  asyncHandler: (fn: any) => fn,
}));

import { register, login, logout, forgotPassword, resetPassword, changePassword } from '@/controllers/auth.controller.js';

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      ip: '127.0.0.1',
      get: vi.fn(() => 'test-agent'),
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      (mockReq as any).body = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      };

      const { queryOne, query } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue(null); // No existing user
      (query as any).mockResolvedValue({ rows: [{ id: 'uuid-1', email: 'test@example.com', first_name: 'Test' }] });

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect((mockRes.json as any).mock.calls[0][0].success).toBe(true);
    });

    it('should reject duplicate email', async () => {
      (mockReq as any).body = { email: 'existing@example.com', password: 'password123' };

      const { queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'existing-uuid' });

      await register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as any).mock.calls[0][0];
      expect(error.statusCode).toBe(409);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      (mockReq as any).body = { email_or_phone: 'test@example.com', password: 'password123' };

      const { queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({
        id: 'user-uuid', email: 'test@example.com', role: 'customer',
        status: 'active', password_hash: 'hashed', failed_login_attempts: 0,
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
      const response = (mockRes.json as any).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.access_token).toBeDefined();
    });

    it('should reject invalid password', async () => {
      (mockReq as any).body = { email_or_phone: 'test@example.com', password: 'wrongpassword' };

      const { comparePassword } = await import('@/middleware/auth.js');
      (comparePassword as any).mockResolvedValue(false);

      const { queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({
        id: 'user-uuid', email: 'test@example.com', password_hash: 'hashed',
        failed_login_attempts: 0, locked_until: null,
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject non-existent user', async () => {
      (mockReq as any).body = { email_or_phone: 'nonexistent@example.com', password: 'password123' };

      const { queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue(null);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email for existing user', async () => {
      (mockReq as any).body = { email: 'test@example.com' };

      const { queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'user-uuid', email: 'test@example.com', first_name: 'Test' });

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
      expect((mockRes.json as any).mock.calls[0][0].success).toBe(true);
    });
  });
});
