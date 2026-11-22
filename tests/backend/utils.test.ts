/**
 * 工具函数测试 / Utils Tests
 * @module tests/backend/utils.test
 */

import { describe, it, expect } from 'vitest';
import { formatPrice, formatDate, truncateText, generateSlug, isValidEmail, isValidPhone, cn } from '@/utils/logger.js';

describe('Utils', () => {
  describe('formatPrice', () => {
    it('should format price in CNY', () => {
      expect(formatPrice(100)).toBe('¥100.00');
      expect(formatPrice(99.99)).toBe('¥99.99');
    });
  });

  describe('formatDate', () => {
    it('should format date', () => {
      const result = formatDate('2024-01-15');
      expect(result).toContain('2024');
      expect(result).toContain('1');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      expect(truncateText('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short text', () => {
      expect(truncateText('Hi', 5)).toBe('Hi');
    });
  });

  describe('generateSlug', () => {
    it('should generate URL-friendly slug', () => {
      expect(generateSlug('Hello World!')).toBe('hello-world');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate Chinese phone number', () => {
      expect(isValidPhone('13812345678')).toBe(true);
    });

    it('should reject invalid phone', () => {
      expect(isValidPhone('12345')).toBe(false);
    });
  });

  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('a', 'b', undefined, false, 'c')).toBe('a b c');
    });
  });
});
