/**
 * 用户控制器
 * User Controller
 *
 * @description 处理用户个人资料、地址管理、收藏等 API
 *              Handles user profile, addresses, wishlist APIs
 * @module controllers/user
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, transaction } from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, selfOrAdmin } from '@/middleware/auth.js';
import { validateRequest, uuidParamSchema, paginationSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * 获取当前用户个人资料
 * Get current user profile
 *
 * @route GET /api/v1/users/me
 * @access Private
 */
export const getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const user = await queryOne(
    `SELECT id, email, phone, first_name, last_name, display_name, avatar_url,
            gender, birthday, role, status, email_verified, phone_verified,
            loyalty_points, referral_code, last_login_at, created_at
     FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  if (!user) {
    throw new AppError('用户不存在 / User not found', 404, true, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: { user },
  });
});

/**
 * 更新个人资料
 * Update profile
 *
 * @route PUT /api/v1/users/me
 * @access Private
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { first_name, last_name, display_name, gender, birthday, avatar_url } = req.body;

  const allowedFields = ['first_name', 'last_name', 'display_name', 'gender', 'birthday', 'avatar_url'];
  const setClauses: string[] = [];
  const values: any[] = [];

  allowedFields.forEach((field, index) => {
    if (field in req.body) {
      setClauses.push(`${field} = $${index + 1}`);
      values.push(req.body[field]);
    }
  });

  if (setClauses.length === 0) {
    throw new AppError('没有要更新的字段 / No fields to update', 400, true, 'NO_UPDATE_FIELDS');
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING id, email, first_name, last_name, display_name, avatar_url, gender, birthday`,
    values
  );

  res.json({
    success: true,
    message: '个人资料更新成功 / Profile updated',
    data: { user: result.rows[0] },
  });
});

/**
 * 获取用户地址列表
 * Get user addresses
 *
 * @route GET /api/v1/users/me/addresses
 * @access Private
 */
export const getAddresses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const result = await query(
    'SELECT * FROM addresses WHERE user_id = $1 AND is_deleted = FALSE ORDER BY is_default DESC, created_at DESC',
    [userId]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * 创建地址
 * Create address
 *
 * @route POST /api/v1/users/me/addresses
 * @access Private
 */
export const createAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { label, recipient_name, recipient_phone, country, province, city, district, street_address, postal_code, is_default } = req.body;

  await transaction(async () => {
    // 如果设置为默认地址，先取消其他默认
    if (is_default) {
      await query(
        'UPDATE addresses SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
    }

    const result = await query(
      `INSERT INTO addresses (user_id, label, recipient_name, recipient_phone, country, province, city, district, street_address, postal_code, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, label || 'home', recipient_name, recipient_phone, country || '中国', province, city, district, street_address, postal_code || null, is_default || false]
    );
  });

  await cacheService.delPattern(`user:${userId}:addresses:*`);

  res.status(201).json({
    success: true,
    message: '地址添加成功 / Address added',
  });
});

/**
 * 更新地址
 * Update address
 *
 * @route PUT /api/v1/users/me/addresses/:id
 * @access Private
 */
export const updateAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { label, recipient_name, recipient_phone, province, city, district, street_address, postal_code, is_default } = req.body;

  const existing = await queryOne(
    'SELECT id FROM addresses WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE',
    [id, userId]
  );

  if (!existing) {
    throw new AppError('地址不存在 / Address not found', 404, true, 'ADDRESS_NOT_FOUND');
  }

  await transaction(async () => {
    if (is_default) {
      await query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    }

    await query(
      `UPDATE addresses SET label = $1, recipient_name = $2, recipient_phone = $3,
       province = $4, city = $5, district = $6, street_address = $7, postal_code = $8, is_default = $9, updated_at = NOW()
       WHERE id = $10`,
      [label, recipient_name, recipient_phone, province, city, district, street_address, postal_code, is_default, id]
    );
  });

  await cacheService.delPattern(`user:${userId}:addresses:*`);

  res.json({
    success: true,
    message: '地址更新成功 / Address updated',
  });
});

/**
 * 删除地址
 * Delete address
 *
 * @route DELETE /api/v1/users/me/addresses/:id
 * @access Private
 */
export const deleteAddress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { id } = req.params;

  const result = await query(
    'UPDATE addresses SET is_deleted = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('地址不存在 / Address not found', 404, true, 'ADDRESS_NOT_FOUND');
  }

  res.json({
    success: true,
    message: '地址删除成功 / Address deleted',
  });
});

/**
 * 获取收藏列表
 * Get wishlist
 *
 * @route GET /api/v1/wishlist
 * @access Private
 */
export const getWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const result = await query(
    `SELECT p.id, p.name, p.slug, p.price, p.original_price, p.discount_percentage,
            p.available_stock, p.rating_average, p.rating_count,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image,
            w.created_at AS added_at
     FROM wishlists w
     JOIN products p ON w.product_id = p.id
     WHERE w.user_id = $1 AND p.deleted_at IS NULL
     ORDER BY w.created_at DESC`,
    [userId]
  );

  res.json({
    success: true,
    data: result.rows,
  });
});

/**
 * 添加收藏
 * Add to wishlist
 *
 * @route POST /api/v1/wishlist
 * @access Private
 */
export const addToWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { product_id } = req.body;

  const existing = await queryOne(
    'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
    [userId, product_id]
  );

  if (existing) {
    res.json({
      success: true,
      message: '已在收藏中 / Already in wishlist',
    });
    return;
  }

  await query(
    'INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)',
    [userId, product_id]
  );

  res.status(201).json({
    success: true,
    message: '已添加到收藏 / Added to wishlist',
  });
});

/**
 * 移除收藏
 * Remove from wishlist
 *
 * @route DELETE /api/v1/wishlist/:productId
 * @access Private
 */
export const removeFromWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { productId } = req.params;

  await query(
    'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );

  res.json({
    success: true,
    message: '已从收藏移除 / Removed from wishlist',
  });
});

export { getMe, updateProfile, getAddresses, createAddress, updateAddress, deleteAddress, getWishlist, addToWishlist, removeFromWishlist, getRecentlyViewed };

// ============================================================
// 浏览历史 / Recently Viewed
// ============================================================

/**
 * 获取浏览历史 / Get recently viewed
 */
export const getRecentlyViewed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await query(
    `SELECT p.id, p.name, p.slug, p.price, p.original_price,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image,
            rv.viewed_at
     FROM recently_viewed rv
     JOIN products p ON rv.product_id = p.id
     WHERE rv.user_id = $1 AND p.deleted_at IS NULL
     ORDER BY rv.viewed_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  res.json({ success: true, data: result.rows });
});
