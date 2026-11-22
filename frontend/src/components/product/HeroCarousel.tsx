/**
 * 首页 - Hero 轮播组件
 * Home Page - Hero Carousel Component
 *
 * @description 首页顶部轮播图组件，展示促销活动和大图 Banner
 *              Hero carousel component for homepage banners
 * @module components/product/HeroCarousel
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Banner 数据结构
 * @typedef {Object} Banner
 * @property {string} title - 标题
 * @property {string} subtitle - 副标题
 * @property {string} image_url - 图片 URL
 * @property {string} link_url - 链接 URL
 * @property {string} [title_en] - 英文标题
 * @property {string} [subtitle_en] - 英文副标题
 */

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  title_en?: string;
  subtitle_en?: string;
}

/**
 * Hero 轮播组件 / Hero Carousel
 */
export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // 模拟 Banner 数据 / Mock banner data
  const banners: Banner[] = [
    {
      id: '1',
      title: '夏季大促销',
      subtitle: '全场低至 5 折起',
      image_url: '/images/banners/summer-sale.jpg',
      link_url: '/products?sale=true',
      title_en: 'Summer Sale',
      subtitle_en: 'Up to 50% off',
    },
    {
      id: '2',
      title: '新品首发',
      subtitle: '探索最新潮流好物',
      image_url: '/images/banners/new-arrivals.jpg',
      link_url: '/products?is_new=true',
      title_en: 'New Arrivals',
      subtitle_en: 'Discover the latest trends',
    },
    {
      id: '3',
      title: '会员专享',
      subtitle: '注册即享 9 折优惠',
      image_url: '/images/banners/membership.jpg',
      link_url: '/register',
      title_en: 'Member Exclusive',
      subtitle_en: '10% off for new members',
    },
  ];

  // 自动轮播 / Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
      {/* Slides / 幻灯片 */}
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Background Image / 背景图片 */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${banner.image_url})` }}
          >
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Content / 内容 */}
          <div className="relative h-full flex items-center justify-center text-center text-white px-4">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
                {banner.title}
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-white/90">
                {banner.subtitle}
              </p>
              <Link
                to={banner.link_url}
                className="inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                立即查看 / Shop Now
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Dots Indicator / 指示点 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
            }`}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
