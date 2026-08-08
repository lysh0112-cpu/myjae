'use client'
// app/manseryeok/consultant/components/SourceReading.tsx
//
// ══════════════════════════════════════════════════════════════════
//  📖 교재 «원본 해설» — 상담사용
//
//  ★2026-08-05 (47부 38·39차 · 대표님 지시)
//    「인적사항을 넣으면, ai통변말고 ★교재 원본의 해설들이 죽 나오게」
//    「상담사들은 고객들에게 상담을 해야하니 고객에게 보여주는 ai통변이 아닌
//      ★원래의 원본해석들을 그대로 모두 노출을 해줬으면 좋겠는데」
//    「전문가인 상담사들이 알아서 볼 수 있으니 ★다 표시를 우선 해보자」
//
//  ★새로 쓴 «해설» 이 한 줄도 없습니다.
//    저장소에 이미 있는 자료 파일에서 «그대로» 꺼내 폅니다.
//    ⚠️ 출처는 lib/saju/SOURCE_INDEX.ts 에 정리되어 있습니다.
//       (『명리적성 비법노트』(심산) 등 — ★책이 «둘» 이라 쪽 번호가 겹칩니다)
//
//  ⛔⛔ 이 화면은 ★«상담사용» 입니다. 손님에게 그대로 보여 주지 마십시오.
//     교재 원문 그대로라 말이 거칠고, 손님이 겁먹을 표현이 섞여 있습니다.
//     손님 화면은 AI 통변이 «부드럽게 옮겨» 보여 줍니다.
//
//  ⚠️ 여기서 «판정» 을 새로 하지 않습니다. 이미 있는 판정 함수를 부르고
//     그 결과로 자료를 꺼내 늘어놓기만 합니다.
//     ⇒ 통변·진로적성과 «다른 답» 이 나올 걱정이 없습니다.
//
//  ⚠️ 말 상대는 ★«성인» 으로 폅니다 (Target/Audience = adult·성인).
//     상담사가 보는 화면이고, 학생 손님이어도 상담사는 원문을 알아야 합니다.
// ══════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react'
import { useResultSaju } from '@/hooks/useResultSaju'
import { cheonganLines, CHEONGAN_TRAIT } from '@/lib/saju/cheonganTrait'
import { traitsInSaju, traitLines, noteLines, ctxOf } from '@/lib/saju/jijiTrait'
import { findByeongjon, sayOf as byeongjonSay } from '@/lib/saju/byeongjon'
import { judgeCheonganHap, judgeJijiHap } from '@/lib/saju/hapJudge'
import { hapLines, findHap } from '@/lib/saju/hapMeaning'
import { chungLines, findChung } from '@/lib/saju/chungMeaning'
import { findRel, relLines, findSamhyeong } from '@/lib/saju/hyeongPaHae'
import { calcYongsinNew, calcGyeokguk } from '@/lib/saju/yongsinNew'
import { calcCareerGyeokguk } from '@/lib/saju/career/gyeokguk'
import { GYEOKGUK_INFO } from '@/lib/saju/career/tables/gyeokguk'
import { YONGSIN_NOTE, YONGSIN_OHAENG, YONGSIN_YUKCHIN } from '@/lib/saju/career/tables/yongsin'
import { checkSinsal9 } from '@/lib/saju/career/sinsal9'
import { getGwiinForBranch, getGwiinForStem } from '@/lib/saju/gwiin'
import { GWIIN_MEANING } from '@/lib/saju/gwiinMeaning'
import { getGongmang } from '@/lib/saju/gongmang'
import { GONGMANG_INTRO, GONGMANG_BY_PILLAR } from '@/lib/saju/gongmangMeaning'
import { ILJU } from '@/lib/saju/career/tables/ilju'
import { YUKCHIN_KEYS, rowOf as yukchinRowOf, yukchinLines, darununLines, sipsinCount } from '@/lib/saju/yukchinTable'
import { groupBrief } from '@/lib/saju/yukchinGroup'
import { OHAENG_TRAIT, excessLines, developLines, lackLines, gaeunLines } from '@/lib/saju/ohaengTrait'
import { weaknessLines, handlingLines } from '@/lib/saju/ohaengNature'
import { salLines } from '@/lib/saju/sinsalTable'
import { LINE_OUTER, LINE_INNER } from '@/lib/ui/line'

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

