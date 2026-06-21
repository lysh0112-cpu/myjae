// lib/saju/yongsin_pro.ts
// 투트랙 용신 시스템 (자평진전 + 심산 명리비법 기반)

const STEM_ELEMENT: Record<string,string> = {
  甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',
  己:'토',庚:'금',辛:'금',壬:'수',癸:'수'
}
const BRANCH_ELEMENT: Record<string,string> = {
  子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',
  午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'
}

// 지장간 (여기·중기·정기)
const JIJANGAN: Record<string, string[]> = {
  子:['壬','','癸'],   丑:['癸','辛','己'],
  寅:['戊','丙','甲'], 卯:['甲','','乙'],
  辰:['乙','癸','戊'], 巳:['戊','庚','丙'],
  午:['丙','','丁'],   未:['丁','乙','己'],
  申:['戊','壬','庚'], 酉:['庚','','辛'],
  戌:['辛','丁','戊'], 亥:['戊','甲','壬'],
}

// 여름월 (조열)
const SUMMER_MONTHS = ['巳','午','未']
// 겨울월 (한랭)
const WINTER_MONTHS = ['亥','子','丑']

interface SajuPillar { pillar: string; stem: string; branch: string }

// ============================================
// 110점 만점 점수 계산
// ============================================
function calc110Score(saju: SajuPillar[], hourIdx: number | null): Record<string,number> {
  const score: Record<string,number> = {목:0,화:0,토:0,금:0,수:0}

  saju.forEach(({pillar, stem, branch}) => {
    // 천간 점수 (각 10점)
    if (STEM_ELEMENT[stem]) score[STEM_ELEMENT[stem]] += 10

    // 지지 점수 (월지 30점, 일지 15점, 시지 15점, 년지 10점)
    let branchScore = 10
    if (pillar === '월주') branchScore = 30
    else if (pillar === '일주') branchScore = 15
    else if (pillar === '시주') branchScore = 15

    // 특수 처리: 丑월 → 水 30점, 未월 → 火 30점
    if (pillar === '월주') {
      if (branch === '丑') { score['수'] += 30; return }
      if (branch === '未') { score['화'] += 30; return }
    }

    // 특수 처리: 丑시·寅시 → 水 15점, 未시 → 火 15점
    if (pillar === '시주') {
      if (branch === '丑' || branch === '寅') { score['수'] += 15; return }
      if (branch === '未') { score['화'] += 15; return }
    }

    if (BRANCH_ELEMENT[branch]) score[BRANCH_ELEMENT[branch]] += branchScore
  })

  return score
}

// 일간 세력 계산
function calcMyForce(score: Record<string,number>, dayStem: string): number {
  const dayElement = STEM_ELEMENT[dayStem]
  const GENERATES: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const helpElement = Object.entries(GENERATES).find(([,v]) => v === dayElement)?.[0] ?? ''
  return (score[dayElement] ?? 0) + (score[helpElement] ?? 0)
}

// 십성 계산
function getSipsin(dayStem: string, targetStem: string): string {
  if (!targetStem) return ''
  const HS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
  const SE: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
  const dayIdx = HS.indexOf(dayStem), targetIdx = HS.indexOf(targetStem)
  const de = SE[dayStem], te = SE[targetStem]
  const sameYin = (dayIdx%2)===(targetIdx%2)
  const gen: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const ctl: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  if (de===te) return sameYin?'비견':'겁재'
  if (gen[de]===te) return sameYin?'식신':'상관'
  if (ctl[de]===te) return sameYin?'편재':'정재'
  if (ctl[te]===de) return sameYin?'편관':'정관'
  if (gen[te]===de) return sameYin?'편인':'정인'
  return ''
}

// ============================================
// Track 1: 내면/개인사 용신
// ============================================
export interface Track1Result {
  yongsin: string      // 용신 오행
  heeksin: string      // 희신 오행
  gisin: string        // 기신 오행
  type: string         // 종격/조후/병약/억부
  description: string
  lifeAdvice: string   // 생활 조언
}

