/**
 * 评论路由 / Review Routes
 * @description 定义商品评论相关的所有 API 端点
 * @module routes/reviewRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getProductReviews, createReview, voteHelpful, reportReview,
} from '@/controllers/review.controller.js';

import { authenticate, optionalAuthenticate } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

/**
 * @route GET /api/v1/reviews/product/:productId
 * @summary 获取商品评论列表 / Get product reviews
 * @access Public
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页数量
 * @query {number} [rating] - 评分筛选 (1-5)
 * @query {string} [sort=helpful] - 排序方式 (helpful/newest/oldest/highest/lowest)
 */
router.get(
  '/product/:productId',
  validateRequest({ params: uuidParamSchema }),
  validateRequest({
    query: Joi.object({
      ...paginationSchema.describe().keys,
      rating: Joi.number().integer().min(1).max(5).optional(),
      sort: Joi.string().valid('newest', 'oldest', 'highest', 'lowest', 'helpful').default('helpful'),
    }),
  }),
  errorAsyncHandler(getProductReviews)
);

/**
 * @route POST /api/v1/reviews
 * @summary 创建评论 / Create review
 * @access Private
 * @body {string} product_id - 商品 ID (必填)
 * @body {string} [order_id] - 订单 ID
 * @body {number} rating - 评分 1-5 (必填)
 * @body {string} [title] - 标题
 * @body {string} [content] - 内容
 * @body {string[]} [images] - 图片 URL 数组
 */
router.post(
  '/',
  authenticate,
  validateRequest({
    body: Joi.object({
      product_id: Joi.string().uuid().required(),
      order_id: Joi.string().uuid().optional(),
      rating: Joi.number().integer().min(1).max(5).required(),
      title: Joi.string().max(500).optional(),
      content: Joi.string().max(2000).optional(),
      images: Joi.array().items(Joi.string().uri()).optional(),
    }),
  }),
  errorAsyncHandler(createReview)
);

/**
 * @route POST /api/v1/reviews/:id/helpful
 * @summary 评价评论是否有用 / Vote review as helpful
 * @access Private
 * @body {boolean} is_helpful - 是否认为有用
 */
router.post(
  '/:id/helpful',
  authenticate,
  validateRequest({ params: uuidParamSchema }),
  validateRequest({
    body: Joi.object({ is_helpful: Joi.boolean().required() }),
  }),
  errorAsyncHandler(voteHelpful)
);

/**
 * @route POST /api/v1/reviews/:id/report
 * @summary 举报评论 / Report review
 * @access Private
 * @body {string} [reason] - 举报原因
 */
router.post(
  '/:id/report',
  authenticate,
  validateRequest({
    params: uuidParamSchema,
    body: Joi.object({ reason: Joi.string().max(500).optional() }),
  }),
  errorAsyncHandler(reportReview)
);

export default router;
