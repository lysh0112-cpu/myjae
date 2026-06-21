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
}

function getBaseInfo(p: PromptParams) {
  const sajuText = p.saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(', ')
  const lunarInfo = p.calType === '음력' && p.solar
    ? `\n음력 ${p.yearParam}년 ${p.monthParam}월 ${p.dayParam}일${p.leapMonth === '1' ? ' (윤달)' : ''} → 양력 ${p.solar.year}년 ${p.solar.month}월 ${p.solar.day}일로 변환`
    : ''
  const el = getElements(p.saju)
  const hourText = p.hourIdx === null ? '모름' : BRANCH_LIST[p.hourIdx]?.char+'시'
  return { sajuText, lunarInfo, el, hourText }
}

export function getFreePrompt(p: PromptParams): string {
  const { sajuText, lunarInfo, el, hourText } = getBaseInfo(p)

  return `다음 사주를 정확하게 분석해주세요.

성별: ${p.gender}성
생년월일: ${p.calType} ${p.yearParam}년 ${p.monthParam}월 ${p.dayParam}일${lunarInfo}
태어난 시: ${hourText}
사주팔자: ${sajuText}
오행 분포: 목${el['목']} 화${el['화']} 토${el['토']} 금${el['금']} 수${el['수']}

중요: 마크다운 기호(##, **, --- 등)를 절대 사용하지 말고 일반 텍스트로만 작성하세요.
읽는 사람이 "어떻게 이렇게 정확하지?" 라고 느낄 만큼 구체적으로 써주세요.

1️⃣ 용신 분석

[용신 도출]
- 일간의 강약(신강/신약) 판단
- 오행 과부족 분석
- 용신·희신·기신·구신·한신 각각 명시
- 용신이 삶에 미치는 핵심 영향

[용신 활용법]
- 용신 오행에 맞는 직업·환경
- 용신 방위·색깔·숫자
- 용신을 살리는 생활 습관

2️⃣ 나의 사주팔자·성격·기질 분석

[타고난 성격과 기질]
- 일간 오행이 말해주는 나의 본질적 성격
- 겉으로 보이는 모습과 속마음의 차이
- 나만의 독특한 매력과 특징
- 감정 표현 방식과 대인관계 스타일

[강점과 재능]
- 타고난 강점과 잘하는 것들
- 남들보다 뛰어난 능력
- 성공할 수 있는 분야의 힌트

[약점과 주의사항]
- 고쳐야 할 습관과 성향
- 스트레스 받을 때 나타나는 모습
- 대인관계에서 조심해야 할 점

[나와 잘 맞는 사람]
- 나와 궁합이 좋은 성격 유형
- 피해야 할 인간관계 유형

3️⃣ 사주로 보는 건강과 체질

[타고난 체질]
- 음양오행으로 본 나의 체질 유형
- 선천적으로 약한 부위와 장기
- 에너지 소모 패턴과 회복력

[주의해야 할 건강 문제]
- 오행 불균형으로 생기는 건강 문제
- 계절별로 조심해야 할 질병
- 정신건강과 감정 건강 주의사항

[건강 관리 방법]
- 내 체질에 맞는 음식과 피해야 할 음식
- 추천 운동과 생활 습관
- 건강 황금기와 주의 시기

각 항목을 매우 구체적이고 상세하게, 읽는 사람이 공감할 수 있도록 작성해주세요.`
}

export function getPaidPrompt(p: PromptParams): string {
  const currentYear = new Date().getFullYear()
  const { sajuText, lunarInfo, el, hourText } = getBaseInfo(p)

  return `다음 사주의 아래 8가지 항목을 분석해주세요.

성별: ${p.gender}성
생년월일: ${p.calType} ${p.yearParam}년 ${p.monthParam}월 ${p.dayParam}일${lunarInfo}
태어난 시: ${hourText}
사주팔자: ${sajuText}
오행 분포: 목${el['목']} 화${el['화']} 토${el['토']} 금${el['금']} 수${el['수']}

중요: 마크다운 기호(##, **, --- 등)를 절대 사용하지 말고 일반 텍스트로만 작성하세요.

4️⃣ 연애·결혼·배우자운
- 나의 연애유형·운명의 상대·결혼 최적 시기

5️⃣ 적성·직업·취업운
- 나에게 맞는 직업·사업 vs 직장·성공 시기

6️⃣ 재물·부동산·내집마련
- 재물운·돈 버는 시기·재테크 전략

7️⃣ 사업운·성공운
- 사업 적성·성공 시기·파트너운

8️⃣ 자녀운·자녀결혼운
- 자녀 인연·자녀 운명·자녀 결혼시기

9️⃣ 노후재물·안정운
- 노후 준비·재물 안정·평안한 노년

🔟 귀인운·운명개선
- 귀인 특징·만나는 시기·운명개선법

1️⃣1️⃣ 10년 운명·월별운
- ${currentYear}~${currentYear+9}년 흐름·${currentYear}년 월별 운세

각 항목을 풍부하고 구체적으로 분석해주세요.`
}

// 하위 호환을 위해 유지
export function getFullPrompt(p: PromptParams): string {
  return getPaidPrompt(p)
}
