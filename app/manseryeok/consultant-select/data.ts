// app/manseryeok/consultant-select/data.ts
export type Consultant = {
  id: string
  name: string
  spec: string
  tags: string[]
  available: boolean
  featured: boolean
  featuredLabel?: string
  rating: number
  count: number
  reRate: number
  review: string
  reviewDate: string
  price: number
  priceSub: string
}

export const consultants: Consultant[] = [
  {
    id: 'yeonjae',
    name: '연재',
    spec: '자평진전 · 격국론 · 부부 궁합 전문',
    tags: ['부부 전문', '커플 채팅'],
    available: true,
    featured: true,
    featuredLabel: '부부 상담 전문 · 예약 1위',
    rating: 4.9,
    count: 1240,
    reRate: 98,
    review: '왜 싸우는지 정확히 짚어주셨어요. 남편이랑 같이 상담 받고 많이 풀렸습니다.',
    reviewDate: '부부 상담 후기 · 3일 전',
    price: 59900,
    priceSub: '두 사람 동시 채팅 상담',
  },
  {
    id: 'ohyh',
    name: '오연희',
    spec: '억부용신 · 대운 분석 · 관계 상담',
    tags: ['부부 전문'],
    available: true,
    featured: false,
    rating: 4.7,
    count: 620,
    reRate: 91,
    review: '차분하고 꼼꼼하게 설명해주셔서 이해가 쉬웠어요.',
    reviewDate: '부부 상담 후기 · 1주일 전',
    price: 49900,
    priceSub: '두 사람 동시 채팅 상담',
  },
  {
    id: 'lyh',
    name: '박연화',
    spec: '신살 · 12운성 · 자녀 인연 전문',
    tags: ['자녀 전문'],
    available: false,
    featured: false,
    rating: 4.6,
    count: 380,
    reRate: 87,
    review: '자녀 인연 시기를 정확하게 말씀해주셔서 감동받았어요.',
    reviewDate: '부부 상담 후기 · 2주일 전',
    price: 39900,
    priceSub: '두 사람 동시 채팅 상담',
  },
]
