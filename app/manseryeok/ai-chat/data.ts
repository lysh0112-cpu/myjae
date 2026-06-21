// app/manseryeok/ai-chat/data.ts

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatMode = 'couple' | 'married' | 'prewedding' | 'birth' | 'personal'

export const FIRST_MESSAGE: Record<ChatMode, string> = {
  couple:
    '두 분 사주를 살펴봤어요 💑\n궁합 점수는 82점이에요. 어떤 점이 가장 궁금하세요?',
  prewedding:
    '두 분 결혼 정말 잘 어울리는 궁합이에요 💍\n택일이나 결혼 후 생활이 궁금하세요?',
  married:
    '두 분 사주를 보니 요즘 힘드신 이유가 보여요 👫\n어떤 점이 가장 궁금하세요?',
  birth:
    '부모님 사주로 아이 인연을 봤어요 👶\n언제 낳으면 좋을지 궁금하세요?',
  personal:
    '사주를 살펴봤어요 🔮\n어떤 점이 가장 궁금하세요?',
}

export const QUICK_QUESTIONS: Record<ChatMode, string[]> = {
  couple: [
    '우리 결혼해도 될까요?',
    '같이 살면 잘 맞을까요?',
    '언제 결혼하면 좋을까요?',
    '우리 사이 위기 시기가 있나요?',
  ],
  prewedding: [
    '결혼 날짜 언제가 좋을까요?',
    '결혼 후 재물운은 어떤가요?',
    '자녀는 언제 낳으면 좋을까요?',
    '신혼 생활에서 주의할 점은?',
  ],
  married: [
    '왜 자꾸 싸우는 걸까요?',
    '관계가 좋아지는 방법이 있나요?',
    '재물운은 어떤가요?',
    '자녀 인연이 있나요?',
  ],
  birth: [
    '언제 임신하면 좋을까요?',
    '아이 사주가 좋은 시기는?',
    '출산 후 산모 건강은 어떤가요?',
    '아이와 부모 궁합은?',
  ],
  personal: [
    '올해 운세는 어떤가요?',
    '직업은 무엇이 맞나요?',
    '결혼은 언제 할까요?',
    '재물운은 어떤가요?',
  ],
}
