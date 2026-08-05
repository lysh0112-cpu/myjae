'use client'

import React, { useState } from 'react'
import { EL_BG, EL_BD, EL_C, EL_C_SUB, EL_HAN } from '@/lib/saju/ohaengColor'
import { getUnsung, getSinsal, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { getGwiinForBranch, getGwiinForStem, GWIIN_STYLE } from '@/lib/saju/gwiin'
import TermModal from '@/app/manseryeok/result-new/TermModal'

/**
 * ★2026-08-01 — 이 파일을 result-new/ 에서 «공용 자리» 로 옮겼습니다. (대표님 지시)
 *
 *   [왜]  사주 원국 표를 «프로그램 전체가 하나로» 씁니다.
 *         전에는 result-new 안에 있어 다른 화면이
 *         `@/app/manseryeok/result-new/SajuWonguk` 처럼 «남의 폴더» 를 불렀습니다.
 *
 *   ★이 표가 «정본» 입니다 — 계산이 정확하고, 용어를 누르면 뜻풀이 모달이 뜹니다.
 *     모달 없는 축소판(moving-timing/SoloWonguk)은 이 부품으로 갈아끼웠습니다.
 *
 *   ⚠️ 궁합(couple-result-new/CoupleWonguk)은 «좌4+우4 나란히» 라 배치가 달라
 *      그대로 둡니다. 색만 정본(ohaengColor.ts)을 씁니다. (대표님 확정)
 *
 * 사주 원국 통합 표 (명카페 공용 부품 · 포스텔러 스타일)
 *
 * 기존 "사주 원국" + "신살과 길성" 두 표를 하나로 합친 것.
 * 한 기둥에 십성·천간·지지·12운성·지지십성·신살을 세로로 쌓음.
 * 용어(십성·운성·신살)를 누르면 TermModal로 쉬운 설명이 뜸.
 *
 *   import SajuWonguk from '@/app/manseryeok/result-new/SajuWonguk'
 *   <SajuWonguk saju={saju} dayStem={dayStem} yeonjji={yeonjji} iljji={iljji} gm1={gm1} gm2={gm2} />
 *
 * saju: [{pillar:'시주', stem:'辛', branch:'亥'}, ...] (시→일→월→연 순)
 */

interface SajuPillar { pillar: string; stem: string; branch: string }

interface Props {
  saju: SajuPillar[]
  dayStem: string
  yeonjji: string
  iljji: string
  gm1?: string
  gm2?: string
}

type Element = '목' | '화' | '토' | '금' | '수'
const STEM_ELEMENT: Record<string, Element> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
const BRANCH_ELEMENT: Record<string, Element> = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
const SS_C: Record<string, string> = {
  비견: '#9e9e9e', 겁재: '#9e9e9e', 식신: '#43a047', 상관: '#43a047',
  편재: '#fb8c00', 정재: '#fb8c00', 편관: '#e53935', 정관: '#e53935',
  편인: '#1e88e5', 정인: '#1e88e5',
}
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
// 지지 십성 계산용 음양 — 표면 음양이 아니라 '지장간 본기(本氣)의 음양'을 쓴다.
//   (자평진전 원칙: 체용 구분. 子·午·巳·亥는 체와 용이 반대)
//   子=癸(음) 丑=己(음) 寅=甲(양) 卯=乙(음) 辰=戊(양) 巳=丙(양)
//   午=丁(음) 未=己(음) 申=庚(양) 酉=辛(음) 戌=戊(양) 亥=壬(양)
//   true=음(陰), false=양(陽)
const BRANCH_YIN: Record<string, boolean> = { 子: true, 丑: true, 寅: false, 卯: true, 辰: false, 巳: false, 午: true, 未: true, 申: false, 酉: true, 戌: false, 亥: false }

function getSipsin(dayStem: string, targetStem: string): string {
  if (!targetStem || targetStem === '?') return ''
  const dayIdx = HEAVENLY_STEMS.indexOf(dayStem)
  const targetIdx = HEAVENLY_STEMS.indexOf(targetStem)
  const de = STEM_ELEMENT[dayStem], te = STEM_ELEMENT[targetStem]
  const sameYin = (dayIdx % 2) === (targetIdx % 2)
  const gen: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
  const ctl: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }
  if (de === te) return sameYin ? '비견' : '겁재'
  if (gen[de] === te) return sameYin ? '식신' : '상관'
  if (ctl[de] === te) return sameYin ? '편재' : '정재'
  if (ctl[te] === de) return sameYin ? '편관' : '정관'
  if (gen[te] === de) return sameYin ? '편인' : '정인'
  return ''
}

