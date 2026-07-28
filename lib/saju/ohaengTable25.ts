// lib/saju/ohaengTable25.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  오행에 관한 전체적인 분석 — 교재 25쪽 표를 그대로 옮긴 것            │
// │  출전: 『명리적성 비법노트』(심산) 25쪽                             │
// │        「03 오행에 관한 전체적인 분석」                             │
// └───────────────────────────────────────────────────────────────┘
//
// ★연재쌤 검수는 이 파일만 보시면 됩니다. 계산이 없습니다. 표뿐입니다.
//   교재 25쪽 표와 줄 차례가 같습니다. 나란히 놓고 보실 수 있습니다.
//
//     계절 · 온도 · 하루 · 인생 · 방향 · 색상 · 맛 · 숫자 · 건강
//     문과:이과 · 학과 전공 · 일반 특성 · 안정적일 때 · 과다할 때
//
// ── ⚠️ 겹치는 자리 (2026-07-28에 센 것) ────────────────────────────
//   25쪽은 오행에 관한 것을 한 표에 모은 색인입니다. 그래서 저장소에
//   이미 있는 것과 여섯 줄이 겹칩니다. **이 파일은 표를 그대로 담기만 하고,
//   화면·통변은 아직 아무것도 이 파일을 안 부릅니다.**
//
//     계절     → lib/saju/ohaengTrait.ts            season
//     색상     → lib/saju/ohaengColor.ts            EL_BG (이미 교재와 같음)
//     방향·맛  → app/manseryeok/result-new/ohaengInfo.ts  direction · taste
//     건강     → lib/saju/ohaengTrait.ts            lackAdult
//                app/manseryeok/result-new/ohaengInfo.ts  health
//     학과전공 → lib/saju/career/tables/gwa.ts
//     안정·과다 → lib/saju/ohaengTrait.ts           develop · excess
//
//   ⚠️ 겹친다고 저쪽을 지우지 마십시오. 저쪽은 지금 화면이 쓰고 있습니다.
//      합치는 일은 따로, 화면을 손댈 각오를 하고 하십시오. (교훈 BQ)
//
// ── 27~28쪽과 무엇이 다른가 ────────────────────────────────────────
//   같은 "과다" 라도 두 쪽이 다른 말을 합니다. 겹치는 것도 있고 새 것도 있습니다.
//
//     27~28쪽 木 과다   자기주장 강함 · 남 무시 · 오버 · 실수투성이
//     25쪽    木 과다   안하무인 · 용두사미 · 미래 지향적 · 전문 자유직 ·
//                       일을 벌이고 책임감 없음
//
//   그래서 합치지 않고 이 파일에 따로 담았습니다. 어느 쪽에서 온 말인지
//   연재쌤이 물으실 때 답할 수 있어야 하기 때문입니다.
//
// ── ★새로 들어온 것 다섯 ──────────────────────────────────────────
//   저장소에 한 줄도 없던 것들입니다.
//     온도 · 하루 · 인생(유년기~노년기) · 숫자 · 문과:이과
//
//   ★문과:이과 는 31부 §9 에 남겨 둔 확인 항목을 풉니다.
//     "木만 문과 70%·이과 30% 가 있고 나머지 넷은 없다" 고 적었는데,
//     25쪽에 다섯 개가 다 있습니다.
//
//   ★인생(유년기~노년기)은 대운을 짚을 때 쓸 만한 자료로 보입니다.
//
// ── ⚠️ 병 이름은 안 담았습니다 (대표님 지시) ────────────────────────
//   25쪽 건강 칸과 과다 칸에도 병명이 있어 같은 잣대로 뺐습니다.
//     水 건강 : 병 이름 둘을 뺌 (두통은 증상이라 남김)
//     水 과다 : 병 이름 둘을 뺌
//   ⚠️ 그래서 이 두 칸은 교재와 글자가 다릅니다. OCR 사고가 아닙니다.
//      검수 때는 PDF 스캔 25쪽을 함께 보십시오.
//   ※ '안과' '정신과' 는 병명이 아니라 진료과 이름이라 그대로 두었습니다.

