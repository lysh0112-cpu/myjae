// lib/saju/yongsin_track2.ts
import { SajuPillar } from './yongsin_track1'

const STEM_ELEMENT: Record<string,string> = {
  甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',
  己:'토',庚:'금',辛:'금',壬:'수',癸:'수'
}
const JIJANGAN: Record<string, string[]> = {
  子:['壬','','癸'],   丑:['癸','辛','己'],
  寅:['戊','丙','甲'], 卯:['甲','','乙'],
  辰:['乙','癸','戊'], 巳:['戊','庚','丙'],
  午:['丙','','丁'],   未:['丁','乙','己'],
  申:['戊','壬','庚'], 酉:['庚','','辛'],
  戌:['辛','丁','戊'], 亥:['戊','甲','壬'],
}
const GENERATES: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
const CONTROLS: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}

export interface Track2Result {
  gyeokguk: string
  yongsin: string
  sipsin: string
  type: '순용' | '역용'
  description: string
  careerAdvice: string
}

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

export function calcTrack2(saju: SajuPillar[], dayStem: string): Track2Result {
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
  const monthStem = saju.find(p => p.pillar === '월주')?.stem ?? ''
  const jijangan = JIJANGAN[monthBranch] ?? []
  const heavenlyStems = saju.filter(p => p.pillar !== '일주').map(p => p.stem).filter(Boolean)

  let gyeokStem = ''
  for (let i = 2; i >= 0; i--) {
    const jg = jijangan[i]
    if (jg && heavenlyStems.includes(jg)) { gyeokStem = jg; break }
  }
  if (!gyeokStem) gyeokStem = jijangan[2] || jijangan[0] || monthStem

  const sipsin = getSipsin(dayStem, gyeokStem)
  const STEM_EL = STEM_ELEMENT[gyeokStem] ?? ''

  const gyeokMap: Record<string, Track2Result> = {
    '정관': { gyeokguk:'정관격', yongsin:GENERATES[STEM_EL]??'', sipsin, type:'순용',
      description:'정관격 — 조직과 규율을 통해 사회적 성공을 이룹니다.',
      careerAdvice:'조직 내 승진, 명예, 결재권 확보를 통해 성공합니다. 공직·법조·대기업이 유리합니다.' },
    '편관': { gyeokguk:'칠살격', yongsin:GENERATES[STEM_EL]??'', sipsin, type:'역용',
      description:'칠살격 — 강한 돌파력으로 난관을 극복합니다.',
      careerAdvice:'카리스마 있는 문제 해결사. 의료·법조·군경·특수직에서 대성합니다.' },
    '정재': { gyeokguk:'정재격', yongsin:GENERATES[STEM_EL]??'', sipsin, type:'순용',
      description:'정재격 — 성실한 노력으로 안정적 재물을 축적합니다.',
      careerAdvice:'뛰어난 재물 관리 능력. 금융·부동산·안정적 사업에서 두각을 나타냅니다.' },
    '편재': { gyeokguk:'편재격', yongsin:GENERATES[STEM_EL]??'', sipsin, type:'순용',
      description:'편재격 — 뛰어난 사업적 수완으로 큰 재물을 이룹니다.',
      careerAdvice:'기획력과 사업적 수완으로 재물을 축적합니다. 무역·투자·영업에 강합니다.' },
    '정인': { gyeokguk:'정인격', yongsin:CONTROLS[STEM_EL]??'', sipsin, type:'순용',
      description:'정인격 — 지식과 학문으로 사회적 권위를 얻습니다.',
      careerAdvice:'지식·자격증·학문적 권위를 바탕으로 성공합니다. 교육·연구·전문직이 유리합니다.' },
    '편인': { gyeokguk:'편인격', yongsin:CONTROLS[STEM_EL]??'', sipsin, type:'순용',
      description:'편인격 — 독창적 아이디어와 전문성으로 성공합니다.',
      careerAdvice:'독창적 전문성으로 승부합니다. 예술·기술·연구·종교 분야에서 두각을 나타냅니다.' },
    '식신': { gyeokguk:'식신격', yongsin:CONTROLS[STEM_EL]??'', sipsin, type:'순용',
      description:'식신격 — 전문 기술과 재능으로 재물을 이룹니다.',
      careerAdvice:'전문 기술·연구·제조·요식업으로 크게 발복합니다. 재능을 돈으로 연결하세요.' },
    '상관': { gyeokguk:'상관격', yongsin:CONTROLS[GENERATES[STEM_EL]??'']??'', sipsin, type:'역용',
      description:'상관격 — 뛰어난 언변과 창의성으로 두각을 나타냅니다.',
      careerAdvice:'언변·예술성·비판적 사고를 활용한 언론·영업·예술·IT 분야에서 대성합니다.' },
    '비견': { gyeokguk:'건록격', yongsin:CONTROLS[STEM_EL]??'', sipsin, type:'역용',
      description:'건록격 — 강한 추진력으로 자수성가합니다.',
      careerAdvice:'강력한 추진력의 자수성가형. 독자적 사업가나 조직 리더로 뻗어나갑니다.' },
    '겁재': { gyeokguk:'양인격', yongsin:CONTROLS[STEM_EL]??'', sipsin, type:'역용',
      description:'양인격 — 강렬한 에너지를 통제하면 크게 성공합니다.',
      careerAdvice:'강렬한 에너지를 엄격히 통제하면 대성합니다. 군경·의료·스포츠가 유리합니다.' },
  }

  return gyeokMap[sipsin] ?? {
    gyeokguk:`${sipsin}격`, yongsin:'', sipsin, type:'순용',
    description:`${sipsin}격 사주입니다.`,
    careerAdvice:'전문 상담사와 상담을 통해 방향을 잡으세요.'
  }
}
