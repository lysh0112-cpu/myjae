'use client'

/**
 * 전문가 상세 — 전문가 모드(?pro=1) 토글 ON일 때만 표시
 * ────────────────────────────────────────────────────────────
 * 담는 것 (참고: 시중 전문가용 만세력 앱)
 *   ① 지장간 + 각 지장간의 십성 (여기·중기·본기)
 *   ② 납음오행
 *   ③ 12운성 — 일간 기준 + 년간 기준 (두 기준 병기)
 *   ④ 12신살 — 년지 기준 + 일지 기준 (두 기준 병기)
 *   ⑤ 귀인 — 지지귀인(천을·태극·문창·금여·암록) + 천간귀인(월덕·천덕)
 *   ⑥ 공망 — 일주 기준 + 년주 기준 (두 기준)
 *   ⑦ 형충회합 격자표 (4×4 교차) + 성립 관계 목록
 *
 * ※ 계산은 전부 검증된 기존 lib 함수 재사용. 이 파일은 표시만 담당.
 * ※ 복성귀인·홍염살·현침살은 조견표 확정 후 추가 예정.
 */

import { getUnsung, getSinsal, getGongmang, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { getGwiinForBranch, getGwiinForStem } from '@/lib/saju/gwiin'
import { nabeum } from '@/lib/saju/sajuDetail'

interface Pillar { pillar: string; stem: string; branch: string }

/* ── 지장간 (여기 → 중기 → 본기 순, 본기가 마지막) ── */
const JIJANGAN: Record<string, string[]> = {
  子: ['壬', '癸'],
  丑: ['癸', '辛', '己'],
  寅: ['戊', '丙', '甲'],
  卯: ['甲', '乙'],
  辰: ['乙', '癸', '戊'],
  巳: ['戊', '庚', '丙'],
  午: ['丙', '己', '丁'],
  未: ['丁', '乙', '己'],
  申: ['戊', '壬', '庚'],
  酉: ['庚', '辛'],
  戌: ['辛', '丁', '戊'],
  亥: ['戊', '甲', '壬'],
}

/* ── 십성 계산 (천간 대 천간) ── */
const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const STEM_YIN: Record<string, boolean> = {
  甲: false, 乙: true, 丙: false, 丁: true, 戊: false,
  己: true, 庚: false, 辛: true, 壬: false, 癸: true,
}
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const OVR: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }

function sipsinOf(dayStem: string, target: string): string {
  const de = STEM_EL[dayStem], te = STEM_EL[target]
  if (!de || !te) return ''
  const same = STEM_YIN[dayStem] === STEM_YIN[target]
  if (te === de) return same ? '비견' : '겁재'
  if (GEN[de] === te) return same ? '식신' : '상관'
  if (OVR[de] === te) return same ? '편재' : '정재'
  if (OVR[te] === de) return same ? '편관' : '정관'
  if (GEN[te] === de) return same ? '편인' : '정인'
  return ''
}

const SS_COLOR: Record<string, string> = {
  비견: '#2e7d32', 겁재: '#2e7d32', 식신: '#c62828', 상관: '#c62828',
  편재: '#f57f17', 정재: '#f57f17', 편관: '#616161', 정관: '#616161',
  편인: '#3c82a0', 정인: '#3c82a0',
}

/* ── 지지 관계 (형충회합) ── */
const YUKHAP: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}
const CHUNG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
const WONJIN: Record<string, string> = {
  子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '酉', 酉: '寅',
  卯: '申', 申: '卯', 辰: '亥', 亥: '辰', 巳: '戌', 戌: '巳',
}
const SAMHAP = [['申', '子', '辰'], ['寅', '午', '戌'], ['亥', '卯', '未'], ['巳', '酉', '丑']]
const BANGHAP = [['寅', '卯', '辰'], ['巳', '午', '未'], ['申', '酉', '戌'], ['亥', '子', '丑']]

interface RelTag { label: string; bg: string; fg: string }
const TAG: Record<string, RelTag> = {
  삼합: { label: '삼합', bg: '#e8f5e9', fg: '#2e7d32' },
  방합: { label: '방합', bg: '#f3ece2', fg: '#96502e' },
  육합: { label: '육합', bg: '#e8f0fb', fg: '#3c82a0' },
  충: { label: '충', bg: '#fdeaea', fg: '#c62828' },
  원진: { label: '원진', bg: '#f7e6ee', fg: '#993556' },
}

/** 두 지지 사이의 관계 목록 */
function relationOf(a: string, b: string): string[] {
  const out: string[] = []
  if (!a || !b) return out
  if (YUKHAP[a] === b) out.push('육합')
  if (CHUNG[a] === b) out.push('충')
  if (WONJIN[a] === b) out.push('원진')
  for (const s of SAMHAP) if (s.includes(a) && s.includes(b)) out.push('삼합')
  for (const s of BANGHAP) if (s.includes(a) && s.includes(b)) out.push('방합')
  return Array.from(new Set(out))
}

