'use client'

// ┌──────────────────────────────────────────────────────────┐
// │  유파 비교 부품 (SchoolCompare)                            │
// │  심산 오행 그래프 아래에 붙는 독립 부품.                    │
// │  그릇(격국)·균형(억부)·계절(조후) 세 관점을 가로로 보여주고, │
// │  누르면 아래로 자세한 설명이 펼쳐집니다.                     │
// │  ※ 종합해설은 심산 기준 고정. 이 부품은 "관점 소개"만 담당.  │
// │                                                            │
// │  사용:  <SchoolCompare ohaeng={ohaeng} />                  │
// │  빼기:  이 한 줄만 지우면 됨 (그래프는 영향 없음)           │
// └──────────────────────────────────────────────────────────┘

import { useState } from 'react'

type Ohaeng = { el: string; pct: number }

interface School {
  key: string
  sym: string        // 한자 아이콘 (格·衡·候)
  name: string       // 쉬운 이름 (그릇으로)
  formal: string     // 정식명칭 (격국용신)
  book: string       // 출전 (자평진전)
  bg: string         // 아이콘 배경색
  tx: string         // 아이콘/강조 글자색
  long: string       // 자세한 설명
  applyBy: (topEl: string) => string  // 이 사주 적용 한 줄
}

const SCHOOLS: School[] = [
  {
    key: '그릇', sym: '格', name: '그릇으로', formal: '격국용신', book: '자평진전',
    bg: '#EEEDFE', tx: '#3C3489',
    long: '태어난 달로 정관격 같은 사회적 그릇을 정하고, 그 그릇을 완성시키는 핵심 글자(상신)가 제자리에 있는지를 봅니다. 강약보다 짜임새의 질을 중시합니다.',
    applyBy: (t) => `이 사주 → 가장 강한 ${t} 기운이 그릇의 중심을 이룹니다`,
  },
  {
    key: '균형', sym: '衡', name: '균형으로', formal: '억부용신', book: '적천수',
    bg: '#E1F5EE', tx: '#085041',
    long: '사주를 양팔저울로 봅니다. 넘치는 기운은 덜고 모자라면 채워 균형(중화)을 맞춥니다. 점수로 약해 보여도 흐름이 좋으면 좋은 사주로 봅니다.',
    applyBy: (t) => `이 사주 → ${t}이(가) 강하니, 이를 흘려보낼 기운이 필요합니다`,
  },
  {
    key: '계절', sym: '候', name: '계절로', formal: '조후용신', book: '궁통보감',
    bg: '#FAECE7', tx: '#712B13',
    long: '사주를 자연 풍경화로 봅니다. 겨울 나무엔 태양이, 여름 밭엔 물이 필요하듯 계절에 알맞은 온도를 맞추는 글자를 찾습니다.',
    applyBy: (t) => `이 사주 → 계절의 기운(${t})이 온도를 좌우합니다`,
  },
]

const EL_FULL: Record<string, string> = {
  목: '목(木)', 화: '화(火)', 토: '토(土)', 금: '금(金)', 수: '수(水)',
}

export default function SchoolCompare({ ohaeng }: { ohaeng: Ohaeng[] }) {
  const [open, setOpen] = useState<string | null>(null)

  // 대표 오행 (가장 높은 점수)
  const topEl = ohaeng.length
    ? [...ohaeng].sort((a, b) => b.pct - a.pct)[0].el
    : ''
  const topLabel = EL_FULL[topEl] || topEl

  return (
    <div
      style={{
        background: '#FFFBF7',
        border: '0.5px solid #f5d5b8',
        borderRadius: 14,
        padding: 15,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: '#96502e', marginBottom: 2 }}>
        다른 관점으로는?
      </div>
      <div style={{ fontSize: 12, color: '#b4785a', marginBottom: 12 }}>
        같은 사주도 유파마다 다르게 봅니다
      </div>

      {/* 세 관점 가로 배치 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {SCHOOLS.map((s) => {
          const on = open === s.key
          return (
            <button
              key={s.key}
              onClick={() => setOpen(on ? null : s.key)}
              style={{
                background: '#fff',
                border: on ? '2px solid #c8783c' : '0.5px solid #e8d5c5',
                borderRadius: 10,
                padding: '11px 3px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 24, height: 24, borderRadius: 7,
                  background: s.bg, color: s.tx,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                }}
              >
                {s.sym}
              </div>
              <div
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-start', justifyContent: 'flex-start',
                  gap: 1, marginTop: -3,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#3a2e28', whiteSpace: 'nowrap', lineHeight: 1.1 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 9.5, color: '#b4785a', whiteSpace: 'nowrap', lineHeight: 1.1 }}>
                  {s.formal}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 펼침 상세 */}
      {open && (() => {
        const s = SCHOOLS.find((x) => x.key === open)!
        return (
          <div style={{ background: s.bg, borderRadius: 10, padding: 13, marginTop: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: s.tx, marginBottom: 6 }}>
              {s.name} 보기 · {s.formal} · {s.book}
            </div>
            <div style={{ fontSize: 13, color: '#5a5048', lineHeight: 1.75, marginBottom: 9 }}>
              {s.long}
            </div>
            {topEl && (
              <div
                style={{
                  fontSize: 12, color: s.tx, background: '#fff',
                  borderRadius: 8, padding: '7px 11px',
                }}
              >
                {s.applyBy(topLabel)}
              </div>
            )}
          </div>
        )
      })()}

      <div style={{ fontSize: 10.5, color: '#c4a58a', marginTop: 10, textAlign: 'center' }}>
        ※ 종합 사주 풀이는 수리계산 관점 기준입니다
      </div>
    </div>
  )
}
