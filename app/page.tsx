import Header from './components/home/Header'
import HeroBanner from './components/home/HeroBanner'
import AiManseryeokSection from './components/home/AiManseryeokSection'
import ServiceCards from './components/home/ServiceCards'
import ReviewSection from './components/home/ReviewSection'
import BottomNav from './components/BottomNav'

export default function Home() {
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
    </div>
  )
}
