/**
 * 商品列表页 / Products Page
 * @description 展示商品列表，支持搜索、筛选、分页
 * @module pages/shop/ProductsPage
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'list', page, searchParams.toString()],
    queryFn: () => api.get(`/products?${searchParams.toString()}`),
  });

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    newParams.set('page', '1');
    setSearchParams(newParams);
    setPage(1);
  };

  const totalPages = data?.pagination?.total_pages || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* 侧边栏筛选 / Sidebar filters */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">筛选 / Filters</h3>

            {/* 价格区间 / Price range */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">价格区间 / Price</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="最低 / Min"
                  className="input-field text-sm"
                  onChange={(e) => updateFilter('min_price', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="最高 / Max"
                  className="input-field text-sm"
                  onChange={(e) => updateFilter('max_price', e.target.value)}
                />
              </div>
            </div>

            {/* 排序 / Sort */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">排序 / Sort</h4>
              <select
                className="input-field text-sm"
                value={searchParams.get('sort_by') || 'created_at'}
                onChange={(e) => {
                  updateFilter('sort_by', e.target.value);
                  updateFilter('sort_order', e.target.value === 'price' ? 'asc' : 'desc');
                }}
              >
                <option value="created_at">最新上架 / Newest</option>
                <option value="price_asc">价格从低到高 / Price: Low to High</option>
                <option value="price_desc">价格从高到低 / Price: High to Low</option>
                <option value="rating">评分最高 / Highest Rated</option>
                <option value="sold">销量最高 / Best Selling</option>
              </select>
            </div>

            {/* 快捷筛选 / Quick filters */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchParams.get('in_stock') === 'true'}
                  onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">仅显示有货 / In Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchParams.get('is_featured') === 'true'}
                  onChange={(e) => updateFilter('is_featured', e.target.checked ? 'true' : '')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">推荐商品 / Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchParams.get('is_on_sale') === 'true'}
                  onChange={(e) => updateFilter('is_on_sale', e.target.checked ? 'true' : '')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">促销中 / On Sale</span>
              </label>
            </div>
          </div>
        </aside>

        {/* 商品列表 / Product grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {searchParams.get('q') ? `搜索结果: "${searchParams.get('q')}"` : '全部商品 / All Products'}
            </h1>
            <p className="text-sm text-gray-500">
              共 {data?.pagination?.total || 0} 件商品
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.data?.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* 分页 / Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => { setPage(p => Math.max(1, p - 1)); setSearchParams(p => { p.set('page', String(Math.max(1, page - 1))); return p; }); }}
                    disabled={page === 1}
                    className="btn-secondary px-4 py-2 disabled:opacity-50"
                  >
                    上一页 / Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setSearchParams(p => { p.set('page', String(Math.min(totalPages, page + 1))); return p; }); }}
                    disabled={page === totalPages}
                    className="btn-secondary px-4 py-2 disabled:opacity-50"
                  >
                    下一页 / Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