export function calcTrack1(
  saju: SajuPillar[],
  dayStem: string,
  hourIdx: number | null
): Track1Result {
  const score = calc110Score(saju, hourIdx)
  const totalScore = Object.values(score).reduce((a,b) => a+b, 0)
  const myForce = calcMyForce(score, dayStem)
  const dayElement = STEM_ELEMENT[dayStem]
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''

  const GENERATES: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const CONTROLS: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  const ELEMENT_KOR: Record<string,string> = {목:'목(木)',화:'화(火)',토:'토(土)',금:'금(金)',수:'수(水)'}

  // Step 1.3: 종격 판별 (최우선)
  const maxElement = Object.entries(score).sort((a,b) => b[1]-a[1])[0]
  if (myForce <= 15 || maxElement[1] >= 80) {
    const dominant = maxElement[0]
    const help = Object.entries(GENERATES).find(([,v]) => v === dominant)?.[0] ?? ''
    return {
      yongsin: dominant,
      heeksin: help,
      gisin: CONTROLS[dominant],
      type: '종격',
      description: `대세를 따르는 종격 사주입니다. ${ELEMENT_KOR[dominant]}의 기운이 압도적으로 강합니다.`,
      lifeAdvice: `${ELEMENT_KOR[dominant]} 기운을 살리는 환경과 직업이 유리합니다.`
    }
  }

  // Step 1.4: 조후용신 (2순위)
  if (SUMMER_MONTHS.includes(monthBranch) && (score['수'] ?? 0) < 40) {
    return {
      yongsin: '수',
      heeksin: '금',
      gisin: '화',
      type: '조후',
      description: `여름 태생으로 사주가 조열합니다. 수(水)의 기운으로 균형을 잡아야 합니다.`,
      lifeAdvice: `검은색 계열, 북쪽 방향, 물가에서 휴식이 스트레스 해소에 좋습니다.`
    }
  }
  if (WINTER_MONTHS.includes(monthBranch) && (score['화'] ?? 0) < 40) {
    return {
      yongsin: '화',
      heeksin: '목',
      gisin: '수',
      type: '조후',
      description: `겨울 태생으로 사주가 한랭합니다. 화(火)의 기운으로 따뜻함을 채워야 합니다.`,
      lifeAdvice: `붉은색 계열, 남쪽 방향, 따뜻하고 밝은 환경이 심리 안정에 도움됩니다.`
    }
  }

  // Step 1.5: 병약용신 (3순위)
  const diseaseElement = Object.entries(score).find(([,v]) => v >= 50)
  if (diseaseElement) {
    const medicine = CONTROLS[diseaseElement[0]]
    return {
      yongsin: medicine,
      heeksin: GENERATES[medicine] ?? '',
      gisin: diseaseElement[0],
      type: '병약',
      description: `${ELEMENT_KOR[diseaseElement[0]]}이 과다(${diseaseElement[1]}점)하여 병(病)이 됩니다. ${ELEMENT_KOR[medicine]}이 약(藥)이 됩니다.`,
      lifeAdvice: `${ELEMENT_KOR[diseaseElement[0]]} 기운을 줄이고 ${ELEMENT_KOR[medicine]} 기운을 보충하는 생활이 필요합니다.`
    }
  }

  // Step 1.6: 억부용신 (마지막)
  if (myForce >= 60) {
    // 신강 → 설기·극제
    const candidates = [CONTROLS[dayElement], GENERATES[dayElement]]
    const yongsin = candidates.find(el => {
      const s = score[el] ?? 0
      return s >= 10 && s <= 25
    }) ?? CONTROLS[dayElement]
    return {
      yongsin,
      heeksin: candidates.find(el => el !== yongsin) ?? '',
      gisin: dayElement,
      type: '억부(신강)',
      description: `신강 사주입니다(내 세력 ${myForce}점). ${ELEMENT_KOR[yongsin]}으로 기운을 조절합니다.`,
      lifeAdvice: `넘치는 에너지를 발산할 수 있는 활동적인 환경이 좋습니다.`
    }
  } else {
    // 신약 → 생조
    const helpElement = Object.entries(GENERATES).find(([,v]) => v === dayElement)?.[0] ?? ''
    return {
      yongsin: helpElement,
      heeksin: dayElement,
      gisin: CONTROLS[dayElement],
      type: '억부(신약)',
      description: `신약 사주입니다(내 세력 ${myForce}점). ${ELEMENT_KOR[helpElement]}의 도움이 필요합니다.`,
      lifeAdvice: `안정적이고 지지받는 환경에서 능력을 발휘합니다.`
    }
  }
}