/**
 * ★2026-08-05 (47부 41차) — 교재 «원문»(original)을 함께 폅니다. [대표님 지시]
 *   「상담사용은 모든 것을 최대한 ★원본대로 다 내보내」
 *
 *   ⚠️⚠️ 자료 파일에는 「original 은 화면에도 통변 재료에도 넣지 말 것」이라
 *      적혀 있습니다. 그것은 ★«손님 화면» 을 두고 한 말입니다.
 *      ⇒ 여기는 «상담사용» 이라 대표님이 펴라 하셨습니다.
 *      ⛔ ★손님 화면(통변·진로적성·궁합)에는 «절대» 이 값을 넣지 마십시오.
 *
 *   🔴 ★알아 두실 것 — 「담지 않기로 한 일곱」은 original 에도 «없습니다» —
 *      127쪽 단명·자살 · 129쪽 성범죄 피해자 탓 · 128쪽 실명
 *      · 131쪽 낙태·유산·불임 판정 · 병명 · 센 말 · 종교 단정
 *      (44부 교훈 CA · yukchinGroup.ts 머리말)
 *      ⇒ original 을 펴도 그 일곱은 안 나옵니다. 어투가 원문에 가까워질 뿐입니다.
 *      ⛔ 스캔을 보고 「빠졌다」 며 되살리지 마십시오.
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

/**
 * ★신살 자료 «둘» 의 열쇠를 맞춥니다 (47부 41차)
 *   왼쪽  career/tables/sinsal 의 key   ·   오른쪽  lib/saju/sinsalTable 의 key
 *   ⚠️ 이름이 같은 살도 열쇠가 달라 그대로 넘기면 «못 찾습니다».
 *   ⚠️ 짝이 없는 것(귀문관살·탕화살·양인일주)은 여기 없어 그냥 지나갑니다.
 */
const SAL_KEY: Record<string, string> = {
  yeokma: 'yeokma', dohwa: 'dohwa', hwagae: 'hwagae',
  cheonmun: 'cheonmun', hyeonchim: 'hyeonchim',
  cheonra: 'cheonra', jimang: 'jimang',
  baekho: 'baekho', goegang: 'goegang',
  munchang: 'munchang', cheonui: 'cheonui', samgi: 'samgi',
}

type Item = { title: string; source?: string; lines: string[] }
type Group = { key: string; label: string; items: Item[] }

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
        {/* ⚠️ 출전을 «반드시» 함께 보여 드립니다 —
            상담사가 손님께 「어디 나온 말인가」 를 말할 수 있어야 합니다. */}
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

