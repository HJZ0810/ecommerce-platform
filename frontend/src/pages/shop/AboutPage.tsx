/**
 * 关于我们页 / About Page
 * @module pages/shop/AboutPage
 */

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">关于我们 / About Us</h1>
      <div className="card p-8 prose max-w-none">
        <p className="text-gray-600 text-lg leading-relaxed">
          电商平台是一个致力于为用户提供优质商品和便捷购物体验的在线购物平台。
          我们精选全球好物，以合理的价格提供给每一位消费者。
        </p>
        <p className="text-gray-600 text-lg leading-relaxed mt-4">
          E-commerce Platform is committed to providing quality products and a convenient shopping experience.
          We carefully select the best products from around the world.
        </p>
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600">100K+</div>
            <p className="text-gray-600 mt-1">商品 / Products</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600">50K+</div>
            <p className="text-gray-600 mt-1">用户 / Users</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600">99%</div>
            <p className="text-gray-600 mt-1">满意度 / Satisfaction</p>
          </div>
        </div>
      </div>
    </div>
  );
}
