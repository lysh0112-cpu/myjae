// lib/saju/ohaeng.ts
// 오행(五行) 표기 정규화 — ★단일 창구
//
// ══════════════════════════════════════════════════════════════════
//  [왜 이 파일이 생겼나]  2026-07-30 · 1단계
//
//    오행 표기를 «목/화/토/금/수» 로 맞추는 논리가 네 벌 흩어져 있었습니다.
//        app/manseryeok/naming/rename/hanja/page.tsx:41      function ohaengChar
//        app/manseryeok/naming/rename/result/page.tsx:37      (한 글자도 같은 사본)
//        app/manseryeok/naming/rename/newhanja/page.tsx:45    (같음)
//        app/manseryeok/naming/rename/newresult/page.tsx:43   (같음)
//
//    그런데 정작 «내이름 감정»(naming/diagnosis/page.tsx:361) 에는 **없었습니다.**
//    DB 에서 읽은 값을 날것으로 엔진에 넣고 있었습니다.
//
//    ★그리고 원자료(덕암 인명용한자 5,111행)의 자원오행 컬럼은
//      **100% 한자 표기(木火土金水)** 였습니다. 한글이 한 글자도 없습니다.
//      → GENERATES['木'] 은 undefined 이므로 상생 판정이 언제나 0건이 되고,
//        용신(한글 '목')과 대조도 언제나 false 가 됩니다.
//      → 즉 «내이름 감정» 의 자원오행·사주보완이 **모든 손님에게 «아쉬움»** 이었습니다.
//        등급은 화면에 안 나오는 것이 방침이라 눈에 띌 자리가 없었습니다.
//
//  [그래서 규칙 하나]
//    ★오행 문자열을 «비교하거나 표에 넣기 전» 에는 반드시 이 파일을 거치십시오.
//      새로 ohaengChar 같은 함수를 만들지 마십시오. 둘로 두면 반드시 갈립니다. (교훈 CJ)
// ══════════════════════════════════════════════════════════════════

/** 이 저장소가 쓰는 오행 표준 표기 — 한글 한 글자 다섯 개뿐입니다 */
export type Ohaeng = '목' | '화' | '토' | '금' | '수'

/** 상생·상극 표와 순서를 맞춰 둡니다 */
export const OHAENG_ALL: readonly Ohaeng[] = ['목', '화', '토', '금', '수']

export function isOhaeng(v: unknown): v is Ohaeng {
  return typeof v === 'string' && (OHAENG_ALL as readonly string[]).includes(v)
}

