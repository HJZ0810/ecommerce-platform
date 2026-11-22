/**
 * 商品控制器
 * Product Controller
 *
 * @description 处理商品 CRUD、搜索、库存、SKU 变体等 API
 *              Handles product CRUD, search, inventory, SKU variants
 * @module controllers/product
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  query, queryOne, transaction,
} from '@/config/database.js';
import {
  cacheService, CacheService,
} from '@/config/redis.js';
import { elasticsearchClient, indexProduct, deleteProductFromIndex } from '@/config/elasticsearch.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { validateRequest, paginationSchema, searchSchema, uuidParamSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * @typedef {Object} ProductQueryParams
 * @property {number} [page=1] - 页码
 * @property {number} [limit=24] - 每页数量
 * @property {string} [sort_by=created_at] - 排序字段
 * @property {string} [sort_order=desc] - 排序方向
 * @property {string} [q] - 搜索关键词
 * @property {string} [category_id] - 分类 ID
 * @property {string} [brand_id] - 品牌 ID
 * @property {number} [min_price] - 最低价格
 * @property {number} [max_price] - 最高价格
 * @property {number} [rating] - 最低评分
 * @property {boolean} [in_stock] - 仅显示有货
 * @property {boolean} [is_featured] - 仅显示推荐
 * @property {boolean} [is_new] - 仅显示新品
 * @property {string[]} [tags] - 标签筛选
 */

/**
 * 获取商品列表（支持搜索、筛选、分页）
 * Get product list with search, filter, and pagination
 *
 * @route GET /api/v1/products
 * @access Public
 */
