// app/manseryeok/consultant-select/ConsultantCard.tsx
'use client'
import { useRouter } from 'next/navigation'
import type { Consultant } from './data'

type Props = { consultant: Consultant; mode: string }

export default function ConsultantCard({ consultant: c, mode }: Props) {
  const router = useRouter()

  return (
    <div className={`mx-5 mb-3 rounded-2xl overflow-hidden border
      ${c.featured ? 'border-[#4433aa]' : 'border-[#252545]'} bg-[#13132a]`}>
      {c.featured && (
        <div className="bg-[#2d2060] text-[#b8a9ff] text-[10px] text-center py-[5px]">
          ⭐ {c.featuredLabel}
        </div>
      )}
      <div className="p-4">
        {/* 상단 프로필 */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#2d2060] text-[#c8b0ff] flex items-center justify-center text-lg font-medium shrink-0">
            {c.name[0]}
          </div>
          <div className="flex-1">
            <div className="text-[15px] text-[#e8e4ff] font-medium mb-1">{c.name} 선생님</div>
            <div className="text-[12px] text-[#7766bb] mb-2">{c.spec}</div>
            <div className="flex flex-wrap gap-1">
              {c.tags.map(t => (
                <span key={t} className="text-[10px] px-2 py-[3px] rounded-lg bg-[#1a1228] text-[#cc88ff] border border-[#3d2060]">
                  {t}
                </span>
              ))}
              {c.available
                ? <span className="text-[10px] px-2 py-[3px] rounded-lg bg-[#0f2a1a] text-[#66bb88] border border-[#2a5535]">지금 가능</span>
                : <span className="text-[10px] px-2 py-[3px] rounded-lg bg-[#1a1a0d] text-[#aa8844] border border-[#3d3010]">예약 필요</span>
              }
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { val: `★ ${c.rating}`, label: '후기 점수' },
            { val: c.count.toLocaleString(), label: '상담 건수' },
            { val: `${c.reRate}%`, label: '재상담율' },
          ].map(s => (
            <div key={s.label} className="bg-[#0d0d1a] rounded-lg p-2 text-center">
              <div className="text-[14px] text-[#b8a9ff] font-medium">{s.val}</div>
              <div className="text-[10px] text-[#4d4480] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 후기 */}
        <div className="bg-[#0d0d1a] rounded-lg px-3 py-[10px] mb-3">
          <div className="text-[12px] text-[#7777aa] leading-relaxed">"{c.review}"</div>
          <div className="text-[11px] text-[#4d4480] mt-1">— {c.reviewDate}</div>
        </div>

        {/* 하단 가격·버튼 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[16px] text-[#b8a9ff] font-medium">{c.price.toLocaleString()}원~</div>
            <div className="text-[11px] text-[#5544aa] mt-1">{c.priceSub}</div>
          </div>
          <button
            onClick={() => router.push(`/manseryeok/consulting?consultantId=${c.id}&mode=${mode}`)}
            className={`px-5 py-[10px] rounded-xl text-[13px] font-medium
              ${c.available ? 'bg-[#3d2a88] text-[#c8b0ff]' : 'bg-[#1a1a35] text-[#444466]'}`}
          >
            {c.available ? '선택하기' : '예약하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
