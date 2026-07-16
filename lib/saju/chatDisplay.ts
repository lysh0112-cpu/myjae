// ============================================================================
// 커플 채팅방 개인 표시설정 (글자 크기 · 폰트 · 배경색)
//   - 개인 취향이라 localStorage에 저장 (상대와 공유 안 함)
//   - 폰트: 한글 웹폰트 10종 (콤보상자, 구글폰트 로드)
//   - 배경: 엑셀식 팔레트 (테마색+밝기단계 / 표준색 / 최근색 / 직접고르기)
// ============================================================================

export type ChatDisplaySettings = {
  fontScale: number // (구버전 호환용, 이제 fontPt 사용)
  fontPt: number // 글자 크기 포인트 (10~24)
  fontKey: string
  bg: string
  textColor: string // 글자색 ('' = 자동)
  myBubble: string // 내 말풍선 색 ('' = 기본 브라운)
}

export const FONT_SCALES = [
  { key: 'sm', label: '작게', scale: 0.88 },
  { key: 'md', label: '보통', scale: 1 },
  { key: 'lg', label: '크게', scale: 1.15 },
  { key: 'xl', label: '아주 크게', scale: 1.3 },
]

// 엑셀식 글자 크기 포인트 (10~24)
export const FONT_POINTS = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24]

export const FONTS = [
  { key: 'gothic', label: '기본 고딕', google: '', css: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" },
  { key: 'noto', label: '노토 세리프', google: 'Noto Serif KR', css: "'Noto Serif KR', serif" },
  { key: 'nanumMyeongjo', label: '나눔 명조', google: 'Nanum Myeongjo', css: "'Nanum Myeongjo', serif" },
  { key: 'jua', label: '둥근 (주아)', google: 'Jua', css: "'Jua', sans-serif" },
  { key: 'gaegu', label: '손글씨 (개구)', google: 'Gaegu', css: "'Gaegu', cursive" },
  { key: 'nanumPen', label: '펜글씨', google: 'Nanum Pen Script', css: "'Nanum Pen Script', cursive" },
  { key: 'dohyeon', label: '도현 (굵은)', google: 'Do Hyeon', css: "'Do Hyeon', sans-serif" },
  { key: 'gamja', label: '감자꽃', google: 'Gamja Flower', css: "'Gamja Flower', cursive" },
  { key: 'stylish', label: '스타일리시', google: 'Stylish', css: "'Stylish', sans-serif" },
  { key: 'hi', label: '하이멜로디', google: 'Hi Melody', css: "'Hi Melody', cursive" },
]

export function googleFontsHref(): string {
  const families = FONTS.filter((f) => f.google)
    .map((f) => 'family=' + encodeURIComponent(f.google).replace(/%20/g, '+'))
    .join('&')
  return 'https://fonts.googleapis.com/css2?' + families + '&display=swap'
}

export function fontCssOf(key: string): string {
  return FONTS.find((f) => f.key === key)?.css || FONTS[0].css
}

// ── 엑셀식 배경 팔레트 ──────────────────────────────────────
// 자동(기본 피치)
export const BG_AUTO = '#FDF6F0'

// 테마 색: 각 열이 [기본색, 밝게2, 밝게1, 진하게1, 진하게2] 밝기 단계
// (엑셀처럼 맨 윗줄 = 대표색, 아래로 갈수록 명암 단계)
export const THEME_COLUMNS: string[][] = [
  ['#FFFFFF', '#F2F2F2', '#D9D9D9', '#BFBFBF', '#808080'], // 흰~회
  ['#000000', '#595959', '#808080', '#A6A6A6', '#D9D9D9'], // 검~회
  ['#FDF6F0', '#FBEFE6', '#F5DEC9', '#E8C4A0', '#C89B6E'], // 피치
  ['#FBEAF0', '#F6D5E0', '#EDAFC4', '#D4789C', '#B0517A'], // 핑크
  ['#F3E5F5', '#E4C8EC', '#CFA3DD', '#B073C6', '#8E4FA8'], // 보라
  ['#E8EAF6', '#C9CEEC', '#A3ACDD', '#7A86C6', '#5563A8'], // 남보라
  ['#E3F2FD', '#BBDCF7', '#8DC0EE', '#5A9BDB', '#3878B0'], // 파랑
  ['#E0F2F1', '#B2DFDB', '#80CBC4', '#4DB6AC', '#26A69A'], // 청록
  ['#EAF3EA', '#CDE6CD', '#A7D2A7', '#78B778', '#4E964E'], // 초록
  ['#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F', '#FFC107'], // 노랑
]

// 표준 색: 선명한 기본색 한 줄
export const STANDARD_COLORS = [
  '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050',
  '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0',
]

export function fontPreview(): string { return '가나다 ABC' }

const KEY = 'couple_chat_display_v2'
const RECENT_KEY = 'couple_chat_recent_colors_v1'

export const DEFAULT_DISPLAY: ChatDisplaySettings = {
  fontScale: 1,
  fontPt: 15,
  fontKey: 'gothic',
  bg: BG_AUTO,
  textColor: '',
  myBubble: '',
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
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* 무시 */ }
}

// 최근 사용한 색 (최대 10개)
export function loadRecentColors(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function pushRecentColor(hex: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const cur = loadRecentColors().filter((c) => c.toLowerCase() !== hex.toLowerCase())
    const next = [hex, ...cur].slice(0, 10)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    return next
  } catch { return [] }
}

export function isDarkColor(hex: string): boolean {
  const h = hex.replace('#', '')
  if (h.length !== 6) return false
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  return lum < 128
}
