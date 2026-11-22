/**
 * 支付路由 / Payment Routes
 * @description 定义支付相关的所有 API 端点
 * @module routes/paymentRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  createPaymentIntent, stripeWebhook, getPaymentMethods, getPayments, initiateRefund,
} from '@/controllers/payment.controller.js';

import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

/**
 * @route POST /api/v1/payments/intent
 * @summary 创建支付意图 / Create payment intent
 * @access Private
 * @body {string} order_id - 订单 ID
 */
router.post(
  '/intent',
  authenticate,
  validateRequest({ body: Joi.object({ order_id: Joi.string().uuid().required() }) }),
  errorAsyncHandler(createPaymentIntent)
);

/**
 * @route POST /api/v1/payments/webhook
 * @summary Stripe Webhook / Stripe webhook
 * @access Public
 */
router.post('/webhook', errorAsyncHandler(stripeWebhook));

/**
 * @route GET /api/v1/payments/methods
 * @summary 获取支付方式 / Get payment methods
 * @access Public
 */
router.get('/methods', errorAsyncHandler(getPaymentMethods));

/**
 * @route GET /api/v1/payments
 * @summary 获取支付记录 / Get payments
 * @access Private
 */
router.get('/', authenticate, validateRequest({ query: Joi.object({ page: Joi.number().integer().min(1).default(1), limit: Joi.number().integer().min(1).max(100).default(20), order_id: Joi.string().uuid().optional() }) }), errorAsyncHandler(getPayments));

/**
 * @route POST /api/v1/payments/:id/refund
 * @summary 发起退款 / Initiate refund
 * @access Private (Admin)
 * @body {number} [amount] - 退款金额
 * @body {string} [reason] - 退款原因
 */
router.post(
  '/:id/refund',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ params: uuidParamSchema }),
  validateRequest({
    body: Joi.object({
      amount: Joi.number().positive().optional(),
      reason: Joi.string().max(500).allow(''),
    }),
  }),
  errorAsyncHandler(initiateRefund)
);

export default router;
