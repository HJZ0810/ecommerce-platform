/**
 * 帮助中心页 / Help Page
 * @description 提供购物帮助、配送说明、退换货政策
 * @module pages/shop/HelpPage
 */

export default function HelpPage() {
  const faqs = [
    { q: '如何下单？/ How to order?', a: '浏览商品 → 加入购物车 → 结算 → 选择支付方式 → 完成订单。' },
    { q: '支持哪些支付方式？/ Payment methods?', a: '支持支付宝、微信支付、信用卡、银行转账、货到付款。' },
    { q: '多久能收到货？/ Delivery time?', a: '标准快递 3-5 个工作日，快速快递 1-2 个工作日。' },
    { q: '如何退换货？/ Returns?', a: '收到商品 7 天内可申请退换货，请到"我的订单"操作。' },
    { q: '如何联系客服？/ Contact support?', a: '通过"联系我们"页面或发送邮件至 support@example.com。' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">帮助中心 / Help Center</h1>

      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <div key={i} className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
            <p className="text-gray-600">{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 card p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">还有其他问题？/ Still have questions?</h2>
        <p className="text-gray-600 mb-6">联系我们的客服团队 / Contact our support team</p>
        <a href="mailto:support@example.com" className="btn-primary">联系客服 / Contact Support</a>
      </div>
    </div>
  );
}
