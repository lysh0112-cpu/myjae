// ★2026-07-27 — 커플채팅('채팅방' 탭)을 걷어냈다. (대표님 지시: 테스트였으므로 전부 삭제)
//   지운 것은 app/couple-chat/** 뿐이다.
//   ⚠️ 상담사–고객 채팅(consultant/ConsultantChat · consulting/ChatRoom ·
//      components/chat/* · hooks/useChatMessages·useSendMessage)은 별개이며 살아 있다.
//      연재쌤 지시로 나중에 되살릴 것이니 절대 함께 지우지 말 것.
//
//   한 칸이 비었다. 다음 서비스(진로적성 등)를 넣을 자리다.
export const NAV_TABS = [
  { href: '/',            label: '홈',      icon: 'home' },
  { href: '/mypage-new', label: '마이',    icon: 'profile' },
  { href: '/category',    label: '카테고리', icon: 'grid' },
  { href: '/auth/login',  label: '로그인',   icon: 'user' },
]
