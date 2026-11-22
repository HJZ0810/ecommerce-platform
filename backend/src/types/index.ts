/**
 * 后端类型定义 / Backend Type Definitions
 * @description 集中定义所有 TypeScript 接口和类型
 * @module types
 */

/**
 * 用户类型 / User Type
 * @typedef {Object} User
 * @property {string} id - 用户唯一标识符 (UUID)
 * @property {string} email - 用户邮箱地址 (CITEXT, 唯一, 非空)
 * @property {string} [phone] - 用户手机号 (唯一)
 * @property {string} [first_name] - 名字
 * @property {string} [last_name] - 姓氏
 * @property {string} [display_name] - 显示名称
 * @property {string} [avatar_url] - 头像 URL
 * @property {string} [gender] - 性别 (male/female/other/prefer_not_to_say)
 * @property {Date} [birthday] - 生日
 * @property {string} role - 角色 (customer/admin/super_admin/vendor/support)
 * @property {string} status - 状态 (active/suspended/pending_verification/deleted)
 * @property {boolean} email_verified - 邮箱是否已验证
 * @property {boolean} phone_verified - 手机号是否已验证
 * @property {Date} [last_login_at] - 最后登录时间
 * @property {string} [last_login_ip] - 最后登录 IP
 * @property {number} loyalty_points - 积分数量
 * @property {string} [referral_code] - 推荐码
 * @property {Date} created_at - 创建时间
 * @property {Date} updated_at - 更新时间
 */
export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  gender?: string;
  birthday?: Date;
  role: string;
  status: string;
  email_verified: boolean;
  phone_verified: boolean;
  last_login_at?: Date;
  last_login_ip?: string;
  loyalty_points: number;
  referral_code?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 商品类型 / Product Type
 * @typedef {Object} Product
 * @property {string} id - 商品唯一标识符 (UUID)
 * @property {string} sku - 商品 SKU (唯一, 非空)
 * @property {string} name - 商品名称 (非空)
 * @property {string} slug - URL 友好标识符 (唯一, 非空)
 * @property {string} [short_description] - 简短描述
 * @property {string} [full_description] - 完整描述
 * @property {string} category_id - 所属分类 ID
 * @property {string} [brand_id] - 所属品牌 ID
 * @property {number} price - 售价 (非空)
 * @property {number} [original_price] - 原价
 * @property {number} [cost_price] - 成本价
 * @property {string} status - 状态 (draft/active/inactive/out_of_stock/discontinued)
 * @property {boolean} is_featured - 是否为推荐商品
 * @property {boolean} is_new - 是否为新商品
 * @property {boolean} is_bestseller - 是否为热销商品
 * @property {number} total_stock - 总库存
 * @property {number} reserved_stock - 已预留库存
 * @property {number} sold_count - 销量
 * @property {number} view_count - 浏览量
 * @property {number} rating_average - 平均评分 (0-5)
 * @property {number} rating_count - 评论数量
 * @property {string[]} [tags] - 标签数组
 * @property {string} [primary_image] - 主图 URL
 * @property {Date} created_at - 创建时间
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  short_description?: string;
  full_description?: string;
  category_id: string;
  brand_id?: string;
  price: number;
  original_price?: number;
  cost_price?: number;
  status: string;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  total_stock: number;
  reserved_stock: number;
  sold_count: number;
  view_count: number;
  rating_average: number;
  rating_count: number;
  tags?: string[];
  primary_image?: string;
  category_name?: string;
  brand_name?: string;
  available_stock: number;
  discount_percentage?: number;
  created_at: Date;
}

/**
 * 购物车类型 / Cart Type
 * @typedef {Object} CartItem
 * @property {string} id - 购物车条目 ID
 * @property {string} cart_id - 购物车 ID
 * @property {string} product_id - 商品 ID
 * @property {string} [variant_id] - 规格 ID
 * @property {number} quantity - 数量
 * @property {number} unit_price - 单价
 * @property {number} subtotal - 小计金额
 * @property {string} name - 商品名称
 * @property {string} [image] - 商品图片
 * @property {number} [available_stock] - 可用库存
 * @property {boolean} in_stock - 是否有货
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
 * 购物车汇总 / Cart Summary
 * @typedef {Object} CartSummary
 * @property {string} cart_id - 购物车 ID
 * @property {CartItem[]} items - 购物车商品列表
 * @property {number} subtotal - 小计金额
 * @property {number} total_items - 商品总数
 */
