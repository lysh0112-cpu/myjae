// lib/saju/career/yongsin.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ⑥  —  기운을 얻는 자리 (용신)                       │
// │  출전: 『명리적성 비법노트』(심산) 94~97쪽                          │
// └───────────────────────────────────────────────────────────────┘
//
// ★교재 40쪽: "격과 용신도 오행으로 본다"
//   → 용신은 계절치환을 하지 않은 **본래 오행** 기준이다.
//     그래서 careerScore(육친 점수)가 아니라 yongsinNew 를 그대로 쓴다.
//
// ★교재 133쪽: 강점 지능 70% : 용신 30%
//   → 이 카드는 앞 카드들을 거드는 자리다. 앞세우지 않는다.
//
// ⚠️ yongsinNew.ts 는 건드리지 않는다. 사주보기·궁합이 함께 쓴다.

import { calcYongsinNew, type Ohaeng as YOhaeng } from '../yongsinNew'
// ★진로적성은 «계절 치환한» 점수로 용신을 냅니다 (2026-08-02 대표님 확정)
import { calcSimsanOhaeng } from '../simsanOhaeng'
import type { CareerCard, CareerInput, Ohaeng } from './types'
import { calcCareerGyeokguk } from './gyeokguk'
import { iga, eunneun } from '../josa'
import { YONGSIN_OHAENG, YONGSIN_YUKCHIN, YONGSIN_NOTE, YONGSIN_SRC } from './tables/yongsin'
import { jobKey, okForStudent } from './tables/jobs'

const EL_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

/**
 * 십성 → 손님께 말할 «큰 묶음». (2026-08-02)
 * ⚠️ 오행 하나로는 비견인지 겁재인지 정할 수 없습니다 — 오행에 음양이 없습니다.
 *    ★그래서 화면에서는 「비겁」처럼 넓게 말합니다. 셈은 그대로입니다.
 */
const GROUP_OF: Record<string, string> = {
  비견: '비겁', 겁재: '비겁',
  식신: '식상', 상관: '식상',
  편재: '재성', 정재: '재성',
  편관: '관성', 정관: '관성',
  편인: '인성', 정인: '인성',
}

export interface CareerYongsin {
  /** 억부용신 — 이 카드의 본줄기 */
  yongsin: Ohaeng | null
  heesin: Ohaeng | null
  gisin: Ohaeng | null
  /** 조후용신 (여름·겨울생이면 잡힌다) */
  johu: Ohaeng | null
  johuNote: string
  /** 격국용신 */
  gyeokYongsin: Ohaeng | null
  gyeokName: string
  status: string           // 극신약 · 신약 · 중화 · 신강
  /** 용신이 가리키는 직업 (오행 용신 + 육친 용신) */
  jobsByEl: string[]
  jobsByYukchin: string[]
  yukchinName: string
}

/** 일간 기준으로 용신 오행이 무슨 십신인지 (육친 용신 표를 고르기 위해) */
const YANG = new Set(['甲', '丙', '戊', '庚', '壬'])
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const GEN: Record<Ohaeng, Ohaeng> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CON: Record<Ohaeng, Ohaeng> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const REP_YANG: Record<Ohaeng, string> = { 목: '甲', 화: '丙', 토: '戊', 금: '庚', 수: '壬' }

function sipsinName(dayStem: string, el: Ohaeng): string {
  const de = STEM_EL[dayStem]
  if (!de) return ''
  const same = YANG.has(dayStem) === YANG.has(REP_YANG[el])
  if (de === el) return same ? '비견' : '겁재'
  if (GEN[de] === el) return same ? '식신' : '상관'
  if (CON[de] === el) return same ? '편재' : '정재'
  if (CON[el] === de) return same ? '편관' : '정관'
  return same ? '편인' : '정인'
}