import type { Ohaeng } from './simsanOhaeng'

export interface Ohaeng25Row {
  /** 한자와 덕목 — 교재 표 머리 (木(仁) 처럼) */
  hanja: string
  /** 덕목 — 仁 禮 信 義 智 */
  virtue: string

  /** 계절  ⚠️ ohaengTrait.season 과 겹침 */
  season: string
  /** 온도  ★새로 들어온 것 (土는 교재에 빈칸) */
  temperature: string
  /** 하루 중 언제  ★새로 들어온 것 */
  timeOfDay: string
  /** 인생의 어느 때  ★새로 들어온 것 */
  lifeStage: string
  /** 방향  ⚠️ ohaengInfo.direction 과 겹침 */
  direction: string
  /** 색상  ⚠️ ohaengColor.EL_BG 와 겹침 (이미 교재와 같은 색) */
  color: string
  /** 맛  ⚠️ ohaengInfo.taste 와 겹침 */
  taste: string
  /** 숫자  ★새로 들어온 것 */
  numbers: string

  /** 건강 — 계통·장부  ⚠️ ohaengTrait.lackAdult · ohaengInfo.health 와 겹침 */
  health: string[]
  /** 건강 칸 아래 ▶ 로 적힌 한 마디 */
  healthKeyword: string

  /** 문과:이과 비율  ★새로 들어온 것 */
  munYi: string
  /** 학과 전공  ⚠️ career/tables/gwa.ts 와 겹침 */
  majors: string[]
  /** 일반 특성 */
  traits: string[]
  /** 오행이 적당하고 안정적일 때  ⚠️ ohaengTrait.develop 과 겹침(내용은 다름) */
  stable: string[]
  /** 오행이 과다할 때  ⚠️ ohaengTrait.excess 와 겹침(내용은 다름) */
  excessive: string[]

  src: string
}