// ══════════════════════════════════════════════════════════════════
//  보이지 않는 문자 걷어내기
// ══════════════════════════════════════════════════════════════════
//
// ⚠️ String.prototype.trim() 만으로는 부족합니다.
//    trim 은 NBSP(U+00A0)·전각공백(U+3000)·BOM(U+FEFF)까지는 걷어내지만
//    폭 없는 문자 ZWSP(U+200B)·ZWNJ(U+200C)·ZWJ(U+200D) 는 **남깁니다.**
//    (그 셋은 Unicode 범주가 Cf 라 공백이 아닙니다)
//
// ⚠️ 그리고 NFC 정규화가 필요합니다.
//    macOS 에서 만든 파일의 한글은 NFD(ㅁ+ㅗ+ㄱ)로 풀려 있을 수 있고,
//    그러면 '목' === '목' 이 false 가 됩니다. 눈으로는 구별이 안 됩니다.
const ZERO_WIDTH = /[\u200b-\u200d\u2060\ufeff]/g
/** 유니코드 공백 전부 — trim 이 놓치는 자리를 함께 잡습니다 */
const ANY_SPACE = /[\s\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g

/**
 * 보이지 않는 문자를 걷어내고 NFC 로 맞춥니다. 공백은 **전부** 제거합니다.
 * ★오행·한자처럼 «공백이 있을 수 없는» 값에만 쓰십시오.
 *   뜻풀이처럼 공백이 뜻을 갖는 값에는 쓰지 마십시오.
 */
export function stripInvisible(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return ''
  return String(raw)
    .normalize('NFC')
    .replace(ZERO_WIDTH, '')
    .replace(ANY_SPACE, '')
}

/**
 * 한자 한 글자를 정제합니다 — 앞뒤·중간 공백과 폭 없는 문자를 걷어냅니다.
 *
 * ★원자료에 실제로 있던 사고 — 행 5002 의 `' 熺'` (앞에 일반 공백 U+0020).
 *   이 값으로 DB 를 조회하면 아무것도 안 나오고, 화면에는 정상으로 보입니다.
 */
export function cleanHanja(raw: string | null | undefined): string {
  return stripInvisible(raw)
}

// ══════════════════════════════════════════════════════════════════
//  오행 정규화
// ══════════════════════════════════════════════════════════════════

/**
 * 오행을 나타내는 «한 글자» 들. 이 표에 없는 표기는 정규화하지 않습니다.
 * ⚠️ 로마자(mok·hwa…)는 넣지 않았습니다. 부분일치로 오탐이 납니다
 *    (예: 'to' 가 'stone' 안에 들어 있음). 필요해지면 «완전일치» 로만 더하십시오.
 */
const OHAENG_CHAR: Record<string, Ohaeng> = {
  목: '목', 木: '목',
  화: '화', 火: '화',
  토: '토', 土: '토',
  금: '금', 金: '금',
  수: '수', 水: '수',
}

export interface OhaengParse {
  /** 정규화 결과. 못 읽으면 null */
  ohaeng: Ohaeng | null
  /** 값 안에서 발견된 오행 «전부» (표기 순서가 아니라 목화토금수 순서) */
  all: Ohaeng[]
  /** 정규화한 뒤의 값 (진단용) */
  cleaned: string
  /** 사람이 읽을 문제 설명. 없으면 null */
  problem: string | null
}

/**
 * 오행 표기를 낱낱이 뜯어봅니다. 진단·검사기·복수 오행 처리에 쓰십시오.
 *
 *   parseOhaeng('木')      → { ohaeng:'목', all:['목'],       problem:null }
 *   parseOhaeng('木(목)')  → { ohaeng:'목', all:['목'],       problem:null }
 *   parseOhaeng(' 수 ')    → { ohaeng:'수', all:['수'],       problem:null }
 *   parseOhaeng('土金')    → { ohaeng:'토', all:['토','금'],  problem:'오행이 둘…' }
 *   parseOhaeng('')        → { ohaeng:null, all:[],          problem:'비어 있습니다' }
 *   parseOhaeng('earth')   → { ohaeng:null, all:[],          problem:'못 읽었습니다…' }
 */
export function parseOhaeng(raw: string | null | undefined): OhaengParse {
  const cleaned = stripInvisible(raw)

  if (cleaned === '') {
    return { ohaeng: null, all: [], cleaned, problem: '오행 값이 비어 있습니다' }
  }

  // ① 빠른 길 — 완전일치. 원자료 5,111행이 전부 여기서 끝납니다.
  const exact = OHAENG_CHAR[cleaned]
  if (exact) return { ohaeng: exact, all: [exact], cleaned, problem: null }

  // ② 섞인 표기 — '木(목)' · '토(土)' 처럼 괄호가 붙은 것.
  //    ★목화토금수 순서로 훑습니다. 옛 ohaengChar 와 같은 우선순위입니다.
  const found: Ohaeng[] = []
  for (const std of OHAENG_ALL) {
    for (const [ch, o] of Object.entries(OHAENG_CHAR)) {
      if (o === std && cleaned.includes(ch) && !found.includes(std)) found.push(std)
    }
  }

  if (found.length === 0) {
    return {
      ohaeng: null, all: [], cleaned,
      problem: `오행을 못 읽었습니다 (원값 "${String(raw ?? '')}")`,
    }
  }
  if (found.length > 1) {
    // ⚠️ 조용히 앞엣것을 고르지 않습니다. 복수 자원오행일 수도 있고 오염일 수도 있습니다.
    //    ★2단계에서 resource_ohaeng_secondary 가 들어오면 all[1] 을 그쪽으로 보내십시오.
    return {
      ohaeng: found[0], all: found, cleaned,
      problem: `오행이 둘 이상 들어 있습니다 (${found.join('·')}) — 앞엣것(${found[0]})으로 봤습니다`,
    }
  }
  return { ohaeng: found[0], all: found, cleaned, problem: null }
}

/**
 * ★기본 창구. 오행 표기를 표준 다섯 글자 중 하나로 바꿉니다.
 * 못 읽으면 **null** 입니다 — 빈 문자열이나 원값을 되돌려 주지 않습니다.
 *
 * ⚠️ null 을 '기타' 로 뭉개지 마십시오. 부르는 쪽이 «모름» 을 알아야 합니다.
 *    옛 ohaengChar 는 못 읽은 값을 «그대로» 되돌려 주었고, 그 값이 상생표에서
 *    조용히 '기타' 로 떨어져 감점 없이 통과했습니다.
 */
export function normalizeOhaeng(raw: string | null | undefined): Ohaeng | null {
  return parseOhaeng(raw).ohaeng
}

/**
 * 옛 `ohaengChar()` 자리에 그대로 끼우는 창구 — 반환이 언제나 string 입니다.
 * 못 읽으면 빈 문자열입니다.
 *
 * ⚠️ 새 코드에는 쓰지 마십시오. `normalizeOhaeng` 을 쓰고 null 을 «다루십시오».
 *    이 함수는 NameChar.resourceOhaeng 이 `string` 인 동안만 필요한 다리입니다.
 * ⚠️ 옛 ohaengChar 와 딱 한 곳이 다릅니다 — 못 읽은 값을 «원값 그대로» 가 아니라
 *    «빈 문자열» 로 돌려줍니다. 어느 쪽이든 상생표에서 걸리지 않으므로
 *    판정 결과는 같고, 빈 값이 «모른다» 는 뜻에 더 가깝습니다.
 */
export function ohaengOrEmpty(raw: string | null | undefined): Ohaeng | '' {
  return normalizeOhaeng(raw) ?? ''
}

/**
 * 정규화 실패를 «세는» 창구. 검사기와 진단 상자에 쓰십시오.
 * @param ctx 어느 글자에서 났는지 (예: '柳' · '행 5002')
 */
export function normalizeOhaengStrict(
  raw: string | null | undefined,
  ctx: string,
): { ohaeng: Ohaeng | null; problem: string | null } {
  const p = parseOhaeng(raw)
  return { ohaeng: p.ohaeng, problem: p.problem ? `${ctx}: ${p.problem}` : null }
}
