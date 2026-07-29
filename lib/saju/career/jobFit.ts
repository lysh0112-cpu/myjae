// lib/saju/career/jobFit.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  잘 맞는 직무 & 조직 성향 — 성인용                                   │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★2026-07-29 대표님 지시 —
//   「계열과 학과」 카드는 학생에게만 보이고, 성인에게는 이 카드가 대신 뜹니다.
//
//   [왜]
//     대학을 이미 나온 사람에게 «어느 학과가 맞습니다» 는 쓸모가 없습니다.
//     그 자리에 «어떤 직무가 맞고, 어떤 조직에서 힘이 나는가» 를 놓습니다.
//
//   ⚠️ 「어느 자리에서 일할까」(jobstruct)·「어울리는 직업」(jobs) 과 겹치지 않게
//      결을 갈랐습니다.
//        jobstruct  조직이냐 자유업이냐 — 일의 «구조»
//        jobs       직업 이름 — 무엇을
//        ★jobFit    직무의 «결»과 조직에서의 «자리» — 어떻게 일하는가
//
//   ⚠️ 이 카드는 교재의 한 대목을 옮긴 것이 아니라, 교재 곳곳(육친·격국·신살)의
//      직업 대목을 성인 관점으로 모은 것입니다. 새 자료를 만든 것은 아닙니다.

import type { CareerCard, CareerInput, Ohaeng } from './types'
import { calcCareerScore, gradeAll } from './careerScore'
import { yukchinOf } from './yukchin'
import { calcSajuMbti } from './sajuMbti'

const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']

/** 육친이 센 쪽에 따라 «직무의 결» */
const BY_YUKCHIN: Record<string, { role: string; org: string; move: string }> = {
  비겁: {
    role: '내 이름을 걸고 하는 일이 맞습니다. 남이 짜 놓은 판을 따르기보다 스스로 판을 만드는 쪽에서 힘이 납니다.',
    org: '수평한 조직이나 작은 팀이 편합니다. 위에서 촘촘히 관리하면 답답해집니다.',
    move: '옮길 때는 «자율이 얼마나 되는가»를 연봉보다 먼저 보십시오. 그게 안 맞으면 오래 못 버팁니다.',
  },
  식상: {
    role: '만들고 표현하는 일이 맞습니다. 기획·콘텐츠·교육·설계처럼 머릿속의 것을 밖으로 꺼내는 직무입니다.',
    org: '결과보다 과정을 봐 주는 조직에서 잘 큽니다. 숫자로만 재는 곳은 힘이 빠집니다.',
    move: '전직할 때 «내가 만든 것이 남는가»를 보십시오. 남는 일이라야 경력이 쌓입니다.',
  },
  재성: {
    role: '수치와 실물을 다루는 일이 맞습니다. 영업·유통·재무·운영처럼 «돌아가게 만드는» 직무입니다.',
    org: '성과가 눈에 보이는 조직이 맞습니다. 평가가 흐릿한 곳에서는 동기가 떨어집니다.',
    move: '옮길 때는 시장이 커지는 쪽으로 가십시오. 같은 힘을 써도 결과가 다릅니다.',
  },
  관성: {
    role: '체계와 책임을 지는 일이 맞습니다. 관리·공공·법무·품질처럼 «기준을 세우고 지키는» 직무입니다.',
    org: '규모가 있고 절차가 분명한 조직에서 안정됩니다. 즉흥적인 곳은 소모가 큽니다.',
    move: '함부로 옮기기보다 한 자리에서 직급과 신뢰를 쌓는 쪽이 이 결에는 이롭습니다.',
  },
  인성: {
    role: '깊이 파고드는 일이 맞습니다. 연구·분석·상담·전문직처럼 «알아야 할 수 있는» 직무입니다.',
    org: '배울 것이 있는 조직이라야 남습니다. 더 배울 게 없다고 느끼면 마음이 먼저 떠납니다.',
    move: '옮길 때 «누구에게 배울 수 있는가»를 보십시오. 사람이 곧 자리입니다.',
  },
}

