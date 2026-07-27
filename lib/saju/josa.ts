// lib/saju/josa.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  조사(助詞) 붙이기 — 받침에 따라 이/가, 은/는, 을/를, 와/과        │
// └───────────────────────────────────────────────────────────────┘
//
// ★왜 공용으로 뺐나 (교훈 AU)
//   `${aLabel}과 ${bLabel}이` 처럼 조사를 박아 놓으면 기본값일 때만 맞는다.
//   이름이 들어가는 순간 "정준호과 이경아이" 가 된다.
//   궁합에서 이미 한 번 깨졌고, 진로적성에서도 "토(土)이 없어요" 가 나왔다.
//   **조사를 문자열에 직접 박지 말고 반드시 이 함수를 쓸 것.**
//
// ⚠️ coupleFilterV1.ts 안에도 같은 일을 하는 hasJong/wagwa/iga 가 있다.
//    거기서만 쓰려고 파일 안에 둔 것인데, 나중에 이 파일로 합치면 좋다.
//    (지금 합치면 궁합을 건드리게 되므로 미뤄 둔다)
//
// 사용 예)
//   `${el}${iga(el)} 없어요`        → "토가 없어요" / "금이 없어요"
//   `${a}${wagwa(a)} ${b}`          → "정준호와 이경아"
//
// ※ 괄호가 붙은 표기(예 '목(木)')를 넘겨도 된다.
//   괄호 안은 눈으로만 읽는 것이라, 조사는 앞의 한글을 기준으로 고른다.

/** 괄호·공백을 떼고 마지막 한글 글자를 찾는다 */
function lastHangul(word: string): string | null {
  const cleaned = word.replace(/[()（）［\]【】<>\s]/g, '')
  for (let i = cleaned.length - 1; i >= 0; i--) {
    const ch = cleaned[i]
    if (ch >= '가' && ch <= '힣') return ch
  }
  return null
}

/** 받침이 있는가. 한글이 없으면 false. */
export function hasJong(word: string): boolean {
  const ch = lastHangul(word)
  if (!ch) return false
  return (ch.charCodeAt(0) - 0xac00) % 28 !== 0
}

/** 받침이 'ㄹ' 인가 (으로/로 를 가를 때 필요) */
function jongIsRieul(word: string): boolean {
  const ch = lastHangul(word)
  if (!ch) return false
  return (ch.charCodeAt(0) - 0xac00) % 28 === 8
}

/** 이 / 가 */
export function iga(word: string): string {
  return hasJong(word) ? '이' : '가'
}
/** 은 / 는 */
export function eunneun(word: string): string {
  return hasJong(word) ? '은' : '는'
}
/** 을 / 를 */
export function eulreul(word: string): string {
  return hasJong(word) ? '을' : '를'
}
/** 와 / 과 */
export function wagwa(word: string): string {
  return hasJong(word) ? '과' : '와'
}
/** 으로 / 로  (ㄹ 받침은 '로') */
export function euro(word: string): string {
  return hasJong(word) && !jongIsRieul(word) ? '으로' : '로'
}
/** 이라 / 라 */
export function ira(word: string): string {
  return hasJong(word) ? '이라' : '라'
}
