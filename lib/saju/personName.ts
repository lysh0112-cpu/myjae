// lib/saju/personName.ts
//
// ★ 사람 이름·저장 처리 공용 부품
//
//   [왜 만들었나 — 2026-07-23 출산택일에서 같은 버그를 네 번 고쳤다]
//   부모 이름이 계속 "부모1 · 부모2" 로 저장되는 문제를 잡느라
//   아래 네 가지 함정을 차례로 밟았다. 다른 서비스가 반복하지 않도록 여기 모은다.
//
//     ① 타입에 name 필드가 없어서, JSON 에 이름이 담겨 와도 코드가 못 읽었다.
//        → PersonWithName 타입을 여기서 제공한다.
//
//     ② 화면에 '부모1'/'부모2' 가 글자로 박혀 있었다.
//        → displayName() 으로 통일한다.
//
//     ③ 사람 목록 필터에서 service_type 을 통째로 제외해,
//        등록한 사람이 목록에서 사라지는 부작용이 났다.
//        → isResultRecord() 로 '사람'과 '결과 기록'을 구분한다.
//
//     ④ ★가장 오래 걸린 것★ 자동저장은 React state 반영 '전'에 호출된다.
//        parent1 state 가 아직 null 이라 이름이 fallback 으로 떨어졌다.
//        → pickSaveValue() 로 "인자 우선, 없으면 state" 규칙을 강제한다.
//        → 저장 함수를 만들 때는 반드시 사람도 인자로 받게 할 것.

// ─────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────

/** 화면/URL 을 오가는 사람 데이터. name 을 반드시 포함한다(함정 ①). */
export interface PersonWithName {
  year?: string; month?: string; day?: string; hour?: string
  gender?: string; calType?: string; leapMonth?: string
  job?: string; mbti?: string
  name?: string          // 이름(별명). 입력화면에서 담아 보낸다.
  isMe?: string          // 'true' 면 본인
}

// ─────────────────────────────────────────────────────────────
// ① 이름 표시·저장
// ─────────────────────────────────────────────────────────────

/**
 * 사람 이름을 꺼낸다. 이름이 비어 있을 때만 fallback 을 쓴다.
 *   화면 표시와 저장에 '같은 함수'를 쓰는 게 핵심 —
 *   따로 만들면 화면엔 이름이 나오는데 저장은 '부모1' 이 되는 일이 생긴다(함정 ②).
 */
export function displayName(p: PersonWithName | null | undefined, fallback: string): string {
  const nm = p?.name
  return nm && nm.trim() ? nm.trim() : fallback
}

/** 두 사람 기록의 제목. 보관함 목록에 그대로 쓰인다. 예: "류도이 · 홍길동" */
export function pairTitle(
  p1: PersonWithName | null | undefined,
  p2: PersonWithName | null | undefined,
  fallback1 = '첫 번째',
  fallback2 = '두 번째',
): string {
  return `${displayName(p1, fallback1)} · ${displayName(p2, fallback2)}`
}

// ─────────────────────────────────────────────────────────────
// ② 자동저장 타이밍 (함정 ④ — 가장 자주 틀리는 곳)
// ─────────────────────────────────────────────────────────────

/**
 * 저장 시 쓸 값을 고른다. **인자로 넘어온 값이 있으면 그것을 우선**한다.
 *
 * [왜 필요한가]
 * 자동저장은 결과가 갖춰지자마자 호출되는데, 그 시점엔
 * setParent1(p1) 같은 state 반영이 아직 안 끝나 있다.
 * state 를 그대로 읽으면 null 이라 이름이 fallback 으로 떨어진다.
 *
 * [쓰는 법]
 *   async function handleSave(recsOverride?, p1Override?, p2Override?) {
 *     const useP1 = pickSaveValue(p1Override, parent1)
 *     const useP2 = pickSaveValue(p2Override, parent2)
 *     ...
 *   }
 *   // 호출부: 방금 만든 값을 반드시 넘긴다
 *   handleSave(result, p1, p2)
 *
 * ※ undefined 와 null 을 구분한다.
 *    undefined = "안 넘겼다" → state 사용
 *    null      = "없는 게 맞다" → 그대로 null
 */
export function pickSaveValue<T>(override: T | undefined, stateValue: T): T {
  return override !== undefined ? override : stateValue
}

// ─────────────────────────────────────────────────────────────
// ③ 사람 vs 결과 기록 구분 (함정 ③)
// ─────────────────────────────────────────────────────────────

/**
 * saju_records 한 줄이 '결과 기록'인지 판별한다.
 *
 * [왜 필요한가]
 * saju_records 는 '사람'과 '결과 기록'을 같은 테이블에 담는다.
 * 게다가 service_type 도 겹친다 — 출산택일은 부모(사람)도, 택일 결과도 'birth' 다.
 * 그래서 service_type 만 보고 통째로 걸러내면
 * 등록한 사람까지 목록에서 사라진다.
 *
 * 구분 기준: result_data 유무
 *   · 사람      → result_data 없음
 *   · 결과 기록 → result_data 에 결과 스냅샷이 들어 있음
 */
export function isResultRecord(row: { service_type?: string | null; result_data?: unknown }): boolean {
  const st = row.service_type ?? ''
  // 궁합 결과는 전용 service_type 을 쓴다(사람은 couple_person/married_person).
  if (st === 'couple' || st === 'married') return true
  // 그 외 서비스는 result_data 유무로 판단한다.
  return !!row.result_data
}

// ─────────────────────────────────────────────────────────────
// ④ URL 전달 (함정 ①의 짝)
// ─────────────────────────────────────────────────────────────

/** 사람을 URL 파라미터로 실어 보낸다. name·isMe 가 빠지지 않게 통째로 담는다. */
export function packPerson(p: PersonWithName): string {
  return encodeURIComponent(JSON.stringify(p))
}

/** URL 파라미터에서 사람을 꺼낸다. 실패해도 앱이 죽지 않게 null 을 준다. */
export function unpackPerson(raw: string | null): PersonWithName | null {
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw)) as PersonWithName
  } catch {
    try {
      // URLSearchParams 로 보낸 경우 이미 디코딩돼 있을 수 있다.
      return JSON.parse(raw) as PersonWithName
    } catch {
      return null
    }
  }
}
