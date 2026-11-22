/**
 * 前端类型定义 / Frontend Type Definitions
 * @description 定义前端使用的 TypeScript 类型接口
 * @module types
 */

/**
 * 用户类型 / User Type
 */
export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  status: string;
  email_verified: boolean;
  loyalty_points: number;
  created_at: string;
}

/**
 * 商品类型 / Product Type
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  short_description?: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  status: string;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  total_stock: number;
  available_stock: number;
  sold_count: number;
  view_count: number;
  rating_average: number;
  rating_count: number;
  tags?: string[];
  primary_image?: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  category_name?: string;
  category_slug?: string;
  brand_name?: string;
  related_products?: Product[];
  created_at: string;
}

/**
 * 商品图片类型 / Product Image Type
 */
export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
}

/**
 * 商品规格类型 / Product Variant Type
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: number;
  original_price?: number;
  total_stock: number;
  available_stock: number;
  image_url?: string;
  is_active: boolean;
}

/**
 * 购物车条目类型 / Cart Item Type
 */
export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  name: string;
  image?: string;
  available_stock?: number;
  in_stock: boolean;
}

/**
 * 购物车汇总类型 / Cart Summary Type
 */
export interface CartSummary {
  cart_id: string;
  items: CartItem[];
  subtotal: number;
  total_items: number;
}

/**
 * 订单类型 / Order Type
 */
export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  order_status: string;
  payment_status: string;
  subtotal_amount: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  shipping_address: Record<string, any>;
  tracking_number?: string;
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
}

/**
 * 订单条目类型 / Order Item Type
 */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
}

/**
 * 订单状态历史类型 / Order Status History Type
 */
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status?: string;
  to_status: string;
  note?: string;
  created_at: string;
}

/**
 * 分类类型 / Category Type
 */
export interface Category {
  id: string;
  parent_id?: string;
  name: string;
  name_en?: string;
  slug: string;
  description?: string;
  image_url?: string;
  icon_url?: string;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
}

/**
 * 评论类型 / Review Type
 */
export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
  is_verified_purchase: boolean;
  status: string;
  helpful_count: number;
  created_at: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

/**
 * 地址类型 / Address Type
 */
export interface Address {
  id: string;
  user_id: string;
  label?: string;
  recipient_name: string;
  recipient_phone: string;
  country: string;
  province: string;
  city: string;
  district?: string;
  street_address: string;
  postal_code?: string;
  is_default: boolean;
}

/**
 * 优惠券类型 / Coupon Type
 */
export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  coupon_type: string;
  value: number;
  min_order_amount: number;
  total_quantity: number;
  used_quantity: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

/**
 * 通知类型 / Notification Type
 */
export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

/**
 * API 响应类型 / API Response Type
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * 分页参数类型 / Pagination Params Type
 */
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * 品牌类型 / Brand Type
 */
export interface Brand {
  id: string;
  name: string;
  name_en?: string;
  slug: string;
  logo_url?: string;
  description?: string;
  is_verified: boolean;
  is_active: boolean;
  product_count?: number;
}

/**
 * Banner 类型 / Banner Type
 */
export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  position?: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * 物流方式类型 / Shipping Method Type
 */
export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  base_price: number;
  free_shipping_threshold?: number;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
}

/**
 * 支付类型 / Payment Type
 */
export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  payment_method: string;
  payment_status: string;
  amount: number;
  currency: string;
  paid_at?: string;
}

/**
 * 退款类型 / Refund Type
 */
export interface Refund {
  id: string;
  order_id: string;
  user_id: string;
  refund_status: string;
  amount: number;
  reason: string;
  created_at: string;
}

/**
 * 库存类型 / Inventory Type
 */
export interface Inventory {
  id: string;
  product_id: string;
  variant_id?: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  min_stock_level: number;
  reorder_point: number;
}

/**
 * 搜索响应类型 / Search Response Type
 */
export interface SearchResponse {
  products: any[];
  total: number;
  page: number;
  total_pages: number;
}