/* ── 공통 스타일 ── */
const card: React.CSSProperties = {
  background: '#fff', border: '0.5px solid #f0e0d5', borderRadius: 12,
  padding: '11px 12px', marginBottom: 9,
}
const ttl: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#96502e', marginBottom: 8,
}
const tb: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: 10.5, textAlign: 'center',
}
const th: React.CSSProperties = {
  background: '#faf3ec', color: '#96502e', padding: '4px 2px',
  border: '0.5px solid #f0e0d5', fontWeight: 600,
}
const td: React.CSSProperties = { padding: '4px 2px', border: '0.5px solid #f0e0d5' }
const rl: React.CSSProperties = {
  ...td, color: '#c5a590', fontSize: 9.5, background: '#fdf9f5', width: 46,
}

function Badge({ kind }: { kind: string }) {
  const t = TAG[kind]
  if (!t) return null
  return (
    <span style={{
      display: 'inline-block', fontSize: 9, padding: '1px 5px', borderRadius: 8,
      margin: 1, background: t.bg, color: t.fg, fontWeight: 600,
    }}>{t.label}</span>
  )
}

export default function ExpertDetail({
  saju, dayStem, yearStem, yeonjji, iljji, monthBranch,
}: {
  saju: Pillar[]
  dayStem: string
  yearStem: string
  yeonjji: string
  iljji: string
  monthBranch: string
}) {
  if (!saju.length || !dayStem) return null

  // 공망 — 일주 기준 / 년주 기준
  const dayPillar = saju.find(p => p.pillar === '일주')
  const yearPillar = saju.find(p => p.pillar === '년주') ?? saju.find(p => p.pillar === '연주')
  const gmDay = dayPillar ? getGongmang(dayPillar.stem, dayPillar.branch) : ['', '']
  const gmYear = yearPillar ? getGongmang(yearPillar.stem, yearPillar.branch) : ['', '']

  // 형충회합 — 성립한 쌍 목록 (중복 제거: i<j 만)
  const pairs: { a: Pillar; b: Pillar; rels: string[] }[] = []
  for (let i = 0; i < saju.length; i++) {
    for (let j = i + 1; j < saju.length; j++) {
      const rels = relationOf(saju[i].branch, saju[j].branch)
      if (rels.length) pairs.push({ a: saju[i], b: saju[j], rels })
    }
  }

  const shortP = (s: string) => s.replace('주', '')

  return (
    <div>
      {/* ① 지장간 + 십성 */}
      <div style={card}>
        <div style={ttl}>📋 지장간 · 십성</div>
        <table style={tb}>
          <tbody>
            <tr>
              <td style={rl} />
              {saju.map((p, i) => <th key={i} style={th}>{shortP(p.pillar)} {p.branch}</th>)}
            </tr>
            {['여기', '중기', '본기'].map((row, ri) => (
              <tr key={row}>
                <td style={rl}>{row}</td>
                {saju.map((p, i) => {
                  const hidden = JIJANGAN[p.branch] ?? []
                  // 여기=0, 중기=(3개일 때만 1), 본기=마지막
                  let g = ''
                  if (ri === 0) g = hidden[0] ?? ''
                  else if (ri === 1) g = hidden.length === 3 ? hidden[1] : ''
                  else g = hidden[hidden.length - 1] ?? ''
                  if (!g) return <td key={i} style={{ ...td, color: '#ddd0c4' }}>–</td>
                  const ss = sipsinOf(dayStem, g)
                  const isBongi = ri === 2
                  return (
                    <td key={i} style={{
                      ...td,
                      fontWeight: isBongi ? 700 : 400,
                      background: isBongi ? '#fdf9f5' : undefined,
                    }}>
                      <span style={{ color: '#3a2e28' }}>{g}</span>{' '}
                      <span style={{ color: SS_COLOR[ss] || '#8a7360', fontSize: 9.5 }}>{ss}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ② 12운성 두 기준 */}
      <div style={card}>
        <div style={ttl}>🌱 12운성 — 두 기준</div>
        <table style={tb}>
          <tbody>
            <tr>
              <td style={rl} />
              {saju.map((p, i) => <th key={i} style={th}>{shortP(p.pillar)}</th>)}
            </tr>
            <tr>
              <td style={rl}>일간 {dayStem}</td>
              {saju.map((p, i) => {
                const u = getUnsung(dayStem, p.branch)
                return <td key={i} style={{ ...td, color: unsungColor(u) || '#3a2e28', fontWeight: 600 }}>{u || '–'}</td>
              })}
            </tr>
            <tr>
              <td style={rl}>년간 {yearStem}</td>
              {saju.map((p, i) => {
                const u = yearStem ? getUnsung(yearStem, p.branch) : ''
                return <td key={i} style={{ ...td, color: unsungColor(u) || '#8a7360' }}>{u || '–'}</td>
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ③ 12신살 두 기준 */}
      <div style={card}>
        <div style={ttl}>⚡ 12신살 — 두 기준</div>
        <table style={tb}>
          <tbody>
            <tr>
              <td style={rl} />
              {saju.map((p, i) => <th key={i} style={th}>{shortP(p.pillar)}</th>)}
            </tr>
            <tr>
              <td style={rl}>년지 {yeonjji}</td>
              {saju.map((p, i) => {
                const s = getSinsal(yeonjji, p.branch)
                return <td key={i} style={{ ...td, color: SINSAL_HIGHLIGHT[s] || '#8a7360', fontWeight: 600 }}>{s || '–'}</td>
              })}
            </tr>
            <tr>
              <td style={rl}>일지 {iljji}</td>
              {saju.map((p, i) => {
                const s = getSinsal(iljji, p.branch)
                return <td key={i} style={{ ...td, color: SINSAL_HIGHLIGHT[s] || '#8a7360' }}>{s || '–'}</td>
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ④ 귀인 (지지 + 천간) */}
      <div style={card}>
        <div style={ttl}>✨ 귀인</div>
        <table style={tb}>
          <tbody>
            <tr>
              <td style={rl} />
              {saju.map((p, i) => <th key={i} style={th}>{shortP(p.pillar)}</th>)}
            </tr>
            <tr>
              <td style={rl}>천간</td>
              {saju.map((p, i) => {
                const g = getGwiinForStem(monthBranch, p.stem)
                return (
                  <td key={i} style={{ ...td, color: '#7c5aaa', fontSize: 9.5 }}>
                    {g.length ? g.map(x => x.replace('귀인', '')).join('·') : '–'}
                  </td>
                )
              })}
            </tr>
            <tr>
              <td style={rl}>지지</td>
              {saju.map((p, i) => {
                const g = getGwiinForBranch(dayStem, monthBranch, p.branch)
                return (
                  <td key={i} style={{ ...td, color: '#c8783c', fontSize: 9.5 }}>
                    {g.length ? g.map(x => x.replace('귀인', '')).join('·') : '–'}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ⑤ 납음오행 */}
      <div style={card}>
        <div style={ttl}>🎵 납음오행</div>
        <table style={tb}>
          <tbody>
            <tr>
              <td style={rl} />
              {saju.map((p, i) => <th key={i} style={th}>{shortP(p.pillar)}</th>)}
            </tr>
            <tr>
              <td style={rl}>납음</td>
              {saju.map((p, i) => (
                <td key={i} style={{ ...td, color: '#6a5848' }}>{nabeum(p.stem, p.branch) || '–'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ⑥ 형충회합 격자표 + 목록 */}
      <div style={card}>
        <div style={ttl}>🔗 형충회합</div>
        <table style={{ ...tb, marginBottom: 9 }}>
          <tbody>
            <tr>
              <td style={rl} />
              {saju.map((p, i) => (
                <th key={i} style={th}>{shortP(p.pillar)} {p.branch}</th>
              ))}
            </tr>
            {saju.map((row, ri) => (
              <tr key={ri}>
                <th style={{ ...th, textAlign: 'center' }}>{shortP(row.pillar)} {row.branch}</th>
                {saju.map((col, ci) => {
                  if (ri === ci) {
                    return (
                      <td key={ci} style={{ ...td, background: '#fdf4ec', color: '#c8783c', fontWeight: 700 }}>
                        {row.branch}
                      </td>
                    )
                  }
                  const rels = relationOf(row.branch, col.branch)
                  return (
                    <td key={ci} style={td}>
                      {rels.length
                        ? rels.map(r => <Badge key={r} kind={r} />)
                        : <span style={{ color: '#ddd0c4' }}>–</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 성립한 관계만 목록으로 */}
        <div style={{
          background: '#fdf9f5', border: '0.5px solid #f5ece2', borderRadius: 10,
          padding: '8px 11px', fontSize: 10.5, lineHeight: 1.9,
        }}>
          {pairs.length === 0 ? (
            <span style={{ color: '#b4785a' }}>성립한 형충회합이 없어요.</span>
          ) : (
            pairs.map((pr, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ flexShrink: 0 }}>{pr.rels.map(r => <Badge key={r} kind={r} />)}</span>
                <span style={{ color: '#3a2e28', fontWeight: 600 }}>
                  {shortP(pr.a.pillar)}{pr.a.branch} · {shortP(pr.b.pillar)}{pr.b.branch}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ⑦ 공망 두 기준 */}
      <div style={card}>
        <div style={ttl}>🕳 공망 — 두 기준</div>
        <div style={{ fontSize: 11, color: '#6a5848', lineHeight: 2 }}>
          <div>
            <span style={{ color: '#c5a590', fontSize: 10 }}>일주 기준</span>{' '}
            <b style={{ color: '#c62828', marginLeft: 6 }}>{gmDay[0]}·{gmDay[1]}</b>
          </div>
          <div>
            <span style={{ color: '#c5a590', fontSize: 10 }}>년주 기준</span>{' '}
            <b style={{ color: '#c62828', marginLeft: 6 }}>{gmYear[0]}·{gmYear[1]}</b>
          </div>
        </div>
      </div>
    </div>
  )
}
