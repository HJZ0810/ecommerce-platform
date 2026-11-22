/**
 * 物流路由 / Shipping Routes
 * @description 定义物流配送相关的所有 API 端点
 * @module routes/shippingRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getShippingMethods, getShipments, getShipmentDetail, updateShipmentStatus,
  getShipmentTracking,
} from '@/controllers/shipping.controller.js';

import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

/**
 * @route GET /api/v1/shipping/methods
 * @summary 获取配送方式列表 / Get shipping methods
 * @access Public
 */
router.get('/methods', errorAsyncHandler(getShippingMethods));

/**
 * @route GET /api/v1/orders/:orderId/shipment
 * @summary 获取订单物流信息 / Get shipment for order
 * @access Private
 */
router.get(
  '/orders/:orderId/shipment',
  authenticate,
  validateRequest({ params: Joi.object({ orderId: Joi.string().uuid().required() }) }),
  errorAsyncHandler(getShipments)
);

/**
 * @route GET /api/v1/shipments/:id/tracking
 * @summary 获取物流追踪 / Get shipment tracking
 * @access Private
 */
router.get(
  '/:id/tracking',
  authenticate,
  validateRequest({ params: uuidParamSchema }),
  errorAsyncHandler(getShipmentTracking)
);

// 管理员路由
/**
 * @route GET /api/v1/admin/shipments
 * @summary 获取所有物流记录（管理员）/ Get all shipments (admin)
 * @access Private (Admin)
 */
router.get(
  '/admin/all',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ query: Joi.object({ page: Joi.number().integer().min(1).default(1), limit: Joi.number().integer().min(1).max(100).default(20) }) }),
  errorAsyncHandler(getShipments)
);

/**
 * @route PUT /api/v1/admin/shipments/:id/status
 * @summary 更新物流状态（管理员）/ Update shipment status (admin)
 * @access Private (Admin)
 * @body {string} shipping_status - 物流状态
 * @body {string} [tracking_number] - 物流单号
 * @body {string} [carrier] - 承运商
 */
router.put(
  '/:id/status',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ params: uuidParamSchema }),
  validateRequest({
    body: Joi.object({
      shipping_status: Joi.string().valid('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned').required(),
      tracking_number: Joi.string().optional(),
      carrier: Joi.string().optional(),
    }),
  }),
  errorAsyncHandler(updateShipmentStatus)
);

export default router;
