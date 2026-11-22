/**
 * 商品详情页 / Product Detail Page
 * @description 展示商品详细信息、图片、规格选择、加入购物车
 * @module pages/shop/ProductDetailPage
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/services/api';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`),
    enabled: !!slug,
  });

  const product = data?.data;

  const handleAddToCart = async () => {
    try {
      await api.post('/cart/items', {
        product_id: product.id,
        variant_id: selectedVariant?.id,
        quantity,
      });
      addItem(product, selectedVariant, quantity);
      toast.success('已添加到购物车 / Added to cart');
    } catch (error) {
      toast.error('添加失败 / Failed to add to cart');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">商品不存在 / Product not found</h2>
        <Link to="/products" className="btn-primary mt-4 inline-block">
          返回商品列表 / Back to Products
        </Link>
      </div>
    );
  }

  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">首页 / Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-primary-600">商品 / Products</Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product images */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={product.images?.[0]?.url || product.primary_image || '/images/placeholder.jpg'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-4">
              {product.images.map((img: any) => (
                <div key={img.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer">
                  <img src={img.url} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          {product.category_name && (
            <Link to={`/categories/${product.category_slug}`} className="text-sm text-primary-600 hover:underline">
              {product.category_name}
            </Link>
          )}

          <h1 className="text-3xl font-bold text-gray-900 mt-2">{product.name}</h1>

          {/* Rating */}
          {product.rating_average > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className={`w-5 h-5 ${star <= Math.round(product.rating_average) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating_average} ({product.rating_count || 0} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mt-6">
            <span className="text-4xl font-bold text-red-600">¥{Number(product.price).toFixed(2)}</span>
            {product.original_price && product.original_price > product.price && (
              <>
                <span className="text-xl text-gray-400 line-through">¥{Number(product.original_price).toFixed(2)}</span>
                <span className="badge bg-red-100 text-red-700">-{discount}%</span>
              </>
            )}
          </div>

          {/* Stock */}
          <p className={`mt-4 text-sm ${product.available_stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {product.available_stock > 0
              ? `库存充足 / In Stock (${product.available_stock} available)`
              : '暂时缺货 / Out of Stock'}
          </p>

          {/* Variant selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">规格 / Variants</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant: any) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 border rounded-lg text-sm transition-colors ${
                      selectedVariant?.id === variant.id
                        ? 'border-primary-600 bg-primary-50 text-primary-600'
                        : 'border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {variant.name} - ¥{Number(variant.price).toFixed(2)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">数量 / Quantity</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50">-</button>
              <span className="text-lg font-medium w-12 text-center">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.available_stock, quantity + 1))} className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50">+</button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleAddToCart}
              disabled={product.available_stock <= 0}
              className="btn-primary flex-1 py-3 text-lg"
            >
              {product.available_stock > 0 ? '加入购物车 / Add to Cart' : '暂时缺货 / Out of Stock'}
            </button>
          </div>

          {/* Description */}
          {product.short_description && (
            <div className="mt-8 pt-8 border-t">
              <h3 className="font-semibold text-gray-900 mb-2">商品描述 / Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.short_description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
