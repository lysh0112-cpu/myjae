// lib/saju/career/sinsal9.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ⑤  —  타고난 신살                                 │
// │  출전: 『명리적성 비법노트』(심산) 90~93쪽                          │
// └───────────────────────────────────────────────────────────────┘
//
// [왜 이 부품이 중요한가]
//   책 사례 (6) 특목고 1학년은 "뇌 의학"이라는 구체적인 답이
//   오행·육친이 아니라 **현침살 5개**에서 나왔다.
//   오행·육친만으로는 "의약 계열" 정도까지만 좁혀진다.
//   신살이 있어야 "정교하게 다루는 뇌 신경계"까지 간다.
//
// ⚠️ lib/saju/sinsal.ts 와 다른 물건이다.
//    그쪽은 12신살(겁살·재살·천살…화개)이고, 여기는 교재가 쓰는 9종이다.
//    겹치는 것은 역마·도화 둘뿐. 계산법도 다르므로 섞지 말 것.
//
// [계산 방식]
//   전부 글자 대조다. 어려운 계산이 없다.
//     char   글자를 센다            현침·탕화 / 역마·도화의 지지
//     pair   지지 두 글자가 짝      귀문관살·천문성
//     pillar 간지 한 기둥이 통째로  백호·괴강·양인
//     double 같은 글자가 둘 이상    丙丙·戊戊·庚庚·戌戌 / 壬壬·癸癸

import type { CareerCard, CareerInput, Pillar } from './types'
import { isHourUnknown } from './types'
import { iga } from '../josa'
import { SINSAL9, DOHWA_NOTE, POWER_PAIRS, GROUP_RULE, type SinsalRow } from './tables/sinsal'
import { jobKey, okForStudent } from './tables/jobs'

/** 신살 하나의 판정 결과 */
export interface SinsalHit {
  key: string
  name: string
  /** 걸린 글자들 (자리와 함께) */
  marks: Array<{ ch: string; pillar: string; semi?: boolean }>
  /** 센 개수 (준현침은 0.5로 세지 않고 1로 세되 semi 로 표시) */
  count: number
  /** threshold 를 넘겨 "작용력이 있다"고 볼 수 있는가 */
  active: boolean
  /** 자리로 본 작용력 3(가장 큼) / 2 / 1 / 0 */
  power: number
  powerNote: string
  row: SinsalRow
}

/** 화면에 보일 신살 개수 (작용력 순). 나머지는 AI 재료로만 넘어간다. */
export const SHOW_MAX = 3

/** 물음표(시 모름)는 세지 않는다 */
const real = (x: string) => x !== '?' && x !== ''

