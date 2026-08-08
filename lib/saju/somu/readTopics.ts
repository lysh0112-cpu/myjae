// lib/saju/somu/readTopics.ts
//
// ┌───────────────────────────────────────────────────────────────────────┐
// │  🌿 소무승 물상론 — «주제별» 꼭지 읽기 (十一 · 十二 · 十四 · 十五 · 十六)   │
// └───────────────────────────────────────────────────────────────────────┘
//
//  ★2026-08-08 신설.
//
//  🔴🔴 [왜 만들었나]  값으로 재 보니 —
//     十一 自然現象論(1,168줄) · 十二 変證論(701줄) · 十四 十二運星(432줄)
//     · 十五 十二支神殺(763줄) · 十六 通辯要論(628줄)
//     ⇒ ★모두 3,692줄이 저장소에 담겨 있는데 «부르는 곳이 하나도 없었습니다».
//       화면도 judge 도 안 불러 ★아무도 못 보고 있었습니다.
//     ⇒ 이 파일이 그것을 «잇습니다». 자료는 ★한 글자도 안 고쳤습니다.
//
//  ⛔⛔ ★기존 판정 함수를 «하나도» 부르지 않습니다 (judge.ts 와 같은 원칙).
//     이 파일이 부르는 것은 topics/ · hyeongsang/ · byeonjeung/ «자료뿐» 입니다.
//
//  ⛔⛔ ★SOMU_CHAPTERS 에 등록하지 않았습니다 — 일간 뿌리가 아닙니다.
//     data.ts · judge.ts 의 SOMU_CHAPTERS 쪽은 ★한 글자도 안 건드렸습니다.
//
//  ══ ⚠️⚠️ 어디까지 «걸었는가» — 지어내지 않은 자리 ══════════════════
//     ✅ ★十五 十二支神殺만 «규칙대로 걸었습니다».
//        교재가 「寅午戌 生은 午宮에 將星을 놓고 ★順行으로 짚어 간다」라
//        ★順行까지 적어 두었기 때문입니다. 규칙이 «완결» 되어 있습니다.
//        ⚠️ 「生」은 ★년지(띠) 로 봤습니다 — 교재 표기 그대로입니다.
//           ⛔ 일지 기준으로 «바꾸지» 마십시오. 교재가 안 그랬습니다.
//     ✅ ★十二 変證論은 «지지가 뿌리» 라 원국 지지 넷에 걸리는 것만 ★표시합니다.
//        (거르지는 «않습니다» — 열두 지지를 다 폅니다)
//     ✅ ★十四 十二運星은 일간의 «장생지 줄» 만 표시합니다.
//        ⛔ 나머지 열한 자리를 «계산해» 채우지 않았습니다 —
//           교재에 순행·역행이 «없습니다» (unseong12.ts 머리말 · 연재쌤 대기).
//     ⛔ ★十一 自然現象論은 «판정을 안 겁니다».
//        형상 열넷 가운데 일곱은 조건이 «말로만» 적혀 있습니다
//        (「조그만 土에 乙木이 많아야」 · 「기타」는 조건 자체가 없습니다).
//        ⇒ 조건을 «지어» 규칙으로 만들면 교재가 안 한 판정이 됩니다.
//          ★조건을 그대로 적어 두고 상담사가 보고 판단합니다.
//     ⛔ ★十六 通辯要論도 판정을 «안» 겁니다. 쪽 차례 그대로 폅니다.
//        ⚠️ 199줄 가운데 원국 여덟 글자로 «걸 수 있는» 줄이 약 150,
//           «못 거는» 줄이 약 50입니다 (명궁 · 태월 · 상문조객 · 인연법
//           · 격물치지론 · 대운/세운만으로 정해지는 줄).
//           ⇒ 못 거는 줄을 «버리지» 마십시오. 상담사가 그냥 읽는 글로 둡니다.
//
//  ══ ⚠️ to 표 ═══════════════════════════════════════════════════
//     judge.ts 와 ★똑같이 다룹니다 — to 가 없으면 '상담사만'.
//     ⚠️⚠️ ★표 줄(SomuStemBranchLine · SomuSamhapLine)에는 to 칸이 «아예 없습니다».
//        타입에 없는 것이라 «빠뜨린» 것이 아닙니다.
//        ⇒ 안전한 쪽으로 넘어뜨려 ★손님 쪽에서는 통째로 뺍니다.
//        □ 손님 통변을 이으실 때 대표님께 여쭐 자리입니다.
//     ⛔ 사례(通辯論·変證論·自然現象論)는 ★손님 쪽에서 «통째로» 빠집니다.
//        실존 인물의 사생활이라 judge.ts 의 사례 처리와 같은 결입니다.

