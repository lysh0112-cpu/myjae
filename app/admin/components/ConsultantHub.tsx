'use client'
import { useState } from 'react'
import ConsultantManager from './ConsultantManager'
import SettlementManager from './SettlementManager'

// ══════════════════════════════════════════════════════════════════
//  ★2026-09-09 — 「👤 상담사 관리+정산관리」 ★한 탭  [대표님 지시]
//    「상담사관리+정산관리 두 탭을 하나로 … 안쪽에는 따로 넣어줘」
//    「★위에 탭들이 너무 많아서 헷갈려」
//    ⇒ 위 탭이 ★열둘 → 열하나 가 되었습니다.
//
//  ★한자리에 두는 것이 맞는 까닭 —
//    둘 다 ★consultants 표를 봅니다. «같은 사람» 의 앞뒤입니다 —
//      상담사 관리  누가 있고 · 무엇을 맡고 · 수수료가 얼마인가
//      정산 관리    그 사람에게 «얼마를 드릴 것인가»
//
//  ⚠️⚠️ ★정산(💰)과 지갑(🪙)을 헷갈리지 마십시오 [1부 3-6] —
//     정산은 ★상담사에게 «나가는» 돈, 지갑은 ★손님이 «넣는» 돈입니다.
//     ⛔ 그래서 정산을 「회원 관리」쪽으로 옮기지 마십시오. 여기가 제자리입니다.
//
//  ★이 파일이 하는 일은 «안쪽 탭을 가르는 것» «하나» 뿐입니다.
//  ⛔⛔ 알맹이를 여기로 옮기지 마십시오 — 둘이 각자 제 일을 그대로 합니다.
//
//  ⚠️ ★열자마자 «상담사 관리» 가 나옵니다.
//     ⛔ 정산을 먼저 두지 마십시오 — ★사람을 «먼저» 보고 그 다음에 돈을 봅니다
//        (회원 관리·지갑을 묶을 때와 같은 결입니다).
//
//  🔴🔴 ★탭 열쇠(key)를 'consultant' 에서 «바꾸지» 마십시오 —
//     두 화면이 여기로 보냅니다 [48부 10차 대표님 「관리자화면으로 돌아가기」] —
//        app/mypage-new/page.tsx:706-707
//        app/manseryeok/consultant/page.tsx:293 · 323-324
//     둘 다 sessionStorage('adminTab','consultant') + /admin#consultant 를 씁니다.
//     ⇒ 열쇠를 바꾸면 ★그 단추가 «대시보드» 로 떨어집니다.
//
//  ⚠️ ★주소로 여는 길이 «둘 다» 살아 있습니다 —
//        /admin#consultant → 상담사 관리
//        /admin#settlement → ★정산으로 «바로»
// ══════════════════════════════════════════════════════════════════

export type ConsultantInner = 'consultant' | 'settlement'

export default function ConsultantHub({ initial }: { initial?: ConsultantInner } = {}) {
  const [inner, setInner] = useState<ConsultantInner>(initial ?? 'consultant')

  const tabStyle = (on: boolean) => ({
    background: 'none',
    border: 'none',
    padding: '0 0 10px',
    marginBottom: -1,
    fontSize: 14,
    fontWeight: on ? 700 : 500,
    color: on ? '#FAC775' : '#8a88a0',
    borderBottom: on ? '2px solid #FAC775' : '2px solid transparent',
    cursor: 'pointer',
  })

  return (
    <div>
      <div className="flex gap-6 mb-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button type="button" onClick={() => setInner('consultant')} style={tabStyle(inner === 'consultant')}>
          👤 상담사 관리
        </button>
        <button type="button" onClick={() => setInner('settlement')} style={tabStyle(inner === 'settlement')}>
          💰 정산 관리
        </button>
      </div>

      {/* ⚠️ 둘을 «함께» 그리지 않습니다 — 안 보이는 쪽까지 조회가 돕니다. */}
      {inner === 'consultant' && <ConsultantManager />}
      {inner === 'settlement' && <SettlementManager />}
    </div>
  )
}
