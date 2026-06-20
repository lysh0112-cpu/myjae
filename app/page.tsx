import Header from './components/home/Header'
import HeroBanner from './components/home/HeroBanner'
import AiManseryeokSection from './components/home/AiManseryeokSection'
import TodayFortuneBanner from './components/home/TodayFortuneBanner'
import CategoryMenu from './components/home/CategoryMenu'
import CommunitySection from './components/home/CommunitySection'
import BottomNav from './components/BottomNav'

export default function Home() {
  return (
    <div className="min-h-screen relative" style={{ background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
      <Header />
      <main className="pb-28">
        <HeroBanner />
        <AiManseryeokSection />
        <TodayFortuneBanner />
        <CategoryMenu />
        <CommunitySection />
      </main>
      <BottomNav />
    </div>
  )
}
