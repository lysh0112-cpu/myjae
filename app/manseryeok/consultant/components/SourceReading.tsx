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
import { cheonganLines } from '@/lib/saju/cheonganTrait'
import { traitsInSaju, traitLines, noteLines, ctxOf } from '@/lib/saju/jijiTrait'
import { findByeongjon, sayOf as byeongjonSay } from '@/lib/saju/byeongjon'
import { judgeCheonganHap, judgeJijiHap } from '@/lib/saju/hapJudge'
import { hapLines } from '@/lib/saju/hapMeaning'
import { chungLines } from '@/lib/saju/chungMeaning'
import { findRel, relLines, findSamhyeong } from '@/lib/saju/hyeongPaHae'
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
          lines: cheonganLines(dayStem, p.gender),
        })
      }
      for (const pil of saju) {
        if (!pil.stem || pil.stem === '?' || pil.pillar === '일주') continue
        const lines = cheonganLines(pil.stem, p.gender)
        if (lines.length === 0) continue
        items.push({
          title: `${pil.pillar} 천간 ${pil.stem}`,
          source: '명리적성 비법노트 40~41쪽',
          lines,
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
          lines: [say],
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
          lines: [head, ...hapLines(h.key, '성인')],
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
          lines: [head, ...hapLines(h.key, '성인')],
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
            lines,
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
              lines: relLines(r, '성인'),
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
          lines: relLines(r, '성인'),
        })
      }
      if (items.length) G.push({ key: 'rel', label: '형·파·해·원진', items })
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

      {/* ⚠️ 아직 «안 편» 것 — 격국 · 용신 · 신살 · 귀인 · 공망 · 지장간 · 60갑자 일주
          자료는 저장소에 있습니다 (career/tables/ 아래 · gwiinMeaning · gongmangMeaning …).
          ⇒ 그것들은 «판정» 이 먼저라 진로적성·용신 계산기를 함께 불러야 합니다.
             한 걸음 더 큰 일이라 대표님께 여쭙고 하십시오. */}
      <div style={{
        fontSize: 10.5, color: '#a08d7d', textAlign: 'center',
        padding: '10px 6px', lineHeight: 1.7,
      }}>
        격국·용신·신살·귀인·공망은 아직 안 폈습니다.<br />
        필요하시면 말씀해 주세요.
      </div>
    </div>
  )
}
