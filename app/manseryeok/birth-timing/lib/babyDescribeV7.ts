// app/manseryeok/birth-timing/lib/babyDescribeV7.ts
//
// ★ 출산택일 v7 — 고른 시간의 해설을 만든다. (2026-07-23)
//
//   [왜 규칙 기반인가]
//   AI 를 부르면 부모가 여러 시간을 눌러볼 때마다 비용이 든다.
//   게다가 이 화면은 결제 전 무료 구간이다. AI 는 결제 후 '사주 자세히 보기'에서 쓴다.
//   여기서 하는 일은 정해진 축(일간오행·십신·신강약)에서 문장을 조립하는 것뿐이라
//   AI 가 필요 없다. 비용 0, 문장은 우리가 검수한 것만 나간다.
//
//   [5개 층]
//   ① 타고난 결   — 일간 오행 + 가장 두터운 십신
//   ② 힘의 세기   — 신강약 + 뿌리 개수
//   ③ 채워진 기운 — 오행 분포(실제 숫자)
//   ④ 인생 흐름   — 20~60세 대운의 십신 변화
//   ⑤ 눈에 띄는 것 — 귀인·네 갈래 뿌리·용신·쏠림
//
//   ③④⑤ 가 후보마다 실제로 달라서, 조합 수를 넘어 사실상 시간마다 다른 해설이 나온다.
//
//   ⚠️ 문구는 1차안이다. 연재쌤 검수 예정(출산택일_성향문구_검수표.xlsx).
//      특히 신강약 표현은 "약하다"로 읽히지 않게 다듬어야 한다.

import { sipsinOf } from '@/lib/saju/yongsinNew'
import {
  STEM_EL, BRANCH_MAIN_STEM, GEN, OVERCOME, seasonOf,
} from './sajuTables'
import type { Candidate } from './candidates'
import type { FilterDetail } from './babyFilterV7'

// ── 십신 → 다섯 갈래 ────────────────────────────────────────────────────
export type SipsinGroup = '비겁' | '인성' | '식상' | '재성' | '관성'

const GROUP_OF: Record<string, SipsinGroup> = {
  비견: '비겁', 겁재: '비겁',
  식신: '식상', 상관: '식상',
  편재: '재성', 정재: '재성',
  편관: '관성', 정관: '관성',
  편인: '인성', 정인: '인성',
}

/** 십신 낱말을 부모가 읽을 말로 (대운 흐름 표기용) */
const SIPSIN_SHORT: Record<string, string> = {
  비견: '또래·동료', 겁재: '경쟁·나눔',
  식신: '표현·먹을복', 상관: '재주·변화',
  편재: '큰 재물·활동', 정재: '꾸준한 살림',
  편관: '도전·긴장', 정관: '명예·규범',
  편인: '남다른 배움', 정인: '바른 배움',
}

// ── 문장 조각 ──────────────────────────────────────────────────────────
const EL_TRAIT: Record<string, { name: string; way: string; trait: string }> = {
  목: { name: '나무', way: '위로 뻗어 자라는', trait: '곧고 어질며 새로운 것을 향해 나아가는' },
  화: { name: '불',   way: '환하게 퍼지는',   trait: '밝고 따뜻하며 마음을 잘 나누는' },
  토: { name: '흙',   way: '품고 받아주는',   trait: '듬직하고 믿음직하며 중심을 잡아주는' },
  금: { name: '쇠',   way: '단단하게 여무는', trait: '곧고 야무지며 맺고 끊음이 분명한' },
  수: { name: '물',   way: '깊이 스며드는',   trait: '생각이 깊고 유연하며 상황을 잘 읽는' },
}

