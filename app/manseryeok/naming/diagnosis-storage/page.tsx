'use client'

// app/manseryeok/naming/diagnosis-storage/page.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  내 이름 정밀분석 보관함 — «전용» 주소                            │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부 33차) — 대표님 지시
//    「홈 버튼이 갈린 만큼 보관함도 «각각 독립 페이지» 로 분리한다」
//
//  ★두 보관함이 이제 «짝» 이 맞습니다.
//     /manseryeok/naming/diagnosis-storage   내 이름 정밀분석
//     /manseryeok/naming/naming-storage      내 아이 명품작명
//
//  ⚠️ 옛 주소(/manseryeok/naming/diagnosis/storage)도 «그대로 둡니다» —
//     마이페이지·북마크가 아직 그리로 옵니다. 거기도 이름 정밀분석이 뜹니다.
//     ★없애면 그분들이 404 를 봅니다. (교훈 AM)
//
//  ⚠️⚠️ 화면을 «복사하지 않았습니다». components/NamingStorageView 하나를
//     세 문이 나눠 씁니다. 복사하면 한쪽만 고치는 날이 반드시 옵니다. (교훈 CJ)
// ══════════════════════════════════════════════════════════════════

import NamingStorageView from '@/app/manseryeok/naming/components/NamingStorageView'

export default function NamingDiagnosisStoragePage() {
  return <NamingStorageView forcedMode="diagnosis" />
}
