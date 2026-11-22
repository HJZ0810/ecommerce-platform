# PostgreSQL 数据库 - 电商平台完整 Schema
# 版本: 1.0.0
# 说明: 包含所有数据表、索引、触发器、存储过程、函数

-- ============================================================
-- 扩展安装
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================
-- 枚举类型定义
-- ============================================================

-- 用户角色枚举
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'super_admin', 'vendor', 'support');

-- 性别枚举
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- 用户状态枚举
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification', 'deleted');

-- 订单状态枚举
CREATE TYPE order_status AS ENUM (
    'pending',           -- 待支付
    'payment_received',  -- 已支付
    'confirmed',         -- 已确认
    'processing',        -- 处理中
    'shipped',           -- 已发货
    'delivered',         -- 已送达
    'completed',         -- 已完成
    'cancelled',         -- 已取消
    'refunded',          -- 已退款
    'partial_refund'     -- 部分退款
);

-- 支付状态枚举
CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'
);

-- 支付方式枚举
CREATE TYPE payment_method AS ENUM (
    'credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay',
    'alipay', 'wechat_pay', 'bank_transfer', 'cash_on_delivery'
);

-- 物流状态枚举
CREATE TYPE shipping_status AS ENUM (
    'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'
);

-- 退款状态枚举
CREATE TYPE refund_status AS ENUM (
    'requested', 'approved', 'processing', 'completed', 'rejected', 'cancelled'
);

-- 商品状态枚举
CREATE TYPE product_status AS ENUM ('draft', 'active', 'inactive', 'out_of_stock', 'discontinued');

-- 评论状态枚举
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');

-- 优惠券类型枚举
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y');

-- 通知类型枚举
CREATE TYPE notification_type AS ENUM ('order', 'promotion', 'system', 'review', 'shipping', 'refund');

-- 日志类型枚举
CREATE TYPE log_type AS ENUM ('info', 'warn', 'error', 'debug');

-- ============================================================
-- 1. 用户相关表
-- ============================================================

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    avatar_url TEXT,
    gender gender_type DEFAULT 'prefer_not_to_say',
    birthday DATE,
    role user_role DEFAULT 'customer',
    status user_status DEFAULT 'pending_verification',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    email_verification_token VARCHAR(255),
    phone_verification_code VARCHAR(10),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    loyalty_points INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;

-- 用户地址表
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'home', -- home, work, other
    recipient_name VARCHAR(200) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT '中国',
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    street_address TEXT NOT NULL,
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id) WHERE is_deleted = FALSE;

-- 用户会话表
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- ============================================================
-- 2. 商品分类相关表
-- ============================================================

-- 商品分类表
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = TRUE;

-- 分类属性表
CREATE TABLE category_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    attribute_type VARCHAR(50) NOT NULL, -- text, number, select, multi_select, boolean
    required BOOLEAN DEFAULT FALSE,
    options JSONB, -- for select/multi_select types: ["red", "blue", "green"]
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_category_attributes_category_id ON category_attributes(category_id);

-- ============================================================
-- 3. 品牌表
-- ============================================================

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    slug VARCHAR(200) UNIQUE NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    description TEXT,
    website_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_active ON brands(is_active) WHERE is_active = TRUE;

-- ============================================================
-- 4. 商品相关表
-- ============================================================