export interface CartSummary {
  cart_id: string;
  items: CartItem[];
  subtotal: number;
  total_items: number;
}

/**
 * 订单类型 / Order Type
 * @typedef {Object} Order
 * @property {string} id - 订单唯一标识符 (UUID)
 * @property {string} order_number - 订单编号 (唯一, 非空)
 * @property {string} user_id - 用户 ID
 * @property {string} order_status - 订单状态
 * @property {string} payment_status - 支付状态
 * @property {number} subtotal_amount - 商品小计
 * @property {number} discount_amount - 优惠金额
 * @property {number} shipping_amount - 运费
 * @property {number} tax_amount - 税费
 * @property {number} total_amount - 总金额
 * @property {string} currency - 货币类型
 * @property {object} shipping_address - 收货地址快照 (JSON)
 * @property {string} [tracking_number] - 物流单号
 * @property {Date} [paid_at] - 支付时间
 * @property {Date} [shipped_at] - 发货时间
 * @property {Date} [delivered_at] - 送达时间
 * @property {Date} created_at - 创建时间
 * @property {OrderItem[]} [items] - 订单商品列表
 * @property {OrderStatusHistory[]} [status_history] - 状态变更历史
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
  paid_at?: Date;
  shipped_at?: Date;
  delivered_at?: Date;
  created_at: Date;
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
}

/**
 * 订单商品条目 / Order Item
 * @typedef {Object} OrderItem
 * @property {string} id - 条目 ID
 * @property {string} order_id - 订单 ID
 * @property {string} product_id - 商品 ID
 * @property {string} [variant_id] - 规格 ID
 * @property {string} product_name - 商品名称 (下单快照)
 * @property {number} quantity - 数量
 * @property {number} unit_price - 单价
 * @property {number} discount_amount - 折扣金额
 * @property {number} subtotal - 小计
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
 * 订单状态历史 / Order Status History
 * @typedef {Object} OrderStatusHistory
 * @property {string} id - 记录 ID
 * @property {string} order_id - 订单 ID
 * @property {string} [from_status] - 原状态
 * @property {string} to_status - 新状态
 * @property {string} [note] - 备注
 * @property {Date} created_at - 创建时间
 */
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status?: string;
  to_status: string;
  note?: string;
  created_at: Date;
}

/**
 * 分类类型 / Category Type
 * @typedef {Object} Category
 * @property {string} id - 分类 ID
 * @property {string} [parent_id] - 父分类 ID
 * @property {string} name - 分类名称
 * @property {string} [name_en] - 英文名称
 * @property {string} slug - URL 友好标识符 (唯一)
 * @property {string} [description] - 描述
 * @property {string} [image_url] - 图片 URL
 * @property {number} sort_order - 排序
 * @property {boolean} is_active - 是否激活
 * @property {Category[]} [children] - 子分类
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
 * @typedef {Object} Review
 * @property {string} id - 评论 ID
 * @property {string} product_id - 商品 ID
 * @property {string} user_id - 用户 ID
 * @property {number} rating - 评分 (1-5)
 * @property {string} [title] - 标题
 * @property {string} [content] - 内容
 * @property {string[]} [images] - 图片数组
 * @property {boolean} is_verified_purchase - 是否为已验证购买
 * @property {string} status - 状态 (pending/approved/rejected/flagged)
 * @property {number} helpful_count - 有用投票数
 * @property {Date} created_at - 创建时间
 * @property {string} [first_name] - 评论者名字
 * @property {string} [avatar_url] - 评论者头像
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
  report_count: number;
  created_at: Date;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

/**
 * 地址类型 / Address Type
 * @typedef {Object} Address
 * @property {string} id - 地址 ID
 * @property {string} user_id - 用户 ID
 * @property {string} [label] - 标签 (home/work/other)
 * @property {string} recipient_name - 收件人姓名
 * @property {string} recipient_phone - 收件人电话
 * @property {string} country - 国家
 * @property {string} province - 省份
 * @property {string} city - 城市
 * @property {string} [district] - 区县
 * @property {string} street_address - 详细地址
 * @property {string} [postal_code] - 邮编
 * @property {boolean} is_default - 是否为默认地址
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
 * @typedef {Object} Coupon
 * @property {string} id - 优惠券 ID
 * @property {string} code - 优惠券代码 (唯一)
 * @property {string} name - 优惠券名称
 * @property {string} description - 描述
 * @property {string} coupon_type - 类型 (percentage/fixed_amount/free_shipping/buy_x_get_y)
 * @property {number} value - 面值 (百分比或固定金额)
 * @property {number} min_order_amount - 最低订单金额
 * @property {number} total_quantity - 总数量
 * @property {number} used_quantity - 已使用数量
 * @property {Date} valid_from - 有效期开始
 * @property {Date} valid_until - 有效期结束
 * @property {boolean} is_active - 是否激活
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
  valid_from: Date;
  valid_until: Date;
  is_active: boolean;
}

/**
 * 通知类型 / Notification Type
 * @typedef {Object} Notification
 * @property {string} id - 通知 ID
 * @property {string} user_id - 用户 ID
 * @property {string} notification_type - 通知类型
 * @property {string} title - 标题
 * @property {string} content - 内容
 * @property {boolean} is_read - 是否已读
 * @property {Date} read_at - 阅读时间
 * @property {Date} created_at - 创建时间
 */
