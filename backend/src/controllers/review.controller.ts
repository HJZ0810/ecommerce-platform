/**
 * 评论控制器 / Review Controller
 * @description 处理商品评论的增删改查、投票、举报 API
 * @module controllers/review
 */

import { Request, Response, NextFunction } from 'express';
import { query, queryOne, transaction } from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, optionalAuthenticate } from '@/middleware/auth.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * 获取商品评论列表 / Get product reviews
 * @route GET /api/v1/reviews/product/:productId
 * @access Public
 */
export const getProductReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  const { page, limit, offset } = validateRequest.extractPagination(req.query as any);
  const { rating, sort } = req.query as any;

  let orderClause = 'ORDER BY r.helpful_count DESC, r.created_at DESC';
  if (sort === 'newest') orderClause = 'ORDER BY r.created_at DESC';
  if (sort === 'oldest') orderClause = 'ORDER BY r.created_at ASC';
  if (sort === 'highest') orderClause = 'ORDER BY r.rating DESC, r.created_at DESC';
  if (sort === 'lowest') orderClause = 'ORDER BY r.rating ASC, r.created_at DESC';

  const conditions = ['r.product_id = $1', "r.status = 'approved'"];
  const params: any[] = [productId];

  if (rating) {
    conditions.push(`r.rating = $${params.length + 1}`);
    params.push(rating);
  }

  const whereClause = conditions.join(' AND ');
  const countResult = await query(`SELECT COUNT(*) as total FROM reviews r WHERE ${whereClause}`, params);

  const result = await query(
    `SELECT r.*, u.first_name, u.last_name, u.avatar_url
     FROM reviews r LEFT JOIN users u ON r.user_id = u.id
     WHERE ${whereClause} ${orderClause}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page, limit,
      total: parseInt(countResult.rows[0]?.total || '0'),
      total_pages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limit),
    },
  });
});

/**
 * 创建评论 / Create review
 * @route POST /api/v1/reviews
 * @access Private
 */
export const createReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { product_id, order_id, rating, title, content, images } = req.body;

  const purchased = await queryOne(
    `SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = $1 AND oi.product_id = $2 AND o.order_status = 'completed'`,
    [userId, product_id]
  );

  const isVerified = !!purchased;

  const result = await query(
    `INSERT INTO reviews (product_id, user_id, order_id, rating, title, content, images, is_verified_purchase, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
    [product_id, userId, order_id || null, rating, title || null, content || null, images || [], isVerified]
  );

  await cacheService.delPattern(`reviews:product:${product_id}:*`);

  logger.info(`Review created for product ${product_id} by user ${userId}`);

  res.status(201).json({
    success: true,
    message: '评论已提交，等待审核 / Review submitted, pending approval',
    data: { review: result.rows[0] },
  });
});

/**
 * 评价评论是否有用 / Vote review as helpful
 * @route POST /api/v1/reviews/:id/helpful
 * @access Private
 */
export const voteHelpful = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { is_helpful } = req.body;

  const existing = await queryOne(
    'SELECT id FROM review_votes WHERE review_id = $1 AND user_id = $2',
    [id, userId]
  );

  if (existing) {
    await query('UPDATE review_votes SET is_helpful = $1 WHERE review_id = $2 AND user_id = $3',
      [is_helpful, id, userId]);
  } else {
    await query('INSERT INTO review_votes (review_id, user_id, is_helpful) VALUES ($1, $2, $3)',
      [id, userId, is_helpful]);
  }

  const helpfulCount = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM review_votes WHERE review_id = $1 AND is_helpful = TRUE',
    [id]
  );

  await query('UPDATE reviews SET helpful_count = $1 WHERE id = $2',
    [parseInt((helpfulCount as any)?.count || '0'), id]);

  res.json({ success: true, message: '投票成功 / Vote recorded' });
});

/**
 * 举报评论 / Report review
 * @route POST /api/v1/reviews/:id/report
 * @access Private
 */
export const reportReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const review = await queryOne('SELECT id FROM reviews WHERE id = $1', [id]);
  if (!review) {
    throw new AppError('评论不存在 / Review not found', 404, true, 'REVIEW_NOT_FOUND');
  }

  await query('UPDATE reviews SET report_count = report_count + 1 WHERE id = $1', [id]);

  res.json({ success: true, message: '举报已提交 / Report submitted' });
});

export { getProductReviews, createReview, voteHelpful, reportReview };
