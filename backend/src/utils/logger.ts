/**
 *  Winston 日志配置
 *  Winston Logger Configuration
 *
 * @description 配置多级别日志：控制台输出、文件日志、日志轮转
 *              Configures multi-level logging: console, file, rotation
 * @module utils/logger
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_DIR = process.env.LOG_DIR || 'logs';

/**
 * 日志级别定义
 * 从高到低：error > warn > info > http > debug
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * 根据环境设置日志级别
 * Set log level based on environment
 */
const level = () => {
  if (NODE_ENV === 'production') return 'info';
  if (NODE_ENV === 'test') return 'error';
  return 'debug';
};

/**
 * Winston 日志器实例
 */
const logger = winston.createLogger({
  level: level(),
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      // / 中英双语日志格式 / Bilingual log format
      let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      if (stack) {
        log += `\n${stack}`;
      }
      if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta)}`;
      }
      return log;
    })
  ),
  transports: [
    // 错误日志文件（每天轮转，保留30天）/ Error log file (daily rotation, keep 30 days)
    new DailyRotateFile({
      filename: `${LOG_DIR}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
    }),
    // 所有日志文件（每天轮转，保留7天）/ All logs file (daily rotation, keep 7 days)
    new DailyRotateFile({
      filename: `${LOG_DIR}/combined-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
      level: 'info',
    }),
  ],
});

/**
 * 开发环境添加控制台输出
 * Add console output in development
 */
if (NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      ),
    })
  );
}

/**
 * HTTP 请求日志流（用于 Morgan）
 * HTTP request log stream (for Morgan)
 */
export const httpLoggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
