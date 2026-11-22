/**
 * 购物车控制器
 * Cart Controller
 *
 * @description 处理购物车操作：添加商品、更新数量、删除商品、获取购物车
 *              Handles cart operations: add, update, remove, get cart
 * @module controllers/cart
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, transaction } from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, optionalAuthenticate } from '@/middleware/auth.js';
import { validateRequest, uuidParamSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';

/**
 * 获取用户购物车
 * Get user cart
 *
 * @route GET /api/v1/cart
 * @access Private
 */
export const getCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  // 1. 获取购物车 ID / Get cart ID
  const cart = await queryOne(
    'SELECT id FROM carts WHERE user_id = $1',
    [userId]
  );

  if (!cart) {
    res.json({
      success: true,
      data: {
        items: [],
        subtotal: 0,
        total_items: 0,
      },
    });
    return;
  }

  // 2. 获取购物车商品 / Get cart items
  const itemsResult = await query(
    `SELECT ci.*, p.name, p.slug, p.price, p.original_price,
            (SELECT url FROM product_images WHERE product_id = ci.product_id AND is_primary = TRUE LIMIT 1) AS image,
            p.available_stock, p.status AS product_status
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = $1
     ORDER BY ci.added_at DESC`,
    [(cart as any).id]
  );

  const items = itemsResult.rows.map((item: any) => ({
    ...item,
    in_stock: item.product_status === 'active' && parseInt(item.available_stock) >= parseInt(item.quantity),
  }));

  const subtotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0);

  res.json({
    success: true,
    data: {
      cart_id: (cart as any).id,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      total_items: items.reduce((sum: number, item: any) => sum + parseInt(item.quantity), 0),
    },
  });
});

/**
 * 添加商品到购物车
 * Add item to cart
 *
 * @route POST /api/v1/cart/items
 * @access Private
 */
export const addToCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { product_id, variant_id, quantity } = req.body;
  const userId = req.user!.id;

  if (!product_id || !quantity || quantity < 1) {
    throw new AppError('商品 ID 和数量为必填项 / Product ID and quantity are required', 400, true, 'INVALID_INPUT');
  }

  await transaction(async (client) => {
    // 1. 获取或创建购物车 / Get or create cart
    let cart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);
    let cartId: string;

    if (!cart) {
      const result = await query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      cartId = result.rows[0].id;
    } else {
      cartId = (cart as any).id;
    }

    // 2. 验证商品 / Validate product
    const product = await queryOne(
      `SELECT id, price, status, available_stock FROM products WHERE id = $1 AND deleted_at IS NULL`,
      [product_id]
    );

    if (!product) {
      throw new AppError('商品不存在 / Product not found', 404, true, 'PRODUCT_NOT_FOUND');
    }

    if ((product as any).status !== 'active') {
      throw new AppError('商品未上架 / Product is not active', 400, true, 'PRODUCT_INACTIVE');
    }

    // 3. 获取单价 / Get unit price
    let unitPrice = parseFloat((product as any).price);

    if (variant_id) {
      const variant = await queryOne(
        'SELECT price, available_stock, is_active FROM product_variants WHERE id = $1 AND product_id = $2',
        [variant_id, product_id]
      );

      if (!variant || !(variant as any).is_active) {
        throw new AppError('商品规格不存在 / Product variant not found', 404, true, 'VARIANT_NOT_FOUND');
      }

      if (parseInt((variant as any).available_stock) < quantity) {
        throw new AppError('库存不足 / Insufficient stock', 400, true, 'OUT_OF_STOCK');
      }

      unitPrice = parseFloat((variant as any).price);
    } else {
      if (parseInt((product as any).available_stock) < quantity) {
        throw new AppError('库存不足 / Insufficient stock', 400, true, 'OUT_OF_STOCK');
      }
    }

    // 4. 检查是否已在购物车 / Check if already in cart
    const existingItem = await queryOne(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))',
      [cartId, product_id, variant_id]
    );

    if (existingItem) {
      // 更新数量 / Update quantity
      const newQuantity = parseInt((existingItem as any).quantity) + quantity;
      await query(
        'UPDATE cart_items SET quantity = $1, unit_price = $2, updated_at = NOW() WHERE id = $3',
        [newQuantity, unitPrice, (existingItem as any).id]
      );
    } else {
      // 添加新条目 / Add new item
      await query(
        'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
        [cartId, product_id, variant_id, quantity, unitPrice]
      );
    }

    // 5. 更新购物车时间戳 / Update cart timestamp
    await query('UPDATE carts SET updated_at = NOW() WHERE id = $1', [cartId]);
  });

  // 6. 使缓存失效 / Invalidate cache
  await cacheService.delPattern(`cart:${userId}:*`);

  logger.info(`Item added to cart: user=${userId}, product=${product_id}`);

  res.status(201).json({
    success: true,
    message: '已添加到购物车 / Added to cart',
  });
});

