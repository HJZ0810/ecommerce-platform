/**
 * 分类控制器 / Category Controller
 * @description 处理商品分类的增删改查 API 接口
 * @module controllers/category
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { validateRequest, uuidParamSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * 获取分类树 / Get category tree
 * @route GET /api/v1/categories
 * @access Public
 */
export const getCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cacheKey = 'categories:tree';
  const cached = await cacheService.get(cachedKey);
  if (cached) {
    res.json({ success: true, data: cached });
    return;
  }

  const rootResult = await query('SELECT * FROM categories WHERE parent_id IS NULL AND is_active = TRUE ORDER BY sort_order');
  const allResult = await query('SELECT * FROM categories WHERE parent_id IS NOT NULL AND is_active = TRUE ORDER BY sort_order');

  const childrenMap = new Map<string, any[]>();
  allResult.rows.forEach((cat: any) => {
    const parentId = cat.parent_id;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push({
      id: cat.id, name: cat.name, name_en: cat.name_en, slug: cat.slug,
      description: cat.description, image_url: cat.image_url, icon_url: cat.icon_url, children: [],
    });
  });

  const tree = rootResult.rows.map((cat: any) => ({
    id: cat.id, name: cat.name, name_en: cat.name_en, slug: cat.slug,
    description: cat.description, image_url: cat.image_url, icon_url: cat.icon_url,
    children: childrenMap.get(cat.id) || [],
  }));

  await cacheService.cacheCategories(tree, 3600);
  res.json({ success: true, data: tree });
});

/**
 * 获取单个分类 / Get single category
 * @route GET /api/v1/categories/:slug
 * @access Public
 */
export const getCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  const category = await queryOne('SELECT * FROM categories WHERE slug = $1 AND is_active = TRUE', [slug]);
  if (!category) {
    throw new AppError('分类不存在 / Category not found', 404, true, 'CATEGORY_NOT_FOUND');
  }

  // 获取子分类 / Get child categories
  const children = await query('SELECT * FROM categories WHERE parent_id = $1 AND is_active = TRUE ORDER BY sort_order', [(category as any).id]);

  res.json({
    success: true,
    data: { ...category, children: children.rows },
  });
});

/**
 * 创建分类（管理员）/ Create category (admin)
 * @route POST /api/v1/admin/categories
 * @access Private (Admin)
 */
export const createCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, name_en, parent_id, description, image_url, icon_url, sort_order, meta_title, meta_description } = req.body;

  const slug = name.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').substring(0, 200);

  const result = await query(
    `INSERT INTO categories (name, name_en, parent_id, slug, description, image_url, icon_url, sort_order, meta_title, meta_description, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW(), NOW()) RETURNING *`,
    [name, name_en || null, parent_id || null, slug, description || null, image_url || null, icon_url || null, sort_order || 0, meta_title || null, meta_description || null]
  );

  await cacheService.del('categories:tree');

  logger.info(`Category created: ${result.rows[0].id} by user ${req.user!.id}`);

  res.status(201).json({
    success: true,
    message: '分类创建成功 / Category created successfully',
    data: { category: result.rows[0] },
  });
});

/**
 * 更新分类（管理员）/ Update category (admin)
 * @route PUT /api/v1/admin/categories/:id
 * @access Private (Admin)
 */
export const updateCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  const existing = await queryOne('SELECT id FROM categories WHERE id = $1', [id]);
  if (!existing) {
    throw new AppError('分类不存在 / Category not found', 404, true, 'CATEGORY_NOT_FOUND');
  }

  const allowedFields = ['name', 'name_en', 'parent_id', 'description', 'image_url', 'icon_url', 'sort_order', 'is_active', 'meta_title', 'meta_description'];
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

  setClauses.push('updated_at = NOW()');
  values.push(id);

  const result = await query(
    `UPDATE categories SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  await cacheService.del('categories:tree');

  res.json({
    success: true,
    message: '分类更新成功 / Category updated successfully',
    data: { category: result.rows[0] },
  });
});

/**
 * 删除分类（管理员）/ Delete category (admin)
 * @route DELETE /api/v1/admin/categories/:id
 * @access Private (Admin)
 */
export const deleteCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // 检查是否有子分类 / Check for child categories
  const children = await queryOne('SELECT COUNT(*) as count FROM categories WHERE parent_id = $1', [id]);
  if (parseInt((children as any)?.count || '0') > 0) {
    throw new AppError('该分类下还有子分类，无法删除 / Cannot delete category with children', 400, true, 'CATEGORY_HAS_CHILDREN');
  }

  // 检查是否有商品关联 / Check for associated products
  const products = await queryOne('SELECT COUNT(*) as count FROM products WHERE category_id = $1', [id]);
  if (parseInt((products as any)?.count || '0') > 0) {
    throw new AppError('该分类下有商品，无法删除 / Cannot delete category with products', 400, true, 'CATEGORY_HAS_PRODUCTS');
  }

  const result = await query('UPDATE categories SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id', [id]);

  if (result.rows.length === 0) {
    throw new AppError('分类不存在 / Category not found', 404, true, 'CATEGORY_NOT_FOUND');
  }

  await cacheService.del('categories:tree');

  res.json({
    success: true,
    message: '分类已删除 / Category deleted successfully',
  });
});

export { getCategories, getCategory, createCategory, updateCategory, deleteCategory };
