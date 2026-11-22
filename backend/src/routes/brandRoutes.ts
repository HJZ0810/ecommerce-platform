/**
 * 品牌路由 / Brand Routes
 * @description 定义品牌相关的所有 API 端点
 * @module routes/brandRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getBrands, getBrand, createBrand, updateBrand, deleteBrand,
} from '@/controllers/brand.controller.js';

import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

/**
 * @route GET /api/v1/brands
 * @summary 获取品牌列表 / Get brand list
 * @access Public
 * @query {number} [page=1] - 页码
 * @query {number} [limit=50] - 每页数量
 */
router.get('/', validateRequest({ query: paginationSchema }), errorAsyncHandler(getBrands));

/**
 * @route GET /api/v1/brands/:slug
 * @summary 获取品牌详情 / Get brand detail
 * @access Public
 */
router.get(
  '/:slug',
  validateRequest({ params: Joi.object({ slug: Joi.string().required() }) }),
  errorAsyncHandler(getBrand)
);

// 管理员路由
router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({
    body: Joi.object({
      name: Joi.string().required(),
      name_en: Joi.string().allow(''),
      description: Joi.string().allow(''),
      website_url: Joi.string().uri().allow(''),
      logo_url: Joi.string().uri().allow(''),
      banner_url: Joi.string().uri().allow(''),
      is_verified: Joi.boolean().default(false),
    }),
  }),
  errorAsyncHandler(createBrand)
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ params: uuidParamSchema }),
  validateRequest({
    body: Joi.object({
      name: Joi.string(),
      name_en: Joi.string().allow(''),
      description: Joi.string().allow(''),
      website_url: Joi.string().uri().allow(''),
      logo_url: Joi.string().uri().allow(''),
      banner_url: Joi.string().uri().allow(''),
      is_verified: Joi.boolean(),
      is_active: Joi.boolean(),
      sort_order: Joi.number().integer(),
    }),
  }),
  errorAsyncHandler(updateBrand)
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ params: uuidParamSchema }),
  errorAsyncHandler(deleteBrand)
);

export default router;
