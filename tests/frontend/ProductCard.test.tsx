/**
 * 商品卡片组件测试 / Product Card Component Tests
 * @module tests/frontend/ProductCard.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/product/ProductCard';

const mockProduct = {
  id: 'p1',
  name: 'Test Product',
  slug: 'test-product',
  price: 99.99,
  original_price: 199.99,
  rating_average: 4.5,
  rating_count: 100,
  sold_count: 500,
  available_stock: 50,
  is_featured: true,
  is_new: false,
  primary_image: '/test.jpg',
};

describe('ProductCard', () => {
  it('should render product name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeDefined();
  });

  it('should render price', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('¥99.99')).toBeDefined();
  });

  it('should render discount badge when on sale', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('-50%')).toBeDefined();
  });

  it('should render featured badge', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('推荐 / HOT')).toBeDefined();
  });

  it('should render sold count', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText(/已售/)).toBeDefined();
  });
});