export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  title_en?: string;
  content: string;
  content_en?: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: Date;
  sent_via_channel: string;
  created_at: Date;
}

/**
 * API 通用响应格式 / Standard API Response
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 是否成功
 * @property {string} [message] - 消息
 * @property {string} [error] - 错误信息
 * @property {string} [errorCode] - 错误代码
 * @property {any} [data] - 响应数据
 * @property {Object} [pagination] - 分页信息
 * @property {number} pagination.page - 当前页码
 * @property {number} pagination.limit - 每页数量
 * @property {number} pagination.total - 总数量
 * @property {number} pagination.total_pages - 总页数
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  message_zh?: string;
  error?: string;
  error_zh?: string;
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
 * 分页查询参数 / Pagination Query Params
 * @typedef {Object} PaginationParams
 * @property {number} page - 页码 (默认 1)
 * @property {number} limit - 每页数量 (默认 24, 最大 100)
 * @property {string} [sort_by] - 排序字段
 * @property {string} [sort_order] - 排序方向 (asc/desc)
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: string;
}

/**
 * 品牌类型 / Brand Type
 * @typedef {Object} Brand
 * @property {string} id - 品牌 ID
 * @property {string} name - 品牌名称
 * @property {string} [name_en] - 英文名称
 * @property {string} slug - URL 友好标识符 (唯一)
 * @property {string} [logo_url] - Logo URL
 * @property {string} [description] - 描述
 * @property {boolean} is_verified - 是否认证
 * @property {boolean} is_active - 是否激活
 */
export interface Brand {
  id: string;
  name: string;
  name_en?: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  is_verified: boolean;
  is_active: boolean;
  product_count?: number;
}

/**
 * 库存类型 / Inventory Type
 * @typedef {Object} Inventory
 * @property {string} id - 库存记录 ID
 * @property {string} product_id - 商品 ID
 * @property {string} [variant_id] - 规格 ID
 * @property {string} warehouse_id - 仓库 ID
 * @property {number} quantity - 库存数量
 * @property {number} reserved_quantity - 预留数量
 * @property {number} min_stock_level - 最低库存阈值
 * @property {number} reorder_point - 补货点
 * @property {Date} [last_restocked_at] - 最后补货时间
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
  last_restocked_at?: Date;
}

/**
 * 物流方式类型 / Shipping Method Type
 * @typedef {Object} ShippingMethod
 * @property {string} id - 物流方式 ID
 * @property {string} name - 名称
 * @property {string} carrier - 承运商
 * @property {number} base_price - 基础价格
 * @property {number} [free_shipping_threshold] - 免运费门槛
 * @property {number} estimated_days_min - 预计最少天数
 * @property {number} estimated_days_max - 预计最多天数
 * @property {boolean} is_active - 是否激活
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
 * 支付记录类型 / Payment Type
 * @typedef {Object} Payment
 * @property {string} id - 支付记录 ID
 * @property {string} order_id - 订单 ID
 * @property {string} user_id - 用户 ID
 * @property {string} payment_method - 支付方式
 * @property {string} payment_status - 支付状态
 * @property {number} amount - 金额
 * @property {string} currency - 货币
 * @property {string} [transaction_id] - 第三方流水号
 * @property {Date} [paid_at] - 支付时间
 */
