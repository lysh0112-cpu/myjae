'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from './components/home/Header'
import HeroBanner from './components/home/HeroBanner'
import AiManseryeokSection from './components/home/AiManseryeokSection'
import ServiceCards from './components/home/ServiceCards'
import ReviewSection from './components/home/ReviewSection'
import BottomNav from './components/BottomNav'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const chatHomeOn = localStorage.getItem('chatHomeOn')
    if (chatHomeOn === 'true') {
      router.replace('/couple-chat')
    }
  }, [router])

  return (
    <div className="min-h-screen relative" style={{ background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
      <Header />
      <main className="pb-28">
        <HeroBanner />
        <AiManseryeokSection />
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />
        <ServiceCards />
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />
        <ReviewSection />
      </main>
      <BottomNav />
      {/* 커플 채팅방 플로팅 버튼 */}
      <a href="/couple-chat"
        style={{
          position: 'fixed', bottom: '80px', right: '20px',
          width: '50px', height: '50px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #c2185b, #e91e8c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', textDecoration: 'none',
          boxShadow: '0 4px 15px rgba(194,24,91,0.4)',
          zIndex: 40,
        }}>
        💕
      </a>
    </div>
  )
}
