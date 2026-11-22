/**
 * 订单路由
 * Order Routes
 *
 * @description 定义订单相关的所有 API 端点
 * @module routes/orderRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
} from '@/controllers/order.controller.js';

import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, uuidParamSchema, paginationSchema } from '@/middleware/validator.js';

const router = Router();

// All order endpoints require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/orders
 * @summary 创建订单 / Create order
 * @access Private
 */
router.post(
  '/',
  validateRequest({
    body: {
      shipping_address_id: Joi.string().uuid().required(),
      billing_address_id: Joi.string().uuid().allow(null),
      shipping_method_id: Joi.string().uuid().allow(null),
      payment_method: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'alipay', 'wechat_pay', 'bank_transfer', 'cash_on_delivery').required(),
      coupon_code: Joi.string().allow('', null),
      customer_note: Joi.string().max(500).allow(''),
      points_to_use: Joi.number().integer().min(0).max(10000).optional(),
    },
  }),
  errorAsyncHandler(createOrder)
);

/**
 * @route GET /api/v1/orders
 * @summary 获取订单列表 / Get orders
 * @access Private
 * @query {string} [status] - 订单状态筛选
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页数量
 */
router.get(
  '/',
  validateRequest({ query: paginationSchema }),
  errorAsyncHandler(getOrders)
);

/**
 * @route GET /api/v1/orders/:id
 * @summary 获取订单详情 / Get order detail
 * @access Private
 */
router.get(
  '/:id',
  validateRequest({ params: uuidParamSchema }),
  errorAsyncHandler(getOrder)
);

/**
 * @route POST /api/v1/orders/:id/cancel
 * @summary 取消订单 / Cancel order
 * @access Private
 */
router.post(
  '/:id/cancel',
  validateRequest({
    params: uuidParamSchema,
    body: {
      reason: Joi.string().max(500).allow(''),
    },
  }),
  errorAsyncHandler(cancelOrder)
);

/**
 * @route GET /api/v1/admin/orders
 * @summary 获取所有订单（管理员）/ Get all orders (admin)
 * @access Private (Admin)
 */
router.get(
  '/admin/all',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({
    query: Joi.object({
      ...paginationSchema.describe().keys,
      status: Joi.string().optional(),
      payment_status: Joi.string().optional(),
      user_id: Joi.string().uuid().optional(),
      date_from: Joi.date().optional(),
      date_to: Joi.date().optional(),
    }),
  }),
  errorAsyncHandler(getOrders)
);

export default router;
