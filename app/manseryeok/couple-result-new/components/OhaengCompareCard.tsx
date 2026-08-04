// app/manseryeok/couple-result-new/components/OhaengCompareCard.tsx
// ============================================================================
// 궁합 시각화 부품 — "타고난 오행으로 본 우리의 차이"
//   두 사람 오행을 좌우 마주보는 막대로 그리고, 닮음도·보완도를 수치로 표시.
//   계산은 lib/saju/ohaengCompare.ts, 오행 색은 lib/saju/ohaengColor.ts(연재쌤 지정).
//
// 부부·연인 궁합 어디서든 재사용. props 로 두 사람 오행 점수만 넘기면 된다.
// ============================================================================
'use client'

import { useState } from 'react'
import { compareOhaeng, OHAENG_ORDER, type Ohaeng } from '@/lib/saju/ohaengCompare'
import { EL_BG } from '@/lib/saju/ohaengColor'

const EL_LABEL: Record<Ohaeng, string> = {
  목: '목 나무', 화: '화 불', 토: '토 흙', 금: '금 쇠', 수: '수 물',
}
// 막대 색은 연재쌤 지정 EL_BG. 단 라벨 글씨는 흰 배경에서 안 보이는 금·밝은 토를
// 살짝 어둡게 조정한 '글씨용' 색을 따로 둔다(막대 자체는 지정색 그대로).
const EL_TEXT: Record<Ohaeng, string> = {
  목: '#2e7d32', 화: '#c62828', 토: '#b8801a', 금: '#8a8a8a', 수: '#2b2b2b',
}

/**
 * ★양끝 오행 이름 칸 너비 (2026-08-03)
 *   「목 나무」처럼 두 글자+두 글자라 44px 이면 줄바꿈 없이 들어갑니다.
 *   ⚠️ 좁히면 「금 쇠」만 남고 나머지가 접힙니다. 재고 정한 값입니다.
 */
const NAME_W = 44

