/**
 *  일진내정법 — ★교재 찾기 표 (로컬)  · 2026-09-15 (9부)
 *  [대표님] 「외부 AI 를 거치지 않고 프로그램 자체의 데이터 검색으로」
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  🔴 [왜 AI 를 안 쓰는가]  대표님 판단입니다 —                      │
 *  │     값 0원 · 즉시 · 망이 끊겨도 됨 · ★늘 같은 답 ·                 │
 *  │     ⛔ «지어낼 여지가 없음» (표에 있는 것만 나옵니다)               │
 *  │  ⇒ 거친 낱말표만으로 시험해 보니 ★여섯 건 중 여섯을 찾았습니다.     │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ⛔ ★DB 에 넣지 «않았습니다» —
 *     교재는 안 바뀌고, 로컬 파일이어야 ★검사가 «값으로» 지킵니다.
 *     (DB 로 하면 8부의 「표가 셋」 처럼 빠뜨릴 곳이 늘어납니다)
 *
 *  ⚠️ ★낱말은 «제가 지었습니다» [대표님 승낙 2026-09-15].
 *     ⇒ 연재쌤 말투와 다를 수 있습니다. ★이 파일만 고치시면 됩니다.
 *
 *  🔴 [must · more · not 이 셋인 까닭]
 *     처음에 낱말 하나로 해 봤더니 —
 *       「★아들이 유학 간다는데」 가 ★«출산» 에도 걸렸습니다 (「아들」 때문에).
 *     ⇒ must 로 «반드시 있어야 할 말» 을 못 박고
 *       not 으로 «있으면 떨어뜨릴 말» 을 두어 곁가지를 막습니다.
 *
 *  ⛔ 못 찾으면 ★「못 찾았어요」 라고 합니다 [대표님 ㉮].
 *     ⇒ «가장 가까운 것» 을 억지로 내밀지 «않습니다».
 */

import type { Jari } from '../sinGung'

export interface LookupRow {
  id: string
  /** 화면에 보일 이름 */
  label: string
  /** ★이것이 하나도 없으면 «아예 안 걸립니다» */
  must: string[]
  /** 있으면 점수가 오릅니다 */
  more?: string[]
  /** ⛔ 있으면 «떨어뜨립니다» — 곁가지를 막는 자리 */
  not?: string[]
  /** 볼 자리 */
  jari?: Jari[]
  /** 교재 쪽 */
  page: string
  /** 콤보의 어느 질문인가 — 누르면 그 자리가 강조됩니다 */
  purposeId?: string
  /** 교재 사례이면 그 문점일 */
  iljin?: string
  /** 사례 한 줄 — 교재의 «문» 을 줄여 적은 것 */
  summary?: string
}

/* ══════════════════════════════════════════════════════════════════
 *  ① 콤보 27개 — 같은 질문을 «말» 로도 찾을 수 있게
 * ══════════════════════════════════════════════════════════════════ */