// ── 신살 하나 판정 ──────────────────────────────────────────────
function checkOne(saju: Pillar[], row: SinsalRow): SinsalHit {
  const marks: SinsalHit['marks'] = []

  for (const p of saju) {
    // pillar — 간지 한 기둥이 통째로
    if (row.kind.includes('pillar') && row.pillars) {
      if (real(p.stem) && real(p.branch) && row.pillars.includes(p.stem + p.branch)) {
        marks.push({ ch: p.stem + p.branch, pillar: p.pillar })
      }
    }
    // char — 천간·지지 글자 각각
    if (row.kind.includes('char') && row.chars) {
      for (const ch of [p.stem, p.branch]) {
        if (!real(ch)) continue
        if (row.chars.includes(ch)) marks.push({ ch, pillar: p.pillar })
        else if (row.semi?.includes(ch)) marks.push({ ch, pillar: p.pillar, semi: true })
      }
    }
  }

  // pair — 지지 두 글자가 짝을 이뤄야 성립
  if (row.kind.includes('pair') && row.pairs) {
    const bs = saju.filter(p => real(p.branch))
    for (const [a, b] of row.pairs) {
      const ha = bs.find(p => p.branch === a)
      const hb = bs.find(p => p.branch === b)
      if (ha && hb) {
        marks.push({ ch: a, pillar: ha.pillar })
        marks.push({ ch: b, pillar: hb.pillar })
      }
    }
  }

  // double — 같은 글자가 둘 이상
  if (row.kind.includes('double') && row.doubles) {
    const all = saju.flatMap(p => [
      { ch: p.stem, pillar: p.pillar }, { ch: p.branch, pillar: p.pillar },
    ]).filter(x => real(x.ch))
    for (const ch of row.doubles) {
      const same = all.filter(x => x.ch === ch)
      if (same.length >= 2) marks.push(...same.map(x => ({ ch: x.ch, pillar: x.pillar })))
    }
  }

  // 같은 자리·같은 글자가 두 번 담기지 않게
  const seen = new Set<string>()
  const uniq = marks.filter(m => {
    const k = `${m.pillar}|${m.ch}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })

  // 자리로 본 작용력
  const pillars = new Set(uniq.map(m => m.pillar))
  let power = 0, powerNote = ''
  for (const pp of POWER_PAIRS) {
    if (pillars.has(pp.pillars[0]) && pillars.has(pp.pillars[1]) && pp.level > power) {
      power = pp.level; powerNote = pp.note
    }
  }

  return {
    key: row.key, name: row.name, marks: uniq, count: uniq.length,
    active: uniq.length >= row.threshold, power, powerNote, row,
  }
}

/** 9종 전부 판정 (화면·다른 부품이 재료로 쓸 수 있게 따로 내보낸다) */
export function checkSinsal9(saju: Pillar[]): SinsalHit[] {
  const hits = SINSAL9.map(row => checkOne(saju, row))

  // ══════════════════════════════════════════════════════════════
  //  ★묶음 처리 — 백호·괴강·양인은 «합쳐» 셉니다 (교재 95쪽 「괴백양」)
  //
  //  ★2026-08-02 — «기둥» 으로 셉니다 (대표님 확정)
  //    전  살마다 센 수를 더함  →  戊辰 하나가 백호1+괴강1 = «2개»
  //                                 최대 7개까지 나왔습니다 (기둥은 넷인데)
  //    후  ★해당하는 «기둥» 이 몇인가  →  戊辰은 «1개»
  //
  //  ⚠️ 교재에 명시가 «없습니다». 노트북LM 두 갈래로 물어 확인했습니다.
  //     연재쌤 답이 오면 이 줄만 바꾸십시오.
  //  ⚠️ 자세한 까닭은 tables/sinsal.ts 의 GROUP_RULE 머리말을 보십시오.
  // ══════════════════════════════════════════════════════════════
  for (const [gkey, rule] of Object.entries(GROUP_RULE)) {
    const members = hits.filter(h => h.row.group === gkey)
    if (!members.length) continue
    // ★기둥으로 셉니다 — 한 기둥이 두 살에 걸려도 «하나» 입니다
    const pillarsHit = new Set(members.flatMap(h => h.marks.map(m => m.pillar)))
    const total = pillarsHit.size
    for (const h of members) h.active = h.count > 0 && total >= rule.threshold
  }
  return hits
}

/** 묶음별로 합친 보기 (화면에서 같은 말을 세 번 반복하지 않게) */
export interface SinsalGroupView {
  key: string
  name: string
  marks: SinsalHit['marks']
  count: number
  power: number
  powerNote: string
  row: SinsalRow
  members?: string[]
}
function toGroupViews(hits: SinsalHit[]): SinsalGroupView[] {
  const out: SinsalGroupView[] = []
  const done = new Set<string>()
  for (const h of hits) {
    if (!h.active) continue
    const g = h.row.group
    if (!g) {
      out.push({ key: h.key, name: h.name, marks: h.marks, count: h.count, power: h.power, powerNote: h.powerNote, row: h.row })
      continue
    }
    if (done.has(g)) continue
    done.add(g)
    const ms = hits.filter(x => x.row.group === g && x.active)
    const marks = ms.flatMap(x => x.marks)
    const pillars = new Set(marks.map(m => m.pillar))
    let power = 0, powerNote = ''
    for (const pp of POWER_PAIRS) {
      if (pillars.has(pp.pillars[0]) && pillars.has(pp.pillars[1]) && pp.level > power) {
        power = pp.level; powerNote = pp.note
      }
    }
    // ★2026-08-02 — 화면에 내는 수도 «기둥» 수입니다 (대표님 확정)
    //   ⚠️ marks.length 로 두면 戊辰이 두 번 세어져 「3개」로 보입니다.
    //      실기에서 「백호·괴강·양인일주 3개」가 그렇게 나왔습니다.
    //   ★그리고 이름은 «잡힌 살만» 부릅니다 — 양인이 0개면 「양인」을 안 붙입니다.
    out.push({
      key: g, name: ms.map(x => x.name.replace('일주', '')).join('·'), marks,
      count: pillars.size, power, powerNote, row: ms[0].row,
      members: ms.map(x => `${x.name} ${x.count}`),
    })
  }
  return out
}

// ── 카드 ────────────────────────────────────────────────────────
export function judgeSinsal(input: CareerInput): CareerCard {
  const { saju } = input
  const all = checkSinsal9(saju)
  const on = toGroupViews(all)
  // 강한 순 → 개수 많은 순
  on.sort((a, b) => (b.power - a.power) || (b.count - a.count))
  // ★화면에는 위 세 가지만. 나머지는 AI 재료로만 넘긴다.
  //   책 사례는 한 사주에 신살을 한둘만 짚는다. 다 늘어놓으면 카드가 신살로 뒤덮인다.
  const shown = on.slice(0, SHOW_MAX)

  const hourUnknown = isHourUnknown(saju)
  const lines: string[] = []
  const reasons: string[] = []

  if (on.length === 0) {
    lines.push('진로를 가르는 신살은 뚜렷하게 잡히지 않아요. 오행과 육친의 결을 따라 보시면 됩니다.')
    reasons.push('작용력 있는 신살 없음. 신살 이야기를 억지로 만들지 마세요.')
  } else {
    for (const h of shown) {
      // ★2026-08-02 — 겹치는 기둥은 «한 번만» 적습니다.
      //   ⚠️ 戊辰이 백호·괴강 둘 다라 「戊辰 · 庚辰 · 戊辰」으로 나왔습니다.
      const seenP = new Set<string>()
      const chars = h.marks
        .filter(m => !seenP.has(m.pillar) && seenP.add(m.pillar) !== undefined)
        .map(m => m.semi ? `${m.ch}(준)` : m.ch).join(' · ')
      // ══════════════════════════════════════════════════════
      //  ★2026-08-02 — 두 수를 «갈라» 적습니다 (교재 95쪽)
      //   백호 단독   "2~3개 이상이면 큰 사주" · "3개 이상이면 흉함"
      //   괴백양 통합 "2개 정도 있으면 성질 괴팍함"
      //   ⇒ ★서로 «다른 잣대» 입니다. 한 수로 뭉치면
      //      백호 1개인 분이 「3개라 흉함」으로 보입니다.
      //   ⚠️ 괄호 안 수는 «살마다» 센 것이고, 앞의 수는 «기둥» 수입니다.
      //      합이 안 맞아 보이는 것이 «맞습니다» — 그래서 말로 밝힙니다.
      // ══════════════════════════════════════════════════════
      const detail = h.members ? ` (${h.members.join(' · ')})` : ''
      // ⚠️ «기둥» 이라는 말은 «묶음(괴백양)» 에만 씁니다.
      //    현침·도화·역마는 «글자» 로 성립해 한 기둥에 둘도 들어갑니다
      //    (甲午 → 甲과 午 둘 다 현침). 「기둥」이라 부르면 5개 이상이 나옵니다.
      const unit = h.members ? '기둥' : '개'
      lines.push(`${h.name} — ${chars} · ${h.count}${unit}${detail}`)
      lines.push(h.row.gijil)
      if (h.powerNote) lines.push(h.powerNote + '.')
      if (h.row.caution) lines.push(h.row.caution)
      if (h.key === 'dohwa') {
        const seenCh = new Set<string>()
        const notes = h.marks
          .filter(m => DOHWA_NOTE[m.ch] && !seenCh.has(m.ch) && seenCh.add(m.ch) !== undefined)
          .map(m => `${m.ch}는 ${DOHWA_NOTE[m.ch]}`)
        if (notes.length) lines.push(notes.join(', ') + '라고 부릅니다.')
      }
    }
  }

  // AI 통변 재료
  // ★2026-07-27 — 학생이면 어른용 직업을 재료에서도 뺀다.
  //   도화살 목록에 '유흥업'이 들어 있어 아이 사주 재료로 그대로 나갔다.
  const forStudent = input.target === 'student'
  for (const h of all) {
    if (!h.active) continue
    const jobs = forStudent
      ? h.row.jobs.filter(j => okForStudent(jobKey(j)))
      : h.row.jobs
    reasons.push(
      `${h.name} ${h.count}개 [${h.marks.map(m => `${m.pillar.replace('주', '')}:${m.ch}`).join(' ')}]` +
      ` 작용력 ${h.power || 0}/3` +
      ` · 어울리는 일 : ${jobs.join(', ')}` +
      ` · 근거 ${h.row.src}`
    )
  }
  const off = all.filter(h => !h.active && h.count > 0)
  if (off.length) {
    reasons.push(`문턱에 못 미친 것 : ${off.map(h => `${h.name} ${h.count}개(기준 ${h.row.threshold})`).join(' · ')}. 언급하지 마세요.`)
  }
  if (hourUnknown) {
    reasons.push('시(時)를 몰라 시주 두 글자를 빼고 세었습니다. 신살이 실제보다 적게 잡혔을 수 있으니 단정하지 마세요.')
  }
  reasons.push('이 대목("타고난 신살")의 통변 재료입니다. 신살의 결과 어울리는 일만 다루고, 학과·대학 이야기는 뒤 대목으로 넘기세요.')
  reasons.push('신살은 겁주는 말이 아닙니다. 그 기운을 어디에 쓰면 좋은지로 풀어 주세요.')
  reasons.push('★건강·사고·질병을 예언처럼 말하지 마세요. 병 이름을 나열하지 말고, "이런 때는 한 번 더 살피시면 좋다" 정도로만 담담하게 한 번 짚으세요. 우리는 의료인이 아닙니다.')

  if (hourUnknown) {
    lines.push('태어난 시(時)를 몰라 시주 두 글자를 빼고 보았어요. 신살이 더 있을 수 있습니다.')
  }

  const badge = on.length ? `${on.length}가지` : ''

  return {
    key: 'sinsal',
    title: '타고난 신살',
    badge,
    lines,
    reasons,
    data: { all, active: on.map(h => h.key), hourUnknown } as unknown as Record<string, unknown>,
  }
}
