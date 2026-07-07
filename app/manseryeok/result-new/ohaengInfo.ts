// app/manseryeok/result-new/ohaengInfo.ts
// ============================================================================
// 오행(목·화·토·금·수) 실생활 설명 사전
// ----------------------------------------------------------------------------
// 용신·희신·기신 카드에서 오행을 눌렀을 때 뜨는 2단계 모달의 내용.
// 명리 일반 지식(오색·오방·오미·오장 등)을 20~30대 초보자용 쉬운 말로 정리.
// 문구를 고치려면 이 파일만 수정하면 됩니다. (직업·취미는 검수 권장)
// ============================================================================

export interface OhaengInfo {
  hanja: string        // 木 火 土 金 水
  name: string         // 나무 불 흙 쇠 물
  emoji: string        // 🌳 🔥 ⛰️ ⚔️ 💧
  oneline: string      // 한마디 (뜻·성질)
  nature: string       // 성질 자세히
  color: string        // 색깔
  direction: string    // 방향
  taste: string        // 음식(맛)
  job: string          // 어울리는 일
  hobby: string        // 취미·활동
  place: string        // 좋은 장소
  item: string         // 소품
  health: string       // 건강(챙길 부위)
  goodWith: string     // 잘 맞는 오행
}

export const OHAENG_INFO: Record<string, OhaengInfo> = {
  목: {
    hanja: '木', name: '나무', emoji: '🌳',
    oneline: '쭉쭉 자라는 나무처럼 성장·시작·의욕',
    nature: '위로 뻗어 오르는 기운이에요. 인정 많고 계획적이며, 새로 시작하고 성장하는 힘이 강해요.',
    color: '초록색', direction: '동쪽', taste: '신맛 (식초·레몬·매실)',
    job: '교육, 출판, 디자인, 의류, 기획',
    hobby: '독서, 화초 가꾸기, 산책, 글쓰기',
    place: '숲, 공원, 나무 많은 곳', item: '초록 옷, 화분, 목재 소품',
    health: '간·쓸개·눈', goodWith: '물(水)',
  },
  화: {
    hanja: '火', name: '불', emoji: '🔥',
    oneline: '활활 타는 불처럼 열정·표현·밝음',
    nature: '밝게 타오르는 기운이에요. 예의 바르고 화끈하며, 사람들 앞에 나서고 표현하는 힘이 강해요.',
    color: '빨강·주황', direction: '남쪽', taste: '쓴맛 (커피·나물·자몽)',
    job: '방송·연예, 예술, 요리, 마케팅, IT',
    hobby: '공연관람, 사진, 댄스, 파티',
    place: '밝은 곳, 무대, 남향 집', item: '빨간 옷, 조명, 향초',
    health: '심장·혈압·눈', goodWith: '나무(木)',
  },
  토: {
    hanja: '土', name: '흙', emoji: '⛰️',
    oneline: '넉넉한 대지처럼 안정·믿음·포용',
    nature: '든든하게 품어주는 기운이에요. 성실하고 중심을 잡아주며, 사람을 포용하고 신뢰를 주는 힘이 강해요.',
    color: '노란색·황토색', direction: '중앙', taste: '단맛 (꿀·고구마·대추)',
    job: '부동산, 건축, 농업, 요식업, 중개·상담',
    hobby: '도자기, 원예, 요리, 봉사활동',
    place: '흙·자연, 시골, 넓은 땅', item: '노란 옷, 도자기, 돌 소품',
    health: '위장·비장·입', goodWith: '불(火)',
  },
  금: {
    hanja: '金', name: '쇠', emoji: '⚔️',
    oneline: '단단한 쇠처럼 결단·의리·원칙',
    nature: '맺고 끊는 기운이에요. 야무지고 정리를 잘하며, 원칙을 지키고 결단하는 힘이 강해요.',
    color: '흰색·은색·금색', direction: '서쪽', taste: '매운맛 (마늘·생강·고추)',
    job: '금융, 법률, 의료, 군인·경찰, 기계',
    hobby: '등산, 골프, 악기연주, 수집',
    place: '산, 높은 건물, 도심', item: '금속 시계·반지, 흰옷',
    health: '폐·기관지·피부', goodWith: '물(水)',
  },
  수: {
    hanja: '水', name: '물', emoji: '💧',
    oneline: '흐르는 물처럼 지혜·유연함·소통',
    nature: '유연하게 흐르는 기운이에요. 생각이 깊고 상황에 잘 맞추며, 지혜롭고 소통하는 힘이 강해요.',
    color: '검정·파랑', direction: '북쪽', taste: '짠맛 (해산물·미역·콩)',
    job: '무역, 유통, 물류, 요식업, 연구',
    hobby: '수영, 여행, 독서, 명상',
    place: '바다, 강, 호수, 온천', item: '검정·파랑 옷, 수족관',
    health: '신장·방광·귀', goodWith: '쇠(金)',
  },
}
