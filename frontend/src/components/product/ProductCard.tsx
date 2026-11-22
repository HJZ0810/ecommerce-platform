/**
 * 首页 - 商品卡片组件
 * Product Card Component
 *
 * @description 商品列表中的商品卡片，包含图片、价格、评分等信息
 *              Product card for product listings
 * @module components/product/ProductCard
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

/**
 * 商品数据结构
 * @typedef {Object} Product
 * @property {string} id - 商品 ID
 * @property {string} name - 商品名称
 * @property {string} slug - URL slug
 * @property {number} price - 价格
 * @property {number} [original_price] - 原价
 * @property {number} [discount_percentage] - 折扣百分比
 * @property {string} [image] - 主图 URL
 * @property {number} [rating_average] - 平均评分
 * @property {number} [rating_count] - 评论数量
 * @property {number} [sold_count] - 销量
 * @property {number} [available_stock] - 可用库存
 */

/**
 * 商品卡片组件 / Product Card
 *
 * @param {Object} props
 * @param {Product} props.product - 商品数据
 */
export function ProductCard({ product }: { product: any }) {
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  return (
    <Link
      to={`/products/${product.slug || product.id}`}
      className="group bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      {/* Product Image / 商品图片 */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image || product.primary_image || '/images/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badges / 标签 */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              -{discount}%
            </span>
          )}
          {product.is_new && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
              新品 / NEW
            </span>
          )}
          {product.is_featured && (
            <span className="bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded">
              推荐 / HOT
            </span>
          )}
        </div>

        {/* Out of Stock Overlay / 缺货遮罩 */}
        {product.available_stock <= 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-lg">暂时缺货 / Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info / 商品信息 */}
      <div className="p-4">
        {/* Category / 分类 */}
        {product.category_name && (
          <p className="text-xs text-gray-500 mb-1">{product.category_name}</p>
        )}

        {/* Name / 名称 */}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>

        {/* Rating / 评分 */}
        {product.rating_average > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(product.rating_average) ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              ({product.rating_count || 0})
            </span>
          </div>
        )}

        {/* Price / 价格 */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-red-600">
            ¥{Number(product.price).toFixed(2)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-sm text-gray-400 line-through">
              ¥{Number(product.original_price).toFixed(2)}
            </span>
          )}
        </div>

        {/* Sold Count / 销量 */}
        {product.sold_count > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            已售 {product.sold_count > 999 ? `${(product.sold_count / 1000).toFixed(1)}k` : product.sold_count}+
          </p>
        )}
      </div>
    </Link>
  );
}

/**
 * 商品卡片骨架屏 / Product Card Skeleton
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4">
        <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-full mb-1" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="h-6 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}