function getSipsinBranch(dayStem: string, branch: string): string {
  if (!branch || branch === '?') return ''
  const be = BRANCH_ELEMENT[branch], de = STEM_ELEMENT[dayStem]
  const dayYin = HEAVENLY_STEMS.indexOf(dayStem) % 2 === 1
  const branchYin = BRANCH_YIN[branch]
  const sameYin = dayYin === branchYin
  const gen: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
  const ctl: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }
  if (de === be) return sameYin ? '비견' : '겁재'
  if (gen[de] === be) return sameYin ? '식신' : '상관'
  if (ctl[de] === be) return sameYin ? '편재' : '정재'
  if (ctl[be] === de) return sameYin ? '편관' : '정관'
  if (gen[be] === de) return sameYin ? '편인' : '정인'
  return ''
}

function GanjiBox({ char, el, isDay, isGongmang }: { char: string; el: Element | undefined; isDay?: boolean; isGongmang?: boolean }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: 8,
      background: el ? EL_BG[el] : '#f5f5f5',
      border: el === '수'
        ? (isDay ? '3px solid #000000' : '1px solid #2b2b2b')
        : (isDay ? '2px solid #c8783c' : `1px solid ${el ? EL_BD[el] : '#ddd'}`),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      // ★2026-08-05 — 공망 흐림을 0.45 → 0.75 로 «올렸습니다» (대표님 확정).
      //   [왜]  45부에 원국표 색 대비를 2.63~3.93:1 로 어렵게 올려 두었는데,
      //         거기에 0.45 를 곱하면 ★대비가 절반 아래로 떨어져 어르신이 못 읽습니다.
      //   [대신]  아래 「空」 배지가 «공망이라는 뜻» 을 대신 짊어집니다.
      //   ⛔ 0.45 로 되돌리지 마십시오. 배지가 있으니 흐림은 거들기만 하면 됩니다.
      margin: '0 auto', position: 'relative', opacity: isGongmang ? 0.75 : 1,
    }}>
      <span style={{ fontSize: 21, fontWeight: 700, color: el ? EL_C[el] : '#888', lineHeight: 1 }}>{char}</span>
      {el && <span style={{ position: 'absolute', bottom: 1, right: 3, fontSize: 10.5, fontWeight: 600, color: EL_C_SUB[el] }}>{EL_HAN[el]}</span>}
      {/* ★공망 배지 — 2026-08-05 신설 (대표님 지시)
          [왜]  원국을 보는 «그 자리에서» 어느 지지가 공망인지 바로 알아보려는 것입니다.
                전에는 표 아래 요약칸의 「공망 戌·未」를 따로 봐야 알 수 있었습니다.
          ★빨강(#c14545)입니다 — 45부 3-2 「빨강은 ‘주의’ 뜻이라 갈색으로 안 바꿈」과
            같은 결입니다. 갈색으로 바꾸지 마십시오.
          ⚠️ 왼쪽 위 모서리입니다. 오른쪽 아래는 오행 한자가 이미 씁니다.
          ⚠️ 지금 기준은 ★일주 공망 하나입니다 (부르는 곳이 gm1·gm2 로 넘기는 것).
             년주 기준을 함께 내려면 부르는 곳 «여덟 군데» 를 다 고쳐야 합니다. */}
      {isGongmang && (
        <span style={{
          position: 'absolute', top: -4, left: -4,
          background: '#c14545', color: '#fff',
          fontSize: 8.5, fontWeight: 700, lineHeight: 1.3,
          borderRadius: 5, padding: '1px 4px',
        }}>空</span>
      )}
    </div>
  )
}

const rowLabel: React.CSSProperties = { fontSize: 9, color: '#6b5340', textAlign: 'right', paddingRight: 5, whiteSpace: 'nowrap' }
const termCell = (color: string): React.CSSProperties => ({ fontSize: 10, fontWeight: 600, color, cursor: 'pointer', textAlign: 'center' })

