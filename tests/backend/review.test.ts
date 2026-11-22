/**
 * 评论控制器测试 / Review Controller Tests
 * @module tests/backend/review.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('@/config/database.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn((fn) => fn({ query: vi.fn(), queryOne: vi.fn() })),
}));

vi.mock('@/middleware/errorHandler.js', () => ({
  AppError: class extends Error { statusCode: number; constructor(message: string, statusCode = 500) { super(message); this.statusCode = statusCode; } },
  asyncHandler: (fn: any) => fn,
}));

import { getProductReviews, createReview, voteHelpful, reportReview } from '@/controllers/review.controller.js';

describe('Review Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = { params: {}, body: {}, user: { id: 'user-uuid' }, query: {} };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    vi.clearAllMocks();
  });

  describe('getProductReviews', () => {
    it('should return reviews for product', async () => {
      const { query, queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ total: '10' });
      (query as any).mockResolvedValue({ rows: [{ id: '1', rating: 5, content: 'Great!', first_name: 'Test' }] });

      mockReq.params = { productId: 'p1' };
      mockReq.query = { page: '1', limit: '20' };

      await getProductReviews(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      const response = (mockRes.json as any).mock.calls[0][0];
      expect(response.data).toHaveLength(1);
    });
  });

  describe('createReview', () => {
    it('should create review for purchased product', async () => {
      (mockReq as any).body = { product_id: 'p1', rating: 5, content: 'Great product!' };

      const { queryOne, query } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'oi1' }); // purchased
      (query as any).mockResolvedValue({ rows: [{ id: 'review-1', is_verified_purchase: true }] });

      await createReview(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('voteHelpful', () => {
    it('should record helpful vote', async () => {
      mockReq.params = { id: 'review-1' };
      (mockReq as any).body = { is_helpful: true };

      const { queryOne, query } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue(null); // No existing vote
      (query as any).mockResolvedValue({ rows: [{ count: '1' }] });

      await voteHelpful(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('reportReview', () => {
    it('should report review', async () => {
      mockReq.params = { id: 'review-1' };

      const { queryOne, query } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'review-1' });

      await reportReview(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      expect((mockRes.json as any).mock.calls[0][0].success).toBe(true);
    });
  });
});
