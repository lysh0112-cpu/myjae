'use client'

// app/manseryeok/moving-timing/components/SoloWonguk.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  이사택일 — 한 사람 사주 원국                                     │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 — «정본 부품» 으로 갈아끼웠습니다. (대표님 지시)
//
//   [전에는]
//     이 파일이 원국 표를 «스스로» 그렸습니다 (131줄).
//     천간·지지 여덟 칸만 있고
//       ✖ 십성 · 지지십성 · 12운성 · 신살 · 귀인 · 공망 이 «없었습니다»
//       ✖ 용어를 눌러도 «뜻풀이 모달» 이 안 떴습니다
//     같은 원국인데 화면마다 다른 표를 보여 주고 있었습니다.
//
//   [이제는]
//     app/manseryeok/components/SajuWonguk.tsx 를 «가져다» 씁니다.
//     ★계산이 정확하고 해설 모달이 들어 있는 «그 표» 입니다.
//     사주보기·진로적성·출산택일·합격운·물상이 쓰는 것과 «같은 부품» 입니다.
//
//   ⚠️ 이 파일은 이제 «껍데기» 입니다 — 이름·생일·용신 줄만 감쌉니다.
//      표 자체를 여기서 다시 그리지 마십시오. 그러면 또 갈립니다. (교훈 CJ)
// ══════════════════════════════════════════════════════════════════

import React from 'react'
import SajuWonguk from '@/app/manseryeok/components/SajuWonguk'
import { getGongmang } from '@/lib/saju'

interface SajuPillar { pillar: string; stem: string; branch: string }

interface PersonLike {
  name: string
  birthLabel: string
  pillars: SajuPillar[]
  yongsin?: string
}

/** 정본 표가 바라는 차례 — 시 → 일 → 월 → 연 */
const ORDER = ['시주', '일주', '월주', '연주'] as const

export default function SoloWonguk({ person }: { person: PersonLike }) {
  const byPillar: Record<string, SajuPillar> = {}
  person.pillars.forEach((p) => { byPillar[p.pillar] = p })

  // ⚠️ 어떤 화면은 «연주», 어떤 화면은 «년주» 로 넘깁니다. 둘 다 받습니다.
  const pick = (label: string): SajuPillar =>
    byPillar[label]
    ?? (label === '연주' ? byPillar['년주'] : undefined)
    ?? { pillar: label, stem: '?', branch: '?' }

  const saju = ORDER.map((l) => pick(l))
  const ilju = saju.find((p) => p.pillar === '일주')
  const dayStem = ilju?.stem ?? ''
  const iljji = ilju?.branch ?? ''
  const yeonjji = saju[3]?.branch ?? ''

  // 공망 — 정본 표가 그 칸을 흐리게 그리는 데 씁니다
  const [gm1, gm2] = (dayStem && iljji && dayStem !== '?' && iljji !== '?')
    ? getGongmang(dayStem, iljji) : ['', '']

  return (
    <div style={{
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      background: '#FFFDF9', border: '0.5px solid #EAE0CE',
      borderRadius: 12, padding: '12px 10px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#3A3228' }}>
          {person.name}
        </div>
        {person.birthLabel && (
          <div style={{ fontSize: 10, color: '#7A6440' }}>{person.birthLabel}</div>
        )}
      </div>

      {/* ★정본 부품 — 십성·12운성·신살·귀인·공망 + 용어 뜻풀이 모달까지 그대로 */}
      <SajuWonguk
        saju={saju}
        dayStem={dayStem}
        yeonjji={yeonjji}
        iljji={iljji}
        gm1={gm1}
        gm2={gm2}
      />

      {person.yongsin && (
        <div style={{
          textAlign: 'center', marginTop: 9, fontSize: 11.5, color: '#9A8060',
        }}>
          필요한 기운 <b style={{ color: '#7A6440' }}>{person.yongsin}</b>
        </div>
      )}
    </div>
  )
}