-- 商品表
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    name_en VARCHAR(500),
    slug VARCHAR(500) UNIQUE NOT NULL,
    short_description TEXT,
    full_description TEXT,
    category_id UUID NOT NULL REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    vendor_id UUID REFERENCES users(id),
    price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2),
    cost_price DECIMAL(12, 2),
    weight DECIMAL(8, 3), -- kg
    dimensions JSONB, -- {"length": 10, "width": 5, "height": 3}
    material VARCHAR(200),
    origin VARCHAR(200),
    status product_status DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_on_sale BOOLEAN DEFAULT FALSE,
    discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    min_order_quantity INTEGER DEFAULT 1,
    max_order_quantity INTEGER,
    total_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS (total_stock - reserved_stock) STORED,
    sold_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    meta_title VARCHAR(500),
    meta_description TEXT,
    meta_keywords TEXT,
    tags TEXT[],
    attributes JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_products_category_id ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_brand_id ON products(brand_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_rating ON products(rating_average DESC NULLS LAST);
CREATE INDEX idx_products_sold ON products(sold_count DESC NULLS LAST);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_products_created ON products(created_at DESC);
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('simple', name || ' ' || COALESCE(short_description, '')));
CREATE INDEX idx_products_trgm_name ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_tags ON products USING GIN (tags);

-- 商品图片表
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

-- 商品规格表 (SKU变体)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    attributes JSONB NOT NULL, -- {"color": "Red", "size": "M"}
    price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2),
    cost_price DECIMAL(12, 2),
    total_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS (total_stock - reserved_stock) STORED,
    weight DECIMAL(8, 3),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id) WHERE is_active = TRUE;
CREATE INDEX idx_product_variants_sku ON product_variants(sku);

-- ============================================================
-- 5. 购物车表
-- ============================================================

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- for guest carts
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(session_id)
);

CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_session_id ON carts(session_id) WHERE session_id IS NOT NULL;

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    added_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cart_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

-- ============================================================
-- 6. 订单相关表
-- ============================================================

-- 订单表
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    order_status order_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    shipping_status shipping_status DEFAULT 'pending',
    -- 金额信息
    subtotal_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    shipping_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    -- 收货地址快照
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    -- 支付信息
    payment_method payment_method,
    payment_intent_id VARCHAR(255),
    paid_at TIMESTAMP,
    -- 物流信息
    shipping_carrier VARCHAR(100),
    tracking_number VARCHAR(200),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    -- 备注
    customer_note TEXT,
    admin_note TEXT,
    -- 优惠
    coupon_id UUID,
    coupon_code VARCHAR(50),
    coupon_discount DECIMAL(12, 2) DEFAULT 0,
    -- 积分
    points_used INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    -- 来源
    source VARCHAR(50) DEFAULT 'web', -- web, mobile, api
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_paid_at ON orders(paid_at);

-- 订单商品明细表
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    product_snapshot JSONB NOT NULL, -- 商品下单时快照
    product_name VARCHAR(500) NOT NULL,
    product_image TEXT,
    variant_attributes JSONB,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price - discount_amount) STORED,
    is_refunded BOOLEAN DEFAULT FALSE,
    refunded_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 订单状态历史表
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status order_status,
    to_status order_status NOT NULL,
    note TEXT,
    created_by UUID REFERENCES users(id),
    created_by_role VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- ============================================================
-- 7. 支付相关表
-- ============================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES users(id),
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    transaction_id VARCHAR(255), -- 第三方支付流水号
    payment_intent_id VARCHAR(255),
    payment_data JSONB, -- 支付网关返回的原始数据
    paid_at TIMESTAMP,
    failed_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- 退款表
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    order_item_id UUID REFERENCES order_items(id),
    user_id UUID NOT NULL REFERENCES users(id),
    refund_status refund_status DEFAULT 'requested',
    refund_type VARCHAR(50), -- full, partial, item_level
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    reason TEXT NOT NULL,
    evidence_images TEXT[],
    admin_note TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    payment_id UUID REFERENCES payments(id),
    refund_transaction_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_user_id ON refunds(user_id);
CREATE INDEX idx_refunds_status ON refunds(refund_status);

-- ============================================================
-- 8. 评论相关表
-- ============================================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(500),
    content TEXT,
    images TEXT[],
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    status review_status DEFAULT 'pending',
    helpful_count INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    admin_response TEXT,
    responded_at TIMESTAMP,
    responded_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_product_id ON reviews(product_id) WHERE status = 'approved';
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_status ON reviews(status);

-- 评论有用投票表
CREATE TABLE review_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);

