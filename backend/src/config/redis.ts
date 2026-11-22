/**
 * Redis 缓存配置
 * Redis Cache Configuration
 *
 * @description 管理 Redis 连接和缓存操作（会话、热门数据、限流）
 * @module config/redis
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Redis 客户端实例
 * 用于：会话存储、缓存热门数据、限流计数器、分布式锁
 */
export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

/**
 * Redis 连接错误处理
 * @param {Error} error - 错误对象
 */
redisClient.on('error', (error) => {
  console.error('❌ Redis connection error / Redis 连接错误:', error);
});

/**
 * Redis 连接成功事件
 */
redisClient.on('connect', () => {
  console.log('✅ Redis connected / Redis 已连接');
});

redisClient.on('ready', () => {
  console.log('✅ Redis ready / Redis 已就绪');
});

/**
 * 通用缓存操作类
 * @class CacheService
 */
export class CacheService {
  private prefix: string;

  constructor(prefix: string = 'ecommerce:') {
    this.prefix = prefix;
  }

  /**
   * 生成带前缀的缓存键
   * Generate prefixed cache key
   * @param {string} key - 原始键名
   * @returns {string} 带前缀的完整键名
   */
  private key(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 获取缓存值
   * Get cached value
   * @param {string} key - 缓存键
   * @returns {Promise<string | null>} 缓存值
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await redisClient.get(this.key(key));
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * 设置缓存值
   * Set cache value
   * @param {string} key - 缓存键
   * @param {T} value - 缓存值
   * @param {number} [ttl=3600] - 过期时间（秒），默认1小时
   */
  async set<T = any>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setex(this.key(key), ttl, serialized);
  }

  /**
   * 删除缓存
   * Delete cache
   * @param {string} key - 缓存键
   */
  async del(key: string): Promise<void> {
    await redisClient.del(this.key(key));
  }

  /**
   * 批量删除（支持模式匹配）
   * Delete multiple keys by pattern
   * @param {string} pattern - 匹配模式（如 "user:*"）
   */
  async delPattern(pattern: string): Promise<number> {
    const keys = await redisClient.keys(this.key(pattern));
    if (keys.length === 0) return 0;
    return redisClient.del(...keys);
  }

  /**
   * 检查键是否存在
   * Check if key exists
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} 是否存在
   */
  async exists(key: string): Promise<boolean> {
    const result = await redisClient.exists(this.key(key));
    return result === 1;
  }

  /**
   * 设置过期时间
   * Set expiration
   * @param {string} key - 缓存键
   * @param {number} ttl - 过期时间（秒）
   */
  async expire(key: string, ttl: number): Promise<void> {
    await redisClient.expire(this.key(key), ttl);
  }

  /**
   * 获取剩余过期时间
   * Get TTL
   * @param {string} key - 缓存键
   * @returns {Promise<number>} 剩余秒数（-1=永不过期，-2=不存在）
   */
  async ttl(key: string): Promise<number> {
    return redisClient.ttl(this.key(key));
  }

  /**
   * 自增计数器
   * Increment counter
   * @param {string} key - 计数器键
   * @param {number} [ttl] - 过期时间（秒）
   * @returns {Promise<number>} 自增后的值
   */
  async increment(key: string, ttl?: number): Promise<number> {
    const value = await redisClient.incr(this.key(key));
    if (ttl && value === 1) {
      await redisClient.expire(this.key(key), ttl);
    }
    return value;
  }

  /**
   * 缓存商品列表（带过期）
   * Cache product list
   * @param {string} key - 缓存键（包含查询参数）
   * @param {any} data - 数据
   * @param {number} [ttl=300] - 5分钟过期
   */
  async cacheProducts(key: string, data: any, ttl: number = 300): Promise<void> {
    await this.set(`products:${key}`, data, ttl);
  }

  /**
   * 获取缓存的商品列表
   * Get cached products
   * @param {string} key - 缓存键
   * @returns {Promise<any | null>} 缓存数据
   */
  async getCachedProducts(key: string): Promise<any | null> {
    return this.get(`products:${key}`);
  }

  /**
   * 使商品缓存失效
   * Invalidate product cache
   */
  async invalidateProductCache(): Promise<void> {
    await this.delPattern('products:*');
  }

  /**
   * 缓存分类数据
   * Cache categories
   */
  async cacheCategories(data: any, ttl: number = 3600): Promise<void> {
    await this.set('categories:all', data, ttl);
  }

  /**
   * 获取缓存的分类数据
   */
  async getCachedCategories(): Promise<any | null> {
    return this.get('categories:all');
  }
}

/**
 * 限流器类
 * @class RateLimiter
 */
export class RateLimiter {
  private redis: Redis;
  private prefix: string;

  constructor(prefix: string = 'rate_limit:') {
    this.redis = redisClient;
    this.prefix = prefix;
  }

  /**
   * 检查是否超过速率限制
   * Check rate limit
   * @param {string} key - 限流键（通常为 IP 或 用户ID）
   * @param {number} limit - 最大请求数
   * @param {number} window - 时间窗口（秒）
   * @returns {{ allowed: boolean; remaining: number; resetAt: number }} 限流结果
   */
  async check(
    key: string,
    limit: number = 100,
    window: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const fullKey = `${this.prefix}${key}`;
    const now = Date.now();
    const windowMs = window * 1000;

    try {
      // 使用 Redis 滑动窗口计数 / Use Redis sliding window counter
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(fullKey, 0, now - windowMs);
      pipeline.zadd(fullKey, now, `${now}`);
      pipeline.zcard(fullKey);
      pipeline.expire(fullKey, window);

      const results = await pipeline.exec();
      const count = results?.[2]?.[1] as number || 0;

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt: now + windowMs,
      };
    } catch {
      // Redis 不可用时允许请求（fail open / Fail open when Redis unavailable）
      return { allowed: true, remaining: limit, resetAt: now + windowMs };
    }
  }
}

// 导出单例
export const cacheService = new CacheService();
export const rateLimiter = new RateLimiter();

/**
 * 连接 Redis
 * Connect to Redis
 */
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.ping();
    console.log('✅ Redis ping successful / Redis ping 成功');
  } catch (error) {
    console.error('❌ Redis connection failed / Redis 连接失败:', error);
    throw error;
  }
}

/**
 * 断开 Redis 连接
 * Disconnect Redis
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redisClient.quit();
    console.log('Redis disconnected / Redis 已断开');
  } catch (error) {
    console.error('Error disconnecting Redis / 断开 Redis 连接时出错:', error);
  }
}