import { SOMU_TOPICS, SOMU_TOPIC_ORDER } from './topics/index'
import type { SomuTopic, SomuTopicSection } from './topics/types'
import {
  HYEONGSANG, HYEONGSANG_TITLE, HYEONGSANG_PAGES,
  SCAN_NOTES as HYEONGSANG_NOTES,
} from './hyeongsang/data'
import {
  BYEONJEUNG, BYEONJEUNG_TITLE, BYEONJEUNG_PAGES,
  SCAN_NOTES as BYEONJEUNG_NOTES,
} from './byeonjeung/data'
import type { SomuLine } from './data'
import type { SomuPillar } from './judge'

/** 꼭지 안의 한 덩이 */
export interface SomuTopicBlock {
  key: string
  title: string
  source?: string
  lines: string[]
  /** ★이 원국에 «걸린» 자리인가 — 화면이 걸린 것을 위로 올리고 펼칩니다 */
  matched?: boolean
  /** 왜 걸렸는지 — 「년주 巳」 처럼 */
  why?: string
  /** 그림 재료 (自然現象論 사례에 있습니다) */
  img?: string
  /**
   * ★그림 제목에 쓸 한글 한 줄.
   * ⚠️ 일간 열 장은 img.ko 가 «따로» 있으나 自然現象論 사례에는 «없습니다».
   *    그래서 물상 낱말을 이어 씁니다.
   * ⛔ 블록 제목을 여기에 넣지 마십시오 — 「🖼 그림 — 　└ … 사례 1」처럼 됩니다.
   */
  imgKo?: string
}

/** 꼭지 하나 */
export interface SomuTopicGroup {
  key: string
  /** 교재 차례 번호 — '十一' */
  no: string
  label: string
  pages: string
  /** 이 원국에 걸린 덩이 수 — 0 이면 「걸린 자리 없음」 */
  hits: number
  blocks: SomuTopicBlock[]
  /** 스캔이 흐려 원문 대조가 필요한 것 — 상담사에게 그대로 보입니다 */
  notes?: string[]
}

export interface SomuTopicsInput {
  saju: SomuPillar[]
  dayStem: string
  /** ★true 면 '상담사만' 줄과 사례를 «전부» 뺍니다 */
  forCustomer?: boolean
}

/** to 가 없으면 '상담사만' — judge.ts 와 «같은» 규칙입니다 */
function pick(lines: SomuLine[] | undefined, forCustomer: boolean): string[] {
  return (lines ?? []).filter(l => !forCustomer || l.to === '둘다').map(l => l.text)
}

const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'

/** 삼합 → 將星이 앉는 궁 (교재 十二支神殺 449쪽 표 그대로) */
function samhapStart(yearBranch: string, topic: SomuTopic): string | null {
  for (const row of topic.samhapTable ?? []) {
    if (row.samhap.includes(yearBranch)) return row.branch
  }
  return null
}