-- ============================================================
-- 9. 优惠券相关表
-- ============================================================

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    coupon_type coupon_type NOT NULL,
    value DECIMAL(10, 2), -- percentage: 0-100, fixed_amount: 金额
    min_order_amount DECIMAL(12, 2) DEFAULT 0,
    max_discount_amount DECIMAL(12, 2),
    applicable_categories UUID[],
    applicable_products UUID[],
    excluded_products UUID[],
    total_quantity INTEGER NOT NULL,
    used_quantity INTEGER DEFAULT 0,
    usage_limit_per_user INTEGER DEFAULT 1,
    is_stackable BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active, valid_from, valid_until);

-- 优惠券使用记录
CREATE TABLE coupon_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    discount_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(coupon_id, order_id)
);

CREATE INDEX idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX idx_coupon_usages_user_id ON coupon_usages(user_id);

-- ============================================================
-- 10. 收藏和浏览历史
-- ============================================================

CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);

CREATE TABLE recently_viewed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id),
    UNIQUE(session_id, product_id)
);

CREATE INDEX idx_recently_viewed_user_id ON recently_viewed(user_id, viewed_at DESC);
CREATE INDEX idx_recently_viewed_session_id ON recently_viewed(session_id, viewed_at DESC);

-- ============================================================
-- 11. 库存表
-- ============================================================

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id),
    warehouse_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    max_stock_level INTEGER DEFAULT 1000,
    reorder_point INTEGER DEFAULT 20,
    last_restocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, variant_id, warehouse_id)
);

CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_low_stock ON inventory(product_id, variant_id)
    WHERE (quantity - reserved_quantity) <= min_stock_level;

-- 库存变动记录
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    transaction_type VARCHAR(50) NOT NULL, -- purchase, sale, return, adjustment, transfer
    quantity_change INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_type VARCHAR(50), -- order, purchase_order, adjustment
    reference_id UUID,
    note TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_transactions_inventory_id ON inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);

-- ============================================================
-- 12. 通知表
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_en VARCHAR(500),
    content TEXT,
    content_en TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_via_channel VARCHAR(50) DEFAULT 'in_app', -- in_app, email, sms, push
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- 通知模板表
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    subject VARCHAR(500) NOT NULL,
    subject_en VARCHAR(500),
    body TEXT NOT NULL,
    body_en TEXT,
    body_html TEXT,
    available_channels TEXT[] DEFAULT ARRAY['in_app', 'email'],
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 13. 系统日志表
-- ============================================================

CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level log_type NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id),
    request_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    endpoint VARCHAR(500),
    http_method VARCHAR(10),
    http_status INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_system_logs_endpoint ON system_logs(endpoint);

-- 管理员操作日志
CREATE TABLE admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(200) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    before_state JSONB,
    after_state JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_resource ON admin_activity_logs(resource_type, resource_id);
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);

-- ============================================================
-- 14. 物流相关表
-- ============================================================

CREATE TABLE shipping_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    carrier VARCHAR(100) NOT NULL,
    estimated_days_min INTEGER,
    estimated_days_max INTEGER,
    base_price DECIMAL(10, 2) NOT NULL,
    free_shipping_threshold DECIMAL(12, 2),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    shipping_method_id UUID REFERENCES shipping_methods(id),
    tracking_number VARCHAR(200),
    carrier VARCHAR(100),
    shipping_status shipping_status DEFAULT 'pending',
    shipped_at TIMESTAMP,
    estimated_delivery DATE,
    delivered_at TIMESTAMP,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    tracking_url TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number) WHERE tracking_number IS NOT NULL;

-- 物流追踪事件表
CREATE TABLE shipment_tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200),
    event_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shipment_tracking_shipment_id ON shipment_tracking_events(shipment_id, event_timestamp);

-- ============================================================
-- 15. 内容管理相关表
-- ============================================================

