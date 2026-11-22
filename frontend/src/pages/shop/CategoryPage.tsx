/**
 * 分类页 / Category Page
 * @description 展示分类下的商品列表
 * @module pages/shop/CategoryPage
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: categoryData, isLoading: catLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => api.get(`/categories/${slug}`),
    enabled: !!slug,
  });

  const category = categoryData?.data;

  const { data: productsData, isLoading: prodLoading } = useQuery({
    queryKey: ['products', 'category', slug],
    queryFn: () => api.get(`/products?category_id=${slug}&limit=24`),
    enabled: !!slug,
  });

  if (catLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">分类不存在 / Category not found</h2>
        <Link to="/categories" className="btn-primary mt-4 inline-block">返回分类列表 / Back to Categories</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">首页 / Home</Link>
        <span>/</span>
        <Link to="/categories" className="hover:text-primary-600">分类 / Categories</Link>
        <span>/</span>
        <span className="text-gray-900">{category.name}</span>
      </nav>

      <div className="flex gap-8">
        {/* Subcategories / 子分类 */}
        {category.children && category.children.length > 0 && (
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">子分类 / Subcategories</h3>
              <div className="space-y-2">
                {category.children.map((child: any) => (
                  <Link key={child.id} to={`/categories/${child.slug}`} className="block text-sm text-gray-600 hover:text-primary-600 py-1">
                    {child.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Products */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-gray-600 mb-6">{category.description}</p>
          )}
          <p className="text-sm text-gray-500 mb-6">
            共 {productsData?.pagination?.total || 0} 件商品
          </p>

          {prodLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {productsData?.data?.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
