/**
 * 收藏页 / Wishlist Page
 * @description 展示用户收藏的商品列表
 * @module pages/account/WishlistPage
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { ProductCard } from '@/components/product/ProductCard';

export default function WishlistPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist'),
  });

  const items = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">我的收藏 / My Wishlist ({items.length})</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-6 animate-pulse"><div className="aspect-square bg-gray-200 rounded-lg mb-4" /><div className="h-4 bg-gray-200 rounded w-3/4" /></div>)}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((product: any) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">❤️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">收藏列表为空 / Your wishlist is empty</h2>
          <p className="text-gray-500 mb-6">浏览商品并点击爱心添加到收藏</p>
          <Link to="/products" className="btn-primary">去购物 / Start Shopping</Link>
        </div>
      )}
    </div>
  );
}