export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  payment_method: string;
  payment_status: string;
  amount: number;
  currency: string;
  transaction_id?: string;
  paid_at?: Date;
}

/**
 * 退款类型 / Refund Type
 * @typedef {Object} Refund
 * @property {string} id - 退款 ID
 * @property {string} order_id - 订单 ID
 * @property {string} user_id - 用户 ID
 * @property {string} refund_status - 退款状态
 * @property {number} amount - 退款金额
 * @property {string} reason - 退款原因
 * @property {string} [admin_note] - 管理员备注
 * @property {Date} [processed_at] - 处理时间
 */
export interface Refund {
  id: string;
  order_id: string;
  user_id: string;
  refund_status: string;
  refund_type: string;
  amount: number;
  currency: string;
  reason: string;
  evidence_images?: string[];
  admin_note?: string;
  processed_by?: string;
  processed_at?: Date;
  created_at: Date;
}

/**
 * 商品规格类型 / Product Variant Type
 * @typedef {Object} ProductVariant
 * @property {string} id - 规格 ID
 * @property {string} product_id - 商品 ID
 * @property {string} sku - 规格 SKU (唯一)
 * @property {string} name - 规格名称
 * @property {object} attributes - 规格属性 JSON (如 {"color": "Red", "size": "M"})
 * @property {number} price - 规格价格
 * @property {number} [original_price] - 规格原价
 * @property {number} total_stock - 规格总库存
 * @property {number} available_stock - 可用库存 (计算字段)
 * @property {string} [image_url] - 规格图片
 * @property {boolean} is_active - 是否激活
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
 * JWT Payload 类型 / JWT Payload
 * @typedef {Object} JWTPayload
 * @property {string} id - 用户 ID
 * @property {string} email - 用户邮箱
 * @property {string} role - 用户角色
 * @property {string} [clientId] - 客户端 ID
 * @property {number} iat - 签发时间
 * @property {number} exp - 过期时间
 * @property {string} iss - 签发者
 * @property {string} aud - 受众
 */
export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  clientId?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/**
 * 登录请求类型 / Login Request
 * @typedef {Object} LoginRequest
 * @property {string} email_or_phone - 邮箱或手机号
 * @property {string} password - 密码
 */
export interface LoginRequest {
  email_or_phone: string;
  password: string;
}

/**
 * 注册请求类型 / Register Request
 * @typedef {Object} RegisterRequest
 * @property {string} email - 邮箱地址
 * @property {string} password - 密码 (最少8位)
 * @property {string} [first_name] - 名字
 * @property {string} [last_name] - 姓氏
 * @property {string} [phone] - 手机号
 * @property {string} [referral_code] - 推荐码
 */
export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  referral_code?: string;
}

/**
 * 创建订单请求类型 / Create Order Request
 * @typedef {Object} CreateOrderRequest
 * @property {string} shipping_address_id - 收货地址 ID
 * @property {string} [billing_address_id] - 账单地址 ID
 * @property {string} [shipping_method_id] - 配送方式 ID
 * @property {string} payment_method - 支付方式
 * @property {string} [coupon_code] - 优惠券代码
 * @property {string} [customer_note] - 客户备注
 * @property {number} [points_to_use] - 使用积分
 */
export interface CreateOrderRequest {
  shipping_address_id: string;
  billing_address_id?: string;
  shipping_method_id?: string;
  payment_method: string;
  coupon_code?: string;
  customer_note?: string;
  points_to_use?: number;
}

