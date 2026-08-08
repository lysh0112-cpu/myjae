'use client'
// app/manseryeok/consultant/components/YongsinReading.tsx
//
// ══════════════════════════════════════════════════════════════════
//  ⚖️ 용신 «로데이터» — 상담사용
//
//  ★2026-08-06 (48부 1차 · 연재쌤 의견 · 대표님 지시)
//    「용신에 대해서만 표시하는 탭을 별도로 만들었으면 한다」
//    「교재에 입력된 격국용신·억부용신·조후용신 관련 내용을
//      ★대고객 통변자료가 아닌 «로데이터»로 그대로 표시해서
//      전문상담사가 판단하게 했으면」
//    「파이프라인을 지나가면서 나오는 ★모든 자료를 교재 있는 내용 그대로」
//    「① 격국용신 관련 내용도 «모두» ② 부정적인 내용도 «원문 자체»를」
//
//  ★무엇이 「원본 해설」탭과 다른가
//    원본 해설  — 열다섯 갈래를 «넓게». 용신은 그중 한 묶음이라 결론만 나옵니다.
//    여기       — 용신 «하나만». 대신 ★결론에 이른 «길» 을 다 폅니다.
//       · 오행 점수 100점 (버려지던 값)
//       · 육친 5분류 합산 점수 (코드 안에만 있고 화면에 나온 적 없음)
//       · 교재 151쪽 표의 «어느 줄» 이 걸렸는가
//       · 예외 규칙 둘이 걸렸는가 — ★안 걸려도 적습니다
//       · 직업표를 «통째로» (전에는 한 줄로 뭉개 나갔습니다)
//
//  ⚠️ ★판정을 «새로» 만들지 않았습니다 — 이미 있는 함수·표만 부릅니다.
//     calcYongsinScore · judgeStrength · calcYongsinNew · calcGyeokguk
//     · calcCareerGyeokguk · relOf · yukchinOfEl · countGeopjae · hasInsungRoot
//     · P151_TABLE · GYEOK_SANGSIN · GYEOKGUK_INFO · YONGSIN_*
//     ⇒ 진로적성·통변·손님 화면과 ★«같은 답» 이 나옵니다.
//     ⛔ 여기서 판정을 새로 짜지 마십시오. 답이 갈립니다.
//
//  ⚠️ yongsinNew.ts 는 「손대지 말 것」이라 ★export 한 낱말만 붙였습니다.
//     로직은 한 글자도 안 건드렸습니다. 표를 «옮겨 적으면» 사본이 둘이 되어
//     교훈 BQ(「한쪽만 고치지 마십시오」)를 또 만듭니다.
//
//  ⛔⛔ ★«상담사용» 입니다. 손님 화면에 옮기지 마십시오.
//     교재 말이 거칠고, 판정 근거는 손님께 안 보이는 것이 확정입니다
//     (진로적성 SHOW_WHY = false · 44부 확정).
//
//  ★2026-08-06 (48부 2차) — 「험한 말」에 대하여  [대표님 지시]
//    「한량, 카사노바 등 이런 험한 말도 ★전문상담사는 모두 봐야 해」
//    「편인격은 교재가 서로 어긋나도 ★그대로 표현해 줘 — 상담사가 알아서 판단」
//
//    ⇒ ★찾아보니 그 말들이 «저장소에 살아 있었습니다» — 격 자료가 아니라
//       «육친» 자료 쪽이었습니다. 45부 주석이 「안 담았다」고 적은 것은
//       ★손님 화면의 격 모달(GYEOK_DESC)을 두고 한 말입니다.
//         yukchinTable.original   「한량기」·「주색잡기」·「별거, 이혼, 바람기」
//         yukchinGroup.original   「거지, 노숙자가 많고 한량이다」
//         ilju.gijilFull          「주색잡기와 구설수」
//    ⇒ ★용신이 «가리키는 육친» 의 원문을 그대로 폅니다 (아래 ⑤·⑥ 묶음).
//
//    🔴 아직 «없는» 것 — A책 159~182쪽 격 본문 스캔이 저장소에 안 들어와 있습니다.
//       「카사노바」·「일부다처형」 같은 ★격 본문 표현이 그 안에 있습니다.
//       ⇒ 스캔을 넣어 주시면 ★자료 파일에 담고 여기서 «불러» 쓰십시오.
//       ⛔ ★이 파일에 교재 말을 «직접» 적지 마십시오. 사본이 둘 되면 교훈 BQ 입니다.
//
//    ⚠️ 「담지 않기로 한 일곱」(44부 교훈 CA)은 ★이번 지시와 «다른» 것입니다 —
//       127쪽 단명·자살 · 129쪽 성범죄 «피해자 탓» · 128쪽 실명
//       · 131쪽 낙태·유산·불임 판정 · 병명 · 센 말 · 종교 단정
//       그 일곱은 자료 파일에 ★애초에 «안 담겨» 있어 여기서도 안 나옵니다.
//       ⛔ 되살리려면 ★대표님께 «따로» 여쭈십시오. 특히 ②는
//          「성폭력 피해자가 자기 사주를 보러 왔을 때 이 말이 닿으면
//            사람을 해칩니다」 라고 자료에 적혀 있습니다.
// ══════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react'
import { useResultSaju } from '@/hooks/useResultSaju'
// 🔴 ★2026-08-08 — 음력 변환이 부본으로 넘어가면 «하루 밀린 원국» 이 됩니다.
//   ⛔ 이 경고를 빼지 마십시오 (LunarSourceNote 머리말 참조).
import LunarSourceNote from '@/app/components/common/LunarSourceNote'
import {
  // ⚠️ judgeStrength 는 «들여오지 않습니다» — calcYongsinNew 가 status 를 이미 줍니다.
  //    들여오면 eslint 경고가 늘어 기준선(82/137)이 깨집니다.
  calcYongsinScore, calcYongsinNew, calcGyeokguk,
  relOf, yukchinOfEl, countGeopjae, hasInsungRoot,
  P151_TABLE, GYEOK_SANGSIN, ALL, sipsinOf,
  type Ohaeng, type Yukchin5,
} from '@/lib/saju/yongsinNew'
import { calcCareerGyeokguk } from '@/lib/saju/career/gyeokguk'
import { GYEOKGUK_INFO } from '@/lib/saju/career/tables/gyeokguk'
import {
  YONGSIN_OHAENG, YONGSIN_YUKCHIN, YONGSIN_NOTE, YONGSIN_SRC,
} from '@/lib/saju/career/tables/yongsin'
import { LINE_OUTER, LINE_INNER } from '@/lib/ui/line'
// ★2026-08-06 (48부 2차) — 육친 «교재 원문» [대표님 「한량·카사노바 등 험한 말도 상담사는 모두 봐야해」]
//   용신은 «육친» 을 가리킵니다. 그 육친의 교재 원문이 여기 살아 있습니다.
//   ⚠️ original 은 ★교재 원문 그대로라 말이 셉니다 — 상담사용이라 폅니다.
//   ⛔⛔ ★손님 화면에는 «절대» 넣지 마십시오 (자료 파일 머리말 · 47부 5-2).
import {
  rowOf as yukchinRowOf, yukchinLines, darununLines, cheobangLines,
  sipsinCount, PAIR_OF, YUKCHIN_KEYS, type YukchinKey,
} from '@/lib/saju/yukchinTable'
import { groupBrief } from '@/lib/saju/yukchinGroup'
import { ctxOf } from '@/lib/saju/jijiTrait'

