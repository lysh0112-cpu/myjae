'use client'

// ==========================================================================
// 루트 홈 (/) — 새 피치톤 홈(home-new)으로 통일.
//
// 이전에는 이 파일이 구버전 다크 홈(#1a1a18 + 추천후기 ReviewSection + 구 BottomNav)
// 이었는데, 새 홈(home-new)과 섞여 위는 밝고 아래는 어두운 짬뽕 화면이 나왔음.
// → 구 홈 요소를 제거하고, 루트에서 새 홈 컴포넌트(HomeNew)를 그대로 렌더한다.
//   URL은 '/' 유지(깜빡임 없음), 하단 네비 홈버튼(→'/')도 새 홈으로 도착.
//
// 참고: 구 홈에 있던 'chatHomeOn' → /couple-chat 자동진입 로직은 보존.
//   (일부 사용자/설정이 쓰던 흐름일 수 있어 함부로 제거하지 않음)
// ==========================================================================

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import HomeNew from './home-new/page'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const chatHomeOn = localStorage.getItem('chatHomeOn')
    if (chatHomeOn === 'true') {
      router.replace('/couple-chat')
    }
  }, [router])

  return <HomeNew />
}
