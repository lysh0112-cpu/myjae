'use client'

type Consultant = {
  id: string
  name: string
  specialty: string
  price: number
  active: boolean
}

export default function PaymentStep({
  selected,
  phone,
  payMethod,
  setPayMethod,
  onBack,
  onComplete,
}: {
  selected: Consultant | null
  phone: string
  payMethod: string
  setPayMethod: (v: string) => void
  onBack: () => void
  onComplete: () => void
}) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4">
      <div className="max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="text-stone-400 text-sm mb-6 flex items-center gap-1"
        >
          ← 연락처 입력으로
        </button>
        <h2 className="text-xl font-bold text-amber-400 mb-6">결제</h2>

        <div className="bg-stone-900 rounded-xl p-5 border border-stone-700 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-stone-400">상담사</span>
            <span className="font-bold">{selected?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">연락처</span>
            <span>{phone}</span>
          </div>
          <div className="border-t border-stone-700 pt-3 flex justify-between">
            <span className="text-stone-400">결제 금액</span>
            <span className="text-amber-400 font-bold text-lg">
              {selected?.price.toLocaleString()}원
            </span>
          </div>
        </div>

        <p className="text-stone-400 text-sm mb-3">결제 수단 선택</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['계좌이체', '카카오페이', '휴대폰 결제'].map((m) => (
            <button
              key={m}
              onClick={() => setPayMethod(m)}
              className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                payMethod === m
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-stone-700 text-stone-400 bg-stone-900'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={onComplete}
          className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 rounded-xl transition-all"
        >
          토스페이먼츠로 결제하기
        </button>
        <p className="text-center text-stone-500 text-xs mt-3">
          결제 후 즉시 상담방이 열립니다
        </p>
      </div>
    </div>
  )
}
