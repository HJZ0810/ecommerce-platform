/**
 * 隐私政策页 / Privacy Policy Page
 * @module pages/shop/PrivacyPage
 */
export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">隐私政策 / Privacy Policy</h1>
      <div className="card p-8 prose max-w-none">
        <h2 className="text-xl font-semibold mb-4">信息收集 / Information Collection</h2>
        <p className="text-gray-600 mb-4">我们收集必要的用户信息以提供更好的服务，包括账户信息、订单信息和使用数据。</p>
        <h2 className="text-xl font-semibold mb-4 mt-6">信息使用 / Information Use</h2>
        <p className="text-gray-600 mb-4">收集的信息仅用于提供和改进服务，不会出售给第三方。</p>
        <h2 className="text-xl font-semibold mb-4 mt-6">Cookie 使用 / Cookie Usage</h2>
        <p className="text-gray-600">我们使用 Cookie 来改善用户体验，您可以在浏览器中管理 Cookie 设置。</p>
      </div>
    </div>
  );
}