// ★2026-07-26 — 조사(과/와 · 이/가)를 받침으로 가른다.
//
//   [왜]
//   전에는 `${aLabel}과 ${bLabel}이` 로 조사를 박아 놨다.
//   기본값(남편·아내)일 때만 맞고, 보관함 다시보기처럼 이름이 들어가면
//   "정준호과 이경아이" 처럼 어색해졌다.
//   coupleFilterV1 에 같은 헬퍼가 있지만 그 파일 안에서만 쓰는 것이라
//   여기서는 필요한 두 개만 짧게 둔다. (한자 이름은 들어오지 않는 자리다)
function hasJong(word: string): boolean {
  const c = (word || '').trim().slice(-1)
  const code = c.charCodeAt(0)
  if (isNaN(code) || code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}
const wagwa = (w: string) => `${w}${hasJong(w) ? '과' : '와'}`
const iga = (w: string) => `${w}${hasJong(w) ? '이' : '가'}`

interface Props {
  /** A(남편/첫 번째) 오행 점수 { 목,화,토,금,수 } */
  aScores: Record<string, number>
  /** B(아내/두 번째) 오행 점수 */
  bScores: Record<string, number>
  /** 좌·우 라벨 (기본: 남편/아내) */
  aLabel?: string
  bLabel?: string
  /** 해설 문구 (없으면 자동 생성) */
  comment?: string
  /** 토글 래퍼 안에 들어갈 때 true — 자체 제목·배경·접기를 끄고 내용만 그린다 */
  embedded?: boolean
}

export default function OhaengCompareCard({
  aScores, bScores, aLabel = '남편', bLabel = '아내', comment, embedded = false,
}: Props) {
  const [open, setOpen] = useState(true)   // 기본 펼침. 제목 누르면 접힘 (embedded면 무시)
  const r = compareOhaeng(aScores, bScores)
  // 막대 길이 정규화: 두 사람 통틀어 가장 큰 값을 100%로
  const maxVal = Math.max(1, ...r.rows.flatMap(row => [row.a, row.b]))
  const pct = (v: number) => `${Math.round((v / maxVal) * 100)}%`

  const autoComment =
    r.leaning === 'similar'
      ? `${EL_LABEL[r.mostSimilar].split(' ')[1]}의 기운으로 깊이 통하는, 결이 비슷한 두 분이에요. 서로 닮아 편안하면서도, 다른 자리는 살며시 채워주는 사이예요.`
      : `서로 없는 기운을 채워주는 두 분이에요. ${wagwa(aLabel)} ${iga(bLabel)} 각자 가진 기운으로 상대의 부족한 자리를 메워, 함께라서 더 단단해지는 사이예요.`

  const body = (
    <>
      {/* 닮음·보완 수치 + 게이지 (한 줄) */}
      <div style={{ display: 'flex', gap: 9, marginBottom: 16 }}>
        <ScoreCard label="🫧 닮은 정도" value={r.similarity} track="#eaf1fa" fill="#378ADD" />
        <ScoreCard label="🤝 채워주는 정도" value={r.complement} track="#fbeaf0" fill="#d4537e" />
      </div>

      {/* ══════════════════════════════════════════════════════════
          ★2026-08-03 — 양방향 막대로 바꿨습니다 (대표님 지시)

          전   [아내 막대][오행 이름][남편 막대]
               ⇒ 이름이 «가운데» 라 0 이 어디인지 알기 어려웠습니다
               ⇒ 막대가 이름 쪽으로 «안으로» 붙어 방향이 헷갈렸습니다

          ★후  [목]  아내 막대 ◀─(0 중앙)─▶ 남편 막대  [목]
               ★맨 가운데가 «0» 입니다. 두 막대가 «바깥으로» 뻗습니다.
               ★오행 이름을 «양끝» 에 대칭으로 둡니다.

          ⚠️ 계산은 «건드리지 않았습니다» — compareOhaeng 그대로입니다.
             CSS 배치만 바꿨습니다 (대표님 지시).
          ⚠️ 색은 EL_BG(연재쌤 지정) 그대로. 금(金)은 흰색이라 테두리로 드러냅니다.
          ══════════════════════════════════════════════════════════ */}

      {/* ★타이틀 — 그래프 «위» 좌우로 */}
      <div style={{
        display: 'grid', gridTemplateColumns: `${NAME_W}px 1fr 1fr ${NAME_W}px`,
        alignItems: 'center', fontSize: 11, marginBottom: 8,
      }}>
        <span />
        <span style={{ color: '#8a6a52', textAlign: 'left', paddingLeft: 2 }}>◀ {aLabel}</span>
        <span style={{ color: '#8a6a52', textAlign: 'right', paddingRight: 2 }}>{bLabel} ▶</span>
        <span />
      </div>

      {/* ★오행별 — 가운데가 0, 바깥으로 뻗습니다 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, position: 'relative' }}>
        {OHAENG_ORDER.map(el => {
          const row = r.rows.find(x => x.el === el)!
          const isGeum = el === '금'  // 흰색이라 테두리로 드러냄
          const bar = (side: 'l' | 'r') => ({
            display: 'block' as const,
            width: side === 'l' ? pct(row.a) : pct(row.b),
            height: 15,
            background: EL_BG[el],
            border: isGeum ? '0.5px solid #c8c8c8' : 'none',
            // ★바깥쪽 끝만 둥글게 — 가운데(0)는 각지게 두어 «시작점» 임을 보입니다
            borderRadius: side === 'l' ? '3px 0 0 3px' : '0 3px 3px 0',
          })
          const name = (
            <span style={{
              fontSize: 11, color: EL_TEXT[el], fontWeight: 500,
              whiteSpace: 'nowrap' as const,
            }}>{EL_LABEL[el]}</span>
          )
          return (
            <div key={el} style={{
              display: 'grid',
              gridTemplateColumns: `${NAME_W}px 1fr 1fr ${NAME_W}px`,
              alignItems: 'center', gap: 6,
            }}>
              {/* ★왼쪽 끝 이름 */}
              <div style={{ textAlign: 'right' }}>{name}</div>
              {/* 아내 — 가운데에서 «왼쪽으로» */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={bar('l')} />
              </div>
              {/* 남편 — 가운데에서 «오른쪽으로» */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <span style={bar('r')} />
              </div>
              {/* ★오른쪽 끝 이름 (대칭) */}
              <div style={{ textAlign: 'left' }}>{name}</div>
            </div>
          )
        })}

        {/* ★가운데 0 선 — 두 막대가 «여기서» 시작합니다 */}
        <div aria-hidden style={{
          position: 'absolute', left: '50%', top: -3, bottom: -3,
          width: 1, background: '#e0d6cc', transform: 'translateX(-0.5px)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* 해설 */}
      <div style={{ marginTop: 16, background: '#fdf3e9', borderRadius: 10, padding: '12px 13px', fontSize: 11.5, color: '#7a5638', lineHeight: 1.65 }}>
        {comment ?? autoComment}
      </div>
    </>
  )

  // 토글 래퍼 안에서 쓰일 때 — 자체 제목·배경·접기 없이 내용만
  if (embedded) return body

  return (
    <div style={{ background: '#FDF6F0', borderRadius: 16, padding: '18px 15px' }}>
      {/* 제목 = 접기/펴기 헤더 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', marginBottom: open ? 16 : 0, WebkitTapHighlightColor: 'transparent', WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: '#96502e' }}>
          타고난 오행으로 본 우리의 차이
        </span>
        <span style={{ fontSize: 11, color: '#c0a898', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>

      {open && body}
    </div>
  )
}

function ScoreCard({ label, value, track, fill }: { label: string; value: number; track: string; fill: string }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: '0.5px solid #9c7a58', borderRadius: 11, padding: '11px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 11.5, color: '#96502e' }}>{label}</span>
        <span style={{ fontSize: 17, fontWeight: 500, color: fill }}>{value}%</span>
      </div>
      <div style={{ height: 7, background: track, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: fill }} />
      </div>
    </div>
  )
}