export function calcCareerYongsin(input: CareerInput): CareerYongsin | null {
  const day = input.saju.find(p => p.pillar === '일주')
  if (!day || day.stem === '?') return null

  // ══════════════════════════════════════════════════════════════
  //  🔴★2026-08-02 — 진로적성의 용신은 «치환한 점수» 로 냅니다 (대표님 확정)
  //
  //  [무엇이 있었나]  한 화면에 「중화신강 55%」와 「극신약」이 함께 떴습니다.
  //    앞은 계절 치환한 점수(진로용), 뒤는 본래 오행(용신 계산기 기본값).
  //    ⇒ 같은 물음에 반대 답이었습니다. 손님이 곧바로 알아채는 자리입니다.
  //
  //  ★[규칙]  계절 치환은 «쓰임» 이 가릅니다 (교재 40쪽 + 2026-08-02 대표님 확정)
  //     치환 «함»      진로 · 적성 · 성격          ← ★여기가 그것입니다
  //     치환 «안 함»   건강 · 궁합 · 작명 · 오늘운세 ·
  //                    통변 · 출산택일 · 합격운 · 물상
  //     ⚠️ 교재 40쪽에는 「건강·궁합」과 「진로·직업적성」 둘만 적혀 있습니다.
  //        나머지 여섯은 대표님이 «건강·궁합 쪽» 으로 정하신 것입니다.
  //        ★작명은 자원오행으로 «본래 글자» 를 채우는 일이라 그쪽이 맞습니다.
  //
  //  ⚠️⚠️ yongsinNew 자체는 «안 고쳤습니다». scoreOverride 로 넣어 줍니다.
  //     ⛔ 그 파일은 43부 「손대지 말 것」이고, 스무 곳이 기대고 있습니다.
  //     ★같은 방식을 roleFit.ts:175 가 «이미» 쓰고 있었습니다 (r.score 를 넘김).
  //        이 파일만 안 넘기고 있었습니다.
  //
  //  [실측 2026-08-02] 임의 사주 20만 건 — 본래오행 ↔ 치환점수
  //     ★신강약이 바뀜 19.29%  ·  ★용신이 바뀜 29.03%  ·  격이 바뀜 0%
  //     ⇒ ★세 분 중 한 분의 용신이 달라집니다. 진로적성 화면 «에서만» 입니다.
  //     ★npm run measure:yongsin 으로 다시 잽니다.
  //
  //  ── ★2026-08-02 조사 — 지금 «어느 화면이 어느 잣대» 를 쓰는가 ──
  //     ⚠️ 대표님 지시 — "이미 프로그램된 대로 하고 손대지 말 것".
  //        아래는 «기록» 입니다. 이대로 두십시오. 고치려면 대표님께 여쭈십시오.
  //
  //     치환 «함» (양력월·일·시지를 넘김)
  //       사주보기(result-new) · 작명 넷(diagnosis·newname·newhanja·newresult) ·
  //       출산택일(birth-timing/result) · 관리자 프롬프트 · ★진로적성(이 파일·roleFit)
  //       ★작명은 연재쌤이 확정하신 자리입니다 (yongsinNew.ts:546 주석)
  //
  //     치환 «안 함» (본래 오행)
  //       ★궁합(coupleFilterV1) — 교재 40쪽 "건강과 궁합은 오행으로 본다" 와 맞습니다
  //       합격운(examScore) · 통변 재료(toTongbyeonInput·toCoupleTongbyeonInput) ·
  //       출산택일 내부(babyFilterV7·scoreV5)
  //
  //     ⚠️ 같은 손님의 용신이 화면마다 다를 수 있습니다. 그것이 «지금의 모습» 입니다.
  // ══════════════════════════════════════════════════════════════
  const careerScore = calcSimsanOhaeng(
    input.saju as never, input.solarMonth, input.solarDay, input.hourBranch,
    { purpose: '진로' },
  )
  const r = calcYongsinNew(input.saju as never, day.stem, careerScore as never)
  if (!r) return null

  const y = (r.eokbu?.yongsin ?? null) as Ohaeng | null
  const g = calcCareerGyeokguk(input.saju, day.stem)
  const yukName = y ? sipsinName(day.stem, y) : ''

  return {
    yongsin: y,
    heesin: (r.eokbu?.heesin ?? null) as Ohaeng | null,
    gisin: (r.eokbu?.gisin ?? null) as Ohaeng | null,
    johu: (r.johu?.element ?? null) as Ohaeng | null,
    johuNote: r.johu?.note ?? '',
    gyeokYongsin: (g.element ?? null) as Ohaeng | null,
    gyeokName: g.name,
    status: r.status,
    jobsByEl: y ? (YONGSIN_OHAENG[y] ?? []) : [],
    jobsByYukchin: yukName ? (YONGSIN_YUKCHIN[yukName] ?? []) : [],
    yukchinName: yukName,
  }
}

