'use client'
import { useState } from 'react'

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function IconComment() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

const POSTS = [
  { id: 1, category: '사주 후기', title: '이명연 선생님 상담 후 실제로 취업됐어요 😭', author: '별빛달빛', time: '2시간 전', likes: 128, comments: 34, hot: true },
  { id: 2, category: 'Q&A', title: '편인격 일간이 재성이 없으면 어떤 운이 오나요?', author: '명리초보자', time: '4시간 전', likes: 47, comments: 12, hot: false },
  { id: 3, category: '자유게시판', title: '2025년 을사년 전체 운세 정리해봤습니다', author: '운세연구가', time: '어제', likes: 312, comments: 89, hot: true },
  { id: 4, category: '궁합', title: '남자친구랑 원진살이 있는데 헤어져야 할까요?', author: '연분홍봄날', time: '어제', likes: 203, comments: 67, hot: false },
  { id: 5, category: '재물운', title: '갑목 일간 2025 재물운 미리보기 — AI 분석 공유', author: '갑목갑목', time: '2일 전', likes: 88, comments: 21, hot: false },
]

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  '사주 후기': { bg: 'rgba(60,52,137,0.3)', color: '#b0aec8' },
  'Q&A': { bg: 'rgba(250,199,117,0.15)', color: '#FAC775' },
  '자유게시판': { bg: 'rgba(76,175,80,0.15)', color: '#81c784' },
  '궁합': { bg: 'rgba(233,30,99,0.15)', color: '#f48fb1' },
  '재물운': { bg: 'rgba(255,152,0,0.15)', color: '#ffcc80' },
}

export default function CommunitySection() {
  const [activeTab, setActiveTab] = useState<'인기' | '최신' | 'Q&A'>('인기')
  return (
    <section className="mt-8 pb-2">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-white">커뮤니티</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8a88a0' }}>사주·운세 정보를 나눠요</p>
        </div>
        <button className="text-xs font-medium" style={{ color: '#FAC775' }}>전체보기 →</button>
      </div>
      <div className="flex gap-1 px-4 mb-3">
        {(['인기', '최신', 'Q&A'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={activeTab === tab ? { background: '#3C3489', color: '#FAC775' } : { background: 'rgba(255,255,255,0.05)', color: '#8a88a0' }}>
            {tab}
          </button>
        ))}
      </div>
      <div className="px-4 flex flex-col gap-2">
        {POSTS.map((post) => {
          const catStyle = CATEGORY_COLORS[post.category] ?? { bg: 'rgba(255,255,255,0.05)', color: '#8a88a0' }
          return (
            <div key={post.id} className="rounded-xl p-4"
              style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: catStyle.bg, color: catStyle.color }}>{post.category}</span>
                  {post.hot && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(255,80,80,0.15)', color: '#ff8080' }}>🔥 HOT</span>
                  )}
                </div>
                <span className="text-[10px] flex-shrink-0" style={{ color: '#8a88a0' }}>{post.time}</span>
              </div>
              <p className="text-sm font-medium text-white leading-snug mb-3">{post.title}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#8a88a0' }}>by {post.author}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#8a88a0' }}><IconHeart />{post.likes}</span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#8a88a0' }}><IconComment />{post.comments}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-4 mt-4">
        <button className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ border: '1px solid rgba(60,52,137,0.5)', color: '#b0aec8', background: 'rgba(60,52,137,0.1)' }}>
          + 글쓰기
        </button>
      </div>
    </section>
  )
}
