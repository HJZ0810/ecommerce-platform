/**
 * 库存路由 / Inventory Routes
 * @description 定义库存管理的所有 API 端点
 * @module routes/inventoryRoutes
 */

import { Router } from 'express';
import Joi from 'joi';

import {
  getInventory, getLowStock, adjustInventory, getInventoryTransactions,
} from '@/controllers/inventory.controller.js';

import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler as errorAsyncHandler } from '@/middleware/errorHandler.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

/**
 * @route GET /api/v1/admin/inventory
 * @summary 获取库存列表 / Get inventory list
 * @access Private (Admin)
 * @query {string} [product_id] - 商品 ID 筛选
 * @query {boolean} [low_stock] - 仅显示低库存
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页数量
 */
router.get('/', validateRequest({ query: paginationSchema }), errorAsyncHandler(getInventory));

/**
 * @route GET /api/v1/admin/inventory/low-stock
 * @summary 获取低库存商品 / Get low stock products
 * @access Private (Admin)
 */
router.get('/low-stock', errorAsyncHandler(getLowStock));

/**
 * @route POST /api/v1/admin/inventory/adjust
 * @summary 调整库存 / Adjust inventory
 * @access Private (Admin)
 * @body {string} product_id - 商品 ID
 * @body {string} [variant_id] - 规格 ID
 * @body {string} warehouse_id - 仓库 ID
 * @body {number} quantity_change - 数量变化 (正数增加, 负数减少)
 * @body {string} [note] - 备注
 * @body {string} [transaction_type] - 事务类型
 */
router.post(
  '/adjust',
  validateRequest({
    body: Joi.object({
      product_id: Joi.string().uuid().required(),
      variant_id: Joi.string().uuid().allow(null),
      warehouse_id: Joi.string().required(),
      quantity_change: Joi.number().integer().required(),
      note: Joi.string().allow(''),
      transaction_type: Joi.string().valid('purchase', 'sale', 'return', 'adjustment', 'transfer').default('adjustment'),
    }),
  }),
  errorAsyncHandler(adjustInventory)
);

/**
 * @route GET /api/v1/admin/inventory/transactions
 * @summary 获取库存变动记录 / Get inventory transactions
 * @access Private (Admin)
 */
router.get('/transactions', validateRequest({ query: paginationSchema }), errorAsyncHandler(getInventoryTransactions));

export default router;