CREATE TABLE banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    title_en VARCHAR(200),
    subtitle VARCHAR(500),
    image_url TEXT NOT NULL,
    link_url TEXT,
    link_target VARCHAR(20) DEFAULT '_blank',
    position VARCHAR(50), -- homepage_top, homepage_middle, homepage_bottom, category_top
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(200) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_en VARCHAR(500),
    content TEXT NOT NULL,
    content_en TEXT,
    content_html TEXT,
    meta_title VARCHAR(500),
    meta_description TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 16. 搜索相关表
-- ============================================================

CREATE TABLE search_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword VARCHAR(200) NOT NULL,
    search_count INTEGER DEFAULT 1,
    is_trending BOOLEAN DEFAULT FALSE,
    last_searched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_suggestions_keyword ON search_suggestions(keyword);
CREATE INDEX idx_search_suggestions_trending ON search_suggestions(is_trending DESC, search_count DESC);

CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    query TEXT NOT NULL,
    result_count INTEGER,
    clicked_product_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_history_user_id ON search_history(user_id, created_at DESC);
CREATE INDEX idx_search_history_session_id ON search_history(session_id, created_at DESC);

-- ============================================================
-- 17. 系统配置表
-- ============================================================

CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(200) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 18. 审计日志表 (用于数据变更追踪)
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(200) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- 触发器函数
-- ============================================================

-- 更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 更新可用库存函数
CREATE OR REPLACE FUNCTION update_available_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'products' THEN
        NEW.available_stock = NEW.total_stock - COALESCE(NEW.reserved_stock, 0);
    ELSIF TG_TABLE_NAME = 'product_variants' THEN
        NEW.available_stock = NEW.total_stock - COALESCE(NEW.reserved_stock, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 自动设置订单编号函数
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(
            CAST(EXTRACT(EPOCH FROM NOW())::BIGINT % 100000 AS TEXT, 5, '0'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 日志变更审计函数
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id, ip_address)
        VALUES (TG_TABLE_NAME, COALESCE(NEW.id::TEXT, gen_random_uuid()::TEXT), 'INSERT',
                to_jsonb(NEW), NULL, NULL);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        changed_fields := ARRAY[]::TEXT[];
        FOR column_name IN SELECT * FROM jsonb_object_keys(to_jsonb(OLD))
        LOOP
            IF to_jsonb(OLD) -> column_name IS DISTINCT FROM to_jsonb(NEW) -> column_name THEN
                changed_fields := array_append(changed_fields, column_name);
            END IF;
        END LOOP;
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_fields, user_id)
        VALUES (TG_TABLE_NAME, COALESCE(NEW.id::TEXT, gen_random_uuid()::TEXT), 'UPDATE',
                to_jsonb(OLD), to_jsonb(NEW), changed_fields, NULL);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id, ip_address)
        VALUES (TG_TABLE_NAME, COALESCE(OLD.id::TEXT, gen_random_uuid()::TEXT), 'DELETE',
                to_jsonb(OLD), NULL, NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 更新商品评分函数
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET
        rating_average = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE product_id = NEW.product_id AND status = 'approved'),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id AND status = 'approved')
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 减少优惠券可用量函数
CREATE OR REPLACE FUNCTION decrement_coupon_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.coupon_id IS NOT NULL THEN
        UPDATE coupons
        SET used_quantity = used_quantity + 1
        WHERE id = NEW.coupon_id AND is_active = TRUE AND used_quantity < total_quantity;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 触发器绑定
-- ============================================================

-- 自动更新 updated_at
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_refunds_updated_at BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自动生成订单号
CREATE TRIGGER trg_orders_generate_number BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- 更新可用库存
CREATE TRIGGER trg_products_update_stock BEFORE UPDATE OF total_stock, reserved_stock ON products FOR EACH ROW EXECUTE FUNCTION update_available_stock();
CREATE TRIGGER trg_variants_update_stock BEFORE UPDATE OF total_stock, reserved_stock ON product_variants FOR EACH ROW EXECUTE FUNCTION update_available_stock();

