/**
 * 报表路由 / Report Routes
 * @description 定义报表相关的所有 API 端点
 * @module routes/reportRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getSalesReport, getProductReport, getUserReport,
} from '@/controllers/report.controller.js';

import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest } from '@/middleware/validator.js';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

/**
 * @route GET /api/v1/reports/sales
 * @summary 销售报表 / Sales report
 * @access Private (Admin)
 * @query {string} [period=30d] - 统计周期 (7d, 30d, 90d, 1y)
 * @query {string} [start_date] - 开始日期 (YYYY-MM-DD)
 * @query {string} [end_date] - 结束日期 (YYYY-MM-DD)
 */
router.get(
  '/sales',
  validateRequest({
    query: Joi.object({
      period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
      start_date: Joi.date().iso().optional(),
      end_date: Joi.date().iso().optional(),
    }),
  }),
  errorAsyncHandler(getSalesReport)
);

/**
 * @route GET /api/v1/reports/products
 * @summary 商品报表 / Product report
 * @access Private (Admin)
 * @query {string} [period=30d] - 统计周期
 */
router.get(
  '/products',
  validateRequest({
    query: Joi.object({
      period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
    }),
  }),
  errorAsyncHandler(getProductReport)
);

/**
 * @route GET /api/v1/reports/users
 * @summary 用户报表 / User report
 * @access Private (Admin)
 * @query {string} [period=30d] - 统计周期
 */
router.get(
  '/users',
  validateRequest({
    query: Joi.object({
      period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
    }),
  }),
  errorAsyncHandler(getUserReport)
);

export default router;
