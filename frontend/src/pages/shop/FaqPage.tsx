/**
 * 常见问题页 / FAQ Page
 * @module pages/shop/FaqPage
 */
export default function FaqPage() {
  const faqs = [
    { q: '如何注册账号？', a: '点击页面右上角的注册按钮，填写邮箱和密码即可完成注册。' },
    { q: '忘记密码怎么办？', a: '点击登录页的忘记密码链接，输入邮箱后我们会发送重置链接。' },
    { q: '如何修改收货地址？', a: '登录后进入个人中心 -> 地址管理，可添加或修改地址。' },
    { q: '优惠券怎么用？', a: '结算时在优惠券输入框中输入优惠码即可。' },
    { q: '支持退换货吗？', a: '支持，收到商品 7 天内可申请退换货。' },
  ];
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">常见问题 / FAQ</h1>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
            <p className="text-gray-600">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
