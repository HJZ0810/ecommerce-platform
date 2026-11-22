/**
 * 优惠券路由 / Coupon Routes
 * @description 定义优惠券相关的所有 API 端点
 * @module routes/couponRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  validateCoupon, getAvailableCoupons, getMyCoupons, getCouponDetail,
  createCoupon, updateCoupon, deleteCoupon, getCoupons,
} from '@/controllers/coupon.controller.js';

import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

// 公开 API / Public APIs
router.get('/:code', validateRequest({ params: Joi.object({ code: Joi.string().required() }) }), errorAsyncHandler(getCouponDetail));

// 需要认证的 API / Authenticated APIs
router.use(authenticate);

/**
 * @route POST /api/v1/coupons/validate
 * @summary 验证优惠券 / Validate coupon
 * @access Private
 */
router.post(
  '/validate',
  validateRequest({
    body: Joi.object({
      code: Joi.string().required(),
      order_amount: Joi.number().positive().required(),
      product_ids: Joi.array().items(Joi.string().uuid()).optional(),
    }),
  }),
  errorAsyncHandler(validateCoupon)
);

/**
 * @route GET /api/v1/coupons/available
 * @summary 获取可用优惠券 / Get available coupons
 * @access Private
 */
router.get('/available', errorAsyncHandler(getAvailableCoupons));

/**
 * @route GET /api/v1/coupons/my
 * @summary 获取我的优惠券 / Get my coupons
 * @access Private
 */
router.get('/my', errorAsyncHandler(getMyCoupons));

// 管理员路由
/**
 * @route GET /api/v1/admin/coupons
 * @summary 获取所有优惠券 / Get all coupons (admin)
 * @access Private (Admin)
 */
router.get(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ query: paginationSchema }),
  errorAsyncHandler(getCoupons)
);

/**
 * @route POST /api/v1/admin/coupons
 * @summary 创建优惠券 / Create coupon (admin)
 * @access Private (Admin)
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({
    body: Joi.object({
      code: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().allow(''),
      coupon_type: Joi.string().valid('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y').required(),
      value: Joi.number().positive().required(),
      min_order_amount: Joi.number().min(0).default(0),
      max_discount_amount: Joi.number().positive().allow(null),
      applicable_categories: Joi.array().items(Joi.string().uuid()).optional(),
      applicable_products: Joi.array().items(Joi.string().uuid()).optional(),
      excluded_products: Joi.array().items(Joi.string().uuid()).optional(),
      total_quantity: Joi.number().integer().min(1).required(),
      usage_limit_per_user: Joi.number().integer().min(1).default(1),
      is_stackable: Joi.boolean().default(false),
      is_active: Joi.boolean().default(true),
      valid_from: Joi.date().iso().optional(),
      valid_until: Joi.date().iso().required(),
    }),
  }),
  errorAsyncHandler(createCoupon)
);

/**
 * @route PUT /api/v1/admin/coupons/:id
 * @summary 更新优惠券 / Update coupon (admin)
 * @access Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ params: uuidParamSchema }),
  validateRequest({
    body: Joi.object({
      code: Joi.string(),
      name: Joi.string(),
      description: Joi.string().allow(''),
      value: Joi.number().positive(),
      min_order_amount: Joi.number().min(0),
      is_active: Joi.boolean(),
      valid_until: Joi.date().iso(),
    }),
  }),
  errorAsyncHandler(updateCoupon)
);

/**
 * @route DELETE /api/v1/admin/coupons/:id
 * @summary 删除优惠券 / Delete coupon (admin)
 * @access Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ params: uuidParamSchema }),
  errorAsyncHandler(deleteCoupon)
);

export default router;