/**
 * 搜索请求类型 / Search Request
 * @typedef {Object} SearchRequest
 * @property {string} q - 搜索关键词
 * @property {string} [category_id] - 分类筛选
 * @property {string} [brand_id] - 品牌筛选
 * @property {number} [min_price] - 最低价格
 * @property {number} [max_price] - 最高价格
 * @property {number} [rating] - 最低评分
 * @property {boolean} [in_stock] - 仅显示有货
 * @property {boolean} [is_featured] - 仅显示推荐
 * @property {boolean} [is_new] - 仅显示新品
 * @property {string[]} [tags] - 标签筛选
 * @property {number} page - 页码
 * @property {number} limit - 每页数量
 */
export interface SearchRequest {
  q: string;
  category_id?: string;
  brand_id?: string;
  min_price?: number;
  max_price?: number;
  rating?: number;
  in_stock?: boolean;
  is_featured?: boolean;
  is_new?: boolean;
  is_on_sale?: boolean;
  tags?: string[];
  page: number;
  limit: number;
}

/**
 * 系统配置类型 / System Config Type
 * @typedef {Object} SystemConfig
 * @property {string} id - 配置 ID
 * @property {string} config_key - 配置键
 * @property {any} config_value - 配置值 (JSON)
 * @property {string} [description] - 描述
 * @property {boolean} is_public - 是否公开
 */
export interface SystemConfig {
  id: string;
  config_key: string;
  config_value: Record<string, any>;
  description?: string;
  is_public: boolean;
}

/**
 * Banner 类型 / Banner Type
 * @typedef {Object} Banner
 * @property {string} id - Banner ID
 * @property {string} title - 标题
 * @property {string} subtitle - 副标题
 * @property {string} image_url - 图片 URL
 * @property {string} link_url - 链接 URL
 * @property {string} position - 位置
 * @property {boolean} is_active - 是否激活
 */
export interface Banner {
  id: string;
  title: string;
  title_en?: string;
  subtitle: string;
  subtitle_en?: string;
  image_url: string;
  link_url: string;
  position?: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * 页面类型 / Page Type (CMS)
 * @typedef {Object} Page
 * @property {string} id - 页面 ID
 * @property {string} slug - URL 友好标识符 (唯一)
 * @property {string} title - 页面标题
 * @property {string} content - 页面内容
 * @property {string} [content_html] - HTML 内容
 * @property {boolean} is_published - 是否发布
 */
export interface Page {
  id: string;
  slug: string;
  title: string;
  title_en?: string;
  content: string;
  content_en?: string;
  content_html?: string;
  meta_title?: string;
  meta_description?: string;
  is_published: boolean;
}

/**
 * 库存事务类型 / Inventory Transaction Type
 * @typedef {Object} InventoryTransaction
 * @property {string} id - 事务 ID
 * @property {string} inventory_id - 库存记录 ID
 * @property {string} product_id - 商品 ID
 * @property {string} transaction_type - 事务类型 (purchase/sale/return/adjustment/transfer)
 * @property {number} quantity_change - 数量变化 (正数为增加, 负数为减少)
 * @property {number} balance_after - 变动后余额
 * @property {string} [reference_type] - 关联类型
 * @property {string} [reference_id] - 关联 ID
 * @property {string} [note] - 备注
 * @property {Date} created_at - 创建时间
 */
export interface InventoryTransaction {
  id: string;
  inventory_id: string;
  product_id: string;
  variant_id?: string;
  transaction_type: string;
  quantity_change: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  note?: string;
  created_at: Date;
}

/**
 * 物流追踪事件类型 / Shipment Tracking Event Type
 * @typedef {Object} ShipmentTrackingEvent
 * @property {string} id - 事件 ID
 * @property {string} shipment_id - 物流 ID
 * @property {string} event_type - 事件类型
 * @property {string} description - 描述
 * @property {string} [location] - 地点
 * @property {Date} event_timestamp - 事件时间
 */
export interface ShipmentTrackingEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  description: string;
  location?: string;
  event_timestamp: Date;
  created_at: Date;
}

/**
 * 系统日志类型 / System Log Type
 * @typedef {Object} SystemLog
 * @property {string} id - 日志 ID
 * @property {string} level - 日志级别 (info/warn/error/debug)
 * @property {string} message - 日志消息
 * @property {object} context - 上下文信息 (JSON)
 * @property {string} [endpoint] - API 端点
 * @property {string} [http_method] - HTTP 方法
 * @property {number} [http_status] - HTTP 状态码
 * @property {number} [response_time_ms] - 响应时间(毫秒)
 * @property {Date} created_at - 创建时间
 */
