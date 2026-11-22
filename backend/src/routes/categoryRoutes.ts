/**
 * 分类路由 / Category Routes
 * @description 定义分类相关的所有 API 端点
 * @module routes/categoryRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getCategories, getCategory, createCategory, updateCategory, deleteCategory,
} from '@/controllers/category.controller.js';

import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

/**
 * @route GET /api/v1/categories
 * @summary 获取分类树 / Get category tree
 * @access Public
 */
router.get('/', errorAsyncHandler(getCategories));

/**
 * @route GET /api/v1/categories/:slug
 * @summary 获取分类详情 / Get category detail
 * @access Public
 */
router.get(
  '/:slug',
  validateRequest({ params: Joi.object({ slug: Joi.string().required() }) }),
  errorAsyncHandler(getCategory)
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
      parent_id: Joi.string().uuid().allow(null),
      description: Joi.string().allow(''),
      image_url: Joi.string().uri().allow(''),
      icon_url: Joi.string().uri().allow(''),
      sort_order: Joi.number().integer().default(0),
      meta_title: Joi.string().allow(''),
      meta_description: Joi.string().allow(''),
    }),
  }),
  errorAsyncHandler(createCategory)
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
      parent_id: Joi.string().uuid().allow(null),
      description: Joi.string().allow(''),
      image_url: Joi.string().uri().allow(''),
      icon_url: Joi.string().uri().allow(''),
      sort_order: Joi.number().integer(),
      is_active: Joi.boolean(),
      meta_title: Joi.string().allow(''),
      meta_description: Joi.string().allow(''),
    }),
  }),
  errorAsyncHandler(updateCategory)
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ params: uuidParamSchema }),
  errorAsyncHandler(deleteCategory)
);

export default router;
