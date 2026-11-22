/**
 * 订单控制器测试 / Order Controller Tests
 * @module tests/backend/order.test
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

vi.mock('@/services/notification.service.js', () => ({
  sendOrderConfirmationEmail: vi.fn(),
}));

vi.mock('@/services/event.service.js', () => ({
  publishOrderEvent: vi.fn(),
}));

vi.mock('@/middleware/errorHandler.js', () => ({
  AppError: class extends Error { statusCode: number; constructor(message: string, statusCode = 500) { super(message); this.statusCode = statusCode; } },
  asyncHandler: (fn: any) => fn,
}));

import { createOrder, getOrders, getOrder, cancelOrder } from '@/controllers/order.controller.js';

describe('Order Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = { params: {}, body: {}, user: { id: 'user-uuid' }, query: {}, get: vi.fn(() => 'web') };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create order from cart', async () => {
      (mockReq as any).body = {
        shipping_address_id: 'addr-uuid',
        payment_method: 'alipay',
      };

      const { queryOne, query } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'cart-id' });
      (query as any).mockResolvedValue({
        rows: [
          { product_id: 'p1', variant_id: null, name: 'Product', quantity: 2, unit_price: 100, subtotal: 200, image: '/img.jpg', available_stock: 50 },
        ],
      });
      (queryOne as any).mockResolvedValue({ id: 'addr-uuid', recipient_name: 'Test', recipient_phone: '123', province: 'Shanghai', city: 'Shanghai', street_address: '123 St' });
      (queryOne as any).mockResolvedValue(null); // No coupon
      (query as any).mockResolvedValue({ rows: [{ id: 'order-id', order_number: 'ORD-20240101-00001', created_at: new Date().toISOString() }] });
      (query as any).mockResolvedValue({ rows: [] });

      await createOrder(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect((mockRes.json as any).mock.calls[0][0].success).toBe(true);
    });
  });

  describe('getOrders', () => {
    it('should return order list', async () => {
      const { query, queryOne } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ total: '5' });
      (query as any).mockResolvedValue({
        rows: [
          { id: '1', order_number: 'ORD-001', order_status: 'pending', total_amount: 200, created_at: new Date().toISOString() },
        ],
      });

      mockReq.query = { page: '1', limit: '20' };

      await getOrders(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      const response = (mockRes.json as any).mock.calls[0][0];
      expect(response.data).toHaveLength(1);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order', async () => {
      mockReq.params = { id: 'order-id' };
      (mockReq as any).body = { reason: 'Changed mind' };

      const { queryOne, query } = await import('@/config/database.js');
      (queryOne as any).mockResolvedValue({ id: 'order-id', order_status: 'pending', order_number: 'ORD-001' });
      (query as any).mockResolvedValue({ rows: [] });
      (query as any).mockResolvedValue({ rows: [] });

      await cancelOrder(mockReq as Request, mockRes as Response, vi.fn() as NextFunction);

      expect(mockRes.json).toHaveBeenCalled();
      expect((mockRes.json as any).mock.calls[0][0].success).toBe(true);
    });
  });
});