type Props = {
  calType: '양력' | '음력'
  leap: boolean
  gender: '남' | '여'
  year: string
  month: string
  day: string
  hourIdx: number | null
  name: string
}

const EL_HAN: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

/** 오행 → 한자를 함께 (로데이터라 둘 다 보입니다) */
function el(e: string | null | undefined): string {
  if (!e) return '—'
  return `${e}${EL_HAN[e] ? `(${EL_HAN[e]})` : ''}`
}

type Item = { title: string; source?: string; lines: string[] }
type Group = { key: string; label: string; items: Item[] }

/**
 * ★교재 원문(original)을 꺼냅니다 — SourceReading 과 «같은» 방식입니다.
 *   ⚠️ 자료 파일에 「original 은 화면에도 통변 재료에도 넣지 말 것」이라 적혀 있습니다.
 *      그것은 ★«손님 화면» 을 두고 한 말입니다. 여기는 «상담사용» 입니다.
 *   ⛔ ★손님 화면(통변·진로적성·궁합)에는 «절대» 넣지 마십시오.
 */
function orig(row: unknown): string[] {
  const o = (row as { original?: unknown })?.original
  if (typeof o === 'string' && o.trim()) return [`【교재 원문】 ${o.trim()}`]
  if (Array.isArray(o)) {
    const arr = o.filter(x => typeof x === 'string' && x.trim())
    if (arr.length) return [`【교재 원문】 ${arr.join(' ')}`]
  }
  return []
}