const GROUP_TRAIT: Record<SipsinGroup, { key: string; head: string; desc: string }> = {
  비겁: { key: '주체', head: '자기 주관이 뚜렷하고 스스로 길을 내는',
    desc: '남이 정해준 길보다 자기가 납득한 길을 갑니다. 또래와 어울리는 힘도 좋아요.' },
  인성: { key: '수용', head: '배우고 받아들이며 안으로 차곡차곡 쌓는',
    desc: '서두르기보다 이해될 때까지 살펴보는 편입니다. 어른들의 사랑을 받는 자리이기도 해요.' },
  식상: { key: '표현', head: '생각을 밖으로 드러내고 재능을 펼치는',
    desc: '말과 손끝으로 표현하는 힘이 있습니다. 만들고 보여주는 일에서 빛나요.' },
  재성: { key: '현실', head: '현실 감각이 밝고 실속을 챙기는',
    desc: '눈에 보이는 결과를 만들어내는 힘이 있습니다. 셈이 밝고 사람과 물건을 잘 다뤄요.' },
  관성: { key: '책임', head: '규범을 지키고 맡은 몫을 감당하는',
    desc: '약속과 질서를 소중히 여깁니다. 믿고 맡길 수 있는 사람으로 자라요.' },
}

const STATUS_TRAIT: Record<string, { head: string; desc: string }> = {
  신강:   { head: '밀고 나가는 힘이 넉넉한 편',
    desc: '하고자 하는 일에 힘을 실을 수 있습니다. 다만 고집으로 굳지 않도록 곁에서 다독여 주면 좋아요.' },
  중화:   { head: '어느 쪽으로도 치우치지 않은 편',
    desc: '힘이 고르게 갖춰져 있어 상황에 맞춰 나아갈 수 있습니다. 명리에서 가장 반기는 자리예요.' },
  신약:   { head: '주변과 어울리며 나아가는 편',
    desc: '혼자 밀어붙이기보다 사람들 사이에서 힘을 얻습니다. 좋은 인연이 큰 자산이 돼요.' },
  극신약: { head: '곁의 도움을 받아 움직이는 편',
    desc: '가족과 스승의 뒷받침이 특히 중요합니다. 든든한 울타리 안에서 제 몫을 키워가요.' },
}

const MID_FLOW: Record<SipsinGroup, string> = {
  비겁: '스스로 일을 벌이고 자기 힘으로 밀고 나가는',
  인성: '배우고 안으로 다지는',
  식상: '재능을 펼치고 드러내는',
  재성: '현실을 다루고 재물을 일구는',
  관성: '자리를 잡고 책임을 맡는',
}

const EL_NAME: Record<string, string> = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' }
const GWIIN_SEAT: Record<string, string> = {
  년: '집안과 조상 자리', 월: '부모와 사회 자리',
  일: '자기 자신 자리', 시: '자식과 노년 자리',
}

// ── 조사 도우미 ────────────────────────────────────────────────────────
/** 마지막 글자에 받침이 있는가 (한글·숫자 모두 처리) */
function hasJongseong(word: string): boolean {
  const ch = word.trim().slice(-1)
  if (!ch) return false
  // 숫자는 읽는 소리로 판단: 0(영) 1(일) 3(삼) 6(육) 7(칠) 8(팔) 이 받침 있음
  if (/[0-9]/.test(ch)) return '013678'.includes(ch)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}
/** '으로/로' 를 앞말에 맞춰 고른다. ㄹ 받침은 '로' */
function ro(word: string): string {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    return jong === 0 || jong === 8 ? '로' : '으로'   // 8 = ㄹ
  }
  return hasJongseong(ch) ? '으로' : '로'
}

// ── 십신 세기 ──────────────────────────────────────────────────────────
/**
 * 드러난 글자에서 십신군 개수를 센다.
 * 일간 자신은 세지 않는다(비겁이 자동으로 하나 늘어나 왜곡되므로).
 * 지지는 본기(정기) 천간으로 환산해서 본다.
 */
