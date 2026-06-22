export const BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', 'IBK기업은행',
  'NH농협은행', '카카오뱅크', '토스뱅크', 'SC제일은행', '씨티은행',
  '부산은행', '대구은행', '광주은행', '전북은행', '경남은행',
  '새마을금고', '신협', '우체국', '수협은행', '케이뱅크',
]

export const SPECIALTIES = [
  '사주·운명', '궁합·연애', '재물·사업', '신살·대운',
  '개명·작명', '타로·점술', '풍수·이사', '전반적 상담',
]

export const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남',
  '제주', '일본', '중국', '홍콩', '기타해외',
]

export function formatPhone(val: string) {
  return val.replace(/[^0-9]/g, '')
}

export function formatAmount(val: number) {
  return val.toLocaleString('ko-KR')
}
