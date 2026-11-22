/**
 * 支付控制器 / Payment Controller
 * @description 处理支付创建、确认、退款、支付方式查询等 API
 * @module controllers/payment
 */

import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { query, queryOne, transaction } from '@/config/database.js';
import { AppError, asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate } from '@/middleware/auth.js';
import { validateRequest, uuidParamSchema } from '@/middleware/validator.js';
import { logger } from '@/utils/logger.js';
import { publishOrderEvent } from '@/services/event.service.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

/**
 * 创建支付意图 / Create payment intent
 * @route POST /api/v1/payments/intent
 * @access Private
 */
export const createPaymentIntent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { order_id } = req.body;

  const order = await queryOne(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND payment_status = $3',
    [order_id, req.user!.id, 'pending']
  );

  if (!order) {
    throw new AppError('订单不存在或已支付 / Order not found or already paid', 404, true, 'ORDER_NOT_FOUND');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(parseFloat((order as any).total_amount) * 100),
    currency: (order as any).currency.toLowerCase(),
    metadata: {
      order_id: (order as any).id,
      order_number: (order as any).order_number,
      user_id: req.user!.id,
    },
  });

  await query(
    `UPDATE orders SET payment_intent_id = $1 WHERE id = $2`,
    [paymentIntent.id, order_id]
  );

  await query(
    `UPDATE payments SET payment_intent_id = $1, payment_status = 'processing' WHERE order_id = $2`,
    [paymentIntent.id, order_id]
  );

  res.json({
    success: true,
    data: {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    },
  });
});

/**
 * Stripe Webhook 回调 / Stripe webhook callback
 * @route POST /api/v1/payments/webhook
 * @access Public (Stripe webhook)
 */
export const stripeWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    res.status(400).send(`Webhook Error: ${(error as Error).message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata.order_id;

    if (orderId) {
      await transaction(async () => {
        await query(
          `UPDATE orders SET payment_status = 'succeeded', order_status = 'confirmed', paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [orderId]
        );
        await query(
          `UPDATE payments SET payment_status = 'succeeded', transaction_id = $1, paid_at = NOW() WHERE order_id = $2`,
          [paymentIntent.id, orderId]
        );
        await query(
          'INSERT INTO order_status_history (order_id, from_status, to_status) VALUES ($1, $2, $3)',
          [orderId, 'pending', 'confirmed']
        );
      });

      await publishOrderEvent('order.paid', { orderId, paymentIntentId: paymentIntent.id });
      logger.info(`Payment confirmed for order: ${orderId}`);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata.order_id;

    if (orderId) {
      await query(
        'UPDATE payments SET payment_status = $1, failed_reason = $2 WHERE order_id = $3',
        ['failed', paymentIntent.last_payment_error?.message, orderId]
      );
      logger.warn(`Payment failed for order: ${orderId}`);
    }
  }

  res.json({ received: true });
});

/**
 * 获取支付方式列表 / Get payment methods
 * @route GET /api/v1/payments/methods
 * @access Public
 */
export const getPaymentMethods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const methods = [
    { id: 'credit_card', name: '信用卡 / Credit Card', icon: 'credit-card', is_active: true },
    { id: 'alipay', name: '支付宝 / Alipay', icon: 'alipay', is_active: true },
    { id: 'wechat_pay', name: '微信支付 / WeChat Pay', icon: 'wechat', is_active: true },
    { id: 'paypal', name: 'PayPal', icon: 'paypal', is_active: true },
    { id: 'bank_transfer', name: '银行转账 / Bank Transfer', icon: 'bank', is_active: true },
    { id: 'cash_on_delivery', name: '货到付款 / Cash on Delivery', icon: 'cash', is_active: true },
  ];

  res.json({ success: true, data: methods });
});

/**
 * 获取支付记录列表 / Get payment list
 * @route GET /api/v1/payments
 * @access Private
 */
export const getPayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { page, limit, offset } = validateRequest.extractPagination(req.query as any);

  const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
  let whereClause = isAdmin ? 'WHERE 1=1' : 'WHERE p.user_id = $1';
  const params: any[] = isAdmin ? [] : [userId];

  if (req.query.order_id) {
    whereClause += ` AND p.order_id = $${params.length + 1}`;
    params.push(req.query.order_id);
  }

  const countResult = await query(`SELECT COUNT(*) as total FROM payments p ${whereClause}`, params);

  const result = await query(
    `SELECT p.*, o.order_number, u.email as user_email
     FROM payments p
     LEFT JOIN orders o ON p.order_id = o.id
     LEFT JOIN users u ON p.user_id = u.id
     ${whereClause}
     ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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
 * 发起退款 / Initiate refund
 * @route POST /api/v1/payments/:id/refund
 * @access Private (Admin)
 */
export const initiateRefund = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  const payment = await queryOne('SELECT * FROM payments WHERE id = $1', [id]);
  if (!payment) {
    throw new AppError('支付记录不存在 / Payment not found', 404, true, 'PAYMENT_NOT_FOUND');
  }

  if ((payment as any).payment_status !== 'succeeded') {
    throw new AppError('该支付无法退款 / Payment cannot be refunded', 400, true, 'PAYMENT_NOT_REFUNDABLE');
  }

  const refundAmount = amount || parseFloat((payment as any).amount);

  await query(
    `INSERT INTO refunds (order_id, user_id, refund_type, amount, currency, reason, payment_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [(payment as any).order_id, (payment as any).user_id, 'full', refundAmount,
     (payment as any).currency, reason, id]
  );

  res.json({
    success: true,
    message: '退款申请已提交 / Refund request submitted',
  });
});

export { createPaymentIntent, stripeWebhook, getPaymentMethods, getPayments, initiateRefund };