export const getProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    q, category_id, brand_id, min_price, max_price, rating,
    in_stock, is_featured, is_new, is_on_sale, tags,
    page, limit, sort_by, sort_order,
  } = req.query as any;

  // 1. 提取分页参数 / Extract pagination params
  const pagination = validateRequest.extractPagination({ page: page || '1', limit: limit || '24' });
  const { page: pg, limit: pgLimit, offset } = pagination;

  // 2. 构建缓存键 / Build cache key
  const cacheKey = CacheService.buildKey([
    'products', 'list',
    q || '', category_id || '', brand_id || '',
    min_price || '', max_price || '', rating || '',
    in_stock || '', is_featured || '', is_new || '', is_on_sale || '',
    tags ? tags.join(',') : '', pg, pgLimit, sort_by || 'created_at', sort_order || 'desc',
  ]);

  // 3. 尝试从缓存获取 / Try to get from cache
  const cached = await cacheService.getCachedProducts(cacheKey);
  if (cached) {
    res.json({
      success: true,
      data: cached.data,
      pagination: cached.pagination,
    });
    return;
  }

  // 4. 构建查询条件 / Build query conditions
  const conditions: string[] = ['p.deleted_at IS NULL'];
  const params: any[] = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(`to_tsvector('simple', p.name || ' ' || COALESCE(p.short_description, '')) @@ plainto_tsquery('simple', $${paramIndex})`);
    params.push(q);
    paramIndex++;
  }

  if (category_id) {
    // 包含子分类 / Include child categories
    conditions.push(`p.category_id IN (
      SELECT id FROM categories WHERE id = $${paramIndex}
      UNION ALL SELECT id FROM categories WHERE parent_id = $${paramIndex}
    )`);
    params.push(category_id);
    paramIndex++;
  }

  if (brand_id) {
    conditions.push(`p.brand_id = $${paramIndex}`);
    params.push(brand_id);
    paramIndex++;
  }

  if (min_price !== undefined && min_price !== '') {
    conditions.push(`p.price >= $${paramIndex}`);
    params.push(parseFloat(min_price));
    paramIndex++;
  }

  if (max_price !== undefined && max_price !== '') {
    conditions.push(`p.price <= $${paramIndex}`);
    params.push(parseFloat(max_price));
    paramIndex++;
  }

  if (rating) {
    conditions.push(`p.rating_average >= $${paramIndex}`);
    params.push(parseInt(rating));
    paramIndex++;
  }

  if (in_stock === 'true') {
    conditions.push('p.available_stock > 0');
  }

  if (is_featured === 'true') {
    conditions.push('p.is_featured = TRUE');
  }

  if (is_new === 'true') {
    conditions.push('p.is_new = TRUE');
  }

  if (is_on_sale === 'true') {
    conditions.push('p.is_on_sale = TRUE AND p.discount_percentage > 0');
  }

  if (tags && tags.length > 0) {
    conditions.push(`p.tags && $${paramIndex}::text[]`);
    params.push(tags);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortClause = validateRequest.buildSortClause(sort_by || 'created_at', sort_order || 'desc');

  // 5. 查询总数 / Count total
  const countResult = await query(
    `SELECT COUNT(*) as total FROM products p ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.total || '0');

  // 6. 查询数据 / Query data
  const dataResult = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
            b.name AS brand_name, b.logo_url AS brand_logo,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS primary_image
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     ${whereClause}
     ${sortClause}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, pgLimit, offset]
  );

  const result = {
    data: dataResult.rows,
    pagination: {
      page: pg,
      limit: pgLimit,
      total,
      totalPages: Math.ceil(total / pgLimit),
    },
  };

  // 7. 缓存结果 / Cache the result
  await cacheService.cacheProducts(cacheKey, result, 300); // 5 minutes

  res.json({
    success: true,
    ...result,
  });
});

/**
 * 获取单个商品详情
 * Get single product detail
 *
 * @route GET /api/v1/products/:id
 * @access Public
 */
export const getProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // 1. 检查缓存 / Check cache
  const cacheKey = `product:${id}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    res.json({ success: true, data: cached });
    return;
  }

  // 2. 查询商品基本信息 / Query product basic info
  const product = await queryOne(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
            b.name AS brand_name, b.logo_url AS brand_logo,
            (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'approved') AS avg_rating,
            (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') AS review_count
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id]
  );

  if (!product) {
    throw new AppError('商品不存在 / Product not found', 404, true, 'PRODUCT_NOT_FOUND');
  }

  // 3. 查询商品图片 / Query product images
  const imagesResult = await query(
    'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, is_primary DESC',
    [id]
  );

  // 4. 查询 SKU 变体 / Query SKU variants
  const variantsResult = await query(
    'SELECT * FROM product_variants WHERE product_id = $1 AND is_active = TRUE ORDER BY sort_order',
    [id]
  );

  // 5. 查询相关商品 / Query related products (同分类)
  const relatedResult = await query(
    `SELECT p.id, p.name, p.slug, p.price, p.original_price,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
     FROM products p
     WHERE p.category_id = $1 AND p.id != $2 AND p.deleted_at IS NULL AND p.status = 'active'
     ORDER BY p.sold_count DESC
     LIMIT 8`,
    [(product as any).category_id, id]
  );

  const fullProduct = {
    ...product,
    images: imagesResult.rows,
    variants: variantsResult.rows,
    related_products: relatedResult.rows,
  };

  // 6. 增加浏览量 / Increment view count
  await query(
    'UPDATE products SET view_count = view_count + 1 WHERE id = $1',
    [id]
  );

  // 7. 缓存结果 / Cache result
  await cacheService.set(cacheKey, fullProduct, 600); // 10 minutes

  res.json({
    success: true,
    data: fullProduct,
  });
});

/**
 * 创建商品（管理员）
 * Create product (admin)
 *
 * @route POST /api/v1/admin/products
 * @access Private (Admin)
 */
