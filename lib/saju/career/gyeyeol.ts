// lib/saju/career/gyeyeol.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ⑨  —  계열(문·이과)                               │
// │  출전: 『명리적성 비법노트』(심산) 129·133쪽                        │
// └───────────────────────────────────────────────────────────────┘
//
// ★교재에 계열 규칙이 두 개 있는데, 사례로 검증한 결과 ⓑ만 맞았다.
//
//   ⓐ 오행별 표 (129쪽)  목7:3 · 화6:4 · 토(무진술6:4/기축미4:6) · 금3:7 · 수4:6
//      → 토(土)가 1위일 때 무너진다. 교재 스스로 "토는 음양을 모두 포함한다"
//        고 했으므로 토를 계열의 대표로 삼으면 안 된다.
//        사례 (3) 초등학생 : 토 1위 → ⓐ는 인문 60, 책은 이과 70.  ❌
//
//   ⓑ 그룹 비교 (133쪽)  "목화 오행이 강하면 인문 70 : 자연 30
//                        금수 오행이 강하면 자연 70 : 인문 30
//                        토 오행은 음양을 모두 포함한다"
//      → 책이 계열 비율을 밝힌 사례 네 건 모두 맞는다.  ✅
//        (1)신생아 이과70 · (2)유치원생 문과 · (3)초등학생 이과70 · (9)삼수생 이과65
//
//   그래서 ⓑ를 본줄기로 삼고, 토는 무진술/기축미로 갈라 약하게만 얹는다.
//
// ★예체능은 따로 본다 (교재 129쪽)
//   "문과 적성(木), 이과 적성(金), 예체능 계열 적성(火)이 70% 적용되고
//    30%는 예외적으로 적용되므로 단식 판단은 금물이다."

import { calcCareerScore, gradeAll, pickStrong, EL5, type CareerScoreResult, type Ohaeng } from './careerScore'
import type { CareerCard, CareerInput } from './types'
import { calcCareerYongsin } from './yongsin'
import { GWA, GWA_SHOW, GWA_MIN, GWA_SRC, HAS_GWA, type GwaRow, type GwaLean } from './tables/gwa'

/** 무진술(戊辰戌) 양토 = 인문 쪽 / 기축미(己丑未) 음토 = 자연 쪽 (교재 133쪽) */
const YANG_TO = ['戊', '辰', '戌']
const EUM_TO = ['己', '丑', '未']

export interface GyeyeolResult {
  /** 인문 비율 (0~100) */
  humanities: number
  /** 자연 비율 (0~100) */
  science: number
  mokhwa: number
  geumsu: number
  to: number
  toYang: number
  toEum: number
  /** 예체능 소질이 뚜렷한가 (화가 발달 이상) */
  arts: boolean
  lean: '인문' | '자연' | '반반'
}

export function calcGyeyeol(r: CareerScoreResult): GyeyeolResult {
  const s = r.score
  const mokhwa = (s['목'] ?? 0) + (s['화'] ?? 0)
  const geumsu = (s['금'] ?? 0) + (s['수'] ?? 0)
  const to = s['토'] ?? 0

  // 토를 양토/음토로 나눈다 (글자 기준)
  let toYang = 0, toEum = 0
  const marks = r.chars['토'] ?? []
  for (const m of marks) {
    if (YANG_TO.includes(m.ch)) toYang++
    else if (EUM_TO.includes(m.ch)) toEum++
  }
  const toTotal = toYang + toEum
  const toH = toTotal ? to * (toYang * 0.6 + toEum * 0.4) / toTotal : to * 0.5
  const toS = to - toH

  const base = mokhwa + geumsu + to
  let humanities: number, science: number
  if (base === 0) { humanities = 50; science = 50 }
  else if (mokhwa > geumsu) { humanities = 70; science = 30 }
  else if (geumsu > mokhwa) { humanities = 30; science = 70 }
  else {
    // ★목화와 금수가 같으면 대표 오행(강점 지능)으로 가른다.
    //   사례 (1) 신생아가 이 경우다. 우리 100점 배점에서 목화45 = 금수45 인데
    //   대표 오행이 금(金)이므로 책과 같이 이과 쪽으로 본다.
    const top = pickStrong(r, gradeAll(r))[0]
    if (top === '목' || top === '화') { humanities = 70; science = 30 }
    else if (top === '금' || top === '수') { humanities = 30; science = 70 }
    else {
      humanities = Math.round((mokhwa + toH) / base * 100)
      science = 100 - humanities
    }
  }

  const g = gradeAll(r)
  const arts = g['화'].grade === '발달' || g['화'].grade === '과다'

  return {
    humanities, science, mokhwa, geumsu, to, toYang, toEum, arts,
    lean: humanities > science ? '인문' : science > humanities ? '자연' : '반반',
  }
}

// ── 학과 추림 ────────────────────────────────────────────────────
//
// ★직업(jobs.ts)과 같은 방식이다. 오행을 겹쳐 거듭 나오는 것을 위로 올린다.
//   다만 학과는 출처가 교재 한 곳뿐이라 무게가 단순하다.
//     대표 오행 1위 3 · 2위 2 · 용신 1 · 계열(문·이과) 일치 1
//   교재 133쪽이 "강점 70 : 용신 30" 이라 한 것과 결이 같다.
//
// ★학생에게만 내보낸다. 성인에게 학과는 이미 지난 이야기다.

