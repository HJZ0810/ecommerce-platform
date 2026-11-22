/**
 * 优惠券控制器 / Coupon Controller
 * @description 处理优惠券的验证、查询、创建、更新、删除 API
 * @module controllers/coupon
 */

import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '@/config/database.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate } from '@/middleware/auth.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * 验证优惠券 / Validate coupon
 * @route POST /api/v1/coupons/validate
 * @access Private
 */
export const validateCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { code, order_amount, product_ids } = req.body;
  const userId = req.user!.id;

  const coupon = await queryOne(
    `SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE
     AND valid_from <= NOW() AND valid_until >= NOW()`,
    [code.toUpperCase()]
  );

  if (!coupon) {
    throw new AppError('优惠券不存在或已过期 / Coupon not found or expired', 400, true, 'COUPON_INVALID');
  }

  if (parseInt((coupon as any).used_quantity) >= parseInt((coupon as any).total_quantity)) {
    throw new AppError('优惠券已使用完毕 / Coupon fully used', 400, true, 'COUPON_EXHAUSTED');
  }

  if (order_amount < parseFloat((coupon as any).min_order_amount || '0')) {
    throw new AppError(
      `订单金额需满 ${(coupon as any).min_order_amount} 元 / Minimum order amount is ${(coupon as any).min_order_amount}`,
      400, true, 'COUPON_MIN_NOT_MET'
    );
  }

  const userUsage = await queryOne(
    'SELECT COUNT(*) as count FROM coupon_usages WHERE coupon_id = $1 AND user_id = $2',
    [(coupon as any).id, userId]
  );

  if (parseInt((userUsage as any)?.count || '0') >= parseInt((coupon as any).usage_limit_per_user)) {
    throw new AppError('您已使用过该优惠券 / Coupon already used by you', 400, true, 'COUPON_USED');
  }

  let discountAmount = 0;
  if ((coupon as any).coupon_type === 'percentage') {
    discountAmount = Math.round(order_amount * (parseFloat((coupon as any).value) / 100) * 100) / 100;
  } else if ((coupon as any).coupon_type === 'fixed_amount') {
    discountAmount = Math.min(parseFloat((coupon as any).value), order_amount);
  }

  res.json({
    success: true,
    data: {
      coupon: {
        id: (coupon as any).id,
        code: (coupon as any).code,
        name: (coupon as any).name,
        coupon_type: (coupon as any).coupon_type,
        value: parseFloat((coupon as any).value),
        discount_amount: discountAmount,
      },
    },
  });
});

/**
 * 获取可用优惠券列表 / Get available coupons
 */
export const getAvailableCoupons = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const result = await query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = c.id AND user_id = $1) as user_usage_count
     FROM coupons c
     WHERE c.is_active = TRUE
       AND c.valid_from <= NOW()
       AND c.valid_until >= NOW()
       AND c.used_quantity < c.total_quantity
       AND (SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = c.id AND user_id = $1) < c.usage_limit_per_user
     ORDER BY c.valid_until ASC`,
    [userId]
  );

  res.json({ success: true, data: result.rows });
});

/**
 * 获取我的优惠券 / Get my coupons
 */
export const getMyCoupons = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const result = await query(
    `SELECT c.*, cu.created_at as used_at, cu.discount_amount as used_discount
     FROM coupon_usages cu
     JOIN coupons c ON cu.coupon_id = c.id
     WHERE cu.user_id = $1
     ORDER BY cu.created_at DESC`,
    [userId]
  );

  res.json({ success: true, data: result.rows });
});

/**
 * 获取优惠券详情 / Get coupon detail
 */
export const getCouponDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;

  const coupon = await queryOne(
    `SELECT id, code, name, description, coupon_type, value, min_order_amount,
            total_quantity, used_quantity, valid_from, valid_until
     FROM coupons WHERE code = $1 AND is_active = TRUE`,
    [code.toUpperCase()]
  );

  if (!coupon) {
    throw new AppError('优惠券不存在 / Coupon not found', 404, true, 'COUPON_NOT_FOUND');
  }

  res.json({ success: true, data: coupon });
});

/**
 * 获取所有优惠券（管理员）/ Get all coupons (admin)
 */
export const getCoupons = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page, limit, offset } = validateRequest.extractPagination(req.query as any);

  const countResult = await query('SELECT COUNT(*) as total FROM coupons');
  const result = await query(
    'SELECT * FROM coupons ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
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
 * 创建优惠券（管理员）/ Create coupon (admin)
 */
export const createCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { code, name, description, coupon_type, value, min_order_amount, max_discount_amount,
          applicable_categories, applicable_products, excluded_products, total_quantity,
          usage_limit_per_user, is_stackable, is_active, valid_from, valid_until } = req.body;

  const result = await query(
    `INSERT INTO coupons (code, name, description, coupon_type, value, min_order_amount, max_discount_amount,
     applicable_categories, applicable_products, excluded_products, total_quantity, usage_limit_per_user,
     is_stackable, is_active, valid_from, valid_until, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()) RETURNING *`,
    [
      code.toUpperCase(), name, description || null, coupon_type, value,
      min_order_amount || 0, max_discount_amount || null,
      applicable_categories || null, applicable_products || null, excluded_products || null,
      total_quantity, usage_limit_per_user || 1, is_stackable || false,
      is_active !== false, valid_from || new Date(), valid_until, req.user!.id,
    ]
  );

  logger.info(`Coupon created: ${result.rows[0].code} by user ${req.user!.id}`);

  res.status(201).json({
    success: true,
    message: '优惠券创建成功 / Coupon created successfully',
    data: { coupon: result.rows[0] },
  });
});

/**
 * 更新优惠券（管理员）/ Update coupon (admin)
 */
export const updateCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  const existing = await queryOne('SELECT id FROM coupons WHERE id = $1', [id]);
  if (!existing) {
    throw new AppError('优惠券不存在 / Coupon not found', 404, true, 'COUPON_NOT_FOUND');
  }

  const allowedFields = ['code', 'name', 'description', 'value', 'min_order_amount', 'max_discount_amount', 'is_active', 'valid_until', 'used_quantity'];
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (field in updates) {
      setClauses.push(`${field} = $${idx}`);
      values.push(field === 'code' ? updates[field].toUpperCase() : updates[field]);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('没有要更新的字段 / No fields to update', 400, true, 'NO_UPDATE_FIELDS');
  }

  setClauses.push('updated_at = NOW()');
  values.push(id);

  const result = await query(
    `UPDATE coupons SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  res.json({
    success: true,
    message: '优惠券更新成功 / Coupon updated successfully',
    data: { coupon: result.rows[0] },
  });
});

/**
 * 删除优惠券（管理员）/ Delete coupon (admin)
 */
export const deleteCoupon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await query(
    'UPDATE coupons SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('优惠券不存在 / Coupon not found', 404, true, 'COUPON_NOT_FOUND');
  }

  res.json({ success: true, message: '优惠券已删除 / Coupon deleted successfully' });
});

export { validateCoupon, getAvailableCoupons, getMyCoupons, getCouponDetail, getCoupons, createCoupon, updateCoupon, deleteCoupon };
