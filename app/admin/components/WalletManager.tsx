'use client'
import WalletMember from './WalletMember'

//  ★지갑 — 2026-09-05 신설 (HANDOVER-WALLET.md 4장)
//
//  ★2026-09-08 [대표님 지시] — ★「🏷 요금표」 를 «내렸습니다».
//    [왜]  요금표가 「💰 가격 관리」와 ★값이 겹쳤습니다 (명카페 열 줄이 두 곳).
//          ⇒ 대표님이 어디에 넣어야 하는지 갈렸습니다.
//    ⇒ 요금표(WalletPrice)는 ★「💰 가격 관리」 «오른쪽» 으로 옮겼습니다.
//       ⇒ 이제 «가격표는 한 화면» 입니다. 여기는 «회원 지갑» 만 다룹니다.
//    ⛔ WalletPrice.tsx 는 ★지우지 않았습니다 — 옮겨서 그대로 씁니다.
//    ⇒ 되돌리시려면 아래 주석과 안쪽 탭을 되살리면 됩니다.
//
//  ⚠️ ★admin/page.tsx 의 탭 이름도 「🪙 지갑·요금」 → 「🪙 회원 지갑」 으로 바꿨습니다.
//     ⛔ 이름만 옛것으로 되돌리지 마십시오 — 요금이 없는데 「요금」이라 적히면 헷갈립니다.
//
//  [옛 모양 — 되살리실 때]
//    import { useState } from 'react'
//    import WalletPrice from './WalletPrice'
//    type Inner = 'member' | 'price'
//    안쪽 탭 둘: 🪙 회원 지갑 / 🏷 요금표
//    ⛔ 그때도 「요금표」를 «먼저» 두지 마십시오. 열자마자 회원 찾기가 나와야 합니다.

//  🔴 ★2026-09-09 — 이 파일은 이제 «아무도 안 부릅니다» [대표님 지시]
//    「회원관리 탭과 회원지갑을 하나의 탭으로 묶는다」
//    ⇒ 지갑은 ★app/admin/components/MemberHub.tsx 의 «안쪽 탭» 이 되었습니다.
//      MemberHub 가 WalletMember 를 «바로» 부릅니다.
//
//  ⛔ 그래도 ★지우지 마십시오 —
//     위 머리말에 「요금표(WalletPrice)를 되살리는 법」이 적혀 있습니다.
//     지우면 그 자국이 사라집니다 (48부 「안 부르지만 지우지 마십시오」와 같은 결).
export default function WalletManager({
  userId,
  onBackToMember,
}: {
  userId?: string | null
  onBackToMember?: () => void
} = {}) {
  return <WalletMember userId={userId} onBackToMember={onBackToMember} />
}
