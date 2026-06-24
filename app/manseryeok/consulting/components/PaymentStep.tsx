'use client'
import PageHeader from '@/app/components/common/PageHeader'

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
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <PageHeader
        title="결제"
        subtitle="결제 수단을 선택해주세요"
        onBack={onBack}
      />
      <div className="max-w-lg mx-auto p-4">
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

        {payMethod === '계좌이체' && (
          <div className="bg-stone-900 rounded-xl p-4 border border-stone-700 mb-6 text-sm space-y-1">
            <p className="text-amber-400 font-bold mb-2">계좌이체 안내</p>
            <p className="text-stone-300">예금주: 김명인</p>
            <p className="text-stone-300">은행: 국민은행</p>
            <p className="text-stone-300">계좌번호: 123-456-789012</p>
            <p className="text-stone-500 text-xs mt-2">입금 확인 후 상담사가 채팅방을 열어드립니다</p>
          </div>
        )}
        {payMethod === '카카오페이' && (
          <div className="bg-stone-900 rounded-xl p-4 border border-stone-700 mb-6 text-sm">
            <p className="text-amber-400 font-bold mb-2">카카오페이 안내</p>
            <p className="text-stone-300">카카오페이 ID: myjae_saju</p>
            <p className="text-stone-500 text-xs mt-2">송금 후 아래 버튼을 눌러주세요</p>
          </div>
        )}
        {payMethod === '휴대폰 결제' && (
          <div className="bg-stone-900 rounded-xl p-4 border border-stone-700 mb-6 text-sm">
            <p className="text-amber-400 font-bold mb-2">휴대폰 결제 안내</p>
            <p className="text-stone-300">준비 중입니다</p>
            <p className="text-stone-500 text-xs mt-2">계좌이체 또는 카카오페이를 이용해주세요</p>
          </div>
        )}

        <button
          onClick={onComplete}
          className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 rounded-xl transition-all"
        >
          결제 완료 — 상담방 입장
        </button>
        <p className="text-center text-stone-500 text-xs mt-3">
          결제 후 즉시 상담방이 열립니다
        </p>
      </div>
    </div>
  )
}
