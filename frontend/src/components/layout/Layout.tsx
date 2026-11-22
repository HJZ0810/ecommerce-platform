/**
 * 通用布局组件
 * Common Layout Components
 *
 * @description 头部导航、页脚、侧边栏等共享布局组件
 * @module components/layout
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

/**
 * 顶部导航栏 / Header Navigation
 *
 * @param {Object} props
 * @param {boolean} [props.transparent] - 是否透明背景
 */
export function Header({ transparent = false }: { transparent?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();
  const { totalItems } = useCartStore();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className={`sticky top-0 z-50 ${transparent ? 'bg-transparent' : 'bg-white shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-bold text-gray-900">电商平台</span>
          </Link>

          {/* 导航链接 / Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/' ? 'text-primary-600' : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              首页 / Home
            </Link>
            <Link
              to="/products"
              className={`text-sm font-medium transition-colors ${
                isActive('/products') ? 'text-primary-600' : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              全部商品 / Products
            </Link>
            <Link
              to="/products?featured=true"
              className={`text-sm font-medium transition-colors ${
                isActive('/categories') ? 'text-primary-600' : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              分类 / Categories
            </Link>
          </nav>

          {/* 右侧操作区 / Right Actions */}
          <div className="flex items-center space-x-4">
            {/* 搜索图标 / Search Icon */}
            <Link to="/search" className="text-gray-700 hover:text-primary-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>

            {/* 购物车 / Cart */}
            <Link to="/cart" className="relative text-gray-700 hover:text-primary-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {/* 收藏 / Wishlist */}
            <Link to="/wishlist" className="hidden sm:block text-gray-700 hover:text-primary-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </Link>

            {/* 用户菜单 / User Menu */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-1 text-sm text-gray-700">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-medium">
                      {(user?.first_name || user?.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    个人中心 / Account
                  </Link>
                  <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    我的订单 / Orders
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      管理后台 / Admin
                    </Link>
                  )}
                  <hr className="my-1" />
                  <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                    退出登录 / Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary-600">
                  登录 / Login
                </Link>
                <Link to="/register" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
                  注册 / Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * 页脚 / Footer
 */
export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 公司信息 / Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">电商平台</h3>
            <p className="text-gray-400 text-sm">
              优质商品，便捷购物体验。<br />
              Quality products, convenient shopping experience.
            </p>
          </div>

          {/* 客户服务 / Customer Service */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">客户服务</h4>
            <ul className="space-y-2">
              <li><Link to="/help" className="text-gray-400 hover:text-white text-sm">帮助中心</Link></li>
              <li><Link to="/shipping" className="text-gray-400 hover:text-white text-sm">配送说明</Link></li>
              <li><Link to="/returns" className="text-gray-400 hover:text-white text-sm">退换货政策</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-white text-sm">常见问题</Link></li>
            </ul>
          </div>

          {/* 关于我们 / About */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">关于我们</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-400 hover:text-white text-sm">关于我们</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white text-sm">联系我们</Link></li>
              <li><Link to="/careers" className="text-gray-400 hover:text-white text-sm">加入我们</Link></li>
            </ul>
          </div>

          {/* 法律信息 / Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">法律信息</h4>
            <ul className="space-y-2">
              <li><Link to="/terms" className="text-gray-400 hover:text-white text-sm">服务条款</Link></li>
              <li><Link to="/privacy" className="text-gray-400 hover:text-white text-sm">隐私政策</Link></li>
              <li><Link to="/cookies" className="text-gray-400 hover:text-white text-sm">Cookie 政策</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} 电商平台. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
