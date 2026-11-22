/**
 * PostgreSQL 数据库连接配置
 * PostgreSQL Database Connection Configuration
 *
 * @description 管理 PostgreSQL 连接池的创建、查询执行和断开连接
 * @module config/database
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * 数据库连接池配置
 * @type {Pool}
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ecommerce',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_MAX || '20'), // 最大连接数
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 空闲超时30秒
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'), // 连接超时5秒
});

// 监听连接事件 / Listen for connection events
pool.on('connect', () => {
  console.log('New database connection established / 新数据库连接已建立');
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error / 意外的数据库池错误:', err);
});

/**
 * 执行 SQL 查询的通用方法
 * Execute a SQL query
 *
 * @param {string} text - SQL 查询文本
 * @param {Array<any>} [params] - 查询参数
 * @returns {Promise<{rows: any[], rowCount: number}>} 查询结果
 * @throws {Error} 数据库查询错误
 *
 * @example
 * const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 */
export async function query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // 慢查询日志 / Slow query logging
    if (duration > 1000) {
      console.warn(`Slow query detected (${duration}ms): ${text.substring(0, 100)}...`);
    }

    return { rows: result.rows, rowCount: result.rowCount };
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database error: ${(error as Error).message}`);
  }
}

/**
 * 获取单个结果（用于查询唯一记录）
 * Get a single row result
 *
 * @param {string} text - SQL 查询文本
 * @param {Array<any>} [params] - 查询参数
 * @returns {Promise<any | null>} 单个结果或 null
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const { rows } = await query(text, params);
  return rows.length > 0 ? (rows[0] as T) : null;
}

/**
 * 执行事务
 * Execute a transaction
 *
 * @param {Function} callback - 事务回调函数，接收 client
 * @returns {Promise<any>} 事务结果
 * @throws {Error} 事务执行错误，会自动回滚
 *
 * @example
 * const result = await transaction(async (client) => {
 *   await client.query('INSERT INTO orders ...');
 *   await client.query('INSERT INTO order_items ...');
 *   return orderId;
 * });
 */
export async function transaction<T = any>(
  callback: (client: pg.Queryable) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 连接数据库（启动时调用）
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected / PostgreSQL 已连接');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed / PostgreSQL 连接失败:', error);
    throw error;
  }
}

/**
 * 断开数据库连接
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await pool.end();
    console.log('PostgreSQL disconnected / PostgreSQL 已断开');
  } catch (error) {
    console.error('Error disconnecting database / 断开数据库连接时出错:', error);
  }
}

/**
 * 获取连接池状态
 * Get pool status
 */
export function getPoolStatus() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

export { pool };