// ============================================
// Track 2: 사회적 성공/격국 용신
// ============================================
export interface Track2Result {
  gyeokguk: string       // 격국명
  yongsin: string        // 사회적 용신 오행
  sipsin: string         // 십성
  type: '순용' | '역용'
  description: string
  careerAdvice: string   // 직업 조언
}

export function calcTrack2(saju: SajuPillar[], dayStem: string): Track2Result {
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
  const monthStem = saju.find(p => p.pillar === '월주')?.stem ?? ''
  const jijangan = JIJANGAN[monthBranch] ?? []

  // 천간 목록 (년·월·시간)
  const heavenlyStems = saju
    .filter(p => p.pillar !== '일주')
    .map(p => p.stem)
    .filter(Boolean)

  // 투출 검사 (정기>중기>여기 우선순위)
  let gyeokStem = ''
  // 정기(index 2) 먼저
  for (let i = 2; i >= 0; i--) {
    const jg = jijangan[i]
    if (jg && heavenlyStems.includes(jg)) {
      gyeokStem = jg
      break
    }
  }
  // 투출 없으면 정기 사용
  if (!gyeokStem) gyeokStem = jijangan[2] || jijangan[0] || monthStem

  const sipsin = getSipsin(dayStem, gyeokStem)

  const GENERATES: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const CONTROLS: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  const STEM_EL = STEM_ELEMENT[gyeokStem] ?? ''

  // 격국별 용신 결정
  const gyeokMap: Record<string, Track2Result> = {
    '정관': {
      gyeokguk: '정관격',
      yongsin: GENERATES[STEM_EL] ?? '',
      sipsin,
      type: '순용',
      description: '정관격 — 조직과 규율을 통해 사회적 성공을 이룹니다.',
      careerAdvice: '조직 내 승진, 명예, 결재권 확보를 통해 성공합니다. 공직·법조·대기업이 유리합니다.'
    },
    '편관': {
      gyeokguk: '칠살격',
      yongsin: GENERATES[STEM_EL] ?? '',
      sipsin,
      type: '역용',
      description: '칠살격 — 강한 돌파력으로 난관을 극복합니다.',
      careerAdvice: '카리스마 있는 문제 해결사. 의료·법조·군경·특수직에서 대성합니다.'
    },
    '정재': {
      gyeokguk: '정재격',
      yongsin: GENERATES[STEM_EL] ?? '',
      sipsin,
      type: '순용',
      description: '정재격 — 성실한 노력으로 안정적 재물을 축적합니다.',
      careerAdvice: '뛰어난 재물 관리 능력. 금융·부동산·안정적 사업에서 두각을 나타냅니다.'
    },
    '편재': {
      gyeokguk: '편재격',
      yongsin: GENERATES[STEM_EL] ?? '',
      sipsin,
      type: '순용',
      description: '편재격 — 뛰어난 사업적 수완으로 큰 재물을 이룹니다.',
      careerAdvice: '기획력과 사업적 수완으로 재물을 축적합니다. 무역·투자·영업에 강합니다.'
    },
    '정인': {
      gyeokguk: '정인격',
      yongsin: CONTROLS[STEM_EL] ?? '',
      sipsin,
      type: '순용',
      description: '정인격 — 지식과 학문으로 사회적 권위를 얻습니다.',
      careerAdvice: '지식·자격증·학문적 권위를 바탕으로 성공합니다. 교육·연구·전문직이 유리합니다.'
    },
    '편인': {
      gyeokguk: '편인격',
      yongsin: CONTROLS[STEM_EL] ?? '',
      sipsin,
      type: '순용',
      description: '편인격 — 독창적 아이디어와 전문성으로 성공합니다.',
      careerAdvice: '독창적 전문성으로 승부합니다. 예술·기술·연구·종교 분야에서 두각을 나타냅니다.'
    },
    '식신': {
      gyeokguk: '식신격',
      yongsin: CONTROLS[STEM_EL] ?? '',
      sipsin,
      type: '순용',
      description: '식신격 — 전문 기술과 재능으로 재물을 이룹니다.',
      careerAdvice: '전문 기술·연구·제조·요식업으로 크게 발복합니다. 재능을 돈으로 연결하세요.'
    },
    '상관': {
      gyeokguk: '상관격',
      yongsin: CONTROLS[GENERATES[STEM_EL] ?? ''] ?? '',
      sipsin,
      type: '역용',
      description: '상관격 — 뛰어난 언변과 창의성으로 두각을 나타냅니다.',
      careerAdvice: '언변·예술성·비판적 사고를 활용한 언론·영업·예술·IT 분야에서 대성합니다.'
    },
    '비견': {
      gyeokguk: '건록격',
      yongsin: CONTROLS[STEM_EL] ?? '',
      sipsin,
      type: '역용',
      description: '건록격 — 강한 추진력으로 자수성가합니다.',
      careerAdvice: '강력한 추진력의 자수성가형. 독자적 사업가나 조직 리더로 뻗어나갑니다.'
    },
    '겁재': {
      gyeokguk: '양인격',
      yongsin: CONTROLS[STEM_EL] ?? '',
      sipsin,
      type: '역용',
      description: '양인격 — 강렬한 에너지를 통제하면 크게 성공합니다.',
      careerAdvice: '강렬한 에너지를 엄격히 통제하면 대성합니다. 군경·의료·스포츠가 유리합니다.'
    },
  }

  return gyeokMap[sipsin] ?? {
    gyeokguk: `${sipsin}격`,
    yongsin: '',
    sipsin,
    type: '순용',
    description: `${sipsin}격 사주입니다.`,
    careerAdvice: '전문 상담사와 상담을 통해 방향을 잡으세요.'
  }
}

