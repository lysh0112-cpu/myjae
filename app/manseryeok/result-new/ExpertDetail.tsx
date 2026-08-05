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

import { useState } from 'react'
import { getUnsung, getSinsal, getGongmang, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { JIJANGAN } from '@/lib/saju/yongsinNew'
import { calcSaryeong } from '@/lib/saju/jijanggan'
import { getGwiinForBranch, getGwiinForStem } from '@/lib/saju/gwiin'
import { nabeum } from '@/lib/saju/sajuDetail'
import TermModal from './TermModal'
import { branchRelationLabels, unMeetsWongook } from '@/lib/saju/hapJudge'

interface Pillar { pillar: string; stem: string; branch: string }

/* ── 지장간 ──
   ★2026-08-05 — 이 파일이 갖고 있던 «사본» 을 걷어내고 공용 표를 부릅니다. [대표님 지시]
     [전]  여기에 JIJANGAN 을 따로 적어 두었습니다.
     [대조]  lib/saju/yongsinNew.ts 의 표와 ★12/12 «완전히 같았습니다» (전수 확인).
             순전한 사본이라 지워도 ★화면이 하나도 안 바뀝니다.
     [까닭]  lib/saju/jijanggan.ts 머리글의 경고 —
             「저장소에 지장간 표가 이미 둘 있다. ★세 번째 표를 만들면
               그때부터 관리가 안 된다 (교훈 CJ)」
     ⚠️ 이 표는 ★«여기먼저» [여, 중, 정] 차례입니다. 아래 여기/중기/본기 줄이
        그 차례에 기댑니다. 뒤집힌 표를 넣지 마십시오. */

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

/* ── 지지 관계 (형충회합) ──
 *   ★2026-07-29 — 육합·충·원진·삼합·방합 표를 여기서 걷어냈습니다.
 *     lib/saju/hapJudge.branchRelationLabels 한 곳에 있습니다.
 *     표를 두 곳에 두면 반드시 갈립니다. (교훈 CJ)
 */

/** ★운↔원국 딱지 색 — 2026-08-05. 원국 딱지(TAG)와 «따로» 둡니다.
 *   원국 것은 격자표 안에서 작게 쓰이고, 이쪽은 줄 배경으로 쓰입니다. */
const UN_TAG: Record<string, { bg: string; fg: string }> = {
  삼합: { bg: '#e8f5e9', fg: '#2e7d32' },
  방합: { bg: '#f3ece2', fg: '#96502e' },
  육합: { bg: '#e8f0fb', fg: '#3c82a0' },
  충: { bg: '#fdeaea', fg: '#c62828' },
  원진: { bg: '#f7e6ee', fg: '#993556' },
  천간합: { bg: '#f3ece2', fg: '#96502e' },
  간지복음: { bg: '#efeaf6', fg: '#5b4a8a' },
  복음: { bg: '#f5f2ea', fg: '#7d6a5b' },
}

interface RelTag { label: string; bg: string; fg: string }
const TAG: Record<string, RelTag> = {
  삼합: { label: '삼합', bg: '#e8f5e9', fg: '#2e7d32' },
  방합: { label: '방합', bg: '#f3ece2', fg: '#96502e' },
  육합: { label: '육합', bg: '#e8f0fb', fg: '#3c82a0' },
  충: { label: '충', bg: '#fdeaea', fg: '#c62828' },
  원진: { label: '원진', bg: '#f7e6ee', fg: '#993556' },
}

/**
 * 두 지지 사이의 관계 목록
 *
 * ★2026-07-28 — 삼합·방합을 **세 글자가 다 있을 때만** 잡습니다.
 *
 *   [무엇이 어긋났었나]
 *     전에는 `s.includes(a) && s.includes(b)` 만 보아, 두 글자만 있어도 방합이라 띄웠습니다.
 *     보기) 壬辰 丙寅 乙酉 乙亥 명식에서 辰-寅 을 「방합」으로 이어 놓았는데,
 *           寅卯辰 의 卯 가 없어 실은 반방합입니다.
 *     그런데 통변 재료(jaryoPick.jijiHapBrief)는 셋이 다 있어야 잡습니다.
 *     → **화면은 「방합 있음」, AI 는 「방합 없음」** 으로 갈렸습니다.
 *        손님이 도표를 보고 물으면 AI 가 모르는 채 답합니다.
 *
 *   [무엇을 따랐나]
 *     ★2026-07-28 대표님 확정 — 준삼합·반합은 넣지 않는다.
 *       "재료가 너무 비대해지는 것을 막고 core 합 위주로 통변하는 게 더 깔끔하다."
 *     그 방침에 화면을 맞췄습니다. 이제 양쪽이 같은 잣대를 씁니다.
 *     교재 82쪽도 寅卯辰·巳午未·申酉戌·亥子丑 을 세 글자로 적습니다.
 *
 *   ⚠️ 삼합도 같이 고쳤습니다. 준삼합(두 글자)이 곧 삼합의 반합이라 결이 같습니다.
 *      방합만 고치면 삼합 쪽에 같은 어긋남이 그대로 남습니다.
 *
 *   ⚠️ 되돌리시려면 `every(has)` 두 군데만 지우면 됩니다.
 *      다만 그때는 jaryoPick.jijiHapBrief 도 함께 풀어야 합니다. 한쪽만 고치지 마십시오.
 *
 * @param all 명식 네 지지 전부. 안 넘기면 두 글자만으로 보아
 *            삼합·방합이 아예 안 잡힙니다(거짓 표시를 내느니 안 내는 쪽).
 */
function relationOf(a: string, b: string, all?: string[]): string[] {
  // ★2026-07-29 — 판정을 lib/saju/hapJudge 한 곳으로 옮겼습니다.
  //   전에는 이 파일과 lib/saju/sajuDetail.ts 가 표를 따로 갖고 있었고,
  //   sajuDetail 쪽은 **두 글자만으로 삼합**이라 불렀습니다(죽은 코드였지만).
  //   표를 여기 두지 않으면 두 벌이 될 수가 없습니다. (교훈 CJ · CL)
  //   ⚠️ 딱지 이름·차례(육합·충·원진·삼합·방합)는 그대로입니다. 화면은 안 바뀝니다.
  return branchRelationLabels(a, b, all)
}

/* ── 현침살·곡각살 (글자 자체로 판정 · 천간/지지 공통) ──
 *   출처: 연재쌤 정리 (심산 명리학 관점)
 *   현침살: 甲 辛 卯 午 未 申  — 날카로운 바늘 형상. 정밀·기술·활인업
 *   곡각살: 乙 己 巳 丑        — 굽은 다리/뼈 형상. 재치·변동성
 */
const HYEONCHIM = new Set(['甲', '辛', '卯', '午', '未', '申'])
const GOKGAK = new Set(['乙', '己', '巳', '丑'])

/* ── 지지 오행 색 (명카페 규칙: 수=검정 배경 + 흰 글씨) ── */
const BRANCH_BG: Record<string, string> = {
  寅: '#e8f5e9', 卯: '#e8f5e9',                 // 목
  巳: '#fdeaea', 午: '#fdeaea',                 // 화
  辰: '#fef6d8', 戌: '#fef6d8', 丑: '#fef6d8', 未: '#fef6d8', // 토
  申: '#f0f0f0', 酉: '#f0f0f0',                 // 금
  亥: '#2b2b2b', 子: '#2b2b2b',                 // 수 (검정)
}
const BRANCH_FG: Record<string, string> = {
  寅: '#2e7d32', 卯: '#2e7d32',
  巳: '#c62828', 午: '#c62828',
  辰: '#f57f17', 戌: '#f57f17', 丑: '#f57f17', 未: '#f57f17',
  申: '#616161', 酉: '#616161',
  亥: '#ffffff', 子: '#ffffff',                 // 수 = 흰 글씨
}

/* ── 공통 스타일 ── */
const card: React.CSSProperties = {
  background: '#fff', border: '0.5px solid #9c7a58', borderRadius: 12,
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
  border: '0.5px solid #9c7a58', fontWeight: 600,
}
const td: React.CSSProperties = { padding: '4px 2px', border: '0.5px solid #9c7a58' }
const rl: React.CSSProperties = {
  ...td, color: '#6b5340', fontSize: 9.5, background: '#fdf9f5', width: 46,
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
  solarYear, solarMonth, solarDay, hourIdx,
  pickedDaeun, pickedSeyun,
}: {
  saju: Pillar[]
  dayStem: string
  yearStem: string
  yeonjji: string
  iljji: string
  monthBranch: string
  /**
   * ★2026-08-05 (46부 12차) — 지장간 «사령» 을 구하려고 더했습니다.
   *   ⚠️ 넷 다 «없어도 됩니다». 안 넘기면 사령 칸이 «안 나옵니다».
   *      나머지 표는 지금까지와 똑같이 나옵니다.
   *      (공용 부품에 값을 더할 때는 기본값을 둔다 — 45부 교훈)
   */
  solarYear?: number | null
  solarMonth?: number | null
  solarDay?: number | null
  /** 태어난 시진 0~11 (子=0 … 亥=11). 모르면 안 넘겨도 됩니다 */
  hourIdx?: number | null
  /**
   * ★「운의 흐름」에서 고른 대운·세운 — 2026-08-05 (46부 14차).
   *   ⚠️ 안 넘기면 「운이 원국을 건드리는 자리」 칸이 «안 나옵니다».
   *      나머지는 지금까지와 똑같습니다.
   */
  pickedDaeun?: { stem: string; branch: string; age: number } | null
  pickedSeyun?: { stem: string; branch: string; year: number } | null
}) {
  // 용어 모달 (Hooks 규칙: early return보다 먼저 선언)
  const [term, setTerm] = useState<string | null>(null)
  const open = (v: string) => v && v !== '-' && setTerm(v)

  if (!saju.length || !dayStem) return null

  // 공망 — 일주 기준 / 년주 기준
  const dayPillar = saju.find(p => p.pillar === '일주')
  const yearPillar = saju.find(p => p.pillar === '년주') ?? saju.find(p => p.pillar === '연주')
  const gmDay = dayPillar ? getGongmang(dayPillar.stem, dayPillar.branch) : ['', '']

  // ★사령(司令) — 절입 뒤 며칠째에 태어났고, 그때 «권한을 쥔» 지장간이 무엇인가
  //   ⚠️ 생년월일을 «안 넘기면» null 이 되어 아래 칸이 통째로 안 나옵니다.
  //      나머지 표는 지금까지와 똑같습니다.
  const saryeong = (solarYear && solarMonth && solarDay && monthBranch)
    ? calcSaryeong(solarYear, solarMonth, solarDay, hourIdx ?? null,
        monthBranch, { table: JIJANGAN, order: '여기먼저' })
    : null
  const STAGE_LABEL: Record<string, string> = { 여: '여기(餘氣)', 중: '중기(中氣)', 정: '본기(正氣)' }
  const gmYear = yearPillar ? getGongmang(yearPillar.stem, yearPillar.branch) : ['', '']

  // 형충회합 — 성립한 쌍 목록 (중복 제거: i<j 만)
  //   ★삼합·방합은 세 글자가 다 있어야 하므로 명식 네 지지를 함께 넘긴다.
  const allBranches = saju.map(p => p.branch).filter(Boolean)
  const pairs: { a: Pillar; b: Pillar; rels: string[] }[] = []
  for (let i = 0; i < saju.length; i++) {
    for (let j = i + 1; j < saju.length; j++) {
      const rels = relationOf(saju[i].branch, saju[j].branch, allBranches)
      if (rels.length) pairs.push({ a: saju[i], b: saju[j], rels })
    }
  }

  // ★운이 원국을 «새로» 건드리는 자리 — 2026-08-05 (46부 14차 · 대표님 지시)
  //   「전문가용 토글을 켜면 보여 줄 수 있는 것은 최대한 보여 주자」
  //   ⚠️ 위 ⑥ 형충회합 표는 ★원국 넷끼리만 봅니다. 여기서 «덮어쓰지» 않습니다.
  //      unMeetsWongook 이 두 번 돌려 «새로 생긴 것만» 골라 냅니다.
  const unList = [
    pickedDaeun ? { pillar: '대운', stem: pickedDaeun.stem, branch: pickedDaeun.branch } : null,
    pickedSeyun ? { pillar: '세운', stem: pickedSeyun.stem, branch: pickedSeyun.branch } : null,
  ].filter(Boolean) as { pillar: string; stem: string; branch: string }[]
  const unHits = unList.length ? unMeetsWongook(saju, unList) : []

    const shortP = (s: string) => s.replace('주', '')

  return (
    <div>
      {/* ① 지장간 + 십성 */}
      <div style={card}>
        <div style={ttl} onClick={() => open('지장간')} title="지장간 설명 보기">
          <span style={{ cursor: 'pointer' }}>📋 지장간 · 십성 <span style={{ fontSize: 9, color: '#6b5340' }}>ⓘ</span></span>
        </div>
        {/* ★사령 + 절입 경과일 — 2026-08-05 (46부 12차 · 대표님 지시)
            「전문가용 화면에 토글을 켰을 경우에만」 → 이 부품 자체가 isPro && hapchungOn
            조건 안에서만 그려지므로(page.tsx), 여기 두면 그 조건을 그대로 탑니다. */}
        {saryeong && (
          <div style={{ background: '#fdf6f0', borderRadius: 9, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, color: '#3a2e28', lineHeight: 1.75 }}>
              <b style={{ color: '#96502e' }}>{saryeong.termName}</b> 절입{' '}
              {saryeong.jolip.getFullYear()}-{String(saryeong.jolip.getMonth() + 1).padStart(2, '0')}-{String(saryeong.jolip.getDate()).padStart(2, '0')}{' '}
              {String(saryeong.jolip.getHours()).padStart(2, '0')}:{String(saryeong.jolip.getMinutes()).padStart(2, '0')}
              {' · '}<b style={{ color: '#96502e' }}>{saryeong.days.toFixed(1)}일째</b> 태생
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: '#b46e46', borderRadius: 6, padding: '2px 7px' }}>사령</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#c62828' }}>{saryeong.result.currentGan}</span>
              <span style={{ fontSize: 11, color: '#7d6a5b' }}>
                {STAGE_LABEL[saryeong.result.stage]} — 월령의 권한을 쥔 글자
              </span>
            </div>
            {/* 구간 막대 — 사령 구간만 진하게 */}
            <div style={{ display: 'flex', height: 9, borderRadius: 5, overflow: 'hidden', marginTop: 9, border: '0.5px solid #b99a7d' }}>
              {saryeong.result.slices.map((sl, i) => (
                <div key={i} style={{ width: `${sl.ratio * 100}%`, background: sl.stage === saryeong.result.stage ? '#c62828' : '#e8dcc8' }} />
              ))}
            </div>
            <div style={{ display: 'flex', fontSize: 9, color: '#7d6a5b', marginTop: 3 }}>
              {saryeong.result.slices.map((sl, i) => (
                <span key={i} style={{
                  width: `${sl.ratio * 100}%`, textAlign: 'center',
                  color: sl.stage === saryeong.result.stage ? '#c62828' : '#7d6a5b',
                  fontWeight: sl.stage === saryeong.result.stage ? 700 : 400,
                }}>{sl.gan} {sl.stage} {Math.round(sl.days)}일</span>
              ))}
            </div>
            {/* ⚠️ 이 줄을 지우지 마십시오 — 날수 배분표가 «교재 정본이 아닙니다» */}
            <div style={{ fontSize: 9.5, color: '#8a7565', marginTop: 8, lineHeight: 1.6 }}>
              ※ 날수 배분은 <b>전통 배분</b> 기준이에요 (생지 7·7·16 / 왕지 10·20 / 午 10·9·11).
              태어난 시각은 그 시진의 한가운데로 잡았어요.
            </div>
          </div>
        )}

        <table style={tb}>
          <tbody>
            <tr>
              <td style={rl} />
              {saju.map((p, i) => <th key={i} style={th}>{shortP(p.pillar)} {p.branch}</th>)}
            </tr>
            {['여기', '중기', '본기'].map((row, ri) => (
              <tr key={row}>
                <td style={{ ...rl, cursor: 'pointer' }} onClick={() => open(row)}>{row}</td>
                {saju.map((p, i) => {
                  const hidden = JIJANGAN[p.branch] ?? []
                  // 여기=0, 중기=(3개일 때만 1), 본기=마지막
                  let g = ''
                  if (ri === 0) g = hidden[0] ?? ''
                  else if (ri === 1) g = hidden.length === 3 ? hidden[1] : ''
                  else g = hidden[hidden.length - 1] ?? ''
                  if (!g) return <td key={i} style={{ ...td, color: '#ddd0c4' }}>-</td>
                  const ss = sipsinOf(dayStem, g)
                  const isBongi = ri === 2
                  // ★사령 칸 — 월주이고, 그 단계가 지금 사령인 자리
                  //   ⚠️ 사령은 «월지에만» 있습니다. 월령(月令)의 권한이라 다른 기둥에는 없습니다.
                  const stageKey = ri === 0 ? '여' : ri === 1 ? '중' : '정'
                  const isSaryeong = !!saryeong && p.pillar === '월주'
                    && saryeong.result.stage === stageKey && saryeong.result.currentGan === g
                  return (
                    <td key={i} style={{
                      ...td,
                      fontWeight: isBongi || isSaryeong ? 700 : 400,
                      background: isSaryeong ? '#fdeceb' : isBongi ? '#fdf9f5' : undefined,
                      border: isSaryeong ? '1.5px solid #c62828' : undefined,
                      borderRadius: isSaryeong ? 6 : undefined,
                    }}>
                      <span style={{ color: '#3a2e28' }}>{g}</span>{' '}
                      <button type="button" onClick={() => open(ss)} style={{ color: SS_COLOR[ss] || '#7d6553', fontSize: 9.5, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>{ss}</button>
                      {isSaryeong && (
                        <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', background: '#c62828', borderRadius: 4, padding: '0 3px', marginLeft: 3 }}>사령</span>
                      )}
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
                return <td key={i} onClick={() => open(u)} style={{ ...td, color: unsungColor(u) || '#3a2e28', fontWeight: 600, cursor: u ? 'pointer' : 'default' }}>{u || '-'}</td>
              })}
            </tr>
            <tr>
              <td style={rl}>년간 {yearStem}</td>
              {saju.map((p, i) => {
                const u = yearStem ? getUnsung(yearStem, p.branch) : ''
                return <td key={i} onClick={() => open(u)} style={{ ...td, color: unsungColor(u) || '#7d6553', cursor: u ? 'pointer' : 'default' }}>{u || '-'}</td>
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
                return <td key={i} onClick={() => open(s)} style={{ ...td, color: SINSAL_HIGHLIGHT[s] || '#7d6553', fontWeight: 600, cursor: s ? 'pointer' : 'default' }}>{s || '-'}</td>
              })}
            </tr>
            <tr>
              <td style={rl}>일지 {iljji}</td>
              {saju.map((p, i) => {
                const s = getSinsal(iljji, p.branch)
                return <td key={i} onClick={() => open(s)} style={{ ...td, color: SINSAL_HIGHLIGHT[s] || '#7d6553', cursor: s ? 'pointer' : 'default' }}>{s || '-'}</td>
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ③-2 현침살 · 곡각살 (글자 자체 판정) */}
      <div style={card}>
        <div style={ttl}>
          <button type="button" onClick={() => open('현침살')} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
            🪡 현침살 · 곡각살 <span style={{ fontSize: 9, color: '#6b5340' }}>ⓘ</span>
          </button>
        </div>
        <table style={tb}>
          <tbody>
            <tr>
              <td style={rl} />
              {saju.map((p, i) => <th key={i} style={th}>{shortP(p.pillar)}</th>)}
            </tr>
            <tr>
              <td style={rl}>천간</td>
              {saju.map((p, i) => {
                const hc = HYEONCHIM.has(p.stem), gg = GOKGAK.has(p.stem)
                return (
                  <td key={i} style={td}>
                    <span style={{ color: '#3a2e28', fontSize: 11 }}>{p.stem}</span>{' '}
                    {hc && <button type="button" onClick={() => open('현침살')} style={{ color: '#c85a6e', fontSize: 9, cursor: 'pointer', fontWeight: 600, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>현침</button>}
                    {gg && <button type="button" onClick={() => open('곡각살')} style={{ color: '#7c5aaa', fontSize: 9, cursor: 'pointer', fontWeight: 600, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>곡각</button>}
                    {!hc && !gg && <span style={{ color: '#ddd0c4', fontSize: 9 }}>-</span>}
                  </td>
                )
              })}
            </tr>
            <tr>
              <td style={rl}>지지</td>
              {saju.map((p, i) => {
                const hc = HYEONCHIM.has(p.branch), gg = GOKGAK.has(p.branch)
                return (
                  <td key={i} style={td}>
                    <span style={{ color: '#3a2e28', fontSize: 11 }}>{p.branch}</span>{' '}
                    {hc && <button type="button" onClick={() => open('현침살')} style={{ color: '#c85a6e', fontSize: 9, cursor: 'pointer', fontWeight: 600, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>현침</button>}
                    {gg && <button type="button" onClick={() => open('곡각살')} style={{ color: '#7c5aaa', fontSize: 9, cursor: 'pointer', fontWeight: 600, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>곡각</button>}
                    {!hc && !gg && <span style={{ color: '#ddd0c4', fontSize: 9 }}>-</span>}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
        {/* 개수 요약 */}
        <div style={{ marginTop: 7, fontSize: 10, color: '#7d6553', textAlign: 'center' }}>
          {(() => {
            let h = 0, g = 0
            for (const p of saju) {
              if (HYEONCHIM.has(p.stem)) h++
              if (HYEONCHIM.has(p.branch)) h++
              if (GOKGAK.has(p.stem)) g++
              if (GOKGAK.has(p.branch)) g++
            }
            if (!h && !g) return <span style={{ color: '#6b5340' }}>해당 글자가 없어요</span>
            return (
              <>
                {h > 0 && <span style={{ color: '#c85a6e', fontWeight: 600 }}>현침 {h}개</span>}
                {h > 0 && g > 0 && ' · '}
                {g > 0 && <span style={{ color: '#7c5aaa', fontWeight: 600 }}>곡각 {g}개</span>}
              </>
            )
          })()}
        </div>
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
                    {g.length ? g.map((x, k) => (
                      <span key={x}>
                        {k > 0 && '·'}
                        <button type="button" onClick={() => open(x)} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>{x.replace('귀인', '')}</button>
                      </span>
                    )) : '-'}
                  </td>
                )
              })}
            </tr>
            <tr>
              <td style={rl}>지지</td>
              {saju.map((p, i) => {
                const g = getGwiinForBranch(dayStem, monthBranch, p.branch)
                return (
                  <td key={i} style={{ ...td, color: '#8f3d0e', fontSize: 9.5 }}>
                    {g.length ? g.map((x, k) => (
                      <span key={x}>
                        {k > 0 && '·'}
                        <button type="button" onClick={() => open(x)} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>{x.replace('귀인', '')}</button>
                      </span>
                    )) : '-'}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ⑤ 납음오행 */}
      <div style={card}>
        <div style={ttl} onClick={() => open('납음')} title="납음 설명 보기">
          <span style={{ cursor: 'pointer' }}>🎵 납음오행 <span style={{ fontSize: 9, color: '#6b5340' }}>ⓘ</span></span>
        </div>
        <table style={tb}>
          <tbody>
            <tr>
              <td style={rl} />
              {saju.map((p, i) => <th key={i} style={th}>{shortP(p.pillar)}</th>)}
            </tr>
            <tr>
              <td style={rl}>납음</td>
              {saju.map((p, i) => (
                <td key={i} style={{ ...td, color: '#6a5848' }}>{nabeum(p.stem, p.branch) || '-'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ⑥ 형충회합 — 관계선 그림 + 격자표 + 목록 */}
      <div style={card}>
        <div style={ttl}>🔗 형충회합</div>

        {/* (1) 관계선 그림 — 사각 배치 */}
        <div style={{ marginBottom: 10 }}>
          <svg width="100%" viewBox="0 0 380 260" xmlns="http://www.w3.org/2000/svg">
            {/* 관계선 (박스보다 먼저 그려 뒤에 깔리게) */}
            {(() => {
              // 사각 배치 좌표: 시(좌상) 일(우상) 월(좌하) 년(우하)
              const POS = [
                { x: 105, y: 70 },   // saju[0] 시주
                { x: 275, y: 70 },   // saju[1] 일주
                { x: 105, y: 190 },  // saju[2] 월주
                { x: 275, y: 190 },  // saju[3] 년주
              ]
              const lines: React.ReactNode[] = []
              for (let i = 0; i < saju.length && i < 4; i++) {
                for (let j = i + 1; j < saju.length && j < 4; j++) {
                  const rels = relationOf(saju[i].branch, saju[j].branch, allBranches)
                  if (!rels.length) continue
                  const a = POS[i], b = POS[j]
                  const isBad = rels.some(r => r === '충' || r === '원진')
                  const color = isBad ? (rels.includes('충') ? '#c62828' : '#993556')
                    : (rels.includes('삼합') ? '#2e7d32' : rels.includes('방합') ? '#96502e' : '#3c82a0')
                  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
                  const label = rels.join('·')
                  const w = label.length * 9 + 14
                  lines.push(
                    <g key={`${i}-${j}`}>
                      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                        stroke={color} strokeWidth={1.8}
                        strokeDasharray={isBad ? '4 3' : undefined} />
                      {/* 라벨을 누르면 뜻풀이 모달 — 관계가 둘이면(예: 충·원진) 첫 번째 것으로 */}
                      <g onClick={() => open(rels[0])} style={{ cursor: 'pointer' }}>
                        <rect x={mx - w / 2} y={my - 8} width={w} height={16} rx={8}
                          fill={isBad ? (rels.includes('충') ? '#fdeaea' : '#f7e6ee')
                            : (rels.includes('삼합') ? '#e8f5e9' : rels.includes('방합') ? '#f3ece2' : '#e8f0fb')} />
                        <text x={mx} y={my} textAnchor="middle" fontSize={9}
                          fill={color} fontWeight={600} dominantBaseline="central">{label}</text>
                      </g>
                    </g>
                  )
                }
              }
              return lines
            })()}

            {/* 기둥 박스 */}
            {saju.slice(0, 4).map((p, i) => {
              const POS = [
                { x: 105, y: 70 }, { x: 275, y: 70 },
                { x: 105, y: 190 }, { x: 275, y: 190 },
              ]
              const c = POS[i]
              const bg = BRANCH_BG[p.branch] ?? '#f5f0ea'
              const fg = BRANCH_FG[p.branch] ?? '#3a2e28'
              return (
                <g key={i}>
                  <rect x={c.x - 26} y={c.y - 26} width={52} height={52} rx={9}
                    fill={bg} stroke="#e8d5c5" strokeWidth={0.5} />
                  <text x={c.x} y={c.y - 4} textAnchor="middle" fontSize={19}
                    fill={fg} fontWeight={600}>{p.branch}</text>
                  <text x={c.x} y={c.y + 16} textAnchor="middle" fontSize={9}
                    fill={fg === '#fff' ? '#ddd' : '#b09079'}>{shortP(p.pillar)}</text>
                </g>
              )
            })}
          </svg>
          <div style={{ fontSize: 9.5, color: '#7d6553', textAlign: 'center', lineHeight: 1.8 }}>
            <span style={{ color: '#2e7d32' }}>━ 합(실선)</span>{'  '}
            <span style={{ color: '#c62828' }}>┅ 충·원진(점선)</span>
            <div style={{ color: '#8f3d0e', marginTop: 2 }}>👆 방합·삼합 같은 글씨를 누르면 설명이 나와요</div>
          </div>
        </div>

        {/* (2) 격자표 */}
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
                      <td key={ci} style={{ ...td, background: '#fdf4ec', color: '#8f3d0e', fontWeight: 700 }}>
                        {row.branch}
                      </td>
                    )
                  }
                  const rels = relationOf(row.branch, col.branch, allBranches)
                  return (
                    <td key={ci} style={td}>
                      {rels.length
                        ? rels.map(r => (
                          <span key={r} onClick={() => open(r)} style={{ cursor: 'pointer' }}>
                            <Badge kind={r} />
                          </span>
                        ))
                        : <span style={{ color: '#ddd0c4' }}>-</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* (3) 성립한 관계만 목록으로 */}
        <div style={{
          background: '#fdf9f5', border: '0.5px solid #f5ece2', borderRadius: 10,
          padding: '8px 11px', fontSize: 10.5, lineHeight: 1.9,
        }}>
          {pairs.length === 0 ? (
            <span style={{ color: '#5c3a1e' }}>성립한 형충회합이 없어요.</span>
          ) : (
            pairs.map((pr, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ flexShrink: 0 }}>
                  {pr.rels.map(r => (
                    <span key={r} onClick={() => open(r)} style={{ cursor: 'pointer' }}>
                      <Badge kind={r} />
                    </span>
                  ))}
                </span>
                <span style={{ color: '#3a2e28', fontWeight: 600 }}>
                  {shortP(pr.a.pillar)}{pr.a.branch} · {shortP(pr.b.pillar)}{pr.b.branch}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ★⑥-2 운이 원국을 건드리는 자리 — 2026-08-05 (46부 14차 · 대표님 지시)
          ⚠️ 위 ⑥ 형충회합 표는 «원국 넷끼리만» 봅니다. 이 칸이 그것을 «덮지» 않습니다.
             unMeetsWongook 이 두 번 돌려 ★새로 생긴 것만 냅니다.
          ⚠️ 대운·세운을 «안 넘기면» 이 칸이 통째로 안 나옵니다. */}
      {unList.length > 0 && (
        <div style={card}>
          <div style={ttl}>🔗 운이 원국을 건드리는 자리</div>
          <div style={{ fontSize: 10, color: '#8f3d0e', marginBottom: 10 }}>
            👆 위 「운의 흐름」에서 대운·세운을 누르면 여기가 따라 바뀌어요
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 11, flexWrap: 'wrap' }}>
            {pickedDaeun && (
              <span style={{ fontSize: 11, background: '#f3ece2', border: '0.5px solid #9c7a58', borderRadius: 7, padding: '4px 9px', color: '#6b5340' }}>
                대운 <b style={{ color: '#3a2e28' }}>{pickedDaeun.stem}{pickedDaeun.branch}</b> <span style={{ color: '#8a7565' }}>{pickedDaeun.age}세</span>
              </span>
            )}
            {pickedSeyun && (
              <span style={{ fontSize: 11, background: '#f3ece2', border: '0.5px solid #9c7a58', borderRadius: 7, padding: '4px 9px', color: '#6b5340' }}>
                세운 <b style={{ color: '#3a2e28' }}>{pickedSeyun.stem}{pickedSeyun.branch}</b> <span style={{ color: '#8a7565' }}>{pickedSeyun.year}</span>
              </span>
            )}
          </div>

          {unHits.length === 0 ? (
            <div style={{ fontSize: 11.5, color: '#7d6a5b', lineHeight: 1.7 }}>
              고르신 운은 원국과 새로 얽히는 자리가 없어요. 조용히 지나가는 결이에요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {unHits.map((h, i) => {
                const t = UN_TAG[h.kind] ?? { bg: '#f5f2ea', fg: '#7d6a5b' }
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.bg, borderRadius: 7, padding: '7px 9px' }}>
                    <span onClick={() => open(h.kind === '간지복음' ? '복음' : h.kind)}
                      style={{ fontSize: 9.5, fontWeight: 700, color: t.fg, background: '#fff', borderRadius: 5, padding: '1px 6px', flexShrink: 0, cursor: 'pointer' }}>
                      {h.kind}
                    </span>
                    <span style={{ fontSize: 11.5, color: '#3a2e28', lineHeight: 1.6 }}>
                      {h.group && <b>{h.group}</b>}{h.group ? ' — ' : ''}
                      {h.seats.join(' · ')}
                      {h.hwaEl && <span style={{ color: '#7d6a5b' }}> → {h.hwaEl}로 화함</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 11, paddingTop: 9, borderTop: '0.5px solid #f0e0d5', fontSize: 10, color: '#8a7565', lineHeight: 1.75 }}>
            ※ 위 「형충회합」 표는 <b>원국 네 지지끼리만</b> 봅니다. 이 칸은 운을 얹어 <b>새로 생긴 것만</b> 모은 거예요.<br />
            ※ 삼합·방합은 세 글자가 다 모여야 하므로 <b>한 줄로 묶어</b> 보여드려요. 운끼리(대운↔세운)의 관계는 빼두었어요.
          </div>
        </div>
      )}

      {/* ⑦ 공망 두 기준 */}
      <div style={card}>
        <div style={ttl} onClick={() => open('공망')} title="공망 설명 보기">
          <span style={{ cursor: 'pointer' }}>🕳 공망 — 두 기준 <span style={{ fontSize: 9, color: '#6b5340' }}>ⓘ</span></span>
        </div>
        <div style={{ fontSize: 11, color: '#6a5848', lineHeight: 2 }}>
          <div>
            <span style={{ color: '#6b5340', fontSize: 10 }}>일주 기준</span>{' '}
            <b style={{ color: '#c62828', marginLeft: 6 }}>{gmDay[0]}·{gmDay[1]}</b>
          </div>
          <div>
            <span style={{ color: '#6b5340', fontSize: 10 }}>년주 기준</span>{' '}
            <b style={{ color: '#c62828', marginLeft: 6 }}>{gmYear[0]}·{gmYear[1]}</b>
          </div>
        </div>
      </div>
      <TermModal term={term} onClose={() => setTerm(null)} />
    </div>
  )
}
