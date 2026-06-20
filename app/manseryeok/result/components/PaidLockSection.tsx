'use client'

const PAID_ITEMS = [
  { icon: "3️⃣", label: "연애·결혼·배우자운", desc: "나의 연애유형·운명의 상대·결혼시기" },
  { icon: "4️⃣", label: "적성·직업·취업운", desc: "나에게 맞는 직업·사업 vs 직장" },
  { icon: "5️⃣", label: "재물·부동산·내집마련", desc: "재물운·돈 버는 시기·재테크 전략" },
  { icon: "6️⃣", label: "사업운·성공운", desc: "사업 적성·성공 시기·파트너운" },
  { icon: "7️⃣", label: "자녀운·자녀결혼운", desc: "자녀 인연·자녀 운명·결혼시기" },
  { icon: "8️⃣", label: "노후재물·안정운", desc: "노후 준비·재물 안정·평안한 노년" },
  { icon: "9️⃣", label: "귀인운·운명개선", desc: "나를 돕는 귀인·운명을 바꾸는 방법" },
  { icon: "🔟", label: "10년 운명·월별운", desc: "앞으로 10년 흐름·월별 상세운세" },
]

export default function PaidLockSection({ onPay }: { onPay: () => void }) {
  return (
    <div className="px-5 pb-5">
      <div className="rounded-xl overflow-hidden"
        style={{border:"1px solid rgba(250,199,117,0.25)"}}>

        {/* 헤더 */}
        <div className="px-4 py-3 flex items-center justify-between"
          style={{background:"linear-gradient(135deg,rgba(60,52,137,0.5),rgba(250,199,117,0.15))"}}>
          <div>
            <div className="text-sm font-bold text-white">🔒 나머지 8가지 분석</div>
            <div className="text-xs mt-0.5" style={{color:"rgba(255,255,255,0.5)"}}>
              연애·재물·직업·건강·10년운 등
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold" style={{color:"#FAC775"}}>10,000원</div>
            <div className="text-xs" style={{color:"rgba(255,255,255,0.4)"}}>전체 공개</div>
          </div>
        </div>

        {/* 항목 목록 */}
        {PAID_ITEMS.map((item, i) => (
          <div key={i} className="px-4 py-2.5 flex items-center gap-3"
            style={{borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(0,0,0,0.15)"}}>
            <span className="text-base">{item.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{color:"rgba(192,188,216,0.6)"}}>
                {item.label}
              </div>
              <div className="text-xs" style={{color:"rgba(106,104,128,0.8)"}}>
                {item.desc}
              </div>
            </div>
            <span style={{color:"rgba(106,104,128,0.8)",fontSize:"14px"}}>🔒</span>
          </div>
        ))}

        {/* 결제 버튼 */}
        <div className="p-4" style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <button onClick={onPay}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{background:"linear-gradient(135deg,#FAC775,#f0a030)",
              color:"#1a1a18",boxShadow:"0 4px 16px rgba(250,199,117,0.3)"}}>
            ✨ 전체보기 — 10,000원 결제
          </button>
          <p className="text-xs text-center mt-2" style={{color:"rgba(255,255,255,0.3)"}}>
            결제 후 즉시 8가지 추가 분석 공개
          </p>
        </div>
      </div>
    </div>
  )
}
