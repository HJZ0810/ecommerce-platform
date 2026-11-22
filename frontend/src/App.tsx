/**
 * 应用根组件 / App Root Component
 * @description 配置路由、全局布局、语言环境
 * @module App
 */

import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layout / 布局
import Layout from '@/components/layout/Layout';

// Pages / 页面 - 懒加载 / Lazy loaded
const HomePage = lazy(() => import('@/pages/shop/HomePage'));
const ProductsPage = lazy(() => import('@/pages/shop/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/shop/ProductDetailPage'));
const CategoryPage = lazy(() => import('@/pages/shop/CategoryPage'));
const SearchPage = lazy(() => import('@/pages/shop/SearchPage'));
const CartPage = lazy(() => import('@/pages/shop/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/checkout/CheckoutPage'));
const OrdersPage = lazy(() => import('@/pages/account/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/account/OrderDetailPage'));
const AccountPage = lazy(() => import('@/pages/account/AccountPage'));
const AddressesPage = lazy(() => import('@/pages/account/AddressesPage'));
const WishlistPage = lazy(() => import('@/pages/account/WishlistPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const HelpPage = lazy(() => import('@/pages/shop/HelpPage'));
const AboutPage = lazy(() => import('@/pages/shop/AboutPage'));
const ContactPage = lazy(() => import('@/pages/shop/ContactPage'));
const TermsPage = lazy(() => import('@/pages/shop/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/shop/PrivacyPage'));
const FaqPage = lazy(() => import('@/pages/shop/FaqPage'));
const NotificationsPage = lazy(() => import('@/pages/account/NotificationsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/**
 * 加载占位组件 / Loading placeholder component
 */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}

/**
 * 应用根组件 / App Root Component
 */
export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 商店页面 / Shop Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/categories" element={<CategoryPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />

          {/* 账户页面 / Account Pages */}
          <Route path="/account" element={<AccountPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/addresses" element={<AddressesPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* 认证页面 / Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* 管理后台 / Admin Pages */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />

          {/* 信息页面 / Info Pages */}
          <Route path="/help" element={<HelpPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/faq" element={<FaqPage />} />

          {/* 404 页面 / 404 Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
