/**
 * 商品控制器测试 / Product Controller Tests
 * @description 测试商品 CRUD、搜索、库存等 API
 * @module tests/backend/product.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('@/config/database.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn((fn) => fn({ query: vi.fn(), queryOne: vi.fn() })),
}));

vi.mock('@/config/redis.js', () => ({
  cacheService: { get: vi.fn(), set: vi.fn(), del: vi.fn(), delPattern: vi.fn(), invalidateProductCache: vi.fn() },
  CacheService: { buildKey: vi.fn((...args) => args.join(':')) },
}));

vi.mock('@/config/elasticsearch.js', () => ({
  elasticsearchClient: { search: vi.fn(), index: vi.fn(), delete: vi.fn() },
  indexProduct: vi.fn(),
  deleteProductFromIndex: vi.fn(),
}));

vi.mock('@/middleware/errorHandler.js', () => ({
  AppError: class extends Error { statusCode: number; constructor(message: string, statusCode = 500) { super(message); this.statusCode = statusCode; } },
  asyncHandler: (fn: any) => fn,
}));

import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from '@/controllers/product.controller.js';

describe('Product Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = { query: {}, params: {}, user: { id: 'admin-uuid' }, body: {} };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    vi.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should return product list with pagination', async () => {
      const { query, queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ total: '100' });
      (query as any).mockResolvedValue({ rows: [{ id: '1', name: 'Test Product', price: 100 }] });

      mockReq.query = { page: '1', limit: '24' };

      await getProducts(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      const response = (mockRes.json as any).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
    });

    it('should filter by category', async () => {
      const { query, queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ total: '10' });
      (query as any).mockResolvedValue({ rows: [] });

      mockReq.query = { page: '1', limit: '24', category_id: 'cat-uuid' };

      await getProducts(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(query).toHaveBeenCalled();
    });
  });

  describe('getProduct', () => {
    it('should return product detail', async () => {
      const { query, queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({
        id: '1', name: 'Test Product', price: 100, available_stock: 50,
        category_id: 'cat-uuid', rating_average: 4.5, rating_count: 10,
      });
      (query as any).mockResolvedValue({ rows: [{ url: '/img.jpg' }] });
      (query as any).mockResolvedValue({ rows: [] });

      mockReq.params = { id: '1' };

      await getProduct(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      expect((mockRes.json as any).mock.calls[0][0].data.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const { queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue(null);

      mockReq.params = { id: 'nonexistent' };

      await getProduct(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      (mockReq as any).body = {
        sku: 'SKU-001', name: 'New Product', category_id: 'cat-uuid',
        price: 100, status: 'active',
      };

      const { query: dbQuery, queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'cat-uuid' });
      (dbQuery as any).mockResolvedValue({ rows: [{ id: 'new-id', sku: 'SKU-001', name: 'New Product' }] });

      await createProduct(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect((mockRes.json as any).mock.calls[0][0].success).toBe(true);
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete product', async () => {
      const { query } = await import('@/config/database.js');
      (query as any).mockResolvedValue({ rows: [{ id: '1' }] });

      mockReq.params = { id: '1' };

      await deleteProduct(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      expect((mockRes.json as any).mock.calls[0][0].success).toBe(true);
    });
  });
});
