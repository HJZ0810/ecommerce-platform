/**
 * 订单控制器
 * Order Controller
 *
 * @description 处理订单 CRUD、状态变更、订单搜索等 API
 *              Handles order CRUD, status changes, order search
 * @module controllers/order
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  query, queryOne, transaction,
} from '@/config/database.js';
import { cacheService } from '@/config/redis.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate } from '@/middleware/auth.js';
import { validateRequest, paginationSchema, uuidParamSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';
import { sendOrderConfirmationEmail } from '@/services/notification.service.js';
import { publishOrderEvent } from '@/services/event.service.js';

/**
 * 创建订单（从购物车结算）
 * Create order from cart
 *
 * @route POST /api/v1/orders
 * @access Private
 */
export const createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const {
    shipping_address_id,
    billing_address_id,
    shipping_method_id,
    payment_method,
    coupon_code,
    customer_note,
    points_to_use,
  } = req.body;

  await transaction(async () => {
    // 1. 获取购物车 / Get cart
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cart) {
      throw new AppError('购物车为空 / Cart is empty', 400, true, 'CART_EMPTY');
    }

    // 2. 获取购物车商品 / Get cart items
    const itemsResult = await query(
      `SELECT ci.*, p.name, p.slug, p.price, p.original_price, p.available_stock,
              (SELECT url FROM product_images WHERE product_id = ci.product_id AND is_primary = TRUE LIMIT 1) AS image
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [(cart as any).id]
    );

    const items = itemsResult.rows;
    if (items.length === 0) {
      throw new AppError('购物车为空 / Cart is empty', 400, true, 'CART_EMPTY');
    }

    // 3. 验证库存和价格 / Validate stock and prices
    for (const item of items) {
      if (parseInt(item.available_stock) < parseInt(item.quantity)) {
        throw new AppError(`商品 "${item.name}" 库存不足 / Insufficient stock for "${item.name}"`, 400, true, 'OUT_OF_STOCK');
      }
    }

    // 4. 获取收货地址快照 / Get shipping address snapshot
    const address = await queryOne(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE',
      [shipping_address_id, userId]
    );

    if (!address) {
      throw new AppError('收货地址不存在 / Shipping address not found', 400, true, 'ADDRESS_NOT_FOUND');
    }

    // 5. 计算金额 / Calculate amounts
    const subtotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0);

    // 获取配送方式价格 / Get shipping cost
    let shippingAmount = 0;
    if (shipping_method_id) {
      const shipping = await queryOne(
        'SELECT base_price, free_shipping_threshold FROM shipping_methods WHERE id = $1 AND is_active = TRUE',
        [shipping_method_id]
      );
      if (shipping) {
        const basePrice = parseFloat((shipping as any).base_price);
        const freeThreshold = (shipping as any).free_shipping_threshold;
        shippingAmount = freeThreshold && subtotal >= parseFloat(freeThreshold) ? 0 : basePrice;
      }
    }

    // 处理优惠券 / Process coupon
    let couponId: string | null = null;
    let couponCode: string | null = null;
    let couponDiscount = 0;

    if (coupon_code) {
      const coupon = await queryOne(
        `SELECT id, value, coupon_type, min_order_amount, used_quantity, total_quantity
         FROM coupons WHERE code = $1 AND is_active = TRUE
           AND valid_from <= NOW() AND valid_until >= NOW()`,
        [coupon_code]
      );

      if (!coupon) {
        throw new AppError('优惠券不存在或已过期 / Coupon not found or expired', 400, true, 'COUPON_INVALID');
      }

      if (subtotal < parseFloat((coupon as any).min_order_amount || '0')) {
        throw new AppError('订单金额不满足优惠券使用条件 / Order amount does not meet coupon minimum', 400, true, 'COUPON_MIN_NOT_MET');
      }

      if (parseInt((coupon as any).used_quantity) >= parseInt((coupon as any).total_quantity)) {
        throw new AppError('优惠券已使用完毕 / Coupon has been fully used', 400, true, 'COUPON_EXHAUSTED');
      }

      // 计算折扣 / Calculate discount
      if ((coupon as any).coupon_type === 'percentage') {
        couponDiscount = Math.round(subtotal * (parseFloat((coupon as any).value) / 100) * 100) / 100;
      } else if ((coupon as any).coupon_type === 'fixed_amount') {
        couponDiscount = Math.min(parseFloat((coupon as any).value), subtotal);
      }

      couponId = (coupon as any).id;
      couponCode = coupon_code;
    }

    // 6. 生成订单号 / Generate order number
    const orderNumber = `ORD-${dayjs().format('YYYYMMDD')}-${String(Date.now() % 100000).padStart(5, '0')}`;

    // 7. 创建订单 / Create order
    const taxAmount = Math.round(subtotal * 0.06 * 100) / 100; // 6% tax
    const totalAmount = subtotal - couponDiscount + shippingAmount + taxAmount;

    const orderResult = await query(
      `INSERT INTO orders (
        order_number, user_id, order_status, payment_status,
        subtotal_amount, discount_amount, shipping_amount, tax_amount, total_amount,
        shipping_address, billing_address,
        shipping_carrier, shipping_method_id,
        payment_method, coupon_id, coupon_code, coupon_discount,
        points_used, points_earned, customer_note, source, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING id, order_number, created_at`,
      [
        orderNumber, userId, 'pending', 'pending',
        subtotal, couponDiscount, shippingAmount, taxAmount, totalAmount,
        JSON.stringify({
          recipient_name: (address as any).recipient_name,
          recipient_phone: (address as any).recipient_phone,
          country: (address as any).country,
          province: (address as any).province,
          city: (address as any).city,
          district: (address as any).district,
          street_address: (address as any).street_address,
          postal_code: (address as any).postal_code,
        }),
        JSON.stringify({
          recipient_name: (address as any).recipient_name,
          recipient_phone: (address as any).recipient_phone,
        }),
        null, shipping_method_id,
        payment_method, couponId, couponCode, couponDiscount,
        points_to_use || 0, Math.round(totalAmount), customer_note,
        req.get('x-client-id') || 'web',
        JSON.stringify({ ip: req.ip }),
      ]
    );

    const order = orderResult.rows[0];

    // 8. 创建订单商品 / Create order items
    for (const item of items) {
      await query(
        `INSERT INTO order_items (
          order_id, product_id, variant_id, product_snapshot,
          product_name, product_image, variant_attributes,
          quantity, unit_price, discount_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          order.id, item.product_id, item.variant_id,
          JSON.stringify({
            sku: item.product_id,
            price: item.unit_price,
            name: item.name,
          }),
          item.name, item.image,
          item.variant_id ? { variant_id: item.variant_id } : null,
          item.quantity, item.unit_price, 0,
        ]
      );

      // 扣减库存 / Reserve stock
      if (item.variant_id) {
        await query(
          'UPDATE product_variants SET reserved_stock = reserved_stock + $1 WHERE id = $2',
          [item.quantity, item.variant_id]
        );
      } else {
        await query(
          'UPDATE products SET reserved_stock = reserved_stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // 9. 记录状态历史 / Record status history
    await query(
      'INSERT INTO order_status_history (order_id, from_status, to_status) VALUES ($1, NULL, $2)',
      [order.id, 'pending']
    );

    // 10. 创建支付记录 / Create payment record
    await query(
      'INSERT INTO payments (order_id, user_id, payment_method, amount) VALUES ($1, $2, $3, $4)',
      [order.id, userId, payment_method || 'credit_card', totalAmount]
    );

    // 11. 记录优惠券使用 / Record coupon usage
    if (couponId) {
      await query(
        'INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount) VALUES ($1, $2, $3, $4)',
        [couponId, userId, order.id, couponDiscount]
      );
    }

    // 12. 删除购物车商品 / Clear cart items
    await query('DELETE FROM cart_items WHERE cart_id = $1', [(cart as any).id]);
  });

  // 13. 发布事件 / Publish event
  try {
    await publishOrderEvent('order.created', { orderId: order.id, userId });
  } catch (error) {
    logger.warn('Failed to publish order event:', error);
  }

  // 14. 发送通知 / Send notification (async, don't block)
  try {
    const user = await queryOne('SELECT email, first_name FROM users WHERE id = $1', [userId]);
    if (user) {
      sendOrderConfirmationEmail((user as any).email, orderNumber, (user as any).first_name);
    }
  } catch (error) {
    logger.warn('Failed to send order confirmation email:', error);
  }

  logger.info(`Order created: ${orderNumber} by user ${userId}`);

  res.status(201).json({
    success: true,
    message: '订单创建成功 / Order created successfully',
    data: {
      order_id: order.id,
      order_number: order.order_number,
    },
  });
});

