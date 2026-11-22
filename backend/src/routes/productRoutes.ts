/**
 * 商品路由
 * Product Routes
 *
 * @description 定义商品相关的所有 API 端点
 *              Defines all product-related API endpoints
 * @module routes/productRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

// Import controllers
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  getFeaturedProducts,
  getNewProducts,
  getBestsellerProducts,
} from '@/controllers/product.controller.js';

// Import middleware
import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, paginationSchema, searchSchema, uuidParamSchema } from '@/middleware/validator.js';
import { upload } from '@/middleware/upload.js';

const router = Router();

// ============================================================
// 公开商品 API / Public Product APIs
// ============================================================

/**
 * @route GET /api/v1/products
 * @summary 获取商品列表（分页、搜索、筛选）/ Get product list
 * @access Public
 * @query {string} [q] - 搜索关键词
 * @query {string} [category_id] - 分类 ID
 * @query {string} [brand_id] - 品牌 ID
 * @query {number} [min_price] - 最低价格
 * @query {number} [max_price] - 最高价格
 * @query {number} [rating] - 最低评分 (1-5)
 * @query {boolean} [in_stock] - 仅显示有货
 * @query {boolean} [is_featured] - 仅显示推荐
 * @query {boolean} [is_new] - 仅显示新品
 * @query {string[]} [tags] - 标签筛选
 * @query {number} [page=1] - 页码
 * @query {number} [limit=24] - 每页数量
 * @query {string} [sort_by=created_at] - 排序字段
 * @query {string} [sort_order=desc] - 排序方向
 */
router.get(
  '/',
  validateRequest({
    query: searchSchema,
  }),
  errorAsyncHandler(getProducts)
);

/**
 * @route GET /api/v1/products/featured
 * @summary 获取热门推荐商品 / Get featured products
 * @access Public
 */
router.get('/featured', errorAsyncHandler(getFeaturedProducts));

/**
 * @route GET /api/v1/products/new
 * @summary 获取新品 / Get new products
 * @access Public
 */
router.get('/new', errorAsyncHandler(getNewProducts));

/**
 * @route GET /api/v1/products/bestsellers
 * @summary 获取热销商品 / Get bestseller products
 * @access Public
 */
router.get('/bestsellers', errorAsyncHandler(getBestsellerProducts));

/**
 * @route GET /api/v1/products/:id
 * @summary 获取商品详情 / Get product detail
 * @access Public
 */
router.get(
  '/:id',
  validateRequest({
    params: uuidParamSchema,
  }),
  errorAsyncHandler(getProduct)
);

// ============================================================
// 管理员商品 API / Admin Product APIs
// ============================================================

/**
 * @route POST /api/v1/admin/products
 * @summary 创建商品 / Create product
 * @access Private (Admin)
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({
    body: Joi.object({
      sku: Joi.string().required(),
      name: Joi.string().required(),
      short_description: Joi.string().allow(''),
      full_description: Joi.string().allow(''),
      category_id: Joi.string().uuid().required(),
      brand_id: Joi.string().uuid().allow(null),
      price: Joi.number().positive().required(),
      original_price: Joi.number().positive().allow(null),
      cost_price: Joi.number().positive().allow(null),
      weight: Joi.number().positive().allow(null),
      dimensions: Joi.object().allow(null),
      material: Joi.string().allow(''),
      origin: Joi.string().allow(''),
      status: Joi.string().valid('draft', 'active', 'inactive', 'out_of_stock', 'discontinued').default('draft'),
      is_featured: Joi.boolean().default(false),
      is_new: Joi.boolean().default(false),
      is_bestseller: Joi.boolean().default(false),
      is_on_sale: Joi.boolean().default(false),
      discount_percentage: Joi.number().integer().min(0).max(100).default(0),
      min_order_quantity: Joi.number().integer().min(1).default(1),
      max_order_quantity: Joi.number().integer().min(1).allow(null),
      total_stock: Joi.number().integer().min(0).default(0),
      tags: Joi.array().items(Joi.string()).default([]),
      attributes: Joi.object().default({}),
      meta_title: Joi.string().allow(''),
      meta_description: Joi.string().allow(''),
      meta_keywords: Joi.string().allow(''),
    }),
  }),
  errorAsyncHandler(createProduct)
);

/**
 * @route PUT /api/v1/admin/products/:id
 * @summary 更新商品 / Update product
 * @access Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({
    params: uuidParamSchema,
    body: Joi.object({
      name: Joi.string(),
      short_description: Joi.string().allow(''),
      full_description: Joi.string().allow(''),
      category_id: Joi.string().uuid(),
      brand_id: Joi.string().uuid().allow(null),
      price: Joi.number().positive(),
      original_price: Joi.number().positive().allow(null),
      cost_price: Joi.number().positive().allow(null),
      status: Joi.string().valid('draft', 'active', 'inactive', 'out_of_stock', 'discontinued'),
      is_featured: Joi.boolean(),
      is_new: Joi.boolean(),
      is_bestseller: Joi.boolean(),
      is_on_sale: Joi.boolean(),
      discount_percentage: Joi.number().integer().min(0).max(100),
      total_stock: Joi.number().integer().min(0),
      tags: Joi.array().items(Joi.string()),
    }),
  }),
  errorAsyncHandler(updateProduct)
);

/**
 * @route DELETE /api/v1/admin/products/:id
 * @summary 删除商品 / Delete product
 * @access Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({
    params: uuidParamSchema,
  }),
  errorAsyncHandler(deleteProduct)
);

/**
 * @route POST /api/v1/admin/products/:id/images
 * @summary 上传商品图片 / Upload product images
 * @access Private (Admin)
 */
router.post(
  '/:id/images',
  authenticate,
  authorize('admin', 'super_admin'),
  validateRequest({ params: uuidParamSchema }),
  upload.array('images', 10), // 最多10张图片
  errorAsyncHandler(uploadProductImages)
);

export default router;
