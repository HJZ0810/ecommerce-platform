/**
 * 物流控制器 / Shipping Controller
 * @description 处理物流配送方式、物流单、追踪等 API
 * @module controllers/shipping
 */

import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest } from '@/middleware/validator.js';
import { authenticate } from '@/middleware/auth.js';
import { logger } from '@/utils/logger.js';

/**
 * 获取配送方式列表 / Get shipping methods
 * @route GET /api/v1/shipping/methods
 * @access Public
 */
export const getShippingMethods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cacheKey = 'shipping:methods';
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    res.json({ success: true, data: cached });
    return;
  }

  const result = await query(
    'SELECT id, name, name_en, description, carrier, estimated_days_min, estimated_days_max, base_price, free_shipping_threshold FROM shipping_methods WHERE is_active = TRUE ORDER BY sort_order'
  );

  await cacheService.set(cacheKey, result.rows, 3600);

  res.json({ success: true, data: result.rows });
});

/**
 * 获取订单物流信息 / Get shipment for order
 * @route GET /api/v1/orders/:orderId/shipment
 * @access Private
 */
export const getShipments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { orderId } = req.params;
  const { page, limit } = validateRequest.extractPagination(req.query as any);

  let whereClause = 'WHERE s.order_id = $1';
  const params: any[] = [orderId];

  // 非管理员只能查看自己的订单物流 / Non-admin can only view own order shipments
  const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
  if (!isAdmin) {
    whereClause += ' AND o.user_id = $2';
    params.push(userId);
  }

  const countResult = await query(`SELECT COUNT(*) as total FROM shipments s JOIN orders o ON s.order_id = o.id ${whereClause}`, params);

  const result = await query(
    `SELECT s.*, o.order_number, o.order_status
     FROM shipments s JOIN orders o ON s.order_id = o.id
     ${whereClause}
     ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page, limit,
      total: parseInt(countResult.rows[0]?.total || '0'),
      total_pages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limit),
    },
  });
});

/**
 * 获取物流追踪详情 / Get shipment tracking detail
 * @route GET /api/v1/shipments/:id/tracking
 * @access Private
 */
export const getShipmentTracking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const shipment = await queryOne('SELECT * FROM shipments WHERE id = $1', [id]);
  if (!shipment) {
    throw new AppError('物流记录不存在 / Shipment not found', 404, true, 'SHIPMENT_NOT_FOUND');
  }

  const trackingEvents = await query(
    'SELECT * FROM shipment_tracking_events WHERE shipment_id = $1 ORDER BY event_timestamp DESC',
    [id]
  );

  res.json({
    success: true,
    data: { ...shipment, tracking_events: trackingEvents.rows },
  });
});

/**
 * 更新物流状态（管理员）/ Update shipment status (admin)
 * @route PUT /api/v1/admin/shipments/:id/status
 * @access Private (Admin)
 */
export const updateShipmentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { shipping_status, tracking_number, carrier } = req.body;

  const shipment = await queryOne('SELECT * FROM shipments WHERE id = $1', [id]);
  if (!shipment) {
    throw new AppError('物流记录不存在 / Shipment not found', 404, true, 'SHIPMENT_NOT_FOUND');
  }

  const updates: string[] = [`shipping_status = $1`];
  const values: any[] = [shipping_status];
  let idx = 2;

  if (tracking_number) { updates.push(`tracking_number = $${idx}`); values.push(tracking_number); idx++; }
  if (carrier) { updates.push(`carrier = $${idx}`); values.push(carrier); idx++; }

  // 根据状态设置时间字段 / Set time fields based on status
  if (shipping_status === 'picked_up') updates.push(`shipped_at = NOW()`);
  if (shipping_status === 'delivered') updates.push(`delivered_at = NOW()`);

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE shipments SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  // 添加物流追踪事件 / Add tracking event
  await query(
    `INSERT INTO shipment_tracking_events (shipment_id, event_type, description, event_timestamp)
     VALUES ($1, $2, $3, NOW())`,
    [id, shipping_status, `物流状态更新为: ${shipping_status}`]
  );

  // 更新订单物流状态 / Update order shipping status
  const order = await queryOne('SELECT order_id FROM shipments WHERE id = $1', [id]);
  if (order) {
    await query('UPDATE orders SET shipping_status = $1 WHERE id = $2', [shipping_status, (order as any).order_id]);

    // 如果已送达，更新订单状态 / If delivered, update order status
    if (shipping_status === 'delivered') {
      await query(
        "UPDATE orders SET order_status = 'delivered', delivered_at = NOW() WHERE id = $1",
        [(order as any).order_id]
      );
    }
  }

  logger.info(`Shipment status updated: ${id} to ${shipping_status}`);

  res.json({
    success: true,
    message: '物流状态更新成功 / Shipment status updated',
    data: result.rows[0],
  });
});

export { getShippingMethods, getShipments, getShipmentTracking, updateShipmentStatus };
