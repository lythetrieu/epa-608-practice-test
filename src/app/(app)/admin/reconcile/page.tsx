import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { reconcile } from '@/lib/polar-reconcile'

export const dynamic = 'force-dynamic'

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`

export default async function ReconcilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const me = await getUserProfile(user.id)
  if (!me?.is_admin) redirect('/dashboard')

  const r = await reconcile()

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
        &larr; Admin
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Đối chiếu thanh toán</h1>
      <p className="text-sm text-gray-500 mt-1 mb-8">
        Mọi đơn đã trả tiền bên Polar, đối chiếu với quyền Pro trong database. Đây là câu trả lời
        duy nhất đáng tin cho câu hỏi &ldquo;có ai trả tiền mà chưa nhận được hàng không&rdquo; —
        khi cấp quyền thất bại, database <em>không để lại dấu vết nào</em> để mà tìm.
      </p>

      {!r.ok ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <strong>Không đọc được dữ liệu Polar.</strong>
          <div className="mt-1 font-mono text-xs">{r.error}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-3xl font-bold text-gray-900">{r.counts.paidOrders}</div>
              <div className="text-sm text-gray-500 mt-1">Đơn đã trả</div>
              <div className="text-xs text-gray-400 mt-1">{usd(r.revenueCents)} tổng</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-3xl font-bold text-green-600">{r.counts.granted}</div>
              <div className="text-sm text-gray-500 mt-1">Đã có Pro</div>
            </div>
            <div
              className={`rounded-xl border p-5 ${
                r.counts.missing > 0 ? 'border-red-300 bg-red-50' : 'bg-white border-gray-200'
              }`}
            >
              <div className={`text-3xl font-bold ${r.counts.missing > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                {r.counts.missing}
              </div>
              <div className="text-sm text-gray-500 mt-1">Trả tiền, CHƯA Pro</div>
              {r.counts.missing > 0 && (
                <div className="text-xs text-red-600 mt-1 font-semibold">cần cấp tay ngay</div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`text-3xl font-bold ${r.counts.noAccount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                {r.counts.noAccount}
              </div>
              <div className="text-sm text-gray-500 mt-1">Chưa tạo tài khoản</div>
              <div className="text-xs text-gray-400 mt-1">đã trả nhưng chưa đăng ký</div>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-4">
            Database đang có <strong className="text-gray-800">{r.proInDb}</strong> tài khoản Pro
            (đã loại tài khoản test). Con số này thường <em>lớn hơn</em> số đơn đã trả — vì có tài
            khoản được cấp tay và {r.counts.freeOrders > 0 && <>{r.counts.freeOrders} đơn $0, </>}
            nên chỉ cần lo khi nó <em>nhỏ hơn</em>.
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Ngày</th>
                    <th className="px-5 py-3 text-left font-medium">Khách</th>
                    <th className="px-5 py-3 text-right font-medium">Số tiền</th>
                    <th className="px-5 py-3 text-left font-medium">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {r.rows.map((row) => (
                    <tr key={row.orderId} className={row.verdict === 'missing' ? 'bg-red-50' : undefined}>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                        {new Date(row.at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-5 py-3">
                        {row.userId ? (
                          <Link href={`/admin/users/${row.userId}`} className="text-blue-700 hover:underline">
                            {row.email || '(không có email)'}
                          </Link>
                        ) : (
                          <span className="text-gray-700">{row.email || '(không có email)'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-600">
                        {usd(row.amountCents)}
                      </td>
                      <td className="px-5 py-3">
                        {row.verdict === 'ok' && <span className="text-green-700">✅ đã có Pro</span>}
                        {row.verdict === 'missing' && (
                          <span className="text-red-700 font-semibold">🔴 TRẢ TIỀN, CHƯA CÓ PRO</span>
                        )}
                        {row.verdict === 'no_account' && (
                          <span className="text-amber-700">⚠️ chưa tạo tài khoản</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Khớp theo <code>customer_external_id</code> trước rồi mới tới email — để không bỏ sót
            người trả tiền bằng địa chỉ khác với địa chỉ đã đăng ký.
          </p>
        </>
      )}
    </div>
  )
}