export const LOOKUP_PURPOSE: LookupRow[] = [
  { id: 'land', label: '땅·부동산을 사고파는 일', purposeId: 'land', jari: ['연지'], page: '교재 4~7쪽',
    must: ['땅', '토지', '부동산', '선산', '임야'], more: ['사', '팔', '처분', '매매'] },
  { id: 'house', label: '집을 사고파는 일 · 전월세', purposeId: 'house', jari: ['월지'], page: '교재 42~43쪽',
    must: ['집', '아파트', '전세', '월세', '셋방', '주택'], more: ['사', '팔', '이사', '계약', '빠지'],
    not: ['가게', '점포'] },
  { id: 'bizStart', label: '가게·사업을 새로 시작할지', purposeId: 'bizStart', jari: ['시지'], page: '교재 11~12쪽',
    must: ['창업', '개업', '차릴', '차리', '시작'], more: ['가게', '사업', '장사', '식당', '미용실'],
    not: ['접', '정리', '그만'] },
  { id: 'bizGrow', label: '가게·사업을 넓힐지', purposeId: 'bizGrow', jari: ['시지'], page: '교재 19쪽',
    must: ['확장', '넓힐', '늘릴', '키울'], more: ['가게', '사업', '장사', '직원'] },
  { id: 'bizEnd', label: '가게·사업을 접거나 업종을 바꿀지', purposeId: 'bizEnd', jari: ['시지'], page: '교재 16·22~23쪽',
    must: ['접', '정리', '그만', '업종', '바꿀', '폐업'], more: ['가게', '사업', '장사', '적자'] },
  { id: 'partner', label: '동업을 할지 · 상대가 맞는지', purposeId: 'partner', jari: ['시지', '월지'], page: '교재 13~15쪽',
    must: ['동업'], more: ['친구', '같이', '함께', '파트너'] },
  { id: 'sellNow', label: '물건을 지금 팔지 · 기다릴지', purposeId: 'sellNow', jari: ['월지', '시지'], page: '교재 18쪽',
    must: ['물건', '재고', '매점', '매석', '사재기'], more: ['팔', '기다', '경매', '쌓'] },
  { id: 'money', label: '돈이 들어올지 (금전 이익)', purposeId: 'money', jari: ['시지', '일지'], page: '교재 7쪽',
    must: ['돈', '금전', '수금', '이익', '매상'], more: ['들어', '받을', '벌'] },

  { id: 'marry', label: '결혼을 할 수 있을지 · 언제', purposeId: 'marry', jari: ['일지'], page: '교재 30~32·34~35쪽',
    must: ['결혼', '혼인', '시집', '장가'], more: ['언제', '할 수', '가능'], not: ['이혼', '재혼'] },
  { id: 'dating', label: '사귀는 사람과 잘될지', purposeId: 'dating', jari: ['일지'], page: '교재 29~31쪽',
    must: ['사귀', '애인', '남친', '여친', '연애', '교제', '동거'], more: ['잘될', '만날'] },
  { id: 'callBack', label: '헤어진 사람에게 연락이 올지', purposeId: 'callBack', jari: ['일지'], page: '교재 29~30쪽',
    must: ['연락'], more: ['헤어', '싸우', '다투', '기다'] },
  { id: 'divorce', label: '부부 사이 불화 · 이혼을 할지', purposeId: 'divorce', jari: ['일지', '월지'], page: '교재 5·41쪽',
    must: ['이혼', '갈라', '불화', '위자료'], more: ['남편', '부인', '아내', '소송', '재산'] },
  { id: 'affair', label: '배우자·연인의 외도', purposeId: 'affair', jari: ['일지'], page: '교재 39~40쪽',
    must: ['바람', '외도', '딴 여자', '딴 남자'], more: ['남편', '부인', '여친', '남친', '의심'] },
  { id: 'remarry', label: '재혼을 할지', purposeId: 'remarry', jari: ['일지'], page: '교재 28·37쪽',
    must: ['재혼'], more: ['다시', '백년해로'] },

  { id: 'pregnant', label: '아이를 가질 수 있을지', purposeId: 'pregnant', jari: ['시지'], page: '교재 24~25·35~36쪽',
    must: ['임신', '아이를 가', '애를 가', '불임', '수정'], more: ['아기', '자식'] },
  { id: 'birth', label: '무사히 출산할지', purposeId: 'birth', jari: ['시지', '일지'], page: '교재 25·37쪽',
    must: ['출산', '낳', '순산'], more: ['아들', '딸', '며느리', '무사'] },
  { id: 'child', label: '자식과의 인연 · 속을 썩이는지', purposeId: 'child', jari: ['시지'], page: '교재 26~27쪽',
    must: ['자식', '자녀'], more: ['속', '인연', '불효', '말썽'], not: ['유학', '대학', '시험'] },
  { id: 'exam', label: '대학·시험에 붙을지', purposeId: 'exam', jari: ['월지'], page: '교재 47~54쪽',
    must: ['대학', '시험', '합격', '사시', '고시', '수능'], more: ['아들', '딸', '공부', '학과', '진학'] },
  { id: 'study', label: '유학을 보낼지', purposeId: 'study', jari: ['월지', '시지'], page: '교재 26쪽',
    must: ['유학', '어학연수'], more: ['아들', '딸', '형편', '보낼'], not: ['군대'] },

  { id: 'job', label: '취업이 될지', purposeId: 'job', jari: ['월지'], page: '교재 47~49쪽',
    must: ['취업', '취직', '입사', '일자리'], more: ['시험', '면접', '지원'], not: ['승진'] },
  { id: 'promote', label: '승진·재임용이 될지', purposeId: 'promote', jari: ['월지'], page: '교재 47~48쪽',
    must: ['승진', '재임용', '진급'], more: ['공무원', '직장'] },
  { id: 'quit', label: '직장을 그만둘지 · 옮길지', purposeId: 'quit', jari: ['월지'], page: '교재 50~51쪽',
    must: ['사직', '퇴사', '이직', '옮길', '그만둘'], more: ['직장', '회사', '스트레스', '상사'] },
  { id: 'lawsuit', label: '재판에서 이길지', purposeId: 'lawsuit', jari: ['일지', '시지'], page: '교재 20~21쪽',
    must: ['재판', '소송', '송사', '고소', '관재'], more: ['이길', '승소', '변호사', '임대료'] },

  { id: 'move', label: '이사를 할지 · 언제', purposeId: 'move', jari: ['월지'], page: '교재 44~45쪽',
    must: ['이사'], more: ['언제', '갈까', '옮기'], not: ['방향'] },

  { id: 'moveDir', label: '이사 방향은 어디가 좋은가', purposeId: 'moveDir', page: '교재 45쪽',
    must: ['방향'], more: ['이사', '어디', '쪽'], not: ['사업', '가게'] },
  { id: 'bizDir', label: '사업장·가게 방향', purposeId: 'bizDir', page: '교재 16~17쪽',
    must: ['방향', '자리'], more: ['사업', '가게', '간판', '출입문', '금고'] },
  { id: 'homePlace', label: '집 안에 무엇을 어디에 둘까', purposeId: 'homePlace', page: '교재 45쪽',
    must: ['어디에 둘', '놓을', '배치'], more: ['금고', '화장대', '어항', '화장실', 'TV'] },
]

