/**
 * 报表控制器 / Report Controller
 * @description 处理销售报表、用户报表、商品报表等 API
 * @module controllers/report
 */

import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '@/config/database.js';
import dayjs from 'dayjs';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { validateRequest } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * 获取销售报表 / Get sales report
 * @route GET /api/v1/reports/sales
 * @access Private (Admin)
 */
export const getSalesReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { period = '30d', start_date, end_date } = req.query as any;

  let dateFilter = '';
  const params: any[] = [];

  if (start_date && end_date) {
    dateFilter = `WHERE o.created_at >= $1 AND o.created_at <= $2`;
    params.push(start_date, end_date + ' 23:59:59');
  } else {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;
    dateFilter = `WHERE o.created_at >= NOW() - INTERVAL '${days} days'`;
  }

  const result = await query(
    `SELECT
      TO_CHAR(o.created_at, 'YYYY-MM-DD') as date,
      COUNT(o.id) as order_count,
      COUNT(o.id) FILTER (WHERE o.order_status != 'cancelled') as completed_orders,
      COALESCE(SUM(o.total_amount), 0) as revenue,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.order_status != 'cancelled'), 0) as net_revenue,
      COALESCE(SUM(o.discount_amount), 0) as discount,
      COALESCE(SUM(o.shipping_amount), 0) as shipping,
      COUNT(DISTINCT o.user_id) as unique_customers
     FROM orders o
     ${dateFilter}
     GROUP BY TO_CHAR(o.created_at, 'YYYY-MM-DD')
     ORDER BY date ASC`,
    params
  );

  // 汇总数据 / Summary data
  const summary = await queryOne(
    `SELECT
      COUNT(*) as total_orders,
      COUNT(*) FILTER (WHERE order_status != 'cancelled') as completed_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(total_amount) FILTER (WHERE order_status != 'cancelled'), 0) as net_revenue,
      COALESCE(AVG(total_amount), 0) as avg_order_value,
      COUNT(DISTINCT user_id) as unique_customers
     FROM orders o ${dateFilter}`,
    params
  );

  res.json({
    success: true,
    data: {
      daily: result.rows,
      summary,
    },
  });
});

/**
 * 获取商品报表 / Get product report
 * @route GET /api/v1/reports/products
 * @access Private (Admin)
 */
export const getProductReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { period = '30d' } = req.query as any;
  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;

  const result = await query(
    `SELECT
      p.id, p.name, p.slug, p.price, p.status,
      p.sold_count, p.view_count, p.rating_average,
      COUNT(oi.id) as order_count,
      COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
      COALESCE(SUM(oi.subtotal), 0) as total_revenue,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
     FROM products p
     LEFT JOIN order_items oi ON p.id = oi.product_id
     LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= NOW() - INTERVAL '${days} days'
     WHERE p.deleted_at IS NULL
     GROUP BY p.id, p.name, p.slug, p.price, p.status, p.sold_count, p.view_count, p.rating_average
     ORDER BY total_revenue DESC
     LIMIT 100`
  );

  res.json({ success: true, data: result.rows });
});

/**
 * 获取用户报表 / Get user report
 * @route GET /api/v1/reports/users
 * @access Private (Admin)
 */
export const getUserReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { period = '30d' } = req.query as any;
  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;

  const result = await query(
    `SELECT
      u.id, u.email, u.display_name, u.created_at,
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(o.total_amount), 0) as total_spent,
      MAX(o.created_at) as last_order_at,
      u.status
     FROM users u
     LEFT JOIN orders o ON u.id = o.user_id AND o.created_at >= NOW() - INTERVAL '${days} days'
     WHERE u.deleted_at IS NULL AND u.role = 'customer'
     GROUP BY u.id, u.email, u.display_name, u.created_at, u.status
     ORDER BY total_spent DESC
     LIMIT 100`
  );

  // 新用户统计 / New user stats
  const newUserStats = await query(
    `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
     FROM users WHERE created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY date ASC`
  );

  res.json({
    success: true,
    data: {
      top_customers: result.rows,
      new_user_trend: newUserStats.rows,
    },
  });
});

export { getSalesReport, getProductReport, getUserReport };