/** 오행이 센 쪽에 따라 «일하는 속도와 결» */
const BY_EL: Record<Ohaeng, string> = {
  목: '새로 벌이고 뻗어 가는 일에 힘이 납니다. 시작하는 자리에 두면 잘합니다.',
  화: '빠르게 반응하고 드러내는 일에 강합니다. 사람 앞에 서는 자리가 아깝지 않습니다.',
  토: '중간에서 받치고 잇는 일에 강합니다. 여러 갈래를 모으는 자리가 맞습니다.',
  금: '자르고 정리하는 일에 강합니다. 기준을 세우고 마무리하는 자리에 두면 빛납니다.',
  수: '살피고 궁리하는 일에 강합니다. 판을 읽고 방향을 잡는 자리가 맞습니다.',
}

/**
 * 성인용 「잘 맞는 직무 & 조직 성향」 카드.
 *   ⚠️ target 이 'student' 면 빈 카드를 돌려줍니다. 화면이 안 그리게 하려는 것입니다.
 */
export function judgeJobFit(input: CareerInput): CareerCard {
  const { saju, solarMonth, solarDay, hourBranch } = input
  const empty: CareerCard = { key: 'jobfit', title: '', badge: '', lines: [], reasons: [] }
  if (input.target === 'student') return empty

  const r = calcCareerScore(saju, solarMonth, solarDay, hourBranch)
  const g = gradeAll(r)
  const dayStem = saju.find(p => p.pillar === '일주')?.stem ?? ''
  const dayEl = STEM_EL[dayStem]
  if (!dayEl) return empty

  // 육친별 점수를 모아 가장 센 쪽
  const Y: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const el of EL5) Y[yukchinOf(dayEl, el)] += r.score[el] ?? 0
  const topY = Object.entries(Y).sort((a, b) => b[1] - a[1])[0]
  const topEl = EL5.slice().sort((a, b) => (r.score[b] ?? 0) - (r.score[a] ?? 0))[0]

  const fit = BY_YUKCHIN[topY[0]]
  const lines: string[] = []
  const reasons: string[] = []

  if (fit) {
    lines.push(`직무의 결 — ${fit.role}`)
    lines.push(`조직에서의 자리 — ${fit.org}`)
    lines.push(`옮길 때 볼 것 — ${fit.move}`)
    reasons.push(`육친 ${topY[0]} 우세(${Math.round(topY[1])}점) → 직무·조직 결`)
  }
  lines.push(`일하는 속도 — ${BY_EL[topEl]}`)
  reasons.push(`오행 ${topEl} 최다(${Math.round(r.score[topEl] ?? 0)}점 · ${g[topEl].grade})`)

  // 자율성 눈금 — 비겁·식상이 세면 자율, 관성·인성이 세면 소속
  const free = (Y['비겁'] ?? 0) + (Y['식상'] ?? 0)
  const belong = (Y['관성'] ?? 0) + (Y['인성'] ?? 0)
  const freePct = Math.round((free / Math.max(1, free + belong)) * 100)
  lines.push(
    freePct >= 60
      ? '자율 쪽입니다. 스스로 정하고 스스로 책임지는 자리에서 힘이 납니다.'
      : freePct <= 40
        ? '소속 쪽입니다. 틀이 있는 조직에서 오히려 더 멀리 갑니다.'
        : '자율과 소속이 반반입니다. 큰 틀은 조직에 두되 안에서 재량이 있는 자리가 맞습니다.',
  )
  reasons.push(`자율(비겁+식상) ${Math.round(free)} vs 소속(관성+인성) ${Math.round(belong)}`)

  // MBTI 결을 한 줄 곁들인다 (참고이지 판정이 아님)
  const m = calcSajuMbti(saju, solarMonth, solarDay, hourBranch)
  reasons.push(`사주 추정 MBTI ${m.code} — 참고용`)

  return {
    key: 'jobfit',
    title: '잘 맞는 직무 & 조직 성향',
    badge: freePct >= 60 ? '자율형' : freePct <= 40 ? '소속형' : '균형형',
    lines,
    reasons,
    data: { freePct, topYukchin: topY[0], topEl },
  }
}
