/**
 * 搜索路由
 * Search Routes
 *
 * @description 定义全文搜索、自动补全、搜索建议等 API
 * @module routes/searchRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  searchProducts,
  autocomplete,
  getTrendingSearches,
  getSearchSuggestions,
} from '@/controllers/search.controller.js';

import { validateRequest, paginationSchema } from '@/middleware/validator.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { cacheService } from '@/config/redis.js';
import { logger } from '@/utils/logger.js';

const router = Router();

/**
 * @route GET /api/v1/search
 * @summary 全文搜索商品 / Full-text search products
 * @access Public
 * @query {string} q - 搜索关键词（必填）
 * @query {string} [category_id] - 分类筛选
 * @query {string} [brand_id] - 品牌筛选
 * @query {number} [min_price] - 最低价格
 * @query {number} [max_price] - 最高价格
 * @query {number} [page=1] - 页码
 * @query {number} [limit=24] - 每页数量
 */
router.get(
  '/',
  validateRequest({
    query: Joi.object({
      q: Joi.string().required(),
      category_id: Joi.string().uuid().optional(),
      brand_id: Joi.string().uuid().optional(),
      min_price: Joi.number().optional(),
      max_price: Joi.number().optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(24),
    }),
  }),
  errorAsyncHandler(searchProducts)
);

/**
 * @route GET /api/v1/search/autocomplete
 * @summary 搜索自动补全 / Search autocomplete
 * @access Public
 * @query {string} q - 搜索关键词
 */
router.get(
  '/autocomplete',
  validateRequest({
    query: Joi.object({
      q: Joi.string().required(),
    }),
  }),
  errorAsyncHandler(autocomplete)
);

/**
 * @route GET /api/v1/search/trending
 * @summary 获取热门搜索 / Get trending searches
 * @access Public
 */
router.get('/trending', errorAsyncHandler(getTrendingSearches));

/**
 * @route GET /api/v1/search/suggestions
 * @summary 获取搜索建议 / Get search suggestions
 * @access Private
 */
router.get('/suggestions', authenticate, errorAsyncHandler(getSearchSuggestions));

export default router;
