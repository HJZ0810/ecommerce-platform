/**
 * 管理后台仪表盘控制器
 * Admin Dashboard Controller
 *
 * @description 提供管理后台的统计数据 API
 *              Provides admin dashboard statistics APIs
 * @module controllers/admin
 */

import { Request, Response, NextFunction } from 'express';
import { query, queryOne, transaction } from '@/config/database.js';
import dayjs from 'dayjs';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { validateRequest, paginationSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * 获取仪表盘统计数据
 * Get dashboard statistics
 *
 * @route GET /api/v1/admin/dashboard
 * @access Private (Admin)
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // 今日统计 / Today's stats
  const today = dayjs().startOf('day').toISOString();
  const thisMonth = dayjs().startOf('month').toISOString();

  const [
    totalUsers,
    totalOrders,
    totalProducts,
    totalRevenue,
    todayOrders,
    todayRevenue,
    monthOrders,
    monthRevenue,
    pendingOrders,
    lowStockProducts,
  ] = await Promise.all([
    queryOne('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'),
    queryOne('SELECT COUNT(*) as count FROM orders'),
    queryOne('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL'),
    queryOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE order_status != $1', ['cancelled']),
    queryOne('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [today]),
    queryOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND order_status != $2', [today, 'cancelled']),
    queryOne('SELECT COUNT(*) as count FROM orders WHERE created_at >= $1', [thisMonth]),
    queryOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE created_at >= $1 AND order_status != $2', [thisMonth, 'cancelled']),
    queryOne('SELECT COUNT(*) as count FROM orders WHERE order_status = $1', ['pending']),
    queryOne(`SELECT COUNT(DISTINCT product_id) as count FROM inventory
              WHERE (quantity - reserved_quantity) <= min_stock_level`),
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        total_users: parseInt((totalUsers as any)?.count || '0'),
        total_orders: parseInt((totalOrders as any)?.count || '0'),
        total_products: parseInt((totalProducts as any)?.count || '0'),
        total_revenue: parseFloat((totalRevenue as any)?.total || '0'),
      },
      today: {
        orders: parseInt((todayOrders as any)?.count || '0'),
        revenue: parseFloat((todayRevenue as any)?.total || '0'),
      },
      this_month: {
        orders: parseInt((monthOrders as any)?.count || '0'),
        revenue: parseFloat((monthRevenue as any)?.total || '0'),
      },
      alerts: {
        pending_orders: parseInt((pendingOrders as any)?.count || '0'),
        low_stock_products: parseInt((lowStockProducts as any)?.count || '0'),
      },
    },
  });
});

/**
 * 获取订单趋势数据
 * Get order trend data
 *
 * @route GET /api/v1/admin/dashboard/orders-trend
 * @access Private (Admin)
 */
export const getOrdersTrend = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { period = '7d' } = req.query as any;

  let dateFormat: string;
  let interval: string;
  let days: number;

  switch (period) {
    case '30d':
      dateFormat = 'YYYY-MM-DD';
      interval = '1 day';
      days = 30;
      break;
    case '90d':
      dateFormat = 'YYYY-MM-DD';
      interval = '1 day';
      days = 90;
      break;
    case '1y':
      dateFormat = 'YYYY-MM';
      interval = '1 month';
      days = 365;
      break;
    default: // 7d
      dateFormat = 'YYYY-MM-DD';
      interval = '1 day';
      days = 7;
  }

  const result = await query(
    `SELECT
      TO_CHAR(created_at, $1) as date,
      COUNT(*) as order_count,
      COALESCE(SUM(total_amount), 0) as revenue
     FROM orders
     WHERE created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY TO_CHAR(created_at, $1)
     ORDER BY date ASC`,
    [dateFormat]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * 获取热销商品排行
 * Get top selling products
 *
 * @route GET /api/v1/admin/dashboard/top-products
 * @access Private (Admin)
 */
export const getTopProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await query(
    `SELECT
      p.id, p.name, p.slug, p.price,
      p.sold_count, p.rating_average,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image,
      COUNT(oi.id) as order_count,
      COALESCE(SUM(oi.quantity), 0) as total_quantity_sold
     FROM products p
     LEFT JOIN order_items oi ON p.id = oi.product_id
     WHERE p.deleted_at IS NULL
     GROUP BY p.id, p.name, p.slug, p.price, p.sold_count, p.rating_average
     ORDER BY p.sold_count DESC
     LIMIT $1`,
    [limit]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * 获取用户增长统计
 * Get user growth stats
 *
 * @route GET /api/v1/admin/dashboard/user-growth
 * @access Private (Admin)
 */
export const getUserGrowth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT
      TO_CHAR(created_at, 'YYYY-MM-DD') as date,
      COUNT(*) as new_users
     FROM users
     WHERE created_at >= NOW() - INTERVAL '30 days'
     GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
     ORDER BY date ASC`
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * 获取最近订单
 * Get recent orders
 *
 * @route GET /api/v1/admin/dashboard/recent-orders
 * @access Private (Admin)
 */
export const getRecentOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await query(
    `SELECT o.*, u.email, u.first_name, u.last_name
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [limit]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

export { getDashboardStats, getOrdersTrend, getTopProducts, getUserGrowth, getRecentOrders };
