/**
 *  일진내정법 — ★용어 사전 (모달용)  · 2026-09-15 (9부)
 *  [대표님] 「중간중간 나오는 용어들도 모달로 해설을 담아 주면 좋겠다」
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  🔴🔴 ★출전이 «셋» 입니다 — 섞이면 안 됩니다.                     │
 *  │                                                                  │
 *  │   ① 12신궁   일진내정법 교재 3~7쪽        ← 이 화면의 본령        │
 *  │   ② 십성     『명리적성 비법노트』 3장     ← ★다른 책             │
 *  │   ③ 신살     사주 교재 94~97쪽            ← ★또 다른 책          │
 *  │                                                                  │
 *  │  ⇒ ⛔ 모달이 ★«어느 책에서 온 말인지» 를 «반드시» 밝힙니다.       │
 *  │    안 밝히면 연재쌤이 ★「일진내정법 교재에 있는 말」 로 오해하십니다.│
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ⛔ ★글을 «지어내지» 않았습니다 — 셋 다 «이미 있는 표» 를 가리킬 뿐입니다.
 *     ⇒ 이 파일에는 ★«어느 표를 볼지» 만 적혀 있습니다.
 *
 *  ⚠️ ★십성 열 가지는 대표님이 「이미 정리된 자료가 있을 것」 이라 하셔서 찾았습니다.
 *     제가 「뜻이 없다」 고 했던 것이 ★틀렸습니다 (lib/saju/yukchinTable.ts).
 */

import { SINGUNG, type SinGung } from '../sinGung'
import { YUKCHIN_KEYS, type YukchinKey } from '@/lib/saju/yukchinTable'

/** 어느 갈래의 말인가 — ⛔ 출전이 달라 «섞지» 않습니다 */
export type TermKind = 'singung' | 'sipsung' | 'sinsal'

export interface TermHit {
  /** 화면 글에 나타나는 «그 말» */
  word: string
  /** 표에서 찾을 열쇠 (딴이름이면 본이름으로) */
  key: string
  kind: TermKind
}

/*  ★딴이름 — 교재가 섞어 씁니다. 눌렀을 때 «본이름» 표를 열어야 합니다. */
const SINGUNG_ALIAS: Record<string, SinGung> = {
  강일진: '강일진',
  천록: '천록', 양인: '천록',
  상문: '상문', 사살신: '상문',
  목적: '목적', 합식: '목적',
  비부: '비부',
  공망: '공망',
  약일충: '약일충',
  원진: '원진', 비인살: '원진',
  해결신: '해결', 해결: '해결',
  퇴식: '퇴식', 쇠퇴: '퇴식',
  금조건: '금조건', 조객: '금조건',
  백병주: '백병주', 병부: '백병주',
}

/*  ★신살 — ⛔ «표에 실제로 있는 것만» 넣었습니다. 표가 ★둘입니다.
 *
 *  ① sinsalTable.ts     사주 교재 94~97쪽   — 백호살 · 양인격 · 도화살 · 천문성 …
 *  ② somu/topics/sinsal12.ts  교재 441~454쪽 — ★12신살 열둘 «전부»
 *
 *  🔴 [9부에 겪은 것]  제가 ①만 보고 ★「여섯뿐」 이라 했다가
 *     ★대표님이 「사주원국에 다 나와 있다」 고 짚어 주셨습니다.
 *     ⇒ ②를 찾아보니 ★열둘이 «다» 있었습니다.
 *     ⛔ 「없다」 고 말하기 «전» 에 저장소를 먼저 뒤지십시오.
 *
 *  ⚠️ ★12신살 글에는 «센 말» 이 섞여 있습니다 (「요절」 「죽게 된다」 등).
 *     ⇒ ★연재쌤 전용이라 «그대로» 둡니다 [대표님 2026-09-15].
 *     ⛔⛔ 손님용으로는 «절대» 쓰지 마십시오 — 반드시 순화해야 합니다. */