/* ══════════════════════════════════════════════════════════════════
 *  ② 교재 사례 — 11~54쪽의 «문» 들  [대표님 「사례까지 싹 넣고」]
 *
 *  ⚠️ 교재의 «문)…」 한 줄을 ★줄여 적은 것입니다. 풀이는 «안» 담았습니다.
 *     ⇒ 찾으면 ★「교재 ○쪽을 보십시오」 로 안내합니다.
 *     ⛔ 교재 풀이를 여기 옮겨 적지 마십시오 — 그러면 ★두 벌이 됩니다.
 *
 *  ⛔ ★넣지 «않은» 사례 — 대표님 확정 (2026-09-15)
 *     · 21쪽 종업원 공금 도주 → 어디 숨었나   ★특정인을 지목합니다
 *     · 22쪽 삼겹살 동토 처방                 ★주술입니다
 *     · 19쪽 소주·소금 뿌리기                 〃
 *     · 15·21쪽 성씨 오행으로 사람 고르기      ★특정인을 가리킵니다
 *     ⇒ 41쪽 «이혼 위자료» 사례는 ★질문만 넣고 «금액» 은 안 적었습니다.
 * ══════════════════════════════════════════════════════════════════ */
export const LOOKUP_CASE: LookupRow[] = [
  { id: 'c12', label: '미용실을 해볼까', iljin: '甲寅', page: '교재 12쪽', purposeId: 'bizStart', jari: ['시지'],
    must: ['미용실', '미용'], summary: '중년 여자가 미용실을 해볼까 하여 상담' },
  { id: 'c13a', label: '퇴직금으로 슈퍼마켓', iljin: '乙巳', page: '교재 13쪽', purposeId: 'bizStart', jari: ['시지'],
    must: ['슈퍼', '마트', '퇴직금'], more: ['정년', '퇴직'], summary: '정년 퇴임한 60대가 퇴직금으로 슈퍼마켓' },
  { id: 'c13b', label: '직장 그만두고 식당', iljin: '庚辰', page: '교재 13쪽', purposeId: 'bizStart', jari: ['시지'],
    must: ['식당', '음식점'], more: ['직장', '그만'], summary: '중년 남자가 직장을 그만두고 식당' },
  { id: 'c14a', label: '친구와 동업해도 되나', iljin: '辛未', page: '교재 14쪽', purposeId: 'partner', jari: ['시지'],
    must: ['동업'], more: ['친구', '괜찮'], summary: '친구와 동업을 하려는데 괜찮은지' },
  { id: 'c14b', label: '빚 내서 시작한 동업', iljin: '辛丑', page: '교재 14쪽', purposeId: 'partner', jari: ['시지'],
    must: ['동업'], more: ['빚', '돈을 잘 벌'], summary: '빚을 내 동업을 시작했는데 돈을 벌까' },
  { id: 'c14c', label: '친구와 호프집', iljin: '乙巳', page: '교재 14쪽', purposeId: 'partner', jari: ['시지'],
    must: ['호프', '술집'], more: ['친구', '동업'], summary: '젊은 여자가 친구와 호프집을 하려는데' },
  { id: 'c17', label: '업종을 바꿀까 계속할까', iljin: '乙丑', page: '교재 17쪽', purposeId: 'bizEnd', jari: ['시지'],
    must: ['업종'], more: ['바꿀', '계속'], summary: '사업 업종을 바꿀까 그냥 계속할까' },
  { id: 'c18a', label: '물건을 지금 팔까 기다릴까', iljin: '辛未', page: '교재 18쪽', purposeId: 'sellNow', jari: ['월지'],
    must: ['물건'], more: ['쌓', '싸게', '기다', '나중'], summary: '물건이 쌓였는데 지금 팔까 나중에 팔까' },
  { id: 'c18b', label: '경매로 사재기하면 벌까', iljin: '辛酉', page: '교재 18쪽', purposeId: 'sellNow', jari: ['시지'],
    must: ['경매', '사재기'], more: ['물건', '벌'], summary: '경매로 물건을 사재기하면 돈을 벌 수 있는지' },
  { id: 'c18c', label: '수출 — 배와 비행기 어느 쪽', iljin: '辛卯', page: '교재 18쪽', jari: ['일지'],
    must: ['수출', '선박', '비행기', '배로'], more: ['보내', '물건'], summary: '수출 물건을 배와 비행기 어느 쪽으로 보낼까' },
  { id: 'c19', label: '사업을 확장해도 될까', iljin: '庚戌', page: '교재 19쪽', purposeId: 'bizGrow', jari: ['시지'],
    must: ['확장'], more: ['사업', '성공'], summary: '사업을 확장할 예정인데 성공할까' },
  { id: 'c20a', label: '사기죄로 고소당했는데 이길까', iljin: '癸酉', page: '교재 20쪽', purposeId: 'lawsuit', jari: ['일지'],
    must: ['사기', '고소'], more: ['재판', '이길', '억울'], summary: '억울하게 사기죄로 고소당해 재판에서 이길 수 있는지' },
  { id: 'c20b', label: '건물 임대료 송사', iljin: '辛未', page: '교재 20쪽', purposeId: 'lawsuit', jari: ['시지'],
    must: ['임대료'], more: ['건물', '송사', '재판'], summary: '건물 임대료 때문에 송사를 일으킨 주인이 이길까' },
  { id: 'c21', label: '이혼 소송의 결과와 끝나는 때', iljin: '乙巳', page: '교재 21쪽', purposeId: 'divorce', jari: ['일지'],
    must: ['이혼'], more: ['소송', '언제', '끝'], summary: '이혼 소송의 결과와 언제 끝날지' },
  { id: 'c23a', label: '가게 계약이 찜찜한데 사기인가', iljin: '甲戌', page: '교재 23쪽', purposeId: 'bizStart', jari: ['시지'],
    must: ['계약'], more: ['가게', '찜찜', '사기'], summary: '가게를 계약했는데 사기를 당한 것이 아닌지' },
  { id: 'c23b', label: '적자인 가게를 팔거나 세 줄까', iljin: '丙戌', page: '교재 23쪽', purposeId: 'bizEnd', jari: ['시지'],
    must: ['적자'], more: ['가게', '팔', '세'], summary: '가게가 계속 적자여서 팔거나 세를 주고 싶은데' },
  { id: 'c24a', label: '사업체와 집을 정리하고 이민', iljin: '辛未', page: '교재 24쪽', purposeId: 'bizEnd', jari: ['시지', '월지'],
    must: ['이민'], more: ['사업체', '정리', '팔'], summary: '사업체를 정리하고 이민을 가려는데 잘 팔릴지' },
  { id: 'c24b', label: '방앗간을 정리할 수 있을까', iljin: '戊戌', page: '교재 24쪽', purposeId: 'bizEnd', jari: ['시지'],
    must: ['방앗간'], more: ['정리'], summary: '방앗간을 정리하고 싶은데 가능한지' },
  { id: 'c25a', label: '딸이 무사히 출산할까', iljin: '辛亥', page: '교재 25쪽', purposeId: 'birth', jari: ['시지'],
    must: ['출산'], more: ['딸', '무사', '친정'], summary: '친정 어머니가 딸이 무사히 출산할 수 있는지' },
  { id: 'c25b', label: '며느리가 아들을 낳을까', iljin: '己未', page: '교재 25쪽', purposeId: 'birth', jari: ['시지'],
    must: ['며느리'], more: ['아들', '낳'], summary: '시어머니가 며느리가 아들을 낳을 수 있는지' },
  /*  ⚠️ ★must 에 「아들」 «하나만» 두었더니 —
   *     「★아들이 유학 간다는데」 가 이 사례(출산)에도 걸렸습니다.
   *     ⇒ 이 사례의 알맹이는 ★«딸만 낳다가 이번엔 아들인가» 입니다.
   *       ⇒ must 를 «그 알맹이» 로 바꾸고, 「아들」 은 more 로 내렸습니다.
   *  ⛔ must 에 ★«흔한 낱말 하나» 를 두지 마십시오 — 곁가지가 걸립니다. */
  { id: 'c26a', label: '이번엔 아들인가', iljin: '壬戌', page: '교재 26쪽', purposeId: 'birth', jari: ['시지'],
    must: ['딸만', '아들인가', '아들일까', '아들을 낳', '임신'], more: ['아들', '이번'],
    not: ['유학', '대학', '군대'], summary: '딸만 다섯인데 이번에는 아들인지' },
  { id: 'c26b', label: '형편이 안 되는데 아들이 유학', iljin: '丁亥', page: '교재 26쪽', purposeId: 'study', jari: ['월지', '시지'],
    must: ['유학'], more: ['아들', '형편'], summary: '형편이 좋지 않은데 아들이 유학을 보내달라 한다' },
  { id: 'c28a', label: '이혼한 뒤 재혼할지 · 자식이 부양할지', iljin: '乙巳', page: '교재 28쪽', purposeId: 'remarry', jari: ['일지'],
    must: ['재혼'], more: ['이혼', '자식', '부양'], summary: '이혼한 부인이 재혼해야 하는지, 자식이 부양할지' },
  { id: 'c28b', label: '병약한 노인이 앞으로 어떻게 살까', iljin: '戊戌', page: '교재 28쪽', jari: ['시지', '일지'],
    must: ['노인', '늙'], more: ['병약', '앞으로', '살'], summary: '나이 들고 병약한 노인이 앞으로 어떻게 살아야 하는지' },
  { id: 'c29a', label: '애인과 헤어졌는데 연락이 올까', iljin: '丁卯', page: '교재 29쪽', purposeId: 'callBack', jari: ['일지'],
    must: ['연락'], more: ['애인', '싸움', '헤어'], summary: '애인과 싸우고 헤어졌는데 언제 연락이 올까' },
  { id: 'c29b', label: '남친에게 연락이 올까 (2주)', iljin: '癸酉', page: '교재 29쪽', purposeId: 'callBack', jari: ['일지'],
    must: ['연락'], more: ['남친', '2주', '헤어'], summary: '남친과 헤어진 뒤 2주가 지나도 연락이 없는데' },
  { id: 'c29c', label: '남친에게 연락이 올까 (10일)', iljin: '乙丑', page: '교재 29쪽', purposeId: 'callBack', jari: ['일지'],
    must: ['연락'], more: ['남친', '10일', '헤어'], summary: '남친과 헤어진 뒤 10일이 지나도 연락이 없는데' },
  { id: 'c31a', label: '결혼이 가능할지', iljin: '乙丑', page: '교재 31쪽', purposeId: 'marry', jari: ['일지'],
    must: ['결혼'], more: ['가능', '하고 싶'], summary: '결혼하고 싶어하는 여자가 결혼이 가능한지' },
  { id: 'c31b', label: '사귀는 남자와 결혼할 수 있을지', iljin: '乙巳', page: '교재 31쪽', purposeId: 'dating', jari: ['일지'],
    must: ['결혼'], more: ['사귀', '언제까지', '만날'], summary: '사귀는 남자와 결혼할 수 있는지, 언제까지 만날지' },
  { id: 'c31c', label: '결혼은 언제 하면 좋을까', iljin: '癸酉', page: '교재 31쪽', purposeId: 'marry', jari: ['일지'],
    must: ['결혼'], more: ['언제', '좋'], summary: '젊은 남자가 결혼은 언제 하면 좋을지' },
  { id: 'c32a', label: '아이가 몇 명 생길까', iljin: '甲戌', page: '교재 32쪽', purposeId: 'pregnant', jari: ['시지'],
    must: ['아이', '자식'], more: ['몇 명', '몇명', '생길'], summary: '결혼할 남녀가 아이가 몇 명 생길지' },
  { id: 'c32b', label: '여자친구가 바람난 것 같은데', iljin: '乙丑', page: '교재 32쪽', purposeId: 'affair', jari: ['일지'],
    must: ['바람'], more: ['여자친구', '여친', '알 수'], summary: '여자친구가 바람난 것 같은데 알 수 있는지' },
  { id: 'c32c', label: '좋아하는 남자와 동거해도 될까', iljin: '丁未', page: '교재 32쪽', purposeId: 'dating', jari: ['일지'],
    must: ['동거'], more: ['좋아하는', '괜찮'], summary: '젊은 여자가 좋아하는 남자와 동거하고 싶은데' },
  { id: 'c36', label: '늦은 나이에 재혼했는데 아이를 가질까', iljin: '丁未', page: '교재 36쪽', purposeId: 'pregnant', jari: ['시지'],
    must: ['재혼'], more: ['아이', '늦은', '나이'], summary: '늦은 나이에 재혼한 여인이 아이를 가질 수 있는지' },
  { id: 'c37a', label: '임산부가 무사히 출산할까', iljin: '丁未', page: '교재 37쪽', purposeId: 'birth', jari: ['시지'],
    must: ['임산부', '출산'], more: ['무사', '아이'], summary: '임산부가 아이를 무사히 잘 출산할 수 있는지' },
  { id: 'c37b', label: '재혼하면 백년해로할까', iljin: '乙巳', page: '교재 37쪽', purposeId: 'remarry', jari: ['일지'],
    must: ['재혼'], more: ['백년해로', '중년'], summary: '중년 부인이 재혼하면 백년해로할 수 있는지' },
  { id: 'c40a', label: '남편이 바람난 것 같은데', iljin: '壬戌', page: '교재 40쪽', purposeId: 'affair', jari: ['일지'],
    must: ['바람'], more: ['남편', '중년'], summary: '중년 부인이 남편이 바람난 것 같은데' },
  { id: 'c40b', label: '바람난 남편이 가정으로 돌아올까', iljin: '丁巳', page: '교재 40쪽', purposeId: 'affair', jari: ['일지'],
    must: ['바람'], more: ['남편', '돌아', '가정'], summary: '남편이 바람이 났는데 다시 가정으로 돌아올 수 있을까' },
  { id: 'c40c', label: '몰래 하는 바람이 언제까지 갈까', iljin: '丁未', page: '교재 40쪽', purposeId: 'affair', jari: ['일지'],
    must: ['바람'], more: ['몰래', '들키', '언제까지'], summary: '남편 몰래 바람을 피우는데 들키지 않고 언제까지 갈지' },
  { id: 'c41', label: '이혼하면 위자료를 받을 수 있을까', iljin: '辛巳', page: '교재 41쪽', purposeId: 'divorce', jari: ['일지', '시지'],
    must: ['위자료'], more: ['이혼', '외박', '남편'], summary: '남편이 외박이 잦아 이혼하고 싶은데 위자료를 받을 수 있는지' },
  { id: 'c42', label: '시골로 내려가 살아야 할까', iljin: '戊戌', page: '교재 42쪽', purposeId: 'house', jari: ['월지', '일지'],
    must: ['시골'], more: ['내려', '부모님', '무직'], summary: '무직인 남자에게 부모님이 시골로 내려와 살라 하는데' },
  { id: 'c43', label: '집을 수리할까 새로 살까', iljin: '丙寅', page: '교재 43쪽', purposeId: 'house', jari: ['월지'],
    must: ['수리'], more: ['집', '새집', '이사'], summary: '집을 수리해서 사는 것이 좋은가 새로 사는 것이 좋은가' },
  { id: 'c44a', label: '작은 아파트를 살 운인가', iljin: '乙巳', page: '교재 44쪽', purposeId: 'house', jari: ['월지'],
    must: ['아파트'], more: ['살 운', '사고자', '좋은 집'], summary: '아주머니가 작은 아파트를 사려는데 좋은 집을 살 운인지' },
  { id: 'c44b', label: '내 명의 집을 내놓으면 팔릴까', iljin: '乙未', page: '교재 44쪽', purposeId: 'house', jari: ['월지'],
    must: ['내놓'], more: ['집', '명의', '팔릴'], summary: '본인 명의 집을 내놓으면 잘 팔릴지' },
  { id: 'c48a', label: '아들이 네 번째 사시에 합격할까', iljin: '乙未', page: '교재 48쪽', purposeId: 'exam', jari: ['월지'],
    must: ['사시', '사법'], more: ['아들', '합격', '네 번째'], summary: '어머니가 아들의 네 번째 사시 시험 합격 여부' },
  { id: 'c48b', label: '취직 시험에 붙을까', iljin: '丁未', page: '교재 48쪽', purposeId: 'job', jari: ['월지'],
    must: ['취직'], more: ['시험', '합격', '젊은 여자'], summary: '젊은 여자가 취직 시험의 합격 여부' },
  { id: 'c48c', label: '공무원이 올해 승진할까', iljin: '丁未', page: '교재 48쪽', purposeId: 'promote', jari: ['월지'],
    must: ['승진', '재임용'], more: ['공무원', '올해'], summary: '공무원 여자분이 올해 승진 또는 재임용이 될지' },
  { id: 'c49a', label: '관청 자리에 지원했는데 될까', iljin: '辛酉', page: '교재 49쪽', purposeId: 'job', jari: ['일지', '월지'],
    must: ['관청'], more: ['지원', '합격', '자리'], summary: '관청에서 자리가 비어 지원했는데 합격할 수 있는지' },
  { id: 'c49b', label: '취직이 될지 초조하다', iljin: '丁丑', page: '교재 49쪽', purposeId: 'job', jari: ['월지'],
    must: ['취직'], more: ['초조', '장사'], summary: '남자가 취직될 것인지 초조하게 물음' },
  { id: 'c51', label: '사직서를 언제 낼까 · 퇴직 후 장사', iljin: '乙巳', page: '교재 51쪽', purposeId: 'quit', jari: ['월지', '시지'],
    must: ['사직서', '사직'], more: ['퇴직', '장사', '언제'], summary: '중도 퇴직할 남자가 사직서를 언제 낼지, 퇴직 후 장사는' },
  { id: 'c52', label: '공부 안 하는 아이가 대학을 갈까', iljin: '辛巳', page: '교재 52쪽', purposeId: 'exam', jari: ['월지'],
    must: ['대학'], more: ['공부', '아이', '안 하'], summary: '공부 안 하는 아이가 대학을 갈 수 있는지' },
  { id: 'c53a', label: '고3인데 대학과 학과', iljin: '甲戌', page: '교재 53쪽', purposeId: 'exam', jari: ['월지'],
    must: ['고3', '대학'], more: ['학과', '전공', '남학생'], summary: '고3 남학생이 대학을 갈 수 있는지, 어떤 학과가 좋은지' },
  { id: 'c53b', label: '딸의 진로', iljin: '己巳', page: '교재 53쪽', purposeId: 'exam', jari: ['월지'],
    must: ['진로'], more: ['딸', '어머니'], summary: '어머니와 딸이 방문하여 딸의 진로를 물음' },
  { id: 'c54a', label: '아들의 대학 시험 합격 여부', iljin: '辛丑', page: '교재 54쪽', purposeId: 'exam', jari: ['월지'],
    must: ['대학'], more: ['아들', '합격', '시험'], summary: '어머니가 아들의 대학 시험 합격 여부' },
  { id: 'c54b', label: '딸의 대학 시험 합격 여부', iljin: '辛巳', page: '교재 54쪽', purposeId: 'exam', jari: ['월지'],
    must: ['대학'], more: ['딸', '합격', '시험'], summary: '어머니가 딸의 대학 시험 합격 여부' },
]