/**
 * 获取订单列表
 * Get order list
 *
 * @route GET /api/v1/orders
 * @access Private
 */
export const getOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { page, limit, offset } = validateRequest.extractPagination(req.query as any);
  const { status } = req.query as any;

  // 构建查询条件 / Build query conditions
  const conditions = ['user_id = $1'];
  const params: any[] = [userId];

  if (status) {
    conditions.push(`order_status = $${params.length + 1}`);
    params.push(status);
  }

  const whereClause = conditions.join(' AND ');
  const sortClause = 'ORDER BY created_at DESC';

  // 查询总数 / Count total
  const countResult = await query(
    `SELECT COUNT(*) as total FROM orders WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.total || '0');

  // 查询数据 / Query data
  const result = await query(
    `SELECT id, order_number, order_status, payment_status, total_amount,
            currency, created_at, paid_at, delivered_at
     FROM orders
     WHERE ${whereClause}
     ${sortClause}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
});

/**
 * 获取单个订单详情
 * Get single order detail
 *
 * @route GET /api/v1/orders/:id
 * @access Private
 */
export const getOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';

  // 查询订单 / Query order
  let order;
  if (isAdmin) {
    order = await queryOne(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );
  } else {
    order = await queryOne(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  }

  if (!order) {
    throw new AppError('订单不存在 / Order not found', 404, true, 'ORDER_NOT_FOUND');
  }

  // 查询商品明细 / Query order items
  const itemsResult = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [id]
  );

  // 查询状态历史 / Query status history
  const historyResult = await query(
    'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at DESC',
    [id]
  );

  res.json({
    success: true,
    data: {
      ...order,
      items: itemsResult.rows,
      status_history: historyResult.rows,
    },
  });
});