export default function SourceReading(p: Props) {
  const yearN = Number(p.year) || 0
  const monthN = Number(p.month) || 0
  const dayN = Number(p.day) || 0

  // ⚠️ 만세력 계산은 ★손님 화면과 «똑같은» 훅을 씁니다.
  //    따로 계산하면 답이 갈립니다. ⛔ 새로 계산하지 마십시오.
  const { saju, converting, dayStem } = useResultSaju(
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
    if (saju.length === 0) return []
    const G: Group[] = []

    // ── ① 천간 ───────────────────────────────────────────────────
    {
      const items: Item[] = []
      if (dayStem) {
        items.push({
          title: `일간 ${dayStem} — 타고난 성품`,
          source: '명리적성 비법노트 40~41쪽',
          lines: [...cheonganLines(dayStem, p.gender), ...orig(CHEONGAN_TRAIT[dayStem])],
        })
      }
      for (const pil of saju) {
        if (!pil.stem || pil.stem === '?' || pil.pillar === '일주') continue
        const lines = cheonganLines(pil.stem, p.gender)
        if (lines.length === 0) continue
        items.push({
          title: `${pil.pillar} 천간 ${pil.stem}`,
          source: '명리적성 비법노트 40~41쪽',
          lines: [...lines, ...orig(CHEONGAN_TRAIT[pil.stem])],
        })
      }
      if (items.length) G.push({ key: 'cheongan', label: '천간 — 성품', items })
    }

    // ── ② 지지 ───────────────────────────────────────────────────
    {
      const items: Item[] = []
      const ctx = ctxOf(saju)
      for (const hit of traitsInSaju(saju)) {
        const lines = [
          ...traitLines(hit.row, 'adult', ctx),
          ...noteLines(hit.row, 'adult', ctx),
          ...orig(hit.row),
        ]
        if (lines.length === 0) continue
        items.push({
          title: `${hit.pillar} ${hit.branch}`,
          source: '명리적성 비법노트 50~73쪽',
          lines,
        })
      }
      if (items.length) G.push({ key: 'jiji', label: '지지 — 성정', items })
    }

    // ── ③ 병존 ───────────────────────────────────────────────────
    //   ⚠️ 손님 화면에서는 «전문가용에만» 보이는 것입니다 (45부 확정).
    //      여기는 상담사용이라 그대로 폅니다.
    {
      const items: Item[] = []
      for (const h of findByeongjon(saju)) {
        const say = byeongjonSay(h.row, 'adult')
        if (!say) continue
        items.push({
          title: `${h.row.ko} (${h.pillars.join('·')})`,
          source: '명리적성 비법노트 74~75쪽 「07 天干의 병존」',
          lines: [say, ...orig(h.row)],
        })
      }
      if (items.length) G.push({ key: 'byeongjon', label: '병존', items })
    }

    // ── ④ 합 ─────────────────────────────────────────────────────
    {
      const items: Item[] = []
      for (const h of judgeCheonganHap(saju)) {
        // ⚠️ 판정 결과(이루어졌나·화했나)를 «맨 앞» 에 한 줄로 적어 둡니다.
        //    교재 78쪽의 조건을 상담사가 바로 알아보게 하려는 것입니다.
        const head =
          `${h.where} · ${h.seongrip ? '합 이룸' : '합 못 이룸'}` +
          (h.block ? ` (${h.block.kind}: ${h.block.by})` : '') +
          (h.dispute ? ` · ${h.dispute}` : '') +
          (h.hwa ? ` · ${h.hwaEl}로 화함` : ' · 화하지 않음')
        items.push({
          title: `천간 ${h.key}`,
          source: '명리적성 비법노트 78~83쪽',
          lines: [head, ...hapLines(h.key, '성인'), ...orig(findHap(h.key))],
        })
      }
      for (const h of judgeJijiHap(saju)) {
        const head =
          `${h.kind} · ${h.where}` +
          (h.monthTied ? ' · 월지 걸림' : '') +
          (h.hwaEl ? ` · ${h.hwaEl}` : '') +
          (h.broken ? ` · ${h.broken}` : '')
        items.push({
          title: `지지 ${h.key}`,
          source: '명리적성 비법노트 78~83쪽',
          lines: [head, ...hapLines(h.key, '성인'), ...orig(findHap(h.key))],
        })
      }
      if (items.length) G.push({ key: 'hap', label: '합', items })
    }

    // ── ⑤ 충 ─────────────────────────────────────────────────────
    //   ⚠️ 충을 «찾아 주는» 함수가 없어 여기서 두 글자씩 짝지어 봅니다.
    //      ⇒ chungLines 가 열쇠를 못 찾으면 빈 배열을 내므로 안전합니다.
    {
      const items: Item[] = []
      const seen = new Set<string>()
      const put = (a: { pillar: string; ch: string }, b: { pillar: string; ch: string }) => {
        for (const key of [`${a.ch}${b.ch}沖`, `${b.ch}${a.ch}沖`]) {
          if (seen.has(key)) continue
          const lines = chungLines(key, '성인')
          if (lines.length === 0) continue
          seen.add(key)
          items.push({
            title: `${key} (${a.pillar}-${b.pillar})`,
            source: '명리적성 비법노트 84~86쪽',
            lines: [...lines, ...orig(findChung(key))],
          })
        }
      }
      const stems = saju.filter(x => x.stem && x.stem !== '?').map(x => ({ pillar: x.pillar, ch: x.stem }))
      const brs = saju.filter(x => x.branch && x.branch !== '?').map(x => ({ pillar: x.pillar, ch: x.branch }))
      for (const arr of [stems, brs]) {
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) put(arr[i], arr[j])
        }
      }
      if (items.length) G.push({ key: 'chung', label: '충', items })
    }

    // ── ⑥ 형·파·해·원진 ──────────────────────────────────────────
    {
      const items: Item[] = []
      const seen = new Set<string>()
      const brs = saju.filter(x => x.branch && x.branch !== '?')
      for (let i = 0; i < brs.length; i++) {
        for (let j = i + 1; j < brs.length; j++) {
          for (const r of findRel(brs[i].branch, brs[j].branch)) {
            if (seen.has(r.key)) continue
            seen.add(r.key)
            items.push({
              title: `${r.alias ?? r.key} (${brs[i].pillar}-${brs[j].pillar})`,
              source: '명리적성 비법노트',
              lines: [...relLines(r, '성인'), ...orig(r)],
            })
          }
        }
      }
      // ★삼형은 «세 글자» 라 따로 봅니다
      for (const r of findSamhyeong(brs.map(x => x.branch))) {
        if (seen.has(r.key)) continue
        seen.add(r.key)
        items.push({
          title: `${r.alias ?? r.key} (삼형)`,
          source: '명리적성 비법노트',
          lines: [...relLines(r, '성인'), ...orig(r)],
        })
      }
      if (items.length) G.push({ key: 'rel', label: '형·파·해·원진', items })
    }

    // ── ⑦ 격국 ───────────────────────────────────────────────────
    //   ⚠️ 판정은 ★이미 있는 calcCareerGyeokguk 을 그대로 씁니다.
    //      (진로적성 화면이 쓰는 바로 그 함수 — 답이 갈릴 일이 없습니다)
    if (dayStem) {
      const items: Item[] = []
      const g = calcCareerGyeokguk(saju, dayStem)
      if (g.name) {
        const info = GYEOKGUK_INFO[g.name]
        const lines: string[] = []
        lines.push(
          `${g.name}${info?.hanja ? ` (${info.hanja})` : ''}` +
          (g.element ? ` · ${g.element}` : '') +
          (g.special ? ' · 특례로 잡힘' : '') +
          (g.position ? ` · ${g.position}` : ''),
        )
        if (g.positionNote) lines.push(g.positionNote)
        if (g.note) lines.push(g.note)
        if (info?.gijil) lines.push(info.gijil)
        if (info?.jobs?.length) lines.push(`어울리는 일 — ${info.jobs.join(' · ')}`)
        if (info?.caution) lines.push(`⚠️ ${info.caution}`)
        items.push({
          title: `격국 — ${g.name}`,
          source: `명리적성 비법노트 ${info?.src ?? '62~65쪽'}`,
          lines,
        })
      }
      if (items.length) G.push({ key: 'gyeokguk', label: '격국', items })
    }

    // ── ⑧ 용신 — 조후·억부·격국 셋 ────────────────────────────────
    if (dayStem) {
      const items: Item[] = []
      const y = calcYongsinNew(saju, dayStem)
      if (y) {
        // 조후
        if (y.johu.element) {
          items.push({
            title: `조후용신 — ${y.johu.element}`,
            source: '명리적성 비법노트 94~97쪽',
            lines: [
              y.johu.note,
              YONGSIN_NOTE[y.johu.element],
              `어울리는 일 — ${(YONGSIN_OHAENG[y.johu.element] ?? []).join(' · ')}`,
            ].filter(Boolean),
          })
        }
        // 억부 5신
        items.push({
          title: '억부용신 — 다섯 신',
          source: '명리적성 비법노트 94~97쪽',
          lines: [
            `용신 ${y.eokbu.yongsin} · 희신 ${y.eokbu.heesin} · 기신 ${y.eokbu.gisin}` +
            ` · 구신 ${y.eokbu.gusin} · 한신 ${y.eokbu.hansin}`,
            y.eokbu.note,
            YONGSIN_NOTE[y.eokbu.yongsin],
            `어울리는 일 — ${(YONGSIN_OHAENG[y.eokbu.yongsin] ?? []).join(' · ')}`,
          ].filter(Boolean),
        })
        // 격국용신
        const gk = calcGyeokguk(saju, dayStem)
        if (gk.name) {
          const yuk = YONGSIN_YUKCHIN[gk.name.replace('격', '')]
          items.push({
            title: `격국용신 — ${gk.name}`,
            source: '명리적성 비법노트 94~97쪽',
            lines: [
              gk.note,
              gk.element ? YONGSIN_NOTE[gk.element] : '',
              yuk?.length ? `어울리는 일 — ${yuk.join(' · ')}` : '',
            ].filter(Boolean),
          })
        }
        // 세력
        items.push({
          title: `오행 세력 · ${y.status}`,
          source: '명리적성 비법노트',
          lines: [
            Object.entries(y.score).map(([k, v]) => `${k} ${v}`).join(' · '),
            `비겁+인성 ${y.inbiScore} · 일간 오행 ${y.dayElement}`,
          ],
        })
      }
      if (items.length) G.push({ key: 'yongsin', label: '용신', items })
    }

    // ── ⑨ 신살 ───────────────────────────────────────────────────
    //   ⚠️ ★작용력이 없는(active=false) 것도 «함께» 폅니다.
    //      대표님 — 「전문가인 상담사들이 알아서 볼 수 있으니 다 표시」
    {
      const items: Item[] = []
      for (const h of checkSinsal9(saju)) {
        if (h.count === 0) continue
        const r = h.row
        const lines: string[] = []
        lines.push(
          `${h.marks.map(m => `${m.ch}(${m.pillar}${m.semi ? '·준' : ''})`).join(' ')}` +
          ` · ${h.count}개 · ${h.active ? '작용력 있음' : '작용력 약함'}` +
          (h.powerNote ? ` · ${h.powerNote}` : ''),
        )
        if (r.gijil) lines.push(r.gijil)
        if (r.jobs?.length) lines.push(`어울리는 일 — ${r.jobs.join(' · ')}`)
        if (r.caution) lines.push(`⚠️ ${r.caution}`)
        // ★교재 «원문» 이 따로 남아 있으면 그것도 폅니다 (상담사용이라)
        if (r.srcCaution) lines.push(`【교재 원문】 ${r.srcCaution}`)
        // ★2026-08-05 (47부 41차) — 신살은 자료가 «둘» 입니다.
        //   career/tables/sinsal(진로 쪽) · lib/saju/sinsalTable(다른 갈래)
        //   ⚠️ 열두 살이 겹칩니다. ⇒ 따로 묶음을 만들면 «두 번» 나옵니다.
        //      그래서 ★같은 꼭지에 sinsalTable 의 말을 «덧붙입니다».
        //   ⚠️ 열쇠(key)가 서로 다릅니다 — 아래에서 맞춰 봅니다.
        for (const l of salLines(SAL_KEY[r.key] ?? r.key, '성인')) lines.push(`[다른 자료] ${l}`)
        // ⚠️ sinsalTable 은 ★«다른 갈래» 의 같은 신살 설명입니다 (교재 90~93쪽).
        //    이름이 열둘 겹치므로 ★따로 묶음을 만들지 «않고» 여기에 «덧붙입니다».
        //    ⛔ 따로 펴지 마십시오. 같은 신살이 두 번 나옵니다.
        for (const l of salLines(r.key, '성인')) lines.push(`【다른 갈래】 ${l}`)
        items.push({
          title: `${r.name}${r.hanja ? ` (${r.hanja})` : ''}`,
          source: '명리적성 비법노트 90~93쪽',
          lines,
        })
      }
      if (items.length) G.push({ key: 'sinsal', label: '신살', items })
    }

    // ── ⑩ 귀인 ───────────────────────────────────────────────────
    if (dayStem) {
      const items: Item[] = []
      const monthBranch = saju.find(x => x.pillar === '월주')?.branch ?? ''
      const seen = new Set<string>()
      for (const pil of saju) {
        const names = [
          ...(pil.branch && pil.branch !== '?' ? getGwiinForBranch(dayStem, monthBranch, pil.branch) : []),
          ...(pil.stem && pil.stem !== '?' ? getGwiinForStem(monthBranch, pil.stem) : []),
        ]
        for (const n of names) {
          const k = `${n}|${pil.pillar}`
          if (seen.has(k)) continue
          seen.add(k)
          const m = GWIIN_MEANING[n]
          items.push({
            title: `${n} (${pil.pillar})`,
            source: '명리적성 비법노트',
            lines: m ? [m.bless, m.life, m.tip].filter(Boolean) : [],
          })
        }
      }
      if (items.length) G.push({ key: 'gwiin', label: '귀인', items })
    }

    // ── ⑪ 공망 ───────────────────────────────────────────────────
    if (dayStem) {
      const items: Item[] = []
      const iljji = saju.find(x => x.pillar === '일주')?.branch ?? ''
      if (iljji && iljji !== '?') {
        const gm = getGongmang(dayStem, iljji)
        const hit = saju.filter(x => gm.includes(x.branch))
        items.push({
          title: `공망 — ${gm.join('·')}`,
          source: '명리적성 비법노트',
          lines: [
            GONGMANG_INTRO,
            hit.length
              ? `원국에 걸린 자리 — ${hit.map(x => `${x.pillar}(${x.branch})`).join(' · ')}`
              : '원국에 걸린 자리가 없습니다.',
          ],
        })
        for (const x of hit) {
          const info = GONGMANG_BY_PILLAR[x.pillar]
          if (!info) continue
          items.push({
            title: `${x.pillar} 공망 — ${info.title}`,
            source: '명리적성 비법노트',
            lines: [info.desc],
          })
        }
      }
      if (items.length) G.push({ key: 'gongmang', label: '공망', items })
    }

    // ── ⑫ 60갑자 일주 ────────────────────────────────────────────
    //   교재 100~127쪽 「9. 60갑자 일주별 기질과 진로적성」
    //   ⚠️ gijilFull 이 ★«교재 원문» 입니다 (gijil 은 손님용으로 말을 고른 것).
    //      상담사 화면이라 ★원문을 폅니다.
    {
      const il = saju.find(x => x.pillar === '일주')
      if (il && il.stem !== '?' && il.branch !== '?') {
        const row = ILJU[il.stem + il.branch]
        if (row) {
          G.push({
            key: 'ilju', label: '60갑자 일주', items: [{
              title: `${il.stem}${il.branch} (${row.ko})`,
              source: '명리적성 비법노트 100~127쪽',
              lines: [
                row.gijilFull ?? row.gijil,
                row.jobs?.length ? `어울리는 일 — ${row.jobs.join(' · ')}` : '',
              ].filter(Boolean),
            }],
          })
        }
      }
    }

    // ── ⑬ 육친(십성) ─────────────────────────────────────────────
    //   ⚠️ ★사주 상담의 «뼈대» 입니다. 열 십성을 «전부» 폅니다.
    //      개수가 0 인 것도 폅니다 — 「없다」 는 것도 상담사에게는 뜻입니다.
    {
      const items: Item[] = []
      const ctx = ctxOf(saju)
      for (const key of YUKCHIN_KEYS) {
        const row = yukchinRowOf(key)
        if (!row) continue
        const n = sipsinCount(ctx, key)
        const lines = [
          `${n}개`,
          ...yukchinLines(row, 'adult', ctx),
          ...darununLines(row, ctx),
          ...orig(row),
        ].filter(Boolean)
        if (lines.length <= 1) continue
        items.push({
          title: `${key} — ${n}개`,
          source: '명리적성 비법노트 3장 六親論',
          lines,
        })
      }
      if (items.length) G.push({ key: 'yukchin', label: '육친(십성)', items })
    }

    // ── ⑭ 육친 짝(과다·없음) ─────────────────────────────────────
    //   ⚠️⚠️ ★groupBrief 를 씁니다 — «이미 다듬어 내보내는» 함수입니다.
    //      ⛔ row.original 을 쓰지 «마십시오». 그 자료에 이렇게 적혀 있습니다 —
    //        「★교재 원문 — 화면에도 통변 재료에도 넣지 말 것」
    //      [까닭]  앞 세션이 ★일곱 가지를 «일부러» 뺐습니다 (44부 교훈 CA) —
    //        127쪽 단명·자살 · 129쪽 성범죄 피해자 탓 · 128쪽 실명
    //        · 131쪽 낙태·유산·불임 판정 · 병명 · 센 말 · 종교 단정
    //        ⇒ 「뜻은 안 뺐고 어투만 옮겼다」 고 적혀 있습니다.
    //      ⛔ 스캔을 보고 「빠졌다」 며 되살리지 마십시오.
    //   ⚠️ ★맺음말(PYEONJUNG_CLOSING)이 «반드시 맨 마지막» 에 와야 합니다.
    //      withClosing: true 로 함께 받습니다. 앞에 두면 앞말이 변명처럼 들립니다.
    {
      const lines = groupBrief(saju, 'adult', {
        cap: 99, 보완: true, 개운: true, 직업: true, withClosing: true,
      })
      if (lines.length) {
        G.push({
          key: 'yukchinGroup', label: '육친 짝 — 과다·없음',
          items: [{
            title: '다섯 짝의 치우침',
            source: '명리적성 비법노트 116~131쪽',
            lines,
          }],
        })
      }
    }

    // ── ⑮ 오행 기질 — 다섯을 «전부» ──────────────────────────────
    //   ⚠️ 발달·과다·결핍·개운을 한자리에 폅니다.
    //      ★어느 오행이 많고 적은지는 위 «용신 · 오행 세력» 에 숫자로 있습니다.
    {
      const items: Item[] = []
      for (const el of ['목', '화', '토', '금', '수'] as const) {
        const row = OHAENG_TRAIT[el]
        if (!row) continue
        const lines = [
          ...developLines(el).map(x => `[발달] ${x}`),
          ...excessLines(el, '성인').map(x => `[과다] ${x}`),
          ...lackLines(el, '성인').map(x => `[결핍] ${x}`),
          ...gaeunLines(el).map(x => `[개운] ${x}`),
          ...weaknessLines(el, '성인').map(x => `[약한 자리] ${x}`),
          ...handlingLines(el).map(x => `[다루는 법] ${x}`),
          ...orig(row),
        ]
        if (lines.length === 0) continue
        items.push({
          title: `${el}(${row.hanja ?? ''})`,
          source: '명리적성 비법노트',
          lines,
        })
      }
      if (items.length) G.push({ key: 'ohaeng', label: '오행 — 발달·과다·결핍·개운', items })
    }

    return G
  }, [saju, dayStem, p.gender])

  if (!yearN || !monthN || !dayN) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontSize: 12.5, color: '#8a7461', textAlign: 'center', lineHeight: 1.8,
      }}>
        생년월일을 넣으면<br />교재 원본 해설이 그대로 펼쳐집니다.
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
      {/* ⛔ 상담사용이라는 것을 «화면에도» 적어 둡니다 */}
      <div style={{
        background: '#fdf0e8', border: LINE_OUTER, borderRadius: 9,
        padding: '9px 11px', marginBottom: 10, fontSize: 11, color: '#8f3d0e', lineHeight: 1.7,
      }}>
        📖 교재 «원본» 그대로입니다. 손님께는 말을 골라 전해 주세요.
        {p.name && <span style={{ marginLeft: 6, color: '#96502e' }}>· {p.name}</span>}
        <span style={{ marginLeft: 6, color: '#a08d7d' }}>· 모두 {total}꼭지</span>
      </div>

      {groups.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12, color: '#8a7461', textAlign: 'center', lineHeight: 1.8 }}>
          이 사주에 걸리는 자료를 못 찾았습니다.
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

      {/* ⚠️ 아직 «안 편» 것 — 지장간 · 60갑자 일주(ILJU) · 12운성 · 납음
          자료는 저장소에 있습니다 (jijanggan · career/tables/ilju · sajuDetail).
          ⇒ 필요하시면 더 얹을 수 있습니다. ⛔ 다만 «판정» 을 새로 만들지 마십시오 —
             이미 있는 함수를 부르는 방식을 그대로 지키십시오. */}
      <div style={{
        fontSize: 10.5, color: '#a08d7d', textAlign: 'center',
        padding: '10px 6px', lineHeight: 1.7,
      }}>
        지장간·12운성·납음은 아직 안 폈습니다. 필요하시면 말씀해 주세요.<br />
        {/* ★2026-08-08 — 「60갑자 일주」를 이 줄에서 뺐습니다.
            이미 위에 «펴져 있는데» 안 폈다고 적혀 있어 상담사가 없는 줄 알 수 있었습니다. */}
        12운성은 🌿 물상 탭의 <b>十四 十二運星</b>에 교재 원문이 있습니다.
      </div>
    </div>
  )
}
