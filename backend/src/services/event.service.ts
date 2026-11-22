/**
 * 事件服务
 * Event Service
 *
 * @description 使用 BullMQ 处理异步事件（订单通知、库存更新、ES索引同步）
 *              Uses BullMQ for async event processing
 * @module services/event
 */

import { Queue, Worker } from 'bullmq';
import { elasticsearchClient, indexProduct, deleteProductFromIndex } from '@/config/elasticsearch.js';
import { logger } from '@/utils/logger.js';

/**
 * BullMQ 队列配置
 */
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

/**
 * 订单事件队列
 */
export const orderQueue = new Queue('order-events', { connection });

/**
 * 搜索索引队列
 */
export const searchQueue = new Queue('search-events', { connection });

// ============================================================
// 事件处理器
// ============================================================

/**
 * 订单事件处理器
 */
export const orderWorker = new Worker('order-events', async (job) => {
  const { event, data } = job.data;

  switch (event) {
    case 'order.created':
      logger.info(`Processing order.created: ${data.orderId}`);
      // TODO: 发送订单确认通知 / Send order confirmation
      break;

    case 'order.paid':
      logger.info(`Processing order.paid: ${data.orderId}`);
      // TODO: 发送支付成功通知 / Send payment success notification
      break;

    case 'order.shipped':
      logger.info(`Processing order.shipped: ${data.orderId}`);
      // TODO: 发送发货通知 / Send shipping notification
      break;

    case 'order.delivered':
      logger.info(`Processing order.delivered: ${data.orderId}`);
      // TODO: 发送送达通知 / Send delivery notification
      break;

    default:
      logger.warn(`Unknown event: ${event}`);
  }
}, { connection });

/**
 * 搜索索引事件处理器
 */
export const searchWorker = new Worker('search-events', async (job) => {
  const { event, data } = job.data;

  switch (event) {
    case 'product.created':
      logger.info(`Indexing product: ${data.productId}`);
      if (data.productData) {
        await indexProduct(data.productData);
      }
      break;

    case 'product.updated':
      logger.info(`Updating product index: ${data.productId}`);
      if (data.productData) {
        await indexProduct(data.productData);
      }
      break;

    case 'product.deleted':
      logger.info(`Removing product from index: ${data.productId}`);
      await deleteProductFromIndex(data.productId);
      break;

    default:
      logger.warn(`Unknown search event: ${event}`);
  }
}, { connection });

/**
 * 发布订单事件
 * Publish order event
 */
export async function publishOrderEvent(event: string, data: Record<string, any>): Promise<void> {
  await orderQueue.add(event, { event, data }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

/**
 * 发布搜索索引事件
 * Publish search index event
 */
export async function publishSearchEvent(event: string, data: Record<string, any>): Promise<void> {
  await searchQueue.add(event, { event, data }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}