/**
 * 取消订单
 * Cancel order
 *
 * @route POST /api/v1/orders/:id/cancel
 * @access Private
 */
export const cancelOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user!.id;

  const order = await queryOne(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND order_status NOT IN ($3, $4, $5)',
    [id, userId, 'cancelled', 'completed', 'delivered']
  );

  if (!order) {
    throw new AppError('订单无法取消 / Order cannot be cancelled', 400, true, 'ORDER_CANNOT_CANCEL');
  }

  await transaction(async () => {
    // 回滚库存 / Restore stock
    const items = await query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    for (const item of items.rows) {
      if (item.variant_id) {
        await query(
          'UPDATE product_variants SET total_stock = total_stock + $1, reserved_stock = reserved_stock - $1 WHERE id = $2',
          [item.quantity, item.variant_id]
        );
      } else {
        await query(
          'UPDATE products SET total_stock = total_stock + $1, reserved_stock = reserved_stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // 更新订单状态 / Update order status
    await query(
      `UPDATE orders SET order_status = 'cancelled', cancellation_reason = $1,
       cancelled_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [reason, id]
    );

    // 记录状态变更 / Record status change
    await query(
      'INSERT INTO order_status_history (order_id, from_status, to_status, note, created_by) VALUES ($1, $2, $3, $4, $5)',
      [id, (order as any).order_status, 'cancelled', reason, userId]
    );
  });

  logger.info(`Order cancelled: ${(order as any).order_number}`);

  res.json({
    success: true,
    message: '订单已取消 / Order cancelled',
  });
});

export { createOrder, getOrders, getOrder, cancelOrder };