/** 콤보 + 사례를 한 벌로 */
export const LOOKUP_ALL: LookupRow[] = [...LOOKUP_PURPOSE, ...LOOKUP_CASE]

/* ══════════════════════════════════════════════════════════════════
 *  ③ 찾기 — ⛔ 못 찾으면 «빈 배열» 입니다 [대표님 ㉮]
 *     억지로 «가장 가까운 것» 을 내밀지 않습니다.
 * ══════════════════════════════════════════════════════════════════ */
export interface LookupHit { row: LookupRow; score: number }

export function lookup(q: string, limit = 5): LookupHit[] {
  const s = q.replace(/\s+/g, ' ').trim()
  if (s.length < 2) return []

  const out: LookupHit[] = []
  for (const row of LOOKUP_ALL) {
    //  ⛔ must 가 하나도 없으면 «아예» 안 걸립니다 — 곁가지를 막는 자리
    const hitMust = row.must.filter(w => s.includes(w))
    if (hitMust.length === 0) continue
    //  ⛔ not 이 걸리면 떨어뜨립니다
    if (row.not?.some(w => s.includes(w))) continue

    const hitMore = (row.more ?? []).filter(w => s.includes(w))
    //  ★사례는 콤보보다 «조금» 뒤로 — 콤보가 더 넓은 갈래입니다
    const base = row.iljin ? 0 : 1
    out.push({ row, score: hitMust.length * 3 + hitMore.length + base })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}
