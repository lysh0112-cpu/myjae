'use client'
import { useState } from 'react'
import WalletMember from './WalletMember'
import WalletPrice from './WalletPrice'

//  ★지갑·요금 — 2026-09-05 신설 (HANDOVER-WALLET.md 4장)
//
//  ⛔⛔ 기존 「💰 가격 관리」(PriceManager)는 «한 줄도» 건드리지 않았습니다.
//      consult_prices · analysis_prices · home_prices · tarot_prices 그대로입니다.
//      [대표님 「가격 설정화면은 변동하면 안 되고 별도의 탭을 만들어 달라」]
//
//  ⚠️ 안을 «둘» 로 가른 까닭 —
//      회원 지갑  ★매일 씁니다 (통장 보고 충전해 주는 일)
//      요금표     ★거의 안 씁니다 (값을 정할 때 한 번)
//     한 화면에 붙이면 매일 쓰는 것 아래로 안 쓰는 것이 깔립니다.
//  ⛔ 「요금표」를 «먼저» 두지 마십시오. 열자마자 회원 찾기가 나와야 합니다.

type Inner = 'member' | 'price'

export default function WalletManager() {
  const [inner, setInner] = useState<Inner>('member')

  const btn = (on: boolean) => on
    ? { background: 'rgba(250,199,117,0.25)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.4)' }
    : { background: 'rgba(255,255,255,0.05)', color: '#8a88a0', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button onClick={() => setInner('member')}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={btn(inner === 'member')}>
          🪙 회원 지갑
        </button>
        <button onClick={() => setInner('price')}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={btn(inner === 'price')}>
          🏷 요금표
        </button>
      </div>

      {inner === 'member' && <WalletMember />}
      {inner === 'price' && <WalletPrice />}
    </div>
  )
}
