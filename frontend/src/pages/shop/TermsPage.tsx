/**
 * 服务条款页 / Terms of Service Page
 * @module pages/shop/TermsPage
 */
export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">服务条款 / Terms of Service</h1>
      <div className="card p-8 prose max-w-none">
        <h2 className="text-xl font-semibold mb-4">1. 服务说明 / Service Description</h2>
        <p className="text-gray-600 mb-4">本平台提供在线购物服务，用户可在平台上浏览和购买商品。</p>
        <h2 className="text-xl font-semibold mb-4 mt-6">2. 用户责任 / User Responsibilities</h2>
        <p className="text-gray-600 mb-4">用户需提供真实准确的个人信息，妥善保管账户安全。</p>
        <h2 className="text-xl font-semibold mb-4 mt-6">3. 退换货政策 / Return Policy</h2>
        <p className="text-gray-600 mb-4">收到商品 7 天内可申请退换货，商品需保持完好。</p>
        <h2 className="text-xl font-semibold mb-4 mt-6">4. 隐私保护 / Privacy Protection</h2>
        <p className="text-gray-600">我们重视用户隐私，详见隐私政策。</p>
      </div>
    </div>
  );
}
