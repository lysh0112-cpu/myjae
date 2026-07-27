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
import { GWA, GWA_SHOW, GWA_MIN, GWA_SRC, HAS_GWA, PICK_BY, PICK_BY_SRC, type GwaRow } from './tables/gwa'
import { yukchinOf } from './yukchin'


/** 천간 → 오행 (careerScore 의 것과 같다. 공용 파일을 건드리지 않으려고 여기 둔다) */
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

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
  /** 왜 뽑혔는지 — 화면 근거와 통변 재료에 그대로 쓴다 */
  sources: string[]
}

/**
 * 학과 추림.
 *
 * ★교재 132쪽이 잣대를 갈라 두었다.
 *     "인문 계열은 육친을 중심으로 학과를 선택하고,
 *      자연 계열은 오행을 중심으로 학과 선택을 한다."
 *   그래서 같은 점수 식을 쓰지 않는다.
 *     자연 학과 — 대표 오행이 태그와 맞는가
 *     인문 학과 — 대표 오행이 가리키는 육친이 그 학과 태그의 육친과 맞는가
 *
 * ★무게는 교재 133쪽 "강점 지능 70 : 용신 30" 을 따른다.
 *     대표 1위 3 · 2위 2 · 용신 1 · 계열 일치 1
 *
 * ★학생에게만 내보낸다. 성인에게 학과는 이미 지난 이야기다.
 */
