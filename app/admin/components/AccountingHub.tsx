'use client'
import { useState } from 'react'
import ExpenseManager from './ExpenseManager'
import ExpenseApproval from './ExpenseApproval'

// ══════════════════════════════════════════════════════════════════
//  ★2026-09-09 — 「💳 관리회계 및 지출결의서」 ★한 탭  [대표님 지시]
//    「관리회계와 AI도 하나로 묶어줘」 · 「★위에 탭들이 너무 많아서 헷갈려」
//
//  ★이 파일이 하는 일은 «안쪽 탭을 가르는 것» «하나» 뿐입니다.
//  ⛔⛔ 알맹이를 여기로 옮기지 마십시오 —
//     ExpenseManager · ExpenseApproval 이 각자 제 일을 그대로 합니다.
//
//  🔴🔴 ★«묶었다고 고쳐진 것이 아닙니다» —
//     둘은 ★같은 expenses 표의 «같은 approval_status 칸» 을 서로 다르게 고칩니다.
//        💳 관리회계    approval_status='승인' · approved_by · approved_at
//                      ⇒ handler · approver 는 «빈 채로» 남습니다 · 「반려」가 «없습니다»
//        🧾 지출결의서   approval_status=승인/반려 · handler · approver
//                      ⇒ approved_by · approved_at 은 «빈 채로» 남습니다
//     ⇒ ★어느 탭에서 승인하셨느냐에 따라 결의서에 이름이 찍히기도 하고 안 찍히기도 합니다.
//     ⚠️ [대표님 2026-09-09] 「★지출화면은 나중에 손보자」 — 그래서 «그대로» 두었습니다.
//     □ 고치실 때는 ★승인을 «한 갈래» 로 모으십시오 (한쪽이 다른 쪽을 부르게).
//
//  ⚠️ ★주소로 여는 길이 «둘 다» 살아 있습니다 [48부 10차] —
//        /admin#accounting → 관리회계
//        /admin#approval   → ★지출결의서로 «바로»
//     ⛔ #approval 을 없애지 마십시오. 즐겨찾기 해 두셨을 수 있습니다.
// ══════════════════════════════════════════════════════════════════

export type AccountingInner = 'expense' | 'approval'

export default function AccountingHub({ initial }: { initial?: AccountingInner } = {}) {
  const [inner, setInner] = useState<AccountingInner>(initial ?? 'expense')

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
        <button type="button" onClick={() => setInner('expense')} style={tabStyle(inner === 'expense')}>
          💳 관리회계
        </button>
        <button type="button" onClick={() => setInner('approval')} style={tabStyle(inner === 'approval')}>
          🧾 지출결의서
        </button>
      </div>

      {/* ⚠️ 둘을 «함께» 그리지 않습니다 — 안 보이는 쪽까지 조회가 돕니다. */}
      {inner === 'expense' && <ExpenseManager />}
      {inner === 'approval' && <ExpenseApproval />}
    </div>
  )
}