export interface SystemLog {
  id: string;
  level: string;
  message: string;
  context: Record<string, any>;
  user_id?: string;
  request_id?: string;
  endpoint?: string;
  http_method?: string;
  http_status?: number;
  response_time_ms?: number;
  created_at: Date;
}

/**
 * 管理员操作日志类型 / Admin Activity Log Type
 * @typedef {Object} AdminActivityLog
 * @property {string} id - 日志 ID
 * @property {string} admin_id - 管理员 ID
 * @property {string} action - 操作类型
 * @property {string} resource_type - 资源类型
 * @property {string} [resource_id] - 资源 ID
 * @property {object} [before_state] - 操作前状态
 * @property {object} [after_state] - 操作后状态
 * @property {Date} created_at - 创建时间
 */
export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

/**
 * 认证响应类型 / Auth Response
 * @typedef {Object} AuthResponse
 * @property {boolean} success - 是否成功
 * @property {string} message - 消息
 * @property {string} access_token - 访问令牌
 * @property {string} refresh_token - 刷新令牌
 * @property {number} expires_in - 过期时间(秒)
 * @property {User} user - 用户信息
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: Partial<User>;
}

/**
 * 商品图片类型 / Product Image Type
 * @typedef {Object} ProductImage
 * @property {string} id - 图片 ID
 * @property {string} product_id - 商品 ID
 * @property {string} url - 图片 URL
 * @property {string} [alt_text] - 替代文本
 * @property {number} sort_order - 排序
 * @property {boolean} is_primary - 是否为主图
 * @property {number} [width] - 宽度
 * @property {number} [height] - 高度
 * @property {number} [file_size] - 文件大小(字节)
 */
export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  width?: number;
  height?: number;
  file_size?: number;
}

/**
 * 认证状态 / Auth State (for stores)
 * @typedef {Object} AuthState
 * @property {User|null} user - 当前用户
 * @property {boolean} isLoading - 加载中
 * @property {boolean} isAuthenticated - 是否已认证
 */

/**
 * 搜索响应类型 / Search Response
 * @typedef {Object} SearchResponse
 * @property {any[]} products - 商品列表
 * @property {number} total - 总结果数
 * @property {number} page - 当前页码
 * @property {number} total_pages - 总页数
 */

// ============================================================
// 数据库枚举类型映射 / Database Enum Type Mappings
// ============================================================
export const USER_ROLES = ['customer', 'admin', 'super_admin', 'vendor', 'support'] as const;
export const USER_STATUSES = ['active', 'suspended', 'pending_verification', 'deleted'] as const;
export const ORDER_STATUSES = ['pending', 'payment_received', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'partial_refund'] as const;
export const PAYMENT_STATUSES = ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'] as const;
export const PAYMENT_METHODS = ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'alipay', 'wechat_pay', 'bank_transfer', 'cash_on_delivery'] as const;
export const SHIPPING_STATUSES = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'] as const;
export const REFUND_STATUSES = ['requested', 'approved', 'processing', 'completed', 'rejected', 'cancelled'] as const;
export const PRODUCT_STATUSES = ['draft', 'active', 'inactive', 'out_of_stock', 'discontinued'] as const;
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'flagged'] as const;
export const COUPON_TYPES = ['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y'] as const;
export const NOTIFICATION_TYPES = ['order', 'promotion', 'system', 'review', 'shipping', 'refund'] as const;

export type UserRole = typeof USER_ROLES[number];
export type UserStatus = typeof USER_STATUSES[number];
export type OrderStatus = typeof ORDER_STATUSES[number];
export type PaymentStatus = typeof PAYMENT_STATUSES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type ShippingStatus = typeof SHIPPING_STATUSES[number];
export type RefundStatus = typeof REFUND_STATUSES[number];
export type ProductStatus = typeof PRODUCT_STATUSES[number];
export type ReviewStatus = typeof REVIEW_STATUSES[number];
export type CouponType = typeof COUPON_TYPES[number];
export type NotificationType = typeof NOTIFICATION_TYPES[number];