export const createProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    sku, name, short_description, full_description,
    category_id, brand_id, price, original_price, cost_price,
    weight, dimensions, material, origin,
    status, is_featured, is_new, is_bestseller, is_on_sale,
    discount_percentage, min_order_quantity, max_order_quantity,
    total_stock, tags, attributes, meta_title, meta_description, meta_keywords,
  } = req.body;

  const createdBy = req.user!.id;

  // 1. 验证分类存在 / Verify category exists
  const category = await queryOne(
    'SELECT id FROM categories WHERE id = $1 AND is_active = TRUE',
    [category_id]
  );
  if (!category) {
    throw new AppError('分类不存在或未激活 / Category not found or inactive', 400, true, 'CATEGORY_NOT_FOUND');
  }

  // 2. 检查 SKU 唯一性 / Check SKU uniqueness
  const existingSku = await queryOne(
    'SELECT id FROM products WHERE sku = $1',
    [sku]
  );
  if (existingSku) {
    throw new AppError('SKU 已存在 / SKU already exists', 409, true, 'SKU_EXISTS');
  }

  // 3. 生成 URL slug / Generate URL slug
  const slug = `${name.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').substring(0, 200)}-${Date.now()}`;

  // 4. 创建商品 / Create product
  const result = await query(
    `INSERT INTO products (
      sku, name, slug, short_description, full_description,
      category_id, brand_id, price, original_price, cost_price,
      weight, dimensions, material, origin,
      status, is_featured, is_new, is_bestseller, is_on_sale,
      discount_percentage, min_order_quantity, max_order_quantity,
      total_stock, tags, attributes, meta_title, meta_description, meta_keywords,
      created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW(), NOW())
     RETURNING *`,
    [
      sku, name, slug, short_description, full_description,
      category_id, brand_id || null, price, original_price || null, cost_price || null,
      weight || null, dimensions ? JSON.stringify(dimensions) : null, material || null, origin || null,
      status || 'draft', is_featured || false, is_new || false, is_bestseller || false, is_on_sale || false,
      discount_percentage || 0, min_order_quantity || 1, max_order_quantity || null,
      total_stock || 0, tags || [], attributes ? JSON.stringify(attributes) : '{}',
      meta_title || null, meta_description || null, meta_keywords || null,
      createdBy,
    ]
  );

  const newProduct = result.rows[0];

  // 5. 如果商品激活，索引到 Elasticsearch / Index to ES if active
  if (newProduct.status === 'active') {
    try {
      await indexProduct({
        id: newProduct.id,
        sku: newProduct.sku,
        name: newProduct.name,
        short_description: newProduct.short_description,
        category_id: newProduct.category_id,
        category_name: (await queryOne('SELECT name FROM categories WHERE id = $1', [category_id]))?.name || '',
        brand_id: newProduct.brand_id,
        brand_name: (await queryOne('SELECT name FROM brands WHERE id = $1', [brand_id]))?.name || '',
        price: parseFloat(newProduct.price),
        original_price: newProduct.original_price ? parseFloat(newProduct.original_price) : null,
        discount_percentage: newProduct.discount_percentage,
        status: newProduct.status,
        is_featured: newProduct.is_featured,
        is_new: newProduct.is_new,
        is_bestseller: newProduct.is_bestseller,
        is_on_sale: newProduct.is_on_sale,
        rating_average: parseFloat(newProduct.rating_average),
        rating_count: newProduct.rating_count,
        sold_count: newProduct.sold_count,
        view_count: newProduct.view_count,
        available_stock: parseInt(newProduct.available_stock),
        tags: newProduct.tags,
        images: [],
        created_at: newProduct.created_at,
      });
    } catch (error) {
      logger.warn('Failed to index product in ES:', error);
    }
  }

  // 6. 使商品缓存失效 / Invalidate product cache
  await cacheService.invalidateProductCache();

  logger.info(`Product created: ${newProduct.id} by user ${createdBy}`);

  res.status(201).json({
    success: true,
    message: '商品创建成功 / Product created successfully',
    data: { product: newProduct },
  });
});

/**
 * 更新商品（管理员）
 * Update product (admin)
 *
 * @route PUT /api/v1/admin/products/:id
 * @access Private (Admin)
 */
