/**
 * 工具函数集 / Utility Functions
 * @description 提供常用的工具函数
 * @module utils/index
 */

/**
 * 格式化价格 / Format price
 * @param {number} price - 价格数值
 * @param {string} [currency='CNY'] - 货币类型
 * @returns {string} 格式化后的价格字符串
 */
export function formatPrice(price: number, currency: string = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
  }).format(price);
}

/**
 * 格式化日期 / Format date
 * @param {string|Date} date - 日期
 * @param {string} [locale='zh-CN'] - 区域设置
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date: string | Date, locale: string = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * 格式化日期时间 / Format datetime
 */
export function formatDateTime(date: string | Date, locale: string = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * 截断文本 / Truncate text
 * @param {string} text - 原文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * 防抖函数 / Debounce function
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待毫秒数
 * @returns {Function} 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数 / Throttle function
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制毫秒数
 * @returns {Function} 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 生成 slug / Generate slug
 * @param {string} text - 输入文本
 * @returns {string} URL 友好的 slug
 */
export function generateSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * 验证邮箱 / Validate email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 验证手机号 / Validate phone
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 类名合并 / Class names merge
 * @param  {...(string | undefined | false)} classes - 类名列表
 * @returns {string} 合并后的类名字符串
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 下载文件 / Download file
 * @param {string} url - 文件 URL
 * @param {string} filename - 文件名
 */
export function downloadFile(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
