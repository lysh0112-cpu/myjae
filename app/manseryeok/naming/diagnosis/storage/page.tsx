'use client'

// app/manseryeok/naming/diagnosis/storage/page.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  이름 풀이 보관함 — «얇은 문» 하나                                │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부 9차) — 화면 본체를 components/NamingStorageView 로 옮겼습니다.
//
//  ⚠️⚠️ 여기에 «갈래를 못 박지 않았습니다»(forcedMode 를 주지 않습니다).
//     [왜]  이 주소는 «옛 주소» 입니다. 마이페이지·옛 링크·북마크가 아직 옵니다.
//       · ?mode=diagnosis 로 오면 → 이름 풀이 보관함
//       · ?mode=naming    으로 오면 → 작명 보관함 (옛 링크 호환)
//       · mode 가 없으면  → «예전 그대로» 탭 셋 · 버튼 둘
//     ★여기에 diagnosis 를 못 박으면 옛 링크로 오신 분이 «작명 기록을 못 봅니다».
//       (교훈 AM — 안 쓰인다고 지레 좁히면 쓰이던 길이 끊깁니다)
//
//  ★새로 만드는 링크는 아래 두 주소를 쓰십시오.
//     이름 풀이  /manseryeok/naming/diagnosis/storage?mode=diagnosis
//     작명       /manseryeok/naming/naming-storage
// ══════════════════════════════════════════════════════════════════

import NamingStorageView from '@/app/manseryeok/naming/components/NamingStorageView'

export default function NamingDiagnosisStoragePage() {
  return <NamingStorageView />
}