export const updateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  // 1. 检查商品存在 / Check product exists
  const existing = await queryOne('SELECT * FROM products WHERE id = $1', [id]);
  if (!existing) {
    throw new AppError('商品不存在 / Product not found', 404, true, 'PRODUCT_NOT_FOUND');
  }

  // 2. 构建更新 SQL / Build update SQL
  const allowedFields = [
    'name', 'short_description', 'full_description', 'category_id', 'brand_id',
    'price', 'original_price', 'cost_price', 'weight', 'dimensions',
    'material', 'origin', 'status', 'is_featured', 'is_new',
    'is_bestseller', 'is_on_sale', 'discount_percentage',
    'min_order_quantity', 'max_order_quantity', 'total_stock',
    'tags', 'attributes', 'meta_title', 'meta_description', 'meta_keywords',
  ];

  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (field in updates) {
      const dbField = field === 'dimensions' || field === 'attributes'
        ? `${field} = $${idx}::jsonb`
        : `${field} = $${idx}`;
      setClauses.push(dbField);
      values.push(field === 'dimensions' || field === 'attributes'
        ? JSON.stringify(updates[field])
        : updates[field]);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('没有提供更新字段 / No fields to update', 400, true, 'NO_UPDATE_FIELDS');
  }

  setClauses.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
  values.push(req.user!.id, id);

  const result = await query(
    `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  const updatedProduct = result.rows[0];

  // 3. 更新 Elasticsearch 索引 / Update ES index
  try {
    if (updatedProduct.status === 'active') {
      await indexProduct({
        id: updatedProduct.id,
        sku: updatedProduct.sku,
        name: updatedProduct.name,
        short_description: updatedProduct.short_description,
        category_id: updatedProduct.category_id,
        category_name: (await queryOne('SELECT name FROM categories WHERE id = $1', [updatedProduct.category_id]))?.name || '',
        brand_id: updatedProduct.brand_id,
        brand_name: updatedProduct.brand_id ? (await queryOne('SELECT name FROM brands WHERE id = $1', [updatedProduct.brand_id]))?.name : '',
        price: parseFloat(updatedProduct.price),
        original_price: updatedProduct.original_price ? parseFloat(updatedProduct.original_price) : null,
        discount_percentage: updatedProduct.discount_percentage,
        status: updatedProduct.status,
        is_featured: updatedProduct.is_featured,
        is_new: updatedProduct.is_new,
        is_bestseller: updatedProduct.is_bestseller,
        is_on_sale: updatedProduct.is_on_sale,
        rating_average: parseFloat(updatedProduct.rating_average),
        rating_count: updatedProduct.rating_count,
        sold_count: updatedProduct.sold_count,
        view_count: updatedProduct.view_count,
        available_stock: parseInt(updatedProduct.available_stock),
        tags: updatedProduct.tags,
        images: [],
        created_at: updatedProduct.created_at,
      });
    } else {
      await deleteProductFromIndex(updatedProduct.id);
    }
  } catch (error) {
    logger.warn('Failed to update ES index:', error);
  }

  // 4. 使缓存失效 / Invalidate cache
  await cacheService.invalidateProductCache();
  await cacheService.del(`product:${id}`);

  logger.info(`Product updated: ${id} by user ${req.user!.id}`);

  res.json({
    success: true,
    message: '商品更新成功 / Product updated successfully',
    data: { product: updatedProduct },
  });
});

/**
 * 删除商品（软删除）（管理员）
 * Delete product - soft delete (admin)
 *
 * @route DELETE /api/v1/admin/products/:id
 * @access Private (Admin)
 */
export const deleteProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // 1. 检查商品存在 / Check product exists
  const existing = await queryOne(
    'SELECT id, status FROM products WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!existing) {
    throw new AppError('商品不存在 / Product not found', 404, true, 'PRODUCT_NOT_FOUND');
  }

  // 2. 软删除 / Soft delete
  await query('UPDATE products SET deleted_at = NOW(), status = $1 WHERE id = $2', ['discontinued', id]);

  // 3. 从 ES 移除 / Remove from ES
  try {
    await deleteProductFromIndex(id);
  } catch (error) {
    logger.warn('Failed to remove product from ES:', error);
  }

  // 4. 使缓存失效 / Invalidate cache
  await cacheService.invalidateProductCache();
  await cacheService.del(`product:${id}`);

  logger.info(`Product deleted: ${id} by user ${req.user!.id}`);

  res.json({
    success: true,
    message: '商品删除成功 / Product deleted successfully',
  });
});

/**
 * 上传商品图片
 * Upload product images
 *
 * @route POST /api/v1/admin/products/:id/images
 * @access Private (Admin)
 */
export const uploadProductImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const files = (req as any).files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new AppError('未上传文件 / No files uploaded', 400, true, 'NO_FILES');
  }

  // 1. 验证商品存在 / Verify product exists
  const product = await queryOne('SELECT id FROM products WHERE id = $1', [id]);
  if (!product) {
    throw new AppError('商品不存在 / Product not found', 404, true, 'PRODUCT_NOT_FOUND');
  }

  // 2. 获取当前最大排序号 / Get current max sort order
  const maxSortResult = await queryOne<{ max_sort: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM product_images WHERE product_id = $1',
    [id]
  );

  // 3. 批量插入图片记录 / Batch insert image records
  const imageRecords = files.map((file, index) => ({
    product_id: id,
    url: `/uploads/products/${file.filename}`,
    alt_text: file.originalname,
    sort_order: (maxSortResult as any)?.max_sort + index + 1,
    is_primary: index === 0,
    width: null,
    height: null,
    file_size: file.size,
  }));

  const values = imageRecords.map((img, i) => {
    const base = i * 7;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  }).join(', ');

  const params = imageRecords.flatMap(img => [
    img.product_id, img.url, img.alt_text, img.sort_order,
    img.is_primary, img.width, img.height,
  ]);

  await query(
    `INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary, width, height, file_size)
     VALUES ${values}`,
    [...params, ...imageRecords.map(img => img.file_size)]
  );

  // 4. 使缓存失效 / Invalidate cache
  await cacheService.del(`product:${id}`);

  res.status(201).json({
    success: true,
    message: '图片上传成功 / Images uploaded successfully',
  });
});

/**
 * 获取热门商品
 * Get featured products
 *
 * @route GET /api/v1/products/featured
 * @access Public
 */
export const getFeaturedProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 12;

  const cacheKey = `products:featured:${limit}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    res.json({ success: true, data: cached });
    return;
  }

  const result = await query(
    `SELECT p.id, p.name, p.slug, p.price, p.original_price, p.discount_percentage,
            p.rating_average, p.rating_count, p.sold_count,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image,
            c.name AS category_name, b.name AS brand_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     WHERE p.is_featured = TRUE AND p.status = 'active' AND p.deleted_at IS NULL AND p.available_stock > 0
     ORDER BY p.sold_count DESC
     LIMIT $1`,
    [limit]
  );

  await cacheService.set(cacheKey, result.rows, 600);
  res.json({ success: true, data: result.rows });
});