export const OHAENG_25: Record<Ohaeng, Ohaeng25Row> = {
  목: {
    hanja: '木(仁)', virtue: '仁',
    season: '봄', temperature: '따뜻함', timeOfDay: '아침', lifeStage: '유년기',
    direction: '동', color: '청색', taste: '신맛', numbers: '3, 8',
    health: ['간', '담(쓸개)', '췌장', '뼈'],
    healthKeyword: '움직임, 반응',
    munYi: '7:3',
    majors: ['정치학과', '법학과', '행정학과', '어문학', '신문방송학과', '청소년학과'],
    traits: ['어짊', '강직', '인정', '명예욕'],
    stable: ['자신감', '대인 관계', '환경 적응력', '욕심 많음', '명예욕', '자존심', '집중력'],
    excessive: ['안하무인', '용두사미', '미래 지향적', '전문 자유직', '일을 벌이고 책임감 없음'],
    src: '교재 25쪽',
  },

  화: {
    hanja: '火(禮)', virtue: '禮',
    season: '여름', temperature: '뜨거움', timeOfDay: '낮', lifeStage: '청년기',
    direction: '남', color: '적색', taste: '쓴맛', numbers: '2, 7',
    health: ['순환계', '심혈관계', '안과', '정신과'],
    healthKeyword: '순환, 전달, 표현',
    munYi: '6:4',
    majors: ['스포츠학과', '디자인학과', '헤어·의상 디자인', '피부 미용', '연극 영화',
             '컴퓨터 그래픽', '컴퓨터 관련'],
    traits: ['명랑', '예의', '성급함'],
    stable: ['활동적', '적극적', '감정적', '자신감', '예의', '양보심', '화려함', '예체능 재능 많음'],
    excessive: ['예술적 재능', '몰입 능력', '작심삼일', '욱기 발동', '끈기 부족', '성급함', '후회'],
    src: '교재 25쪽',
  },

  토: {
    hanja: '土(信)', virtue: '信',
    // ⚠️ 교재 25쪽 온도 칸은 土만 비어 있습니다. 빠뜨린 것이 아닙니다.
    season: '환절기', temperature: '', timeOfDay: '사이', lifeStage: '중년기',
    direction: '중앙', color: '황색', taste: '단맛', numbers: '5, 10',
    health: ['근육계', '생식기계', '비장', '위장', '유방', '비뇨기'],
    healthKeyword: '연결, 전달, 조정',
    munYi: '5:5',
    majors: ['부동산', '건축', '토목', '임업', '농경제', '외교', '어문', '관광', '법학', '항공학과'],
    traits: ['믿음', '고집', '끈기'],
    stable: ['포용력', '중후함', '중용', '신용', '믿음', '중개하는 직업'],
    excessive: ['타인 무시', '주변 갈등', '성격 굴곡', '비밀 많음', '엉큼', '언행 불일치'],
    src: '교재 25쪽',
  },

  금: {
    hanja: '金(義)', virtue: '義',
    season: '가을', temperature: '서늘함', timeOfDay: '저녁', lifeStage: '장년기',
    direction: '서', color: '백색', taste: '매운맛', numbers: '4, 9',
    health: ['골격계', '호흡기계', '피부계', '대장', '폐', '뼈'],
    healthKeyword: '분리',
    munYi: '3:7',
    majors: ['기계', '금속', '섬유', '산업공학', '항공', '재료', '자동차', '체육', '의예',
             '육해공사', '경찰대', 'NGO학과'],
    traits: ['완벽', '예민', '개혁'],
    stable: ['상황 대처 능력', '판단력', '결단력', '냉철한 분별', '의협심', '의리', '봉사 정신'],
    excessive: ['날카로운 성격', '무서움', '폭력성', '강요', '요구', '잔소리꾼', '송곳 말투',
                '비판력', '찬바람'],
    src: '교재 25쪽',
  },

  수: {
    hanja: '水(智)', virtue: '智',
    season: '겨울', temperature: '차가움', timeOfDay: '밤', lifeStage: '노년기',
    direction: '북', color: '흑색', taste: '짠맛', numbers: '1, 6',
    // ★교재는 여기에 병명 둘을 함께 적습니다. 대표님 지시로 빼고 적었습니다.
    health: ['비뇨기계', '혈액계', '체액(눈물, 콧물)', '신장', '두통'],
    healthKeyword: '체액 저장, 배설',
    munYi: '4:6',
    majors: ['경제', '경영', '회계', '무역', '물리', '수학', '생물', '미생물학', '전자계산학',
             '정보처리', '전자', '전산통계', '정보관리학과'],
    traits: ['총명', '지혜', '기획력', '우유부단'],
    stable: ['두뇌 총명', '계획적', '도량 넓음', '배움 욕망', '임기응변', '아이디어',
             '성격 예민', '신중함', '철저한 준비'],
    // ★교재는 여기에도 병명 둘을 적습니다. 같은 까닭으로 빼고 적었습니다.
    excessive: ['과도한 상상력', '잔머리', '권모술수', '음모', '꼼수', '생각 많음', '자존심 강'],
    src: '교재 25쪽',
  },
}

/** 교재 표의 줄 차례 — 화면에 표로 그릴 때 이 순서를 쓰십시오 */
export const TABLE_25_ROWS = [
  '계절', '온도', '하루', '인생', '방향', '색상', '맛', '숫자',
  '건강', '문과:이과', '학과 전공', '일반 특성',
  '오행이 적당하고 안정적일 때', '오행이 과다할 때',
] as const

/** 오행 차례 — 교재 표의 열 순서와 같습니다 */
export const OHAENG_ORDER_25: Ohaeng[] = ['목', '화', '토', '금', '수']

/**
 * 문과:이과 비율을 숫자로 돌려준다.
 *   진로적성에서 학과를 고를 때 쓸 수 있습니다.
 *   예) munYiRatio('목') → { mun: 7, yi: 3 }
 */
export function munYiRatio(el: Ohaeng): { mun: number; yi: number } {
  const [mun, yi] = OHAENG_25[el].munYi.split(':').map(Number)
  return { mun, yi }
}