// ⚠️ iljji 는 지금 안 쓴다. 부르는 곳 여덟 군데가 넘기고 있어 인자는 그대로 두고
//    이름만 _iljji 로 바꿨다. (_ 로 시작하면 "일부러 안 쓴다" 는 뜻 — 2026-07-27)
export default function SajuWonguk({ saju, dayStem, yeonjji, iljji: _iljji, gm1, gm2 }: Props) {
  const [term, setTerm] = useState<string | null>(null)
  const open = (v: string) => v && v !== '-' && setTerm(v)

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      <div style={{ fontSize: 10.5, color: '#8f3d0e', marginBottom: 12 }}>👆 용어를 누르면 쉬운 뜻풀이가 나와요</div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <td style={{ width: 34 }} />
            {saju.map(({ pillar }, i) => (
              <td key={i} style={{ textAlign: 'center', fontSize: 9, color: '#6b5340', paddingBottom: 3 }}>{pillar}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 천간 십성 */}
          <tr>
            <td style={rowLabel}>십성</td>
            {saju.map(({ pillar, stem }, i) => {
              const isDay = pillar === '일주'
              const ss = isDay ? '본원' : getSipsin(dayStem, stem)
              return (
                <td key={i} onClick={() => !isDay && open(ss)} style={{ ...termCell(isDay ? '#c8783c' : (SS_C[ss] || '#ccc')), cursor: isDay ? 'default' : 'pointer' }}>
                  {ss || '-'}
                </td>
              )
            })}
          </tr>
          {/* 천간 */}
          <tr>
            <td style={rowLabel}>천간</td>
            {saju.map(({ pillar, stem }, i) => (
              <td key={i} style={{ padding: 2 }}>
                <GanjiBox char={stem} el={STEM_ELEMENT[stem]} isDay={pillar === '일주'} />
              </td>
            ))}
          </tr>
          {/* 지지 */}
          <tr>
            <td style={rowLabel}>지지</td>
            {saju.map(({ branch }, i) => {
              const isGm = !!gm1 && (branch === gm1 || branch === gm2)
              return (
                // ★공망인 칸은 눌러도 「공망」 뜻풀이가 뜹니다 (2026-08-05).
                //   사전(sajuTerms.ts)에 공망 항목이 «이미» 있어 잇기만 했습니다.
                //   ⚠️ 공망이 아닌 칸은 지금까지처럼 «안 눌립니다». 그대로 두십시오.
                <td key={i} style={{ padding: 2, cursor: isGm ? 'pointer' : 'default' }}
                  onClick={() => isGm && open('공망')}>
                  <GanjiBox char={branch} el={BRANCH_ELEMENT[branch]} isGongmang={isGm} />
                </td>
              )
            })}
          </tr>
          {/* 지지 십성 */}
          <tr>
            <td style={rowLabel}>지지십성</td>
            {saju.map(({ pillar, branch }, i) => {
              const bs = pillar === '일주' ? getSipsinBranch(dayStem, branch) : getSipsinBranch(dayStem, branch)
              return <td key={i} onClick={() => open(bs)} style={termCell(SS_C[bs] || '#ccc')}>{bs || '-'}</td>
            })}
          </tr>
          {/* 12운성 */}
          <tr>
            <td style={rowLabel}>12운성</td>
            {saju.map(({ branch }, i) => {
              const u = dayStem ? getUnsung(dayStem, branch) : ''
              return <td key={i} onClick={() => open(u)} style={termCell(unsungColor(u) || '#888')}>{u || '-'}</td>
            })}
          </tr>
          {/* 신살 */}
          <tr>
            <td style={rowLabel}>신살</td>
            {saju.map(({ branch }, i) => {
              const sinsal = getSinsal(yeonjji, branch)
              const color = SINSAL_HIGHLIGHT[sinsal]
              return (
                <td key={i} onClick={() => color && open(sinsal)} style={{ ...termCell(color || '#ddd'), cursor: color ? 'pointer' : 'default' }}>
                  {color ? sinsal : '-'}
                </td>
              )
            })}
          </tr>
          {/* 귀인(길신) 8종 — 천간귀인(월덕·천덕)+지지귀인(천을·태극·문창·문곡·금여·암록)을 칸마다 */}
          <tr>
            <td style={rowLabel}>귀인</td>
            {saju.map(({ stem, branch }, i) => {
              const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
              const gwiins = [
                ...getGwiinForStem(monthBranch, stem),
                ...getGwiinForBranch(dayStem, monthBranch, branch),
              ]
              if (gwiins.length === 0) {
                return <td key={i} style={{ ...termCell('#ddd'), cursor: 'default' }}>-</td>
              }
              return (
                <td key={i} style={{ padding: '2px 1px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                    {gwiins.map((g) => {
                      const st = GWIIN_STYLE[g]
                      return (
                        <span key={g} onClick={() => open(g)}
                          style={{ fontSize: 8.5, fontWeight: 700, color: st?.color || '#c8783c', cursor: 'pointer', lineHeight: 1.25, whiteSpace: 'nowrap' }}>
                          {st?.short || g}
                        </span>
                      )
                    })}
                  </div>
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>

      {/* 요약 */}
      <div style={{ background: '#faf3ee', border: '0.5px solid #9c7a58', borderRadius: 8, padding: 9, display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#6b5340', fontSize: 9, marginBottom: 2 }}>일간</div>
          <div style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 11 }}>{dayStem ? `${dayStem}(${STEM_ELEMENT[dayStem] || '?'})` : '-'}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#6b5340', fontSize: 9, marginBottom: 2 }}>공망</div>
          <div onClick={() => gm1 && open('공망')}
            style={{ color: '#f44336', fontWeight: 700, fontSize: 11, cursor: gm1 ? 'pointer' : 'default' }}>
            {gm1 ? `${gm1}·${gm2}` : '-'}
          </div>
        </div>
      </div>

      <TermModal term={term} onClose={() => setTerm(null)} />
    </div>
  )
}