/**
 * 获取新品
 * Get new products
 *
 * @route GET /api/v1/products/new
 * @access Public
 */
export const getNewProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 12;

  const cacheKey = `products:new:${limit}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    res.json({ success: true, data: cached });
    return;
  }

  const result = await query(
    `SELECT p.id, p.name, p.slug, p.price, p.original_price, p.discount_percentage,
            p.rating_average, p.rating_count,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
     FROM products p
     WHERE p.is_new = TRUE AND p.status = 'active' AND p.deleted_at IS NULL AND p.available_stock > 0
     ORDER BY p.created_at DESC
     LIMIT $1`,
    [limit]
  );

  await cacheService.set(cacheKey, result.rows, 600);
  res.json({ success: true, data: result.rows });
});

/**
 * 获取热销商品
 * Get bestseller products
 *
 * @route GET /api/v1/products/bestsellers
 * @access Public
 */
export const getBestsellerProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 12;
  const categoryId = req.query.category_id as string | undefined;

  const cacheKey = `products:bestsellers:${categoryId || 'all'}:${limit}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    res.json({ success: true, data: cached });
    return;
  }

  let queryText = `
    SELECT p.id, p.name, p.slug, p.price, p.original_price, p.discount_percentage,
           p.rating_average, p.rating_count, p.sold_count,
           (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image
    FROM products p
    WHERE p.is_bestseller = TRUE AND p.status = 'active' AND p.deleted_at IS NULL AND p.available_stock > 0
  `;
  const params: any[] = [];

  if (categoryId) {
    queryText += ' AND p.category_id = $1';
    params.push(categoryId);
  }

  queryText += ' ORDER BY p.sold_count DESC LIMIT $' + (params.length + 1);
  params.push(limit);

  const result = await query(queryText, params);
  await cacheService.set(cacheKey, result.rows, 600);
  res.json({ success: true, data: result.rows });
});
