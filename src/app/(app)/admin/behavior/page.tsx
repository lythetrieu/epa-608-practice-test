import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getBehaviour } from '@/lib/analytics-behavior'

export const dynamic = 'force-dynamic'

const pct = (n: number) => `${Math.round(n * 100)}%`

export default async function BehaviorPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const me = await getUserProfile(user.id)
  if (!me?.is_admin) redirect('/dashboard')

  const b = await getBehaviour()
  const f = b.funnel

  const stages = [
    { label: 'Bắt đầu thi (chưa đăng ký)', n: f.anonStarts },
    { label: 'Nộp bài (chưa đăng ký)', n: f.anonFinished },
    { label: 'Đăng ký tài khoản', n: f.signups },
    { label: 'Có làm ít nhất 1 bài', n: f.tookAQuiz },
    { label: 'Quay lại ngày khác', n: f.cameBack },
    { label: 'Trả tiền (Pro)', n: f.paid },
  ]
  const top = Math.max(...stages.map((s) => s.n), 1)

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
        &larr; Admin
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Hành vi người dùng</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        {b.windowDays} ngày gần nhất · đã loại tài khoản test khỏi mọi con số.
      </p>

      {b.truncated && (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <strong>Dữ liệu bị cắt.</strong> Số câu trả lời trong kỳ vượt ngưỡng an toàn, nên các chỉ
          số bên dưới <strong>thấp hơn thực tế</strong>. Cần chuyển sang tính gộp trong database
          thay vì kéo từng dòng về.
        </div>
      )}

      {/* ── Phễu ─────────────────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Phễu</h2>
      <p className="text-sm text-gray-500 mb-4">
        Đây là <strong>số lượng ở từng bước trong cùng kỳ</strong>, không phải theo dõi cùng một
        nhóm người. Người đăng ký tháng này phần lớn không phải người đã thi thử tháng này — đọc để
        thấy <em>hình dạng</em>, đừng đọc thành &ldquo;X người này đã chuyển đổi&rdquo;.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8 space-y-3">
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1].n : null
          const drop = prev && prev > 0 ? 1 - s.n / prev : null
          return (
            <div key={s.label}>
              <div className="flex items-baseline justify-between text-sm mb-1">
                <span className="text-gray-700">{s.label}</span>
                <span className="tabular-nums font-semibold text-gray-900">
                  {s.n.toLocaleString('vi-VN')}
                  {drop !== null && drop > 0 && (
                    <span className="ml-2 text-xs font-normal text-red-500">−{pct(drop)}</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-800 rounded-full"
                  style={{ width: `${Math.max((s.n / top) * 100, 0.5)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Bỏ dở ────────────────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Bỏ dở giữa chừng</h2>
      <p className="text-sm text-gray-500 mb-4">
        Bắt đầu bài thi rồi không nộp. Trang analytics cũ chỉ đếm bài đã nộp, nên con số này trước
        giờ <strong>không ai nhìn thấy</strong>.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-4xl font-bold text-orange-500">{pct(b.abandonOverall.rate)}</span>
          <span className="text-sm text-gray-500">
            {b.abandonOverall.started - b.abandonOverall.finished} / {b.abandonOverall.started} bài
            bị bỏ dở
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left font-medium py-2">Phần</th>
              <th className="text-right font-medium py-2">Bắt đầu</th>
              <th className="text-right font-medium py-2">Nộp</th>
              <th className="text-right font-medium py-2">Bỏ dở</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {b.abandonByCategory.map((c) => (
              <tr key={c.category}>
                <td className="py-2 text-gray-800">{c.category}</td>
                <td className="py-2 text-right tabular-nums text-gray-600">{c.started}</td>
                <td className="py-2 text-right tabular-nums text-gray-600">{c.finished}</td>
                <td
                  className={`py-2 text-right tabular-nums font-semibold ${
                    c.rate >= 0.7 ? 'text-red-600' : c.rate >= 0.5 ? 'text-orange-500' : 'text-gray-700'
                  }`}
                >
                  {pct(c.rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Các chỉ số khác ──────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-blue-800">
            {b.returnRate.ofUsers ? pct(b.returnRate.returned / b.returnRate.ofUsers) : '—'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Quay lại ngày khác</div>
          <div className="text-xs text-gray-400 mt-1">
            {b.returnRate.returned}/{b.returnRate.ofUsers} người có làm bài
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-blue-800">
            {b.aiAdoption.ofUsers ? pct(b.aiAdoption.tried / b.aiAdoption.ofUsers) : '—'}
          </div>
          <div className="text-sm text-gray-500 mt-1">Từng dùng AI Tutor</div>
          <div className="text-xs text-gray-400 mt-1">
            {b.aiAdoption.tried}/{b.aiAdoption.ofUsers} tài khoản
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-blue-800">
            {b.medianSecsPerQuestion === null ? '—' : `${b.medianSecsPerQuestion}s`}
          </div>
          <div className="text-sm text-gray-500 mt-1">Trung vị mỗi câu</div>
          <div className="text-xs text-gray-400 mt-1">đề thi thật cho ~72s/câu</div>
        </div>
      </div>

      {/* ── Câu khó nhất ─────────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Câu sai nhiều nhất</h2>
      <p className="text-sm text-gray-500 mb-4">
        Từ 8 lượt trả lời trở lên. Tỉ lệ đúng rất thấp thường là <em>câu hỏi có vấn đề</em> chứ
        không phải người học kém — đáng đọc lại nội dung câu đó.
      </p>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {b.hardest.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            Chưa đủ dữ liệu trong {b.windowDays} ngày qua.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Mã câu hỏi</th>
                <th className="px-6 py-3 text-right font-medium">Lượt trả lời</th>
                <th className="px-6 py-3 text-right font-medium">Tỉ lệ đúng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {b.hardest.map((q) => (
                <tr key={q.questionId}>
                  <td className="px-6 py-3 font-mono text-xs text-gray-700">{q.questionId}</td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-600">{q.attempts}</td>
                  <td
                    className={`px-6 py-3 text-right tabular-nums font-semibold ${
                      q.accuracy < 0.3 ? 'text-red-600' : 'text-orange-500'
                    }`}
                  >
                    {pct(q.accuracy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
