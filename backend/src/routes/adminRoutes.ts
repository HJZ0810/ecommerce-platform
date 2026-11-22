/**
 * 管理后台路由
 * Admin Routes
 *
 * @description 定义管理后台的所有 API 端点
 * @module routes/adminRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getDashboardStats,
  getOrdersTrend,
  getTopProducts,
  getUserGrowth,
  getRecentOrders,
} from '@/controllers/admin.controller.js';

import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest } from '@/middleware/validator.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin', 'super_admin'));

/**
 * @route GET /api/v1/admin/dashboard
 * @summary 获取仪表盘统计数据 / Get dashboard stats
 * @access Private (Admin)
 */
router.get('/dashboard', errorAsyncHandler(getDashboardStats));

/**
 * @route GET /api/v1/admin/dashboard/orders-trend
 * @summary 获取订单趋势 / Get orders trend
 * @access Private (Admin)
 * @query {string} [period=7d] - 统计周期 (7d, 30d, 90d, 1y)
 */
router.get(
  '/dashboard/orders-trend',
  validateRequest({
    query: Joi.object({
      period: Joi.string().valid('7d', '30d', '90d', '1y').default('7d'),
    }),
  }),
  errorAsyncHandler(getOrdersTrend)
);

/**
 * @route GET /api/v1/admin/dashboard/top-products
 * @summary 获取热销商品 / Get top selling products
 * @access Private (Admin)
 */
router.get(
  '/dashboard/top-products',
  validateRequest({
    query: Joi.object({ limit: Joi.number().integer().min(1).max(100).default(10) }),
  }),
  errorAsyncHandler(getTopProducts)
);

/**
 * @route GET /api/v1/admin/dashboard/user-growth
 * @summary 获取用户增长统计 / Get user growth
 * @access Private (Admin)
 */
router.get('/dashboard/user-growth', errorAsyncHandler(getUserGrowth));

/**
 * @route GET /api/v1/admin/dashboard/recent-orders
 * @summary 获取最近订单 / Get recent orders
 * @access Private (Admin)
 */
router.get('/dashboard/recent-orders', errorAsyncHandler(getRecentOrders));

export default router;
