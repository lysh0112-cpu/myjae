// ============================================================================
// 커플 채팅방 개인 표시설정 (글자 크기 · 폰트 · 배경색)
//   - 개인 취향이라 localStorage에 저장 (상대와 공유 안 함)
//   - 명카페 방침: 화면 표시 취향은 localStorage 허용
// ============================================================================

export type ChatDisplaySettings = {
  fontScale: number // 0.88 작게 / 1 보통 / 1.15 크게 / 1.3 아주크게
  fontFamily: string
  bg: string // 배경 키
}

export const FONT_SCALES = [
  { key: 'sm', label: '작게', scale: 0.88 },
  { key: 'md', label: '보통', scale: 1 },
  { key: 'lg', label: '크게', scale: 1.15 },
  { key: 'xl', label: '아주 크게', scale: 1.3 },
]

export const FONT_FAMILIES = [
  { key: 'gothic', label: '기본', css: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" },
  { key: 'myeongjo', label: '명조', css: "'Nanum Myeongjo', 'Apple SD Gothic Neo', serif" },
  { key: 'round', label: '둥근', css: "'Jua', 'Apple SD Gothic Neo', sans-serif" },
  { key: 'hand', label: '손글씨', css: "'Gaegu', 'Apple SD Gothic Neo', cursive" },
]

// 배경: 키 → 색 (다크는 흰 글씨 필요)
export const BG_OPTIONS = [
  { key: 'peach', label: '피치', color: '#FDF6F0', dark: false },
  { key: 'pink', label: '핑크', color: '#fbeaf0', dark: false },
  { key: 'mint', label: '민트', color: '#eaf3ea', dark: false },
  { key: 'sky', label: '하늘', color: '#e8eef7', dark: false },
  { key: 'dark', label: '다크', color: '#2b2b2b', dark: true },
]

const KEY = 'couple_chat_display_v1'

export const DEFAULT_DISPLAY: ChatDisplaySettings = {
  fontScale: 1,
  fontFamily: FONT_FAMILIES[0].css,
  bg: 'peach',
}

export function loadDisplaySettings(): ChatDisplaySettings {
  if (typeof window === 'undefined') return DEFAULT_DISPLAY
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_DISPLAY
    return { ...DEFAULT_DISPLAY, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_DISPLAY
  }
}

export function saveDisplaySettings(s: ChatDisplaySettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 저장 실패 무시 */
  }
}

export function bgColorOf(key: string): { color: string; dark: boolean } {
  const found = BG_OPTIONS.find((b) => b.key === key)
  return found ? { color: found.color, dark: found.dark } : { color: '#FDF6F0', dark: false }
}
