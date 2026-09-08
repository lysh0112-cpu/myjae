'use client'
import { useState } from 'react'
import MemberManager from './MemberManager'
import WalletMember from './WalletMember'

// ══════════════════════════════════════════════════════════════════
//  ★2026-09-09 — 「👥 회원 관리」 ★한 탭  [대표님 지시]
//    「회원관리 탭과 회원지갑을 하나의 탭으로 묶는다.
//      그 탭 안에서 회원관리 탭과 회원지갑 탭이 나뉜다」
//    「★위에 탭들이 너무 많아서 헷갈려」
//    ⇒ 위 탭이 ★열여섯 → 열다섯 이 되었습니다.
//
//  ★이 파일이 하는 일은 «안쪽 탭을 가르는 것» «하나» 뿐입니다.
//  ⛔⛔ 회원 목록·지갑의 «알맹이» 를 여기로 옮기지 마십시오 —
//     MemberManager · WalletMember 가 각자 제 일을 그대로 합니다.
//     여기에 조회나 저장을 넣는 순간 «같은 일이 두 곳» 이 됩니다.
//
//  ⚠️ ★열자마자 «회원 목록» 이 나옵니다.
//     ⛔ 「지갑」을 먼저 두지 마십시오 — ★사람을 «먼저» 찾고 그 다음에 돈을 봅니다.
//        (2026-09-08 에 「열자마자 회원 찾기가 나와야 합니다」라 적어 두신 그 결입니다)
//
//  ⚠️ ★주소로 여는 길이 «둘 다» 살아 있습니다 [48부 10차] —
//        /admin#member  → 회원 목록
//        /admin#wallet  → ★지갑으로 «바로»
//     ⛔ #wallet 을 없애지 마십시오. 즐겨찾기 해 두셨을 수 있습니다.
//
//  ⚠️ WalletManager.tsx 는 이제 «안 쓰입니다» — ⛔ 지우지는 마십시오.
//     요금표를 되살릴 때 쓰라고 적어 둔 주석이 그 안에 있습니다.
// ══════════════════════════════════════════════════════════════════

export type MemberInner = 'list' | 'wallet'

export default function MemberHub({ initial }: { initial?: MemberInner } = {}) {
  const [inner, setInner] = useState<MemberInner>(initial ?? 'list')

  //  ★지갑에서 보고 있는 회원. 회원 목록에서 «이름» 을 눌러 넘어옵니다.
  //  ⛔ 탭을 오갈 때 «지우지» 마십시오 — 돌아왔다 다시 가면 자리가 풀립니다.
  const [walletUserId, setWalletUserId] = useState<string | null>(null)

  //  ★회원 목록에서 이름을 누르면 — 지갑 탭으로 옮기고 «누구인지» 를 함께 넘깁니다.
  const openWallet = (userId: string) => {
    setWalletUserId(userId)
    setInner('wallet')
  }

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
      {/* 안쪽 탭 둘 */}
      <div className="flex gap-6 mb-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button type="button" onClick={() => setInner('list')} style={tabStyle(inner === 'list')}>
          👥 회원 목록
        </button>
        <button type="button" onClick={() => setInner('wallet')} style={tabStyle(inner === 'wallet')}>
          🪙 회원 지갑
        </button>
      </div>

      {/* ⚠️ 둘을 «함께» 그리지 않습니다 — 안 보이는 쪽까지 조회가 돕니다. */}
      {inner === 'list' && <MemberManager onOpenWallet={openWallet} />}
      {inner === 'wallet' && (
        <WalletMember
          userId={walletUserId}
          //  ★회원 목록에서 넘어오셨을 때만 「← 회원 목록으로」 가 뜹니다.
          onBackToMember={walletUserId ? () => setInner('list') : undefined}
        />
      )}
    </div>
  )
}