-- 更新商品评分
CREATE TRIGGER trg_reviews_update_rating AFTER INSERT OR UPDATE OF rating, status ON reviews FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- 优惠券使用量减少
CREATE TRIGGER trg_coupon_usages_decrement AFTER INSERT ON coupon_usages FOR EACH ROW EXECUTE FUNCTION decrement_coupon_quantity();

-- 审计触发器 (对关键表)
CREATE TRIGGER trg_users_audit AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER trg_products_audit AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER trg_orders_audit AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER trg_payments_audit AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER trg_coupons_audit AFTER INSERT OR UPDATE OR DELETE ON coupons FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================
-- 存储过程
-- ============================================================

-- 获取商品统计信息
CREATE OR REPLACE PROCEDURE get_product_stats(IN p_product_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_review_count INTEGER;
    v_sold_count INTEGER;
    v_view_count INTEGER;
    v_stock INTEGER;
BEGIN
    SELECT rating_average, rating_count, sold_count, view_count, available_stock
    INTO v_avg_rating, v_review_count, v_sold_count, v_view_count, v_stock
    FROM products WHERE id = p_product_id;

    RAISE NOTICE 'Product Stats:';
    RAISE NOTICE '  Average Rating: %', v_avg_rating;
    RAISE NOTICE '  Review Count: %', v_review_count;
    RAISE NOTICE '  Sold Count: %', v_sold_count;
    RAISE NOTICE '  View Count: %', v_view_count;
    RAISE NOTICE '  Available Stock: %', v_stock;
END;
$$;

-- 处理订单取消 (回滚库存)
CREATE OR REPLACE PROCEDURE cancel_order(IN p_order_id UUID, IN p_reason TEXT, IN p_user_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id AND order_status NOT IN ('cancelled', 'completed', 'delivered');
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or cannot be cancelled';
    END IF;

    -- 回滚库存
    FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
        IF v_item.variant_id IS NOT NULL THEN
            UPDATE product_variants
            SET total_stock = total_stock + v_item.quantity
            WHERE id = v_item.variant_id;
        ELSE
            UPDATE products
            SET total_stock = total_stock + v_item.quantity
            WHERE id = v_item.product_id;
        END IF;
    END LOOP;

    -- 更新订单状态
    UPDATE orders SET
        order_status = 'cancelled',
        cancellation_reason = p_reason,
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 记录状态变更
    INSERT INTO order_status_history (order_id, from_status, to_status, note, created_by)
    VALUES (p_order_id, v_order.order_status, 'cancelled', p_reason, p_user_id);

    COMMIT;
END;
$$;

-- ============================================================
-- 视图
-- ============================================================

-- 商品列表视图（含分类信息）
CREATE OR REPLACE VIEW v_products_full AS
SELECT
    p.id, p.sku, p.name, p.name_en, p.slug, p.short_description,
    p.price, p.original_price, p.discount_percentage,
    p.status, p.is_featured, p.is_new, p.is_bestseller,
    p.rating_average, p.rating_count, p.sold_count, p.view_count,
    p.total_stock, p.available_stock,
    p.meta_title, p.meta_description, p.tags,
    p.created_at,
    c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
    b.id AS brand_id, b.name AS brand_name, b.logo_url AS brand_logo,
    (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS primary_image,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') AS review_count
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.deleted_at IS NULL;

-- 用户订单统计视图
CREATE OR REPLACE VIEW v_user_order_stats AS
SELECT
    u.id AS user_id,
    u.email,
    u.display_name,
    COUNT(o.id) AS total_orders,
    COUNT(o.id) FILTER (WHERE o.order_status = 'pending') AS pending_orders,
    COUNT(o.id) FILTER (WHERE o.order_status = 'completed') AS completed_orders,
    COUNT(o.id) FILTER (WHERE o.order_status = 'cancelled') AS cancelled_orders,
    SUM(o.total_amount) FILTER (WHERE o.order_status NOT IN ('cancelled')) AS total_spent,
    MAX(o.created_at) AS last_order_at
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.display_name;

-- 商品热销排行视图
CREATE OR REPLACE VIEW v_product_bestsellers AS
SELECT
    p.id, p.name, p.slug, p.price, p.primary_image,
    p.sold_count, p.rating_average, p.rating_count,
    c.name AS category_name,
    b.name AS brand_name
FROM v_products_full p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.status = 'active' AND p.available_stock > 0
ORDER BY p.sold_count DESC;

-- ============================================================
-- 初始数据种子
-- ============================================================

INSERT INTO system_configs (config_key, config_value, description, is_public) VALUES
('site_name', '"电商平台"', '网站名称', true),
('site_description', '"优质商品，便捷购物"', '网站描述', true),
('site_url', '"https://example.com"', '网站URL', true),
('support_email', '"support@example.com"', '客服邮箱', true),
('currency', '"CNY"', '默认货币', true),
('currency_symbol', '"¥"', '货币符号', true),
('items_per_page', '24', '每页显示商品数', true),
('free_shipping_threshold', '99.00', '免运费门槛', true),
('loyalty_points_rate', '0.01', '积分比率(每消费1元得积分)', true),
('max_cart_items', '99', '购物车最大商品数', false);

INSERT INTO notification_templates (template_key, name, name_en, subject, subject_en, body, body_en, available_channels) VALUES
('welcome', '欢迎注册', 'Welcome', '欢迎加入我们！', 'Welcome to our platform!',
 '亲爱的 {user_name}，欢迎注册！', 'Dear {user_name}, welcome!', ARRAY['email', 'in_app']),
('order_confirmed', '订单确认', 'Order Confirmed', '订单 {order_number} 已确认', 'Order {order_number} confirmed',
 '您的订单 {order_number} 已确认，我们将尽快为您发货。', 'Your order {order_number} has been confirmed.', ARRAY['email', 'in_app', 'sms']),
('order_shipped', '订单发货', 'Order Shipped', '订单 {order_number} 已发货', 'Order {order_number} shipped',
 '您的订单 {order_number} 已发货，快递单号：{tracking_number}', 'Your order {order_number} has been shipped. Tracking: {tracking_number}', ARRAY['email', 'in_app', 'sms']),
('order_delivered', '订单送达', 'Order Delivered', '订单 {order_number} 已送达', 'Order {order_number} delivered',
 '您的订单 {order_number} 已送达，请确认收货。', 'Your order {order_number} has been delivered.', ARRAY['email', 'in_app']),
('refund_processed', '退款处理', 'Refund Processed', '退款申请已处理', 'Refund request processed',
 '您的退款申请已处理，退款金额：{amount} 元', 'Your refund has been processed. Amount: {amount}', ARRAY['email', 'in_app']);

INSERT INTO shipping_methods (name, name_en, description, carrier, estimated_days_min, estimated_days_max, base_price, free_shipping_threshold, sort_order) VALUES
('标准快递', 'Standard Shipping', '3-5个工作日送达', 'SF Express', 3, 5, 10.00, 99.00, 1),
('快速快递', 'Express Shipping', '1-2个工作日送达', '顺丰速运', 1, 2, 20.00, 199.00, 2),
('经济快递', 'Economy Shipping', '5-7个工作日送达', '中通快递', 5, 7, 5.00, NULL, 3),
('同城配送', 'Local Delivery', '当日或次日送达', '本地配送', 1, 2, 8.00, 49.00, 4);

COMMENT ON TABLE users IS '用户表 - 存储所有注册用户信息';
COMMENT ON TABLE products IS '商品表 - 存储商品核心信息';
COMMENT ON TABLE orders IS '订单表 - 存储所有订单信息';
COMMENT ON TABLE payments IS '支付表 - 存储支付流水信息';
COMMENT ON TABLE reviews IS '评论表 - 存储商品评价信息';
COMMENT ON TABLE coupons IS '优惠券表 - 存储优惠券信息';