/** 한 갈래(section)를 줄로 편다 */
function sectionLines(sec: SomuTopicSection, forCustomer: boolean): string[] {
  const out: string[] = []
  const kw = pick(sec.keywords, forCustomer)
  if (kw.length) out.push(kw.join(' · '))
  out.push(...pick(sec.lines, forCustomer))
  for (const tb of sec.tables ?? []) {
    const head = tb.head ? `〔${tb.label}〕 ${tb.head[0]} / ${tb.head[1]}` : `〔${tb.label}〕`
    const rows = tb.rows
      .filter(r => !forCustomer || r.to === '둘다')
      .map(r => `　${r.left}${r.right ? ` · ${r.right}` : ''} — ${r.text}`)
    if (rows.length) out.push(head, ...rows)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────
//  十四 十二運星 · 十五 十二支神殺 · 十六 通辯要論  (SomuTopic 꼴)
// ─────────────────────────────────────────────────────────────────
function readTopic(
  topic: SomuTopic,
  saju: SomuPillar[],
  dayStem: string,
  forCustomer: boolean,
): SomuTopicGroup {
  const blocks: SomuTopicBlock[] = []

  const intro = pick(topic.intro, forCustomer)
  if (intro.length) {
    blocks.push({
      key: `${topic.id}-intro`,
      title: `${topic.label} — 머리말`,
      source: `소무승 물상론 ${topic.pages}`,
      lines: intro,
      matched: true,
    })
  }
  if (topic.order) {
    blocks.push({
      key: `${topic.id}-order`,
      title: `${topic.label} — 차례`,
      lines: [topic.order.text, topic.order.items.join(' ▸ ')],
      matched: true,
    })
  }

  // ── 十二運星 : 장생지 표 — ★일간에 걸리는 줄만 표시 ──────────────
  //   ⛔ 나머지 열한 자리를 «계산해» 채우지 않습니다 (머리말 참조).
  if (topic.stemTable?.length && !forCustomer) {
    const hit = topic.stemTable.find(r => r.stems.includes(dayStem))
    blocks.push({
      key: `${topic.id}-stemTable`,
      title: `장생지(長生地) 표${hit ? `　★일간 ${dayStem} → ${hit.branch}궁` : ''}`,
      source: `소무승 물상론 ${topic.pages}`,
      matched: !!hit,
      why: hit ? `일간 ${dayStem}` : undefined,
      lines: topic.stemTable.map(
        r => `${r.stems.includes(dayStem) ? '★ ' : '　 '}${r.text}`,
      ),
    })
  }

  // ── 十二支神殺 : 삼합 → 將星 → ★順行 (교재에 적힌 규칙 그대로) ────
  const yearBranch = saju.find(p => p.pillar === '년주')?.branch ?? ''
  const startBranch = topic.samhapTable?.length ? samhapStart(yearBranch, topic) : null
  /** 지지 한 글자 → 그 자리의 神殺 이름 */
  const sinsalOf: Record<string, string> = {}
  if (startBranch) {
    const s = BRANCHES.indexOf(startBranch)
    topic.sections.forEach((sec, i) => {
      sinsalOf[BRANCHES[(s + i) % 12]] = sec.label
    })
    if (!forCustomer) {
      blocks.push({
        key: `${topic.id}-samhap`,
        title: `삼합 → 將星 자리　★년지 ${yearBranch} → ${startBranch}宮`,
        source: `소무승 물상론 ${topic.pages}`,
        matched: true,
        why: `년지 ${yearBranch}`,
        lines: [
          ...topic.samhapTable!.map(
            r => `${r.samhap.includes(yearBranch) ? '★ ' : '　 '}${r.text}`,
          ),
          '',
          '★이 원국의 네 기둥 —',
          ...saju
            .filter(p => p.branch && p.branch !== '?')
            .map(p => `　${p.pillar} ${p.branch} → ${sinsalOf[p.branch] ?? '—'}`),
        ],
      })
    }
  }

  // ── 갈래들 ────────────────────────────────────────────────────
  //   ⚠️ ★안 걸린 갈래도 «전부» 폅니다. 걸린 것에만 ★표시를 답니다.
  const myBranches = saju.map(p => p.branch).filter(b => b && b !== '?')
  for (const sec of topic.sections) {
    const lines = sectionLines(sec, forCustomer)
    if (!lines.length) continue
    // 神殺이면 「내 원국의 어느 기둥이 이 神殺인가」
    const hitPillars = startBranch
      ? saju.filter(p => sinsalOf[p.branch] === sec.label).map(p => p.pillar)
      : []
    const matched = hitPillars.length > 0
    blocks.push({
      key: `${topic.id}-${sec.key}`,
      title: `${sec.label}${matched ? `　★${hitPillars.join('·')}` : ''}`,
      source: `소무승 물상론 ${topic.pages}`,
      lines,
      matched,
      why: matched ? hitPillars.join('·') : undefined,
    })
  }
  void myBranches

  return {
    key: topic.id,
    no: topic.no,
    label: topic.label,
    pages: topic.pages,
    hits: blocks.filter(b => b.matched && !b.key.endsWith('-intro') && !b.key.endsWith('-order')).length,
    blocks,
  }
}

// ─────────────────────────────────────────────────────────────────
//  十一 自然現象論 — ⛔ 판정을 «안» 겁니다
// ─────────────────────────────────────────────────────────────────
function readHyeongsang(forCustomer: boolean): SomuTopicGroup {
  const blocks: SomuTopicBlock[] = []
  for (const h of HYEONGSANG) {
    const head: string[] = []
    if (h.condition.length) head.push(...h.condition)
    head.push(
      h.ruleLike
        ? '★조건이 «표로 떨어지는» 형상입니다.'
        : '⚠️ 조건이 «말로만» 적힌 형상입니다 — 상담사가 보고 판단하십시오.',
    )
    blocks.push({
      key: `hyeongsang-${h.name}`,
      title: `${h.name}`,
      source: `소무승 물상론 ${h.page}쪽`,
      lines: head,
    })
    // 사례 — ⛔ 손님 쪽에서는 통째로 빠집니다
    if (forCustomer) continue
    h.cases.forEach((c, i) => {
      blocks.push({
        key: `hyeongsang-${h.name}-case-${i}`,
        title: `　└ ${h.name} 사례 ${i + 1}`,
        source: [c.birth, c.gender, c.chart].filter(Boolean).join(' · '),
        img: c.img,
        imgKo: [...c.stemWords, ...(c.branchWords ?? [])].filter(Boolean).join(' · '),
        lines: [
          `【원국】 ${c.chart}　【물상】 ${c.stemWords.filter(Boolean).join(' · ') || '—'}`,
          ...(c.branchWords?.length
            ? [`【지지 물상】 ${c.branchWords.filter(Boolean).join(' · ')}`]
            : []),
          ...(c.daeun ? [`【대운】 ${c.daeun}`] : []),
          ...c.lines.flatMap(l => [l.text, ...(l.sub ?? []).map(s => `　− ${s}`)]),
        ],
      })
    })
  }
  return {
    key: 'hyeongsang',
    no: '十一',
    label: HYEONGSANG_TITLE.replace(/^十一\s*/, ''),
    pages: HYEONGSANG_PAGES,
    hits: 0,
    blocks,
    notes: forCustomer ? undefined : HYEONGSANG_NOTES,
  }
}

// ─────────────────────────────────────────────────────────────────
//  十二 変證論 — ★지지가 뿌리. 원국 지지에 걸리는 것에 ★표시
// ─────────────────────────────────────────────────────────────────
function readByeonjeung(saju: SomuPillar[], forCustomer: boolean): SomuTopicGroup {
  const mine = new Map<string, string[]>()
  for (const p of saju) {
    if (!p.branch || p.branch === '?') continue
    mine.set(p.branch, [...(mine.get(p.branch) ?? []), p.pillar])
  }
  const blocks: SomuTopicBlock[] = []
  // 교재 차례(子丑寅…) 그대로 돌되, ★걸린 지지를 «위» 로
  const keys = Object.keys(BYEONJEUNG)
  const order = [...keys.filter(k => mine.has(k)), ...keys.filter(k => !mine.has(k))]
  for (const k of order) {
    const b = BYEONJEUNG[k]
    if (!b) continue
    const pillars = mine.get(k) ?? []
    const matched = pillars.length > 0
    const lines: string[] = []
    for (const r of b.rules) {
      if (forCustomer && r.to !== '둘다') continue
      lines.push(`${r.day ? `[${r.day}일주] ` : ''}${r.text}`)
      for (const f of r.formula ?? []) lines.push(`　▸ ${f}`)
    }
    if (b.summary) lines.push(`※ ${b.summary}`)
    if (!forCustomer) {
      for (const c of b.cases) {
        lines.push(
          `【원국】 ${c.chart}`
            + `　【십성】 ${c.tenGods.filter(Boolean).join(' · ') || '—'}`
            + `　【물상】 ${c.words.filter(Boolean).join(' · ') || '—'}`
            + (c.words2?.length ? `　/ ${c.words2.filter(Boolean).join(' · ')}` : '')
            + `　⇒ ${c.label}`,
        )
        if (c.note) lines.push(`　※ ${c.note}`)
      }
    }
    if (!lines.length) continue
    blocks.push({
      key: `byeonjeung-${k}`,
      title: `${b.branch}${matched ? `　★${pillars.join('·')}` : ''}`,
      source: `소무승 물상론 ${b.page}쪽`,
      lines,
      matched,
      why: matched ? pillars.join('·') : undefined,
    })
  }
  return {
    key: 'byeonjeung',
    no: '十二',
    label: BYEONJEUNG_TITLE.replace(/^十二\s*/, ''),
    pages: BYEONJEUNG_PAGES,
    hits: blocks.filter(b => b.matched).length,
    blocks,
    notes: forCustomer ? undefined : BYEONJEUNG_NOTES,
  }
}

/**
 * ★주제별 다섯 꼭지를 «교재 차례» 대로 돌려줍니다.
 *   十一 自然現象論 → 十二 変證論 → 十四 十二運星 → 十五 十二支神殺 → 十六 通辯要論
 *   □ 十三 神殺論은 ★아직 안 담겼습니다 (교재 425쪽 언저리 — 스캔으로 세어 확인할 것).
 */
export function readSomuTopics(input: SomuTopicsInput): SomuTopicGroup[] {
  const { saju, dayStem, forCustomer = false } = input
  const out: SomuTopicGroup[] = [
    readHyeongsang(forCustomer),
    readByeonjeung(saju, forCustomer),
  ]
  for (const id of SOMU_TOPIC_ORDER) {
    const t = SOMU_TOPICS[id]
    if (t) out.push(readTopic(t, saju, dayStem, forCustomer))
  }
  return out
}