// ============================================
// 통합 결과
// ============================================
export interface YongsinProResult {
  track1: Track1Result
  track2: Track2Result
  isConflict: boolean      // 두 용신 상극 여부
  conflictAdvice: string   // 상극 시 조언
  score: Record<string,number>
}

export function calcYongsinPro(
  saju: SajuPillar[],
  dayStem: string,
  hourIdx: number | null
): YongsinProResult {
  const score = calc110Score(saju, hourIdx)
  const track1 = calcTrack1(saju, dayStem, hourIdx)
  const track2 = calcTrack2(saju, dayStem)

  const CONTROLS: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  const isConflict = track1.yongsin !== '' &&
    track2.yongsin !== '' &&
    CONTROLS[track1.yongsin] === track2.yongsin

  const ELEMENT_KOR: Record<string,string> = {
    목:'목(木)',화:'화(火)',토:'토(土)',금:'금(金)',수:'수(水)'
  }

  const conflictAdvice = isConflict
    ? `사적인 영역(휴식·건강)에서는 ${ELEMENT_KOR[track1.yongsin]} 기운으로 재충전하고, 공적인 영역(직장·사업)에서는 ${ELEMENT_KOR[track2.yongsin]} 기운을 무기로 삼아야 성공하는 입체적 성향의 소유자입니다. 일터에서 치열하게 활동하되 퇴근 후 정적인 취미로 온오프를 분리하세요.`
    : ''

  return { track1, track2, isConflict, conflictAdvice, score }
}