/** 5분류(비겁·식상…)에 딸린 십신 «둘» — 용신이 가리키는 육친을 원문까지 폅니다 */
function keysOfPair(pair: string): YukchinKey[] {
  return YUKCHIN_KEYS.filter(k => PAIR_OF[k] === pair)
}

/** 한 꼭지 — 제목 · 출전 · 여러 줄 */
function Block({ title, source, lines }: Item) {
  if (lines.length === 0) return null
  return (
    <div style={{
      background: '#fff', border: LINE_OUTER, borderRadius: 10,
      padding: '11px 13px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3a2e28' }}>{title}</span>
        {source && (
          <span style={{ fontSize: 10, color: '#a08d7d', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {source}
          </span>
        )}
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{
          fontSize: 12, color: '#4a3f38', lineHeight: 1.85,
          paddingLeft: 9, borderLeft: LINE_INNER, marginBottom: 5,
        }}>{l}</div>
      ))}
    </div>
  )
}

export default function YongsinReading(p: Props) {
  const yearN = Number(p.year) || 0
  const monthN = Number(p.month) || 0
  const dayN = Number(p.day) || 0

  // ⚠️ 만세력 계산은 ★손님 화면·원본 해설과 «똑같은» 훅입니다.
  //    ⛔ 새로 계산하지 마십시오. 답이 갈립니다.
  const { saju, converting, dayStem, lunarSource, lunarReason, lunarMismatch } = useResultSaju(
    p.calType, yearN, monthN, dayN, p.leap ? '1' : '0', p.hourIdx,
  )

  /** 접힌 묶음 — ⚠️ «담긴 것만» 접힘. 빈 Set 이라 처음엔 전부 펼쳐집니다. */
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const toggle = (k: string) => setClosed(prev => {
    const n = new Set(prev)
    if (n.has(k)) n.delete(k); else n.add(k)
    return n
  })

  const groups = useMemo<Group[]>(() => {
    if (saju.length === 0 || !dayStem) return []
    const G: Group[] = []

    const dayEl = ({ 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토',
      庚: '금', 辛: '금', 壬: '수', 癸: '수' } as Record<string, Ohaeng>)[dayStem]
    if (!dayEl) return []

    const score = calcYongsinScore(saju)
    const rel = relOf(dayEl)
    const y = calcYongsinNew(saju, dayStem)
    const monthBranch = saju.find(s => s.pillar === '월주')?.branch ?? ''
    const hourMissing = p.hourIdx === null

    // ── ⓪ 원국 · 점수 — 모든 판정이 딛는 «바닥» ───────────────────
    {
      const items: Item[] = []
      items.push({
        title: '원국 여덟 글자',
        source: '만세력',
        lines: [
          saju.map(s => `${s.pillar} ${s.stem}${s.branch}`).join(' · '),
          `일간 ${dayStem} · 일간 오행 ${el(dayEl)} · 월지 ${monthBranch || '—'}`,
          hourMissing
            ? '🔴 시간 «모름» — 시주가 빠졌습니다. 아래 점수·판정이 «모두» 달라집니다.'
            : '시주까지 다 들어왔습니다.',
        ],
      })
      items.push({
        title: '오행 점수 (100점)',
        source: 'simsanOhaeng — 원장님 수정판',
        lines: [
          ALL.map(e => `${el(e)} ${score[e] ?? 0}`).join(' · '),
          `비겁 ${el(rel.bigeop)} · 인성 ${el(rel.insung)} · 식상 ${el(rel.siksang)}`
          + ` · 재성 ${el(rel.jaesung)} · 관성 ${el(rel.gwansung)}`,
        ],
      })
      if (y) {
        items.push({
          title: `신강약 — ${y.status}`,
          source: 'A책 141쪽 · 문턱 30 / 42 / 47',
          lines: [
            `비겁+인성 = ${y.inbiScore}`,
            '30 미만 극신약 · 42 미만 신약 · 47 이하 중화 · 47 초과 신강',
            'A책 141쪽 — 월지가 비겁·인성으로 통근하면 신강, 월지가 식재관이면 신약',
          ],
        })
      }
      G.push({ key: 'base', label: '① 바닥 — 원국과 점수', items })
    }

    // ── ① 조후용신 ────────────────────────────────────────────────
    if (y) {
      const items: Item[] = []
      items.push({
        title: `조후용신 — ${y.johu.element ? el(y.johu.element) : '없음'}`,
        source: 'A책 151쪽',
        lines: [
          `월지 ${monthBranch || '—'} → ${y.johu.note}`,
          '【교재 원문】 조후용신: 건강, 궁합 판단 — 巳午未月 여름생(水), 亥子丑月 겨울생(火)',
          '⚠️ 신강약과 무관하게 «계절만» 봅니다.',
          '⚠️ 교재에 「90%는 이 공식, 10%는 예외」라 적혀 있으나 ★예외 규칙은 교재에 «안 적혀» 있습니다.',
          '⚠️ 극신약 유예·가교오행은 교재에 없어 «뺐습니다».',
        ],
      })
      if (y.johu.element) {
        items.push({
          title: `조후용신 ${el(y.johu.element)} — 결`,
          source: 'B책 94~97쪽',
          lines: [YONGSIN_NOTE[y.johu.element]],
        })
        items.push({
          title: `조후용신 ${el(y.johu.element)} — 교재 직업표`,
          source: 'B책 94~95쪽 (1) 오행 용신',
          lines: [(YONGSIN_OHAENG[y.johu.element] ?? []).join(' · ')],
        })
      }
      G.push({ key: 'johu', label: '② 조후용신 — 건강·궁합', items })
    }

    // ── ② 억부용신 — ★판정 «과정» 을 그대로 ────────────────────────
    if (y) {
      const items: Item[] = []

      // 육친 5분류 합산 — ⚠️ calcEokbu 안에서 하는 것과 «같은» 셈입니다.
      //   ⛔ 새 판정이 아닙니다. 오행 점수를 육친으로 «다시 묶어» 보여 줄 뿐입니다.
      const byY: Record<Yukchin5, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
      for (const e of ALL) byY[yukchinOfEl(dayEl, e)] += score[e] ?? 0
      const ORDER: Yukchin5[] = ['비겁', '인성', '관성', '재성', '식상']
      let gang: Yukchin5 = ORDER[0]
      for (const k of ORDER) if (byY[k] > byY[gang]) gang = k
      const row = P151_TABLE[gang]

      items.push({
        title: '육친 합산 — 오행 점수를 다섯으로 묶음',
        source: 'A책 151쪽 표가 딛는 숫자',
        lines: [
          ORDER.map(k => `${k} ${byY[k]}`).join(' · '),
          `가장 강한 육친 — ★${gang} ${byY[gang]}`,
          '동점이면 비겁 > 인성 > 관성 > 재성 > 식상 차례로 잡습니다.',
        ],
      })

      const geopjae = countGeopjae(saju, dayStem)
      const insungRoot = hasInsungRoot(saju, dayEl)
      const ex1 = gang === '비겁' && geopjae >= 2
      const ex2 = gang === '관성' && !insungRoot

      items.push({
        title: `A책 151쪽 표 — ${gang} 강`,
        source: 'A책 151쪽',
        lines: [
          `표 그대로 — 용신 ${row.yong} · 희신 ${row.hee}`,
          `【표의 말】 ${row.note}`,
          '─ 표 전체 ─',
          ...ORDER.map(k => `${k} 강 → 용신 ${P151_TABLE[k].yong} · 희신 ${P151_TABLE[k].hee}`),
        ],
      })

      items.push({
        title: '예외 규칙 둘 — 걸렸는가',
        source: 'A책 151쪽 표 각주 · 145쪽 통근',
        lines: [
          `① 비겁 강 + 겁재 2개 이상 → 관성 : ${ex1 ? '★걸림' : '안 걸림'}`,
          `   【교재 원문】 식상(70%), 관성(겁재 2개 이상)`,
          `   원국 겁재 ${geopjae}개 — ⚠️ 천간·지지에 «드러난 것만» 셉니다 (지장간 안 봄 · 연재쌤 확정)`,
          `② 관성 강 + 인성 뿌리 없음 → 식상 : ${ex2 ? '★걸림' : '안 걸림'}`,
          `   【교재 원문】 인성(90%), 인성 뿌리 X → 식상`,
          `   인성 뿌리 ${insungRoot ? '있음' : '없음'} — 판정은 A책 145쪽 통근 순위표`,
        ],
      })

      items.push({
        title: '억부용신 — 다섯 신',
        source: 'A책 150·151쪽',
        lines: [
          `용신 ${el(y.eokbu.yongsin)} · 희신 ${el(y.eokbu.heesin)} · 기신 ${el(y.eokbu.gisin)}`
          + ` · 구신 ${el(y.eokbu.gusin)} · 한신 ${el(y.eokbu.hansin)}`,
          `【판정 말】 ${y.eokbu.note}`,
          '기신 = 용신을 극하는 것 · 구신 = 희신을 극하는 것 (A책 150쪽)',
          `용신 ${el(y.eokbu.yongsin)}의 육친 — ${yukchinOfEl(dayEl, y.eokbu.yongsin)}`,
        ],
      })

      items.push({
        title: `억부용신 ${el(y.eokbu.yongsin)} — 결`,
        source: 'B책 94~97쪽',
        lines: [YONGSIN_NOTE[y.eokbu.yongsin]],
      })
      items.push({
        title: `억부용신 ${el(y.eokbu.yongsin)} — 교재 직업표`,
        source: 'B책 94~95쪽 (1) 오행 용신',
        lines: [(YONGSIN_OHAENG[y.eokbu.yongsin] ?? []).join(' · ')],
      })

      G.push({ key: 'eokbu', label: '③ 억부용신 — 재물·현실', items })
    }

    // ── ③ 격국 · 격국용신 — ★「모두 표시」 [대표님 지시] ─────────────
    {
      const items: Item[] = []
      const cg = calcCareerGyeokguk(saju, dayStem)
      const gk = calcGyeokguk(saju, dayStem)

      items.push({
        title: '격 정하는 법',
        source: 'B책 62쪽 · A책 157·178쪽',
        lines: [
          '【교재 원문】 격국이란 그 사람의 그릇으로 월지에서 투간된 오행이나 월지 오행 중에서 가장 힘이 있는 십성을 말한다.',
          '【교재 원문】 A책 157쪽 — 비견과 겁재는 투간해도 格으로 잡지 않는다',
          '【교재 원문】 A책 178쪽 — 비견겁, 겁재격은 없다. 비견격이라 하지 않고 건록격이라 하며, 겁재가 있을 때는 겁재격이 아니라 양인격이라고 하는 것이다',
          '【교재 원문】 A책 158쪽 — 십정격 중에 격이 없는 無格과 破格이 많다',
          '⚠️ 건록격·양인격은 ★투간과 무관하게 «월지 하나» 로 정합니다 (157쪽 ③ · 178쪽 · 181쪽).',
        ],
      })

      if (cg.name) {
        const info = GYEOKGUK_INFO[cg.name]
        const lines: string[] = [
          `${cg.name}${info?.hanja ? ` (${info.hanja})` : ''}`
          + (cg.element ? ` · ${el(cg.element)}` : '')
          + (cg.special ? ' · ★특례로 잡힘' : '')
          + (cg.position ? ` · ${cg.position}` : ''),
        ]
        if (cg.positionNote) lines.push(cg.positionNote)
        if (cg.note) lines.push(cg.note)
        if (info?.gijil) lines.push(`【교재 원문】 ${info.gijil}`)
        if (info?.jobs?.length) lines.push(`【교재 직업】 ${info.jobs.join(' · ')}`)
        if (info?.caution) lines.push(`⚠️【교재 주의】 ${info.caution}`)
        items.push({
          title: `격 — ${cg.name}`,
          source: `B책 ${info?.src ?? '62~65쪽'}`,
          lines,
        })
      } else {
        items.push({
          title: '격 — 안 잡힘',
          source: 'A책 158쪽',
          lines: ['월지가 뚜렷한 격을 이루지 않았습니다.',
            '【교재 원문】 십정격 중에 격이 없는 無格과 破格이 많다'],
        })
      }

      // 격국용신 (상신)
      if (gk.name) {
        const sangsin = GYEOK_SANGSIN[gk.name]
        const lines: string[] = [
          `격국용신 — ${el(gk.element)}${sangsin ? ` (${sangsin})` : ''}`,
          `【판정 말】 ${gk.note}`,
        ]
        if (gk.name === '건록격') lines.push('【교재 원문】 A책 181쪽 — 제1用神은 정관이고 제2用神은 편관')
        if (gk.name === '양인격') lines.push('【교재 원문】 A책 179쪽 — 양인격은 무조건 관성이 用神이다')
        if (gk.name === '식신격') lines.push('식신생재 (A책 159쪽)')
        if (gk.name === '상관격') lines.push('상관패인 (A책 162쪽)')
        if (gk.name === '편관격') lines.push('식신제살 (A책 171쪽)')
        if (gk.name === '정관격') lines.push('관인상생 (A책 169쪽)')
        if (gk.name === '편인격') {
          lines.push('⚠️ ★교재가 «갈립니다» — A책 176쪽 본문은 「재성에 의해 제화되는 것이 중요」라 하는데'
            + ' 151쪽 표는 «관성» 입니다. ★연재쌤 확인 대기 중이라 표(관성)를 그대로 둡니다.')
        }
        lines.push('─ 격별 상신표 전체 ─')
        for (const [k, v] of Object.entries(GYEOK_SANGSIN)) lines.push(`${k} → ${v}`)
        items.push({ title: `격국용신 — ${gk.name}`, source: 'A책 151·159~182쪽', lines })

        if (gk.element) {
          items.push({
            title: `격국용신 ${el(gk.element)} — 결`,
            source: 'B책 94~97쪽',
            lines: [YONGSIN_NOTE[gk.element]],
          })
          items.push({
            title: `격국용신 ${el(gk.element)} — 교재 직업표`,
            source: 'B책 94~95쪽 (1) 오행 용신',
            lines: [(YONGSIN_OHAENG[gk.element] ?? []).join(' · ')],
          })
        }
        if (sangsin && YONGSIN_YUKCHIN[sangsin]) {
          items.push({
            title: `격국용신 육친 ${sangsin} — 교재 직업표`,
            source: 'B책 96~97쪽 (2) 육친 용신',
            lines: [YONGSIN_YUKCHIN[sangsin].join(' · ')],
          })
        }
      }

      // 십정격 표 «전체» — [대표님 「격국용신 관련 내용도 모두 표시」]
      items.push({
        title: '십정격 표 — 전체',
        source: 'B책 62~65쪽',
        lines: Object.entries(GYEOKGUK_INFO).map(([k, v]) =>
          `${k}(${v.hanja}) — ${v.gijil}`
          + (v.jobs.length ? ` / 직업 ${v.jobs.join('·')}` : '')
          + (v.caution ? ` / ⚠️ ${v.caution}` : '')
          + ` [${v.src}]`),
      })

      G.push({ key: 'gyeokguk', label: '④ 격국 · 격국용신 — 직업·명예', items })
    }

    // ── ⑤ ★용신이 가리키는 «육친» 의 교재 원문 ─────────────────────
    //   [대표님 2026-08-06]  「한량, 카사노바 등 이런 험한 말도
    //                          ★전문상담사는 모두 봐야 해」
    //   ⚠️ 용신은 오행이지만 «뜻» 은 육친으로 옵니다. 그 육친의 원문을 폅니다.
    //      원문에 「한량」·「주색잡기」·「이혼」·「바람기」 같은 말이 그대로 있습니다.
    //   ⛔⛔ ★손님 화면으로 옮기지 마십시오.
    if (y) {
      const items: Item[] = []
      const ctx = ctxOf(saju)
      const gk = calcGyeokguk(saju, dayStem)

      /** 어느 육친을 왜 펴는지 — 상담사가 «까닭» 을 알아야 합니다 */
      const want: Array<{ pair: Yukchin5; why: string }> = []
      const add = (pair: Yukchin5 | undefined, why: string) => {
        if (!pair) return
        const hit = want.find(w => w.pair === pair)
        if (hit) { hit.why += ` · ${why}`; return }
        want.push({ pair, why })
      }
      add(yukchinOfEl(dayEl, y.eokbu.yongsin), '억부 용신')
      add(yukchinOfEl(dayEl, y.eokbu.heesin), '억부 희신')
      add(yukchinOfEl(dayEl, y.eokbu.gisin), '억부 기신')
      if (y.johu.element) add(yukchinOfEl(dayEl, y.johu.element), '조후 용신')
      if (gk.element) add(yukchinOfEl(dayEl, gk.element), '격국 용신')

      for (const w of want) {
        for (const key of keysOfPair(w.pair)) {
          const row = yukchinRowOf(key)
          if (!row) continue
          const n = sipsinCount(ctx, key)
          const lines = [
            `${w.pair} — ${w.why} · 원국에 ${n}개`,
            ...yukchinLines(row, 'adult', ctx),
            ...darununLines(row, ctx),
            ...cheobangLines(row, ctx),
            row.jobs?.length ? `【교재 직업】 ${row.jobs.join(' · ')}` : '',
            row.keyword ? `【핵심어】 ${row.keyword}` : '',
            row.social ? `【사회적 의미】 ${row.social}` : '',
            ...orig(row),
          ].filter(Boolean)
          if (lines.length <= 1) continue
          items.push({ title: `${key} — ${w.pair}`, source: row.src || 'B책 3장 六親論 106~115쪽', lines })
        }
      }
      if (items.length) G.push({ key: 'yukchinOrig', label: '⑤ 용신이 가리키는 육친 — 교재 원문', items })
    }

    // ── ⑥ ★육친 짝 — 과다·없음 (교재 원문) ────────────────────────
    //   ⚠️ ★맺음말(PYEONJUNG_CLOSING)이 «맨 마지막» 에 옵니다 (withClosing).
    //      「앞에 두면 앞말이 변명처럼 들리고, 빼면 손님이 무서운 말만 안고 나갑니다」
    //      ⛔ withClosing 을 끄지 마십시오.
    {
      const lines = groupBrief(saju, 'adult', {
        cap: 99, 보완: true, 개운: true, 직업: true, withClosing: true,
      })
      if (lines.length) {
        G.push({
          key: 'group', label: '⑥ 육친 짝 — 과다·없음',
          items: [{ title: '과다·없는 짝', source: 'B책 3장 六親論 116~131쪽', lines }],
        })
      }
    }


    {
      const items: Item[] = []
      const daySipsin = saju
        .filter(s => s.stem && s.stem !== '?' && s.pillar !== '일주')
        .map(s => `${s.pillar} ${s.stem} ${sipsinOf(dayStem, s.stem)}`)
      if (daySipsin.length) {
        items.push({
          title: '원국 천간의 십신',
          source: '일간 기준',
          lines: [daySipsin.join(' · ')],
        })
      }
      items.push({
        title: '육친 용신 직업표 — 십신 열 가지 전부',
        source: 'B책 96~97쪽 (2) 육친 용신',
        lines: Object.entries(YONGSIN_YUKCHIN).map(([k, v]) => `${k} — ${v.join(' · ')}`),
      })
      items.push({
        title: '오행 용신 직업표 — 다섯 오행 전부',
        source: 'B책 94~95쪽 (1) 오행 용신',
        lines: ALL.map(e => `${el(e)} — ${(YONGSIN_OHAENG[e] ?? []).join(' · ')}`),
      })
      G.push({ key: 'tables', label: '⑦ 교재 직업표 — 전체', items })
    }

    // ── ⑤ 세 용신 견주기 · 비중 ───────────────────────────────────
    if (y) {
      const gk = calcGyeokguk(saju, dayStem)
      const items: Item[] = [{
        title: '세 용신 — 값 그대로',
        source: 'A책 151쪽 · B책 94~97쪽',
        lines: [
          `조후 ${y.johu.element ? el(y.johu.element) : '없음(봄·가을생)'} — 건강·궁합`,
          `억부 ${el(y.eokbu.yongsin)} — 재물·현실`,
          `격국 ${gk.element ? el(gk.element) : '없음'} — 직업·명예`,
          '【교재 원문】 격국, 억부, 조후까지 用神이 같으면 좋은데 (…) 用神이 다 같으면 유리하다',
        ],
      }, {
        title: '용신의 «비중»',
        source: YONGSIN_SRC,
        lines: [
          '【교재 원문】 B책 133쪽 — 오행과 육친의 강점 지능이 진로적성인 경우가 70%이고, 용신이 진로적성인 경우는 30%이며, 격(格)과 용신(用神)의 통근 여부에 따라 그릇의 크기와 성공 가능성을 가늠한다.',
          '⚠️ ★용신은 30%입니다. 강점 지능(70%)을 거들되 앞세우지 않는 것이 교재의 뜻입니다.',
        ],
      }]
      G.push({ key: 'compare', label: '⑧ 세 용신 견주기', items })
    }

    return G
  }, [saju, dayStem, p.hourIdx])

  if (!yearN || !monthN || !dayN) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontSize: 12.5, color: '#8a7461', textAlign: 'center', lineHeight: 1.8,
      }}>
        생년월일을 넣으면<br />용신 판정 근거가 그대로 펼쳐집니다.
      </div>
    )
  }

  if (converting) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontSize: 12.5, color: '#8a7461',
      }}>사주를 뽑는 중…</div>
    )
  }

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 10, background: '#FDF6F0' }}>
      {/* 🔴 ★원국을 읽기 «전» 에 보셔야 뜻이 있어 맨 위입니다 */}
      <LunarSourceNote
        source={lunarSource} reason={lunarReason} mismatch={lunarMismatch}
        isLunar={p.calType === '음력'}
      />

      {/* ⛔ 상담사용이라는 것을 «화면에도» 적어 둡니다 */}
      <div style={{
        background: '#fdf0e8', border: LINE_OUTER, borderRadius: 9,
        padding: '9px 11px', marginBottom: 10, fontSize: 11, color: '#8f3d0e', lineHeight: 1.7,
      }}>
        ⚖️ 판정 «근거» 를 그대로 폅니다. 손님께는 말을 골라 전해 주세요.
        {p.name && <span style={{ marginLeft: 6, color: '#96502e' }}>· {p.name}</span>}
        <span style={{ marginLeft: 6, color: '#a08d7d' }}>· 모두 {total}꼭지</span>
      </div>

      {/* ★2026-08-06 (48부 2차) — 「시간 모름」 빨간 알림을 ★걷었습니다.
          [대표님]  「시간을 모르는 손님은 아예 접근이 안 되도록 할 테니
                     이것은 신경쓰지마」
          ⚠️ 다만 ①바닥 묶음 안에는 시주가 들어왔는지 «한 줄» 로 남겼습니다 —
             값을 읽는 자리라 상담사가 알아야 합니다.
          ⛔ 빨간 알림을 다시 붙이지 마십시오. 입구에서 막는 것이 대표님 뜻입니다. */}

      {groups.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12, color: '#8a7461', textAlign: 'center', lineHeight: 1.8 }}>
          사주를 못 뽑았습니다. 생년월일을 확인해 주세요.
        </div>
      ) : (
        groups.map(g => {
          const open = !closed.has(g.key)
          return (
            <div key={g.key} style={{ marginBottom: 12 }}>
              {/* 묶음 머리 — 눌러서 접습니다 (기본은 펼침) */}
              <button type="button" onClick={() => toggle(g.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                  background: 'transparent', border: 'none', padding: '4px 2px 7px',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#96502e' }}>
                  {g.label}
                </span>
                <span style={{ fontSize: 10.5, color: '#a08d7d' }}>{g.items.length}</span>
                <span aria-hidden style={{
                  marginLeft: 'auto', color: '#96502e', fontSize: 18, lineHeight: 1,
                  transition: 'transform .2s', transform: `rotate(${open ? 180 : 0}deg)`,
                }}>▾</span>
              </button>
              {open && g.items.map((it, i) => <Block key={i} {...it} />)}
            </div>
          )
        })
      )}

      {/* ★2026-08-06 (48부 2차) — 무엇이 «펴졌고» 무엇이 «아직 없는지».
          ⛔ 여기에 교재 말을 «직접» 적지 마십시오. 자료 파일에 담아 부르십시오. */}
      <div style={{
        background: '#fff', border: LINE_OUTER, borderRadius: 10,
        padding: '10px 12px', marginTop: 4, fontSize: 11, color: '#8a7461', lineHeight: 1.8,
      }}>
        <div style={{ fontWeight: 700, color: '#96502e', marginBottom: 5 }}>교재 원문 — 어디까지 폈나</div>
        육친(3장 106~131쪽)·직업표(94~97쪽)·격국(62~65쪽)은 ★원문 그대로 폈습니다.
        「한량」·「주색잡기」·「이혼」·「바람기」 같은 말이 다듬지 않고 나옵니다.
        <br /><br />
        아직 «없는» 것 — A책 159~182쪽 격 본문 스캔이 저장소에 안 들어와 있습니다.
        지금은 62~65쪽 격국표와 151쪽 상신표로 폅니다.
        그 쪽을 넣어 주시면 「카사노바」·「일부다처형」 같은 격 본문 표현까지 이 자리에 폅니다.
      </div>
    </div>
  )
}
