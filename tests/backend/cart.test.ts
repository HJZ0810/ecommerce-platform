/**
 * 购物车控制器测试 / Cart Controller Tests
 * @module tests/backend/cart.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('@/config/database.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn((fn) => fn({ query: vi.fn(), queryOne: vi.fn() })),
}));

vi.mock('@/config/redis.js', () => ({
  cacheService: { delPattern: vi.fn() },
}));

vi.mock('@/middleware/errorHandler.js', () => ({
  AppError: class extends Error { statusCode: number; constructor(message: string, statusCode = 500) { super(message); this.statusCode = statusCode; } },
  asyncHandler: (fn: any) => fn,
}));

import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '@/controllers/cart.controller.js';

describe('Cart Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = { params: {}, body: {}, user: { id: 'user-uuid' }, query: {} };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    vi.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return empty cart when no cart exists', async () => {
      const { queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue(null);

      await getCart(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      const response = (mockRes.json as any).mock.calls[0][0];
      expect(response.data.items).toHaveLength(0);
    });

    it('should return cart items', async () => {
      const { queryOne, query } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'cart-id' });
      (query as any).mockResolvedValue({ rows: [{ id: '1', product_id: 'p1', name: 'Product', quantity: 2, unit_price: 100, subtotal: 200, available_stock: 50, product_status: 'active' }] });

      await getCart(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      const response = (mockRes.json as any).mock.calls[0][0];
      expect(response.data.items).toHaveLength(1);
      expect(response.data.total_items).toBe(2);
    });
  });

  describe('addToCart', () => {
    it('should add item to cart', async () => {
      (mockReq as any).body = { product_id: 'p1', quantity: 2 };

      const { queryOne, query } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue(null); // No cart
      (queryOne as any).mockResolvedValue({ id: 'p1', price: 100, status: 'active', available_stock: 100 });
      (query as any).mockResolvedValue({ rows: [{ id: 'cart-id' }] });
      (query as any).mockResolvedValue({ rows: [{ id: 'item-id' }] });

      await addToCart(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should reject adding out of stock item', async () => {
      (mockReq as any).body = { product_id: 'p1', quantity: 100 };

      const { queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'p1', price: 100, status: 'active', available_stock: 5 });

      await addToCart(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      mockReq.params = { itemId: 'item-id' };

      const { queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'item-id' });

      await removeFromCart(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      expect((mockRes.json as any).mock.calls[0][0].success).toBe(true);
    });
  });

  describe('clearCart', () => {
    it('should clear cart', async () => {
      const { queryOne, query } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'cart-id' });
      (query as any).mockResolvedValue({ rows: [] });

      await clearCart(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      expect((mockRes.json as any).mock.calls[0][0].success).toBe(true);
    });
  });
});