const SINSAL_WORDS: Record<string, string> = {
  //  ① sinsalTable.ts
  백호살: 'baekho',
  도화살: 'dohwa',
  천문성: 'cheonmun',
  //  ② sinsal12.ts — ★12신살 열둘
  장성살: 's12:jangseong',
  반안살: 's12:banan',
  역마살: 's12:yeokma',
  육해살: 's12:yukhae',
  화개살: 's12:hwagae',
  겁살: 's12:geop',
  재살: 's12:jae',
  천살: 's12:cheon',
  지살: 's12:ji',
  년살: 's12:nyeon',
  월살: 's12:wol',
  망신살: 's12:mangsin',
}

/**
 *  🔴 글에서 ★용어를 찾습니다.
 *
 *  ⛔ [지킨 것]
 *   · ★긴 말을 «먼저» 찾습니다 — 「해결신」 이 「해결」 로 잘리지 않게.
 *   · ★같은 말은 «첫 번째만» 눌리게 합니다 — 온통 밑줄이면 읽기가 나쁩니다.
 *   · ★겹치는 자리는 «건너뜁니다» — 「천록(양인)」 에서 둘 다 잡히지 않게.
 */
export function findTerms(text: string): { start: number; end: number; hit: TermHit }[] {
  const all: { word: string; key: string; kind: TermKind }[] = [
    ...Object.entries(SINGUNG_ALIAS).map(([w, k]) => ({ word: w, key: k, kind: 'singung' as const })),
    ...YUKCHIN_KEYS.map(k => ({ word: k as string, key: k as string, kind: 'sipsung' as const })),
    ...Object.entries(SINSAL_WORDS).map(([w, k]) => ({ word: w, key: k, kind: 'sinsal' as const })),
  ]
  /*  ⛔ ★긴 것부터 — 「해결신」 이 「해결」 보다 먼저 잡혀야 합니다.
   *  ⚠️ 지금은 표에 「해결신」 이 «먼저» 적혀 있어 정렬을 빼도 «우연히» 맞습니다.
   *     ⇒ ⛔ 그래도 «빼지» 마십시오 — 표 차례를 바꾸는 순간 «조용히» 틀립니다.
   *       (9부에 되살려 보고 «우연» 임을 확인했습니다) */
  all.sort((a, b) => b.word.length - a.word.length)

  const out: { start: number; end: number; hit: TermHit }[] = []
  const taken = new Array<boolean>(text.length).fill(false)
  const seen = new Set<string>()

  for (const t of all) {
    let from = 0
    for (;;) {
      const i = text.indexOf(t.word, from)
      if (i < 0) break
      const j = i + t.word.length
      //  ⛔ 이미 다른 말이 차지한 자리면 건너뜁니다
      let clash = false
      for (let p = i; p < j; p++) if (taken[p]) { clash = true; break }
      //  ★같은 말은 첫 번째만
      if (!clash && !seen.has(t.key + t.kind)) {
        for (let p = i; p < j; p++) taken[p] = true
        seen.add(t.key + t.kind)
        out.push({ start: i, end: j, hit: { word: t.word, key: t.key, kind: t.kind } })
      }
      from = j
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

/** 12신궁 이름인가 */
export function isSinGungName(k: string): k is SinGung {
  return (SINGUNG as readonly string[]).includes(k)
}
/** 십성 이름인가 */
export function isSipsungName(k: string): k is YukchinKey {
  return (YUKCHIN_KEYS as readonly string[]).includes(k)
}

/** ⛔ 모달 맨 아래에 «반드시» 붙는 출전 한 줄 */
export const TERM_SRC: Record<TermKind, string> = {
  singung: '일진내정법 교재 3~7쪽',
  sipsung: '『명리적성 비법노트』 3장 六親論 — ⚠️ 일진내정법 교재가 아닙니다',
  //  ⚠️ 신살은 «표가 둘» 이라 모달이 «어느 쪽인지» 를 가려서 보여 줍니다
  sinsal: '⚠️ 일진내정법 교재가 아닙니다',
}
