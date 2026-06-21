const BRANCH_LIST = [
  {char:"子"},{char:"丑"},{char:"寅"},{char:"卯"},
  {char:"辰"},{char:"巳"},{char:"午"},{char:"未"},
  {char:"申"},{char:"酉"},{char:"戌"},{char:"亥"},
]

const STEM_ELEMENT: Record<string,string> = {
  甲:"목",乙:"목",丙:"화",丁:"화",戊:"토",
  己:"토",庚:"금",辛:"금",壬:"수",癸:"수"
}
const BRANCH_ELEMENT: Record<string,string> = {
  子:"수",丑:"토",寅:"목",卯:"목",辰:"토",巳:"화",
  午:"화",未:"토",申:"금",酉:"금",戌:"토",亥:"수"
}

interface SajuItem { pillar: string; stem: string; branch: string }

function getElements(saju: SajuItem[]) {
  const elements = {목:0,화:0,토:0,금:0,수:0} as Record<string,number>
  saju.forEach(({stem,branch}) => {
    if (STEM_ELEMENT[stem]) elements[STEM_ELEMENT[stem]]++
    if (BRANCH_ELEMENT[branch]) elements[BRANCH_ELEMENT[branch]]++
  })
  return elements
}

interface PromptParams {
  saju: SajuItem[]
  gender: string
  calType: string
  yearParam: number
  monthParam: number
  dayParam: number
  hourIdx: number | null
  leapMonth: string
  solar: { year: number; month: number; day: number } | null
  userQuestion?: string
}

function getBaseInfo(p: PromptParams) {
  const sajuText = p.saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(', ')
  const lunarInfo = p.calType === '음력' && p.solar
    ? ` → 양력 ${p.solar.year}년 ${p.solar.month}월 ${p.solar.day}일`
    : ''
  const el = getElements(p.saju)
  const hourText = p.hourIdx === null ? '모름' : BRANCH_LIST[p.hourIdx]?.char+'시'
  return { sajuText, lunarInfo, el, hourText }
}

export function getFreePrompt(p: PromptParams): string {
  const { sajuText, lunarInfo, el, hourText } = getBaseInfo(p)
  const questionText = p.userQuestion ? `\n고객 질문: ${p.userQuestion}` : ''

  return `사주 분석 전문가로서 아래 사주를 분석해주세요.
마크다운 기호(##, **, ---)는 절대 사용하지 마세요.
각 항목은 핵심만 2~3문장, 100자 이내로 작성하세요.

성별: ${p.gender}성 / 생년월일: ${p.calType} ${p.yearParam}년 ${p.monthParam}월 ${p.dayParam}일${lunarInfo}
태어난 시: ${hourText} / 사주: ${sajuText}
오행: 목${el['목']} 화${el['화']} 토${el['토']} 금${el['금']} 수${el['수']}${questionText}

1️⃣ 용신 분석
신강/신약 판단, 용신·희신·기신 명시, 용신이 삶에 미치는 핵심 영향 한 줄

2️⃣ 성격·기질
타고난 성격, 강점과 약점, 대인관계 스타일 핵심만`
}

export function getPaidPrompt(p: PromptParams): string {
  const currentYear = new Date().getFullYear()
  const { sajuText, lunarInfo, el, hourText } = getBaseInfo(p)
  const questionText = p.userQuestion ? `\n고객 질문: ${p.userQuestion}` : ''

  return `사주 분석 전문가로서 아래 사주의 8가지를 분석해주세요.
마크다운 기호(##, **, ---)는 절대 사용하지 마세요.
각 항목은 핵심만 2~3문장, 100자 이내로 작성하세요.

성별: ${p.gender}성 / 생년월일: ${p.calType} ${p.yearParam}년 ${p.monthParam}월 ${p.dayParam}일${lunarInfo}
태어난 시: ${hourText} / 사주: ${sajuText}
오행: 목${el['목']} 화${el['화']} 토${el['토']} 금${el['금']} 수${el['수']}${questionText}

3️⃣ 건강·체질 — 약한 부위, 주의 질병, 건강 관리법
4️⃣ 연애·결혼 — 연애유형, 배우자 특징, 결혼 최적 시기
5️⃣ 직업·취업 — 맞는 직업, 사업 vs 직장, 성공 시기
6️⃣ 재물·부동산 — 재물운, 돈 버는 시기, 재테크 방향
7️⃣ 사업·성공운 — 사업 적성, 성공 시기, 파트너운
8️⃣ 자녀운 — 자녀 인연, 자녀 특징, 출산 시기
9️⃣ 노후·안정 — 노후 재물, 평안한 노년 시기
🔟 귀인·운명개선 — 귀인 특징, 만나는 시기, 운명개선법
1️⃣1️⃣ 10년 운세 — ${currentYear}~${currentYear+9}년 흐름, ${currentYear}년 월별 핵심`
}

export function getFullPrompt(p: PromptParams): string {
  return getPaidPrompt(p)
}