export interface GwaHit {
  row: GwaRow
  score: number
  /** 왜 뽑혔는지 — 화면과 통변 재료에 그대로 쓴다 */
  sources: string[]
}

export function pickGwa(input: CareerInput, y: GyeyeolResult, r: CareerScoreResult): GwaHit[] {
  if (!HAS_GWA()) return []          // ⛔ 표가 비어 있으면 아무것도 안 낸다

  const strong = pickStrong(r, gradeAll(r)).slice(0, 2)
  const yong = calcCareerYongsin(input)?.yongsin ?? null
  const lean: GwaLean | null = y.lean === '반반' ? null : (y.lean as GwaLean)

  const hits: GwaHit[] = []
  for (const row of GWA) {
    let score = 0
    const sources: string[] = []

    strong.forEach((el, i) => {
      if (row.el.includes(el)) {
        const w = i === 0 ? 3 : 2
        score += w
        sources.push(`${el} 오행`)
      }
    })
    if (yong && row.el.includes(yong)) { score += 1; sources.push(`${yong} 용신`) }

    // 교재가 계열을 밝힌 학과만 계열 일치를 얹는다
    if (lean && row.lean === lean) { score += 1; sources.push(`${lean} 계열`) }
    // 예체능은 화(火)가 발달 이상일 때만 값어치가 있다 (교재 129쪽)
    if (row.lean === '예체능') {
      if (y.arts) { score += 1; sources.push('화 발달(예체능)') }
      else score -= 1
    }

    if (score >= GWA_MIN) hits.push({ row, score, sources })
  }

  return hits.sort((a, b) => (b.score - a.score) || (b.sources.length - a.sources.length))
}

// ── 카드 ────────────────────────────────────────────────────────
export function judgeGyeyeol(input: CareerInput): CareerCard {
  const r = calcCareerScore(input.saju, input.solarMonth, input.solarDay, input.hourBranch)
  const y = calcGyeyeol(r)

  const lines: string[] = []
  const reasons: string[] = []

  lines.push(`목화가 ${y.mokhwa}점, 금수가 ${y.geumsu}점입니다.`)
  if (y.lean === '인문') {
    lines.push(`인문 ${y.humanities} : 자연 ${y.science} — 문과 쪽 결입니다.`)
  } else if (y.lean === '자연') {
    lines.push(`인문 ${y.humanities} : 자연 ${y.science} — 이과 쪽 결입니다.`)
  } else {
    lines.push('목화와 금수가 팽팽해서 어느 쪽으로도 열려 있어요.')
  }
  if (y.to) lines.push(`토(土)는 음양을 모두 품은 오행이라 계열을 가르는 대표로 보지 않았습니다. (양토 ${y.toYang}자 · 음토 ${y.toEum}자)`)
  if (y.arts) lines.push('화(火)가 발달해 예체능 소질이 함께 보입니다.')

  // ★학과 — 학생에게만. 표가 비어 있으면 이 묶음이 통째로 건너뛴다.
  const gwa = input.target === 'student' ? pickGwa(input, y, r).slice(0, GWA_SHOW) : []
  if (gwa.length) {
    lines.push(`오행을 겹쳐 보니 ${gwa.length}개 학과가 거듭 나옵니다.`)
    for (const h of gwa) {
      lines.push(`${h.row.name} — ${h.sources.join(' · ')}`)
    }
    lines.push('학과는 정해 주는 것이 아니라 둘러볼 자리를 좁혀 드리는 것입니다.')
  }

  lines.push('계열 비율은 70%만 적용되고 30%는 예외입니다. 이 비율 하나로 진로를 단정하지 마세요.')

  reasons.push(`계열 — 목화 ${y.mokhwa} vs 금수 ${y.geumsu} → 인문 ${y.humanities} : 자연 ${y.science}`)
  reasons.push(`토 ${y.to}점 (양토 ${y.toYang}자 · 음토 ${y.toEum}자) — 대표로 삼지 않음`)
  if (y.arts) reasons.push('화(火)가 발달 이상이라 예체능 소질을 함께 짚어 주세요. (교재 129쪽 "예체능 계열 적성=火")')
  if (gwa.length) {
    reasons.push(`학과 추림 — ${GWA.length}개 중 문턱(${GWA_MIN}점) 통과 상위 ${gwa.length}개`)
    for (const h of gwa) reasons.push(`  ${h.row.name} ${h.score}점 ← ${h.sources.join(' + ')} (${h.row.src})`)
    reasons.push(`근거 ${GWA_SRC}. 무게 — 대표 오행 1위 3 · 2위 2 · 용신 1 · 계열 일치 1`)
    reasons.push('★학과는 위 목록에 있는 것만 쓰세요. 없는 학과를 지어내지 마세요.')
    reasons.push('학과는 "이 자리를 둘러보시면 좋겠다" 정도로 권하세요. 정해 주지 마세요.')
  } else if (input.target === 'student') {
    reasons.push('학과 표가 아직 없어 학과는 다루지 않습니다. 학과 이름을 지어내지 마세요.')
  }
  reasons.push('근거 : 교재 133쪽 그룹 비교 / 129쪽 "문과=木 이과=金 예체능=火, 70% 적용"')
  reasons.push('이 대목("계열과 학과")의 통변 재료입니다. 비율은 참고치라고 반드시 덧붙이세요.')

  return {
    key: 'gyeyeol', title: '계열과 학과', badge: y.lean === '반반' ? '' : y.lean,
    lines, reasons, data: { ...y } as unknown as Record<string, unknown>,
  }
}
