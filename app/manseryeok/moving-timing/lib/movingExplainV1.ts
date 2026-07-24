// app/manseryeok/moving-timing/lib/movingExplainV1.ts
//
// ★ 고른 날짜가 왜 괜찮은지 설명하는 글을 만든다.
//
//   [원칙 — AI 를 쓰지 않는다]
//   출산택일 babyDescribeV7 과 같은 방식이다. 규칙으로 조립한다.
//   · 비용 0. 날짜를 누를 때마다 API 를 부르면 감당이 안 된다.
//   · 틀릴 위험이 없다. 이미 계산해 둔 판정 결과(MovingDetail)를 풀어 쓰는 것뿐이다.
//     AI 는 그럴듯한 말을 지어내지만 우리 계산과 어긋날 수 있다.
//
//   [왜 만들었나]
//   연재쌤 의견(2026-07-24) — "돈 주고 볼 고객인데 날짜만 주면 성의가 없어 보인다."
//   날짜 목록만으로는 왜 그 날이 뽑혔는지 알 수 없다.
//
//   [무엇을 말하는가]
//   ① 피한 것   — 공망·충·형을 어떻게 비껴갔는지 (근거를 글자로 짚는다)
//   ② 좋은 점   — 용신·손·요일 중 해당하는 것
//   ③ 알아둘 것 — 용신이 안 든 사람, 손이 있는 방위 등
//
//   ★없는 말을 지어내지 않는다. 해당 사항이 없으면 그 줄을 아예 빼 버린다.
//     "특별한 것이 없어요" 같은 말로 채우지 않는다.

import type { MovingDetail } from './movingFilterV1'
import type { PersonSaju } from './movingFilterV1'
import type { Direction } from './movingTables'
import { gongmangBranches } from './movingTables'

export interface ExplainLine {
  /** 한 줄 제목 (없으면 본문만) */
  head?: string
  body: string
}

export interface DayExplain {
  /** 피한 것 — 고정 4를 어떻게 통과했는지 */
  avoided: ExplainLine[]
  /** 좋은 점 — 켜진 조건 중 맞은 것 */
  merits: ExplainLine[]
  /** 알아두실 것 — 아쉬운 점·주의 */
  notes: ExplainLine[]
}

interface BuildArgs {
  detail: MovingDetail
  people: PersonSaju[]
  ganji: string
  weekday: string
  lunarLabel: string
  holidayName?: string
  direction: Direction | null
}

/** 이름 목록을 '가·나님' 식으로 */
function names(list: string[]): string {
  return list.map(n => `${n}님`).join('·')
}

export function buildDayExplain(a: BuildArgs): DayExplain {
  const { detail: d, people, ganji, weekday, lunarLabel, direction } = a
  const branch = ganji[1] ?? ''
  const stem = ganji[0] ?? ''

  const avoided: ExplainLine[] = []
  const merits: ExplainLine[] = []
  const notes: ExplainLine[] = []

  // ── ① 피한 것 ──────────────────────────────────────────
  // 공망 — 두 사람 공망 글자를 실제로 짚어 준다.
  //   "공망 아님"보다 "두 분 공망은 寅卯·午未인데 이날은 巳예요"가 훨씬 낫다.
  const gmList = people
    .map(p => ({ name: p.name, gm: gongmangBranches(p.ganji).join('') }))
    .filter(x => x.gm)
  if (gmList.length > 0) {
    const txt = gmList.map(x => `${x.name}님 ${x.gm}`).join(', ')
    avoided.push({
      head: '빈자리를 비껴갔어요',
      body: `공망은 기운이 비는 자리예요. ${txt}인데 이날 지지는 ${branch}라 걸리지 않아요.`,
    })
  }

  // 충 — 각자 일지를 짚는다
  const iljiTxt = people.map(p => `${p.name}님 ${p.dayBranch}`).join(', ')
  if (people.length > 0) {
    avoided.push({
      head: '부딪히지 않아요',
      body: `이날 지지 ${branch}는 ${iljiTxt}와 정면으로 맞부딪히지 않아요.`,
    })
    avoided.push({
      head: '어긋나지 않아요',
      body: `삼형·상형·자형 어느 쪽으로도 걸리지 않아요.`,
    })
  }

  // 명절
  avoided.push({
    head: '명절이 아니에요',
    body: '설·추석 연휴는 이삿짐 업체도 쉬고 길도 막혀 미리 빼 두었어요.',
  })

  // ── ② 좋은 점 ──────────────────────────────────────────
  // 용신 — 연재쌤이 반드시 반영하라고 하신 항목. 맨 앞에 둔다.
  if (d.yongsinWho.length > 0) {
    const hits = d.yongsinWho
      .map(n => `${n}님(${d.yongsinHit[n] ?? ''})`)
      .join(', ')
    const all = d.yongsinMiss.length === 0 && people.length > 1
    merits.push({
      head: all ? '두 분 모두 기운이 맞아요' : '필요한 기운이 들어 있어요',
      body: `사주에 부족해서 채워야 하는 기운을 용신이라고 해요. ` +
            `이날 간지 ${stem}${branch}에 ${hits}의 용신이 들었어요.` +
            (all ? ' 두 분 다 맞는 날은 흔치 않아요.' : ''),
    })
  }

  // 손
  if (d.optSonEomneun) {
    merits.push({
      head: '손 없는 날이에요',
      body: `${lunarLabel}이라 손이 하늘로 올라가 사방 어디에도 없어요. ` +
            '어느 방향으로 가셔도 괜찮아요.',
    })
  } else if (direction && d.optDirection && d.sonDir) {
    merits.push({
      head: `${direction}쪽에는 손이 없어요`,
      body: `${lunarLabel}이라 손이 ${d.sonDir}쪽에 있어요. ` +
            `가시는 ${direction}쪽과는 겹치지 않아요.`,
    })
  }

  // 요일
  if (d.optWeekend) {
    merits.push({
      head: a.holidayName ? `${a.holidayName}이에요` : `${weekday}요일이에요`,
      body: '쉬는 날이라 따로 휴가를 내지 않으셔도 돼요. ' +
            '다만 이삿짐 업체는 주말이 더 비싸고 예약이 빨리 차요.',
    })
  }

  // ── ③ 알아두실 것 ──────────────────────────────────────
  if (d.yongsinMiss.length > 0 && d.yongsinWho.length > 0) {
    notes.push({
      body: `${names(d.yongsinMiss)}께 필요한 기운은 이날 들어 있지 않아요. ` +
            '나쁜 날이라는 뜻은 아니에요.',
    })
  } else if (d.yongsinMiss.length > 0 && d.yongsinWho.length === 0) {
    notes.push({
      body: '이날은 두 분께 필요한 기운이 들어 있지 않아요. ' +
            '꼭 봐야 할 네 가지는 지나갔으니 흉일은 아니에요.',
    })
  }

  if (!d.optSonEomneun && d.sonDir && !direction) {
    notes.push({
      body: `${lunarLabel}이라 손이 ${d.sonDir}쪽에 있어요. ` +
            `${d.sonDir}쪽으로 가신다면 다른 날을 보시는 게 좋겠어요.`,
    })
  }

  if (!d.optWeekend) {
    notes.push({
      body: '평일이라 휴가를 내셔야 할 수 있어요. 대신 이삿짐 비용은 주말보다 싸요.',
    })
  }

  if (d.lunarUnknown) {
    notes.push({
      body: '음력을 읽지 못해 손은 확인하지 못했어요.',
    })
  }

  return { avoided, merits, notes }
}
