'use client'
import { useRouter } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'

type Consultant = {
  id: string
  name: string
  specialty: string
  price: number
  active: boolean
}

export default function ContactStep({
  selected,
  phone,
  setPhone,
  onSubmit,
  loading,
  error,
}: {
  selected: Consultant | null
  phone: string
  setPhone: (v: string) => void
  onSubmit: () => void
  loading: boolean
  error: string
}) {
  const router = useRouter()

  function formatPhone(value: string) {
    const n = value.replace(/\D/g, '')
    if (n.length <= 3) return n
    if (n.length <= 7) return `${n.slice(0,3)}-${n.slice(3)}`
    return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7,11)}`
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <PageHeader
        title="명연재 상담"
        subtitle="연락처를 입력해주세요"
        onBack={() => router.back()}
      />
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-stone-900 rounded-xl p-4 mb-4 border border-stone-700">
          <div className="text-stone-400 text-sm">선택한 상담사</div>
          <div className="font-bold text-lg mt-1">{selected?.name}</div>
          <div className="text-amber-400">{selected?.price.toLocaleString()}원</div>
        </div>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          maxLength={13}
          className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-lg text-center tracking-widest focus:outline-none focus:border-amber-500"
        />
        {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
        <button
          onClick={onSubmit}
          disabled={loading || phone.replace(/\D/g, '').length < 10}
          className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 rounded-xl transition-all disabled:opacity-40"
        >
          {loading ? '처리중...' : '다음 — 결제하기'}
        </button>
      </div>
    </div>
  )
}
