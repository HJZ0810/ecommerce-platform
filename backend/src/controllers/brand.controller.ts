/**
 * 品牌控制器 / Brand Controller
 * @description 处理品牌的增删改查 API 接口
 *              Handles brand CRUD API endpoints
 * @module controllers/brand
 */

import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * 获取品牌列表 / Get brand list
 * @route GET /api/v1/brands
 * @access Public
 */
export const getBrands = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page, limit, offset } = validateRequest.extractPagination(req.query as any);

  const cacheKey = `brands:list:${page}:${limit}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    res.json({ success: true, ...cached });
    return;
  }

  const countResult = await query('SELECT COUNT(*) as total FROM brands WHERE is_active = TRUE');
  const result = await query(
    'SELECT id, name, name_en, slug, logo_url, description, is_verified FROM brands WHERE is_active = TRUE ORDER BY sort_order, name LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  const response = {
    data: result.rows,
    pagination: {
      page, limit,
      total: parseInt(countResult.rows[0]?.total || '0'),
      total_pages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limit),
    },
  };

  await cacheService.set(cacheKey, response, 3600);
  res.json({ success: true, ...response });
});

/**
 * 获取品牌详情 / Get brand detail
 * @route GET /api/v1/brands/:slug
 * @access Public
 */
export const getBrand = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  const brand = await queryOne(
    'SELECT * FROM brands WHERE slug = $1 AND is_active = TRUE',
    [slug]
  );

  if (!brand) {
    throw new AppError('品牌不存在 / Brand not found', 404, true, 'BRAND_NOT_FOUND');
  }

  const productCount = await query(
    'SELECT COUNT(*) as count FROM products WHERE brand_id = $1 AND deleted_at IS NULL AND status = $2',
    [(brand as any).id, 'active']
  );

  res.json({
    success: true,
    data: { ...brand, product_count: parseInt((productCount.rows[0] as any)?.count || '0') },
  });
});

/**
 * 创建品牌（管理员）/ Create brand (admin)
 * @route POST /api/v1/admin/brands
 * @access Private (Admin)
 */
export const createBrand = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, name_en, description, website_url, logo_url, is_verified } = req.body;

  const slug = name.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').substring(0, 200);

  const result = await query(
    `INSERT INTO brands (name, name_en, slug, description, website_url, logo_url, is_verified, is_active, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 0, NOW(), NOW()) RETURNING *`,
    [name, name_en || null, slug, description || null, website_url || null, logo_url || null, is_verified || false]
  );

  await cacheService.delPattern('brands:*');

  logger.info(`Brand created: ${result.rows[0].id} by user ${req.user!.id}`);

  res.status(201).json({
    success: true,
    message: '品牌创建成功 / Brand created successfully',
    data: { brand: result.rows[0] },
  });
});

/**
 * 更新品牌（管理员）/ Update brand (admin)
 * @route PUT /api/v1/admin/brands/:id
 * @access Private (Admin)
 */
export const updateBrand = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  const existing = await queryOne('SELECT id FROM brands WHERE id = $1', [id]);
  if (!existing) {
    throw new AppError('品牌不存在 / Brand not found', 404, true, 'BRAND_NOT_FOUND');
  }

  const allowedFields = ['name', 'name_en', 'description', 'website_url', 'logo_url', 'banner_url', 'is_verified', 'is_active', 'sort_order'];
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (field in updates) {
      setClauses.push(`${field} = $${idx}`);
      values.push(updates[field]);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('没有要更新的字段 / No fields to update', 400, true, 'NO_UPDATE_FIELDS');
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE brands SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  await cacheService.delPattern('brands:*');

  res.json({
    success: true,
    message: '品牌更新成功 / Brand updated successfully',
    data: { brand: result.rows[0] },
  });
});

/**
 * 删除品牌（管理员）/ Delete brand (admin)
 * @route DELETE /api/v1/admin/brands/:id
 * @access Private (Admin)
 */
export const deleteBrand = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await query(
    'UPDATE brands SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('品牌不存在 / Brand not found', 404, true, 'BRAND_NOT_FOUND');
  }

  await cacheService.delPattern('brands:*');

  res.json({
    success: true,
    message: '品牌已删除 / Brand deleted successfully',
  });
});

export { getBrands, getBrand, createBrand, updateBrand, deleteBrand };