export function pickGwa(input: CareerInput, y: GyeyeolResult, r: CareerScoreResult): GwaHit[] {
  if (!HAS_GWA()) return []

  const strong = pickStrong(r, gradeAll(r)).slice(0, 2)
  const yong = calcCareerYongsin(input)?.yongsin ?? null
  const lean: '인문' | '자연' | null = y.lean === '반반' ? null : (y.lean as '인문' | '자연')

  const day = input.saju.find(p => p.pillar === '일주')
  const dayEl = day && day.stem !== '?' ? STEM_EL[day.stem] : null

  const hits: GwaHit[] = []
  for (const row of GWA) {
    let score = 0
    const sources: string[] = []

    // ★태그가 없는 학과는 그 묶음의 오행으로 본다.
    //   교재 제목이 "목(木) 오행이 강할 때 적성에 맞는 학과" 이므로
    //   그 안에 실린 학과는 그 자체가 목 학과다.
    //   괄호는 다른 오행이 섞인 것만 따로 표시한 것으로 읽는다.
    //   (그래야 동남아어학과(木)처럼 묶음과 같은 태그가 왜 붙었는지 설명된다)
    //   ⚠️ 연재쌤 확인 항목. 다르게 읽어야 하면 이 한 줄만 고치면 된다.
    const els = row.el.length ? row.el : [row.group]

    if (PICK_BY[row.lean] === '오행') {
      // ── 자연 계열 — 오행으로 고른다
      strong.forEach((el, i) => {
        if (els.includes(el)) {
          score += i === 0 ? 3 : 2
          sources.push(`${el} 오행`)
        }
      })
    } else {
      // ── 인문 계열 — 육친으로 고른다
      //    학과 오행을 일간 기준 육친으로 바꿔 대표 육친과 견준다
      if (dayEl) {
        const strongGroups = strong.map(el => yukchinOf(dayEl, el))
        els.forEach(el => {
          const g = yukchinOf(dayEl, el)
          const i = strongGroups.indexOf(g)
          if (i >= 0) {
            score += i === 0 ? 3 : 2
            sources.push(`${g}(${el})`)
          }
        })
      }
    }

    // ★괄호 태그가 붙은 학과는 교재가 따로 짚은 것이라 조금 무겁게 본다
    if (row.el.length) { score += 1; sources.push('교재가 따로 짚음') }

    if (yong && els.includes(yong)) { score += 1; sources.push(`${yong} 용신`) }
    if (lean && row.lean === lean) { score += 1; sources.push(`${lean} 계열`) }

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
  //   ★대표님 지시 2026-07-27 — "특정 대학을 추천하는 것이 아니라,
  //     이런 전공의 학과들이 있다는 정도로만" 보여 준다.
  //     한 줄에 하나씩 점수 근거를 달면 서열표로 읽히므로 쉼표로 이어 둔다.
  //     왜 뽑혔는지는 reasons 로만 넘긴다(화면에 안 나감).
  const gwa = input.target === 'student' ? pickGwa(input, y, r).slice(0, GWA_SHOW) : []
  if (gwa.length) {
    const leanWord = y.lean === '자연' ? '자연 공학계열' : y.lean === '인문' ? '인문 사회계열' : '양쪽 계열'
    lines.push(`${leanWord}의 전공들이 어울리는 것 같습니다.`)
    lines.push(gwa.map(h => h.row.name).join(' · '))
  }

  if (input.target === 'student') {
    // ★같은 카드에 70/30 이 여러 번 나오면 헷갈린다 (대표님 지적 2026-07-27).
    //   교재 129쪽의 "계열 비율은 70%만 적용" 문구는 화면에서 빼고 reasons 로 옮겼다.
    lines.push(
      '진로적성은 환경이 30%, 사주가 30%, 나머지는 가장 중요한 노력이 40%라고 할 수 있습니다.',
    )
    lines.push(
      '사주가 말해 줄 수 있는 건 그중 30% 정도뿐입니다. ' +
      '나머지 70%는 곁에서 만들어 주시는 환경과 아이가 열심히 노력하는 시간에 달려 있어요. ' +
      '여기 적힌 것은 길을 좁혀 드리는 참고이지, 정해진 답이 아닙니다.',
    )
  } else {
    lines.push('이 비율은 참고입니다. 하나만 보고 단정하지 마세요.')
  }

  reasons.push(`계열 — 목화 ${y.mokhwa} vs 금수 ${y.geumsu} → 인문 ${y.humanities} : 자연 ${y.science}`)
  reasons.push(`토 ${y.to}점 (양토 ${y.toYang}자 · 음토 ${y.toEum}자) — 대표로 삼지 않음`)
  if (y.arts) reasons.push('화(火)가 발달 이상이라 예체능 소질을 함께 짚어 주세요. (교재 129쪽 "예체능 계열 적성=火")')
  if (gwa.length) {
    reasons.push(`학과 추림 — 표 ${GWA.length}개 중 상위 ${gwa.length}개`)
    reasons.push('★[내부순위] 는 순서를 고르려고 매긴 수치입니다. 교재에 없습니다. 글에 절대 쓰지 마세요.')
    for (const h of gwa) reasons.push(`  ${h.row.name} [내부순위 ${h.score}] ← ${h.sources.join(' + ')} (${h.row.src})`)
    reasons.push(`근거 ${GWA_SRC}. 무게 — 대표 오행 1위 3 · 2위 2 · 용신 1 · 계열 일치 1`)
    reasons.push('★학과는 위 목록에 있는 것만 쓰세요. 없는 학과를 지어내지 마세요.')
    reasons.push('★학과를 정해 주지 마세요. "이런 전공들이 이 결과 가깝다" 정도로만 쓰고, 이 밖에도 길이 많다고 반드시 덧붙이세요.')
    reasons.push('★목록을 그대로 읊지 마세요. 두세 개만 골라 왜 이 결과 가까운지 풀어 주세요.')
  } else if (input.target === 'student') {
    reasons.push('학과 표가 아직 없어 학과는 다루지 않습니다. 학과 이름을 지어내지 마세요.')
  }
  reasons.push('근거 : 교재 133쪽 그룹 비교 / 129쪽 "문과=木 이과=金 예체능=火, 70% 적용"')
  reasons.push('교재 129쪽은 계열 비율에 예외가 많다고 합니다. ★단 이 대목에는 이미 비율이 여럿 나오므로, 70%·30% 같은 숫자를 또 쓰지 말고 "단정할 수 없다"는 결로만 담으세요.')
  if (input.target === 'student') {
    // ★대학은 짚지 않는다 (대표님 판단 2026-07-27)
    //   교재 129쪽에 "용신·희신에 해당하는 대학에 지원하면 유리하다"는 대목이 있고
    //   136~139쪽에 대학 오행 표도 있다(gwa.ts 의 UNIV_136). 붙이려면 붙일 수 있다.
    //   그러나 화면에 대학 이름을 늘어놓으면 "여기 붙는다"로 읽힌다.
    //   교재 스스로 사주를 30% 로 두는데 화면은 100% 처럼 보이게 된다.
    //   표는 자료로 남겨 두되(상담사 쪽에서 쓸 값어치는 있다) 화면에는 안 내보낸다.
    reasons.push('★대학 이름을 절대 말하지 마세요. 어느 대학에 붙는다·유리하다는 말도 쓰지 마세요.')
    reasons.push('★교재는 진로를 환경 30% · 사주 30% · 노력 40% 로 봅니다 (126쪽). 사주는 30%라고 반드시 덧붙이세요. 가장 큰 몫은 노력입니다.')
    reasons.push('부모가 함께 읽습니다. 성적이나 형편을 탓하는 말로 들리지 않게 쓰세요. "이렇게 도와주시면 좋겠다"로 쓰세요.')
  }
  reasons.push('이 대목("계열과 학과")의 통변 재료입니다. 비율은 참고치라고 반드시 덧붙이세요.')

  return {
    key: 'gyeyeol', title: '계열과 학과', badge: y.lean === '반반' ? '' : y.lean,
    lines, reasons, data: { ...y } as unknown as Record<string, unknown>,
  }
}