/**
 * 更新购物车商品数量
 * Update cart item quantity
 *
 * @route PUT /api/v1/cart/items/:itemId
 * @access Private
 */
export const updateCartItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { itemId } = req.params;
  const { quantity } = req.body;
  const userId = req.user!.id;

  if (!quantity || quantity < 1) {
    throw new AppError('数量必须大于0 / Quantity must be greater than 0', 400, true, 'INVALID_QUANTITY');
  }

  await transaction(async () => {
    // 1. 验证购物车商品属于当前用户 / Verify cart item belongs to user
    const cartItem = await queryOne(
      `SELECT ci.*, p.price, p.available_stock, p.status
       FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = $1 AND c.user_id = $2`,
      [itemId, userId]
    );

    if (!cartItem) {
      throw new AppError('购物车商品不存在 / Cart item not found', 404, true, 'CART_ITEM_NOT_FOUND');
    }

    // 2. 验证库存 / Check stock
    if (parseInt((cartItem as any).available_stock) < quantity) {
      throw new AppError('库存不足 / Insufficient stock', 400, true, 'OUT_OF_STOCK');
    }

    // 3. 更新数量 / Update quantity
    await query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [quantity, itemId]
    );
  });

  await cacheService.delPattern(`cart:${userId}:*`);

  res.json({
    success: true,
    message: '购物车已更新 / Cart updated',
  });
});

/**
 * 从购物车删除商品
 * Remove item from cart
 *
 * @route DELETE /api/v1/cart/items/:itemId
 * @access Private
 */
export const removeFromCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { itemId } = req.params;
  const userId = req.user!.id;

  // 1. 验证商品属于当前用户 / Verify item belongs to user
  const cartItem = await queryOne(
    `SELECT ci.id FROM cart_items ci
     JOIN carts c ON ci.cart_id = c.id
     WHERE ci.id = $1 AND c.user_id = $2`,
    [itemId, userId]
  );

  if (!cartItem) {
    throw new AppError('购物车商品不存在 / Cart item not found', 404, true, 'CART_ITEM_NOT_FOUND');
  }

  // 2. 删除 / Delete
  await query('DELETE FROM cart_items WHERE id = $1', [itemId]);

  await cacheService.delPattern(`cart:${userId}:*`);

  res.json({
    success: true,
    message: '已从购物车移除 / Removed from cart',
  });
});

/**
 * 清空购物车
 * Clear cart
 *
 * @route DELETE /api/v1/cart/items
 * @access Private
 */
export const clearCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const cart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);

  if (cart) {
    await query('DELETE FROM cart_items WHERE cart_id = $1', [(cart as any).id]);
  }

  await cacheService.delPattern(`cart:${userId}:*`);

  res.json({
    success: true,
    message: '购物车已清空 / Cart cleared',
  });
});

/**
 * 合并购物车（登录后合并游客购物车）
 * Merge carts (merge guest cart after login)
 *
 * @route POST /api/v1/cart/merge
 * @access Private
 */
export const mergeCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { session_id, items } = req.body;
  const userId = req.user!.id;

  if (!session_id || !items || !Array.isArray(items)) {
    res.json({ success: true, message: '无购物车需要合并 / No cart to merge' });
    return;
  }

  await transaction(async () => {
    // 1. 获取或创建用户购物车 / Get or create user cart
    let userCart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);
    let userCartId: string;

    if (!userCart) {
      const result = await query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
      userCartId = result.rows[0].id;
    } else {
      userCartId = (userCart as any).id;
    }

    // 2. 获取游客购物车商品 / Get guest cart items
    const guestCart = await queryOne('SELECT id FROM carts WHERE session_id = $1', [session_id]);

    if (!guestCart) {
      res.json({ success: true, message: '无游客购物车 / No guest cart' });
      return;
    }

    const guestItems = await query(
      'SELECT * FROM cart_items WHERE cart_id = $1',
      [(guestCart as any).id]
    );

    // 3. 合并商品 / Merge items
    for (const guestItem of guestItems.rows) {
      const existingItem = await queryOne(
        'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))',
        [userCartId, guestItem.product_id, guestItem.variant_id]
      );

      if (existingItem) {
        const newQty = parseInt((existingItem as any).quantity) + parseInt(guestItem.quantity);
        await query(
          'UPDATE cart_items SET quantity = $1 WHERE id = $2',
          [newQty, (existingItem as any).id]
        );
      } else {
        await query(
          'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
          [userCartId, guestItem.product_id, guestItem.variant_id, guestItem.quantity, guestItem.unit_price]
        );
      }
    }

    // 4. 删除游客购物车 / Delete guest cart
    await query('DELETE FROM cart_items WHERE cart_id = $1', [(guestCart as any).id]);
    await query('DELETE FROM carts WHERE id = $1', [(guestCart as any).id]);
  });

  await cacheService.delPattern(`cart:${userId}:*`);

  res.json({
    success: true,
    message: '购物车合并成功 / Cart merged successfully',
  });
});

export { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
