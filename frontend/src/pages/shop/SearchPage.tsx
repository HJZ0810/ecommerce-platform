/**
 * 搜索页 / Search Page
 * @description 展示搜索关键词、自动补全、搜索结果
 * @module pages/shop/SearchPage
 */

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(query)}&limit=24`),
    enabled: !!query,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search form / 搜索表单 */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-4 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="搜索商品 / Search products..."
              className="input-field pl-10 pr-4 py-3"
              autoFocus
            />
            <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button type="submit" className="btn-primary px-8">搜索 / Search</button>
        </form>
      </div>

      {query && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            搜索结果 / Search Results for "{query}"
          </h1>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">
                找到 {data?.data?.total || 0} 件商品 / Found {data?.data?.total || 0} products
              </p>
              {data?.data?.products?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.data.products.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-lg">未找到相关商品 / No products found</p>
                  <p className="text-gray-400 mt-2">请尝试其他关键词 / Try other keywords</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