export function countGroups(c: Candidate): Record<SipsinGroup, number> {
  const ds = c.day.stem
  const targets = [
    c.year.stem, BRANCH_MAIN_STEM[c.year.branch],
    c.month.stem, BRANCH_MAIN_STEM[c.month.branch],
    BRANCH_MAIN_STEM[c.day.branch],          // 일간은 제외, 일지만
    c.hour.stem, BRANCH_MAIN_STEM[c.hour.branch],
  ]
  const out: Record<SipsinGroup, number> = { 비겁: 0, 인성: 0, 식상: 0, 재성: 0, 관성: 0 }
  for (const t of targets) {
    if (!t) continue
    const g = GROUP_OF[sipsinOf(ds, t)]
    if (g) out[g]++
  }
  return out
}

/**
 * 가장 두터운 십신군 하나를 고른다.
 *
 * ★연재쌤 확정 2026-07-23 — 동률일 때 순서:
 *   1순위 월지에 있는 것 (월지가 계절과 격을 지배해 세력이 가장 세다)
 *   2순위 일지 → 월간 (일간과 가까운 자리)
 *   3순위 그래도 남으면 고정된 차례로
 */
export function topGroup(c: Candidate): SipsinGroup {
  const cnt = countGroups(c)
  const max = Math.max(...Object.values(cnt))
  const tied = (Object.keys(cnt) as SipsinGroup[]).filter(k => cnt[k] === max)
  if (tied.length === 1) return tied[0]

  const ds = c.day.stem
  const groupAt = (stem: string | undefined) => (stem ? GROUP_OF[sipsinOf(ds, stem)] : undefined)

  // 1순위 월지
  const wolji = groupAt(BRANCH_MAIN_STEM[c.month.branch])
  if (wolji && tied.includes(wolji)) return wolji
  // 2순위 일지 → 월간
  const ilji = groupAt(BRANCH_MAIN_STEM[c.day.branch])
  if (ilji && tied.includes(ilji)) return ilji
  const wolgan = groupAt(c.month.stem)
  if (wolgan && tied.includes(wolgan)) return wolgan
  // 3순위 고정 차례
  const order: SipsinGroup[] = ['비겁', '인성', '식상', '재성', '관성']
  return order.find(k => tied.includes(k)) ?? tied[0]
}

// ── 결과 ──────────────────────────────────────────────────────────────
export interface BabyDescription {
  /** 목록에 다는 한 줄. 예: '자기 주관이 뚜렷하고 스스로 길을 내는 아이' */
  headline: string
  layer1: string   // 타고난 결
  layer2: string   // 힘의 세기
  layer3: string   // 채워진 기운
  layer4: string   // 인생 흐름
  layer5: string[] // 눈에 띄는 것 (없을 수 있음)
  /** 대운 흐름 표 — 화면에서 따로 그릴 때 쓴다 */
  flow: { age: number; ganji: string; label: string }[]
  topGroup: SipsinGroup
  groupCount: Record<SipsinGroup, number>
}