// ── 카드 ────────────────────────────────────────────────────────
export function judgeYongsin(input: CareerInput): CareerCard {
  const v = calcCareerYongsin(input)
  if (!v || !v.yongsin) {
    return { key: 'yongsin', title: '기운을 얻는 자리', badge: '', lines: [],
             reasons: ['용신을 잡지 못했습니다. 이 대목은 건너뛰세요.'] }
  }

  const y = v.yongsin
  const lines: string[] = []
  const reasons: string[] = []

  lines.push(`용신은 ${y}(${EL_HANJA[y]})입니다. ${YONGSIN_NOTE[y]}`)
  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-02 — 손님께는 «큰 묶음» 으로 말합니다 (비견/겁재 → 비겁)
  //
  //  [무엇이 있었나]  "일간 기준으로는 «겁재» 에 해당합니다" 라고 나왔습니다.
  //    ⚠️ 乙 일간에게 «목» 은 비견(乙)일 수도 겁재(甲)일 수도 있습니다.
  //       ★오행에는 음양이 없습니다. 하나로 좁힐 수 없는 물음입니다.
  //    그런데 sipsinName 이 오행을 «대표 양간(甲)» 으로 바꿔 견주어,
  //    乙 일간에게 목이 «언제나 겁재» 로 나왔습니다.
  //    ⇒ 같은 화면의 오각형은 「목(비겁)」이라 적어, 두 말이 갈렸습니다.
  //
  //  ★[이제]  화면에는 «비겁·식상·재성·관성·인성» 다섯 묶음으로 말합니다.
  //  ⚠️ yukchinName 자체는 «그대로 둡니다» — YONGSIN_YUKCHIN 직업 표가
  //     비견/겁재를 갈라 갖고 있어, 그 열쇠로 아직 씁니다.
  //     ★말만 넓히고 셈은 건드리지 않습니다.
  // ══════════════════════════════════════════════════════════════
  lines.push(`일간 기준으로는 ${GROUP_OF[v.yukchinName] ?? v.yukchinName}에 해당합니다. 사주는 ${v.status} 쪽이에요.`)
  if (v.heesin) lines.push(`${v.heesin}(${EL_HANJA[v.heesin]})${iga(v.heesin)} 곁에서 도와주고, ${v.gisin}(${EL_HANJA[v.gisin!]})${eunneun(v.gisin!)} 힘을 빼앗습니다.`)
  if (v.johu && v.johuNote) lines.push(v.johuNote)
  if (v.gyeokYongsin) lines.push(`${v.gyeokName}이라 ${v.gyeokYongsin}(${EL_HANJA[v.gyeokYongsin]})${iga(v.gyeokYongsin)} 격국용신입니다.`)
  lines.push('다만 용신은 거드는 자리예요. 앞서 본 강점 지능이 7할이고 용신은 3할입니다.')

  reasons.push(`억부용신 ${y} (${v.yukchinName}) · 희신 ${v.heesin ?? '-'} · 기신 ${v.gisin ?? '-'} · 신강약 ${v.status}`)
  if (v.johu) reasons.push(`조후용신 ${v.johu} — ${v.johuNote}`)
  if (v.gyeokYongsin) reasons.push(`격국용신 ${v.gyeokYongsin} (${v.gyeokName})`)
  // ★2026-07-27 — 학생이면 어른용 직업을 재료에서도 뺀다.
  //   수(水) 용신 목록에 유흥업·술집·목욕탕이, 편재 목록에 대부업·투기업·전당포가 있다.
  const forStudent = input.target === 'student'
  const sift = (list: string[]) =>
    (forStudent ? list.filter(j => okForStudent(jobKey(j))) : list).slice(0, 20)

  reasons.push(`${y} 용신 직업 : ${sift(v.jobsByEl).join(', ')} …`)
  if (v.jobsByYukchin.length) reasons.push(`${v.yukchinName} 용신 직업 : ${sift(v.jobsByYukchin).join(', ')} …`)
  reasons.push(`근거 ${YONGSIN_SRC}`)
  reasons.push('이 대목("기운을 얻는 자리")의 통변 재료입니다. 용신은 3할이라고 반드시 덧붙이세요. 직업 목록은 뒤 대목에서 추립니다.')

  return {
    key: 'yongsin', title: '기운을 얻는 자리', badge: `${y} 용신`,
    lines, reasons, data: { ...v } as unknown as Record<string, unknown>,
  }
}
