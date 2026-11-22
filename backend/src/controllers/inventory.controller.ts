/**
 * 库存控制器 / Inventory Controller
 * @description 处理库存管理、库存查询、库存调整等 API
 * @module controllers/inventory
 */

import { Request, Response, NextFunction } from 'express';
import { query, queryOne, transaction } from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * 获取库存列表 / Get inventory list
 * @route GET /api/v1/admin/inventory
 * @access Private (Admin)
 */
export const getInventory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page, limit, offset } = validateRequest.extractPagination(req.query as any);
  const { product_id, low_stock } = req.query as any;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (product_id) {
    whereClause += ` AND i.product_id = $${params.length + 1}`;
    params.push(product_id);
  }

  if (low_stock === 'true') {
    whereClause += ` AND (i.quantity - i.reserved_quantity) <= i.min_stock_level`;
  }

  const countResult = await query(`SELECT COUNT(*) as total FROM inventory i ${whereClause}`, params);

  const result = await query(
    `SELECT i.*, p.name as product_name, p.sku, p.price,
            (SELECT url FROM product_images WHERE product_id = i.product_id AND is_primary = TRUE LIMIT 1) AS product_image
     FROM inventory i
     LEFT JOIN products p ON i.product_id = p.id
     ${whereClause}
     ORDER BY i.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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
 * 获取低库存商品 / Get low stock products
 * @route GET /api/v1/admin/inventory/low-stock
 * @access Private (Admin)
 */
export const getLowStock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT i.*, p.name as product_name, p.sku, p.price,
            (SELECT url FROM product_images WHERE product_id = i.product_id AND is_primary = TRUE LIMIT 1) AS product_image
     FROM inventory i
     LEFT JOIN products p ON i.product_id = p.id
     WHERE (i.quantity - i.reserved_quantity) <= i.min_stock_level
     ORDER BY (i.quantity - i.reserved_quantity) ASC`
  );

  res.json({ success: true, data: result.rows });
});

/**
 * 调整库存 / Adjust inventory
 * @route POST /api/v1/admin/inventory/adjust
 * @access Private (Admin)
 */
export const adjustInventory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { product_id, variant_id, warehouse_id, quantity_change, note, transaction_type } = req.body;

  if (!warehouse_id) {
    throw new AppError('仓库 ID 为必填 / Warehouse ID is required', 400, true, 'WAREHOUSE_ID_REQUIRED');
  }

  await transaction(async () => {
    // 获取或创建库存记录 / Get or create inventory record
    let inventory = await queryOne(
      'SELECT * FROM inventory WHERE product_id = $1 AND (variant_id = $2 OR (variant_id IS NULL AND $2 IS NULL)) AND warehouse_id = $3',
      [product_id, variant_id, warehouse_id]
    );

    if (!inventory) {
      const result = await query(
        'INSERT INTO inventory (product_id, variant_id, warehouse_id, quantity) VALUES ($1, $2, $3, 0) RETURNING *',
        [product_id, variant_id, warehouse_id]
      );
      inventory = result.rows[0];
    }

    const oldQuantity = parseInt((inventory as any).quantity);
    const newQuantity = oldQuantity + quantity_change;

    if (newQuantity < 0) {
      throw new AppError('库存不足 / Insufficient stock', 400, true, 'INSUFFICIENT_STOCK');
    }

    // 更新库存 / Update inventory
    await query(
      'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [newQuantity, (inventory as any).id]
    );

    // 记录库存变动 / Record inventory transaction
    await query(
      `INSERT INTO inventory_transactions (inventory_id, product_id, variant_id, transaction_type,
       quantity_change, balance_after, reference_type, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        (inventory as any).id, product_id, variant_id,
        transaction_type || 'adjustment', quantity_change, newQuantity,
        'manual_adjustment', note || 'Manual inventory adjustment', req.user!.id,
      ]
    );

    // 同步更新商品总库存 / Sync product total stock
    if (!variant_id) {
      await query('UPDATE products SET total_stock = total_stock + $1 WHERE id = $2', [quantity_change, product_id]);
    }
  });

  await cacheService.delPattern('inventory:*');

  logger.info(`Inventory adjusted: product=${req.body.product_id}, change=${req.body.quantity_change} by user ${req.user!.id}`);

  res.json({
    success: true,
    message: '库存调整成功 / Inventory adjusted successfully',
  });
});

/**
 * 获取库存变动记录 / Get inventory transaction history
 * @route GET /api/v1/admin/inventory/transactions
 * @access Private (Admin)
 */
export const getInventoryTransactions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page, limit, offset } = validateRequest.extractPagination(req.query as any);
  const { product_id, transaction_type } = req.query as any;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (product_id) {
    whereClause += ` AND it.product_id = $${params.length + 1}`;
    params.push(product_id);
  }
  if (transaction_type) {
    whereClause += ` AND it.transaction_type = $${params.length + 1}`;
    params.push(transaction_type);
  }

  const countResult = await query(`SELECT COUNT(*) as total FROM inventory_transactions it ${whereClause}`, params);

  const result = await query(
    `SELECT it.*, p.name as product_name, p.sku
     FROM inventory_transactions it
     LEFT JOIN products p ON it.product_id = p.id
     ${whereClause}
     ORDER BY it.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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

export { getInventory, getLowStock, adjustInventory, getInventoryTransactions };