export function describeBaby(c: Candidate, d: FilterDetail): BabyDescription {
  const el = EL_TRAIT[d.dayEl] ?? EL_TRAIT['토']
  const g = topGroup(c)
  const gt = GROUP_TRAIT[g]
  const st = STATUS_TRAIT[d.status] ?? STATUS_TRAIT['중화']
  const cnt = countGroups(c)

  // ① 타고난 결
  const layer1 =
    `${el.name}(${d.dayEl})의 기운을 타고났어요. ${el.way} 성질이라 ${el.trait} 바탕을 지닙니다. ` +
    `여덟 글자를 보면 ${gt.key}의 기운이 가장 두터워요. ${gt.desc}`

  // ② 힘의 세기
  const rootText =
    d.rootSeats.length >= 3 ? `뿌리가 세 군데 넘게 있어 밑동이 단단합니다`
    : d.rootSeats.length === 2 ? '뿌리가 두 군데 있어 제 자리를 지킬 만합니다'
    : '뿌리가 한 군데 있어 자리는 잡았습니다'
  const layer2 = `${st.head}입니다. ${rootText}. ${st.desc}`

  // ③ 채워진 기운
  const els = ['목', '화', '토', '금', '수']
  const spread = els.map(e => `${EL_NAME[e]} ${d.elementCount[e] ?? 0}`).join(' · ')
  const none = els.filter(e => (d.elementCount[e] ?? 0) === 0).map(e => EL_NAME[e])
  const many = els.filter(e => (d.elementCount[e] ?? 0) >= 3).map(e => EL_NAME[e])
  let layer3 = `다섯 기운은 ${spread}${ro(spread)} 놓였어요. `
  layer3 += none.length === 0
    ? '빠진 기운 없이 다섯이 모두 자리했습니다. '
    : `${none.join('·')} 기운은 여덟 글자 안에 드러나지 않았어요. 없는 기운은 자라며 채워간다고 보기도 합니다. `
  layer3 += many.length > 0
    ? `${many.join('·')} 기운이 도드라져 그 색이 뚜렷하게 나타납니다.`
    : '어느 하나가 크게 몰리지 않아 고른 편입니다.'

  // ④ 인생 흐름 — 대운 지지의 십신으로 본다
  const flow = d.daeun.map(du => {
    const s = sipsinOf(c.day.stem, BRANCH_MAIN_STEM[du.branch] ?? '')
    return { age: du.age, ganji: du.stem + du.branch, label: SIPSIN_SHORT[s] ?? s }
  })
  let layer4 = ''
  if (flow.length > 0) {
    const grouped: Partial<Record<SipsinGroup, number>> = {}
    for (const du of d.daeun) {
      const gg = GROUP_OF[sipsinOf(c.day.stem, BRANCH_MAIN_STEM[du.branch] ?? '')]
      if (gg) grouped[gg] = (grouped[gg] ?? 0) + 1
    }
    const vals = Object.values(grouped) as number[]
    const mx = vals.length ? Math.max(...vals) : 0
    const main = (Object.keys(grouped) as SipsinGroup[]).find(k => grouped[k] === mx)
    layer4 =
      (() => {
        const seq = flow.map(f => `${f.age}세 ${f.label}`).join(' → ')
        return `10년마다 흐름이 바뀝니다. ${seq}${ro(seq)} 이어져요. `
      })() +
      (main ? `20대에서 60대 사이는 ${MID_FLOW[main]} 시기가 중심입니다.` : '')
  }

  // ⑤ 눈에 띄는 것 — 해당하는 것만. 길어지지 않게 셋까지.
  const points: string[] = []
  if (d.gwiinSeats.length > 0) {
    points.push(
      `천을귀인이 ${d.gwiinSeats.map(s => GWIIN_SEAT[s] ?? s).join('과 ')}에 들었어요. ` +
      '어려울 때 돕는 인연이 따른다고 보는 자리입니다.')
  }
  if (d.optFourRoot) {
    points.push('자신·일·재능·살림살이 네 갈래가 모두 땅에 뿌리를 두고 있어 어느 한쪽도 비어 있지 않습니다.')
  }
  if (d.optDaeun && d.eokbuEl) {
    const season = seasonOf(c.month.branch)
    const need = d.johuEl && (season === '여름' || season === '겨울') ? d.johuEl : d.eokbuEl
    points.push(`꼭 필요한 ${EL_NAME[need] ?? need} 기운이 20대에서 60대 사이 대운에 찾아와요.`)
  }
  if (many.length > 0) {
    points.push(`${many.join('·')} 기운이 셋 이상으로 두터워요. 그만큼 색이 분명한 대신 다른 기운은 옅습니다.`)
  }

  return {
    headline: `${gt.head} 아이`,
    layer1, layer2, layer3, layer4,
    layer5: points.slice(0, 3),
    flow,
    topGroup: g,
    groupCount: cnt,
  }
}

// 미사용 경고 방지 — 앞으로 층을 늘릴 때 쓸 표들
void GEN; void OVERCOME; void STEM_EL
