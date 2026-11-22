/**
 * 首页 / Home Page
 * @description 展示轮播 Banner、热门商品、新品、热销商品
 * @module pages/shop/HomePage
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { HeroCarousel } from '@/components/product/HeroCarousel';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { SectionTitle } from '@/components/common/SectionTitle';

/**
 * 首页组件 / Home Page Component
 */
export default function HomePage() {
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/products/featured?limit=8'),
  });

  const { data: newData, isLoading: newLoading } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: () => api.get('/products/new?limit=8'),
  });

  const { data: bestsellerData, isLoading: bestsellerLoading } = useQuery({
    queryKey: ['products', 'bestsellers'],
    queryFn: () => api.get('/products/bestsellers?limit=8'),
  });

  return (
    <div>
      {/* Hero Carousel / 轮播图 */}
      <HeroCarousel />

      {/* 热门推荐 / Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SectionTitle
          title="热门推荐 / Featured Products"
          subtitle="精选优质商品，为你推荐 / Selected quality products for you"
          link="/products?is_featured=true"
          linkText="查看全部 / View All"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featuredData?.data?.map((product: any) => <ProductCard key={product.id} product={product} />)
          }
        </div>
      </section>

      {/* 新品上市 / New Arrivals */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="新品上市 / New Arrivals"
            subtitle="探索最新上架的商品 / Discover the latest arrivals"
            link="/products?is_new=true"
            linkText="查看全部 / View All"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : newData?.data?.map((product: any) => <ProductCard key={product.id} product={product} />)
            }
          </div>
        </div>
      </section>

      {/* 热销排行 / Bestsellers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SectionTitle
          title="热销排行 / Bestsellers"
          subtitle="最受欢迎的畅销商品 / Most popular best-selling products"
          link="/products?is_bestseller=true"
          linkText="查看全部 / View All"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestsellerLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : bestsellerData?.data?.map((product: any) => <ProductCard key={product.id} product={product} />)
          }
        </div>
      </section>

      {/* 服务特色 / Features */}
      <section className="bg-primary-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: '🚚', title: '免费配送', desc: '满 99 元免运费' },
              { icon: '🔒', title: '安全支付', desc: '多种支付方式' },
              { icon: '↩️', title: '7天退换', desc: '不满意随时退' },
              { icon: '💬', title: '24/7 客服', desc: '全天候在线服务' },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
