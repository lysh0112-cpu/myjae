'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// 명연재 색상
const GOLD = '#FAC775'
const BG = '#1C1C1A'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const LINE = '#3a3a38'

// 후기 대상 서비스 (칩 선택)
const SERVICES = ['사주분석', '물상도', '작명', '궁합', '전문가 상담', '기타']

export default function ReviewWritePage() {
  const router = useRouter()

  const [nickname, setNickname] = useState('')
  const [rating, setRating] = useState(5)
  const [serviceType, setServiceType] = useState('사주분석')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // ── 로그인 도입 후: 여기서 로그인한 사용자의 닉네임을 자동으로 채운다 ──
  // useEffect(() => {
  //   const user = ... // 로그인 세션에서 가져오기
  //   if (user?.nickname) setNickname(user.nickname)
  // }, [])
  // 지금은 로그인 전이므로 직접 입력받는다.

  const submit = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해 주세요.')
      return
    }
    if (!content.trim()) {
      alert('후기 내용을 입력해 주세요.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('reviews').insert({
      nickname: nickname.trim(),
      rating,
      service_type: serviceType,
      content: content.trim(),
      // is_approved 는 기본 false → 관리자 승인 후 노출
    })
    setSaving(false)

    if (error) {
      alert('등록 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.')
      console.error(error)
      return
    }
    setDone(true)
  }

  // 등록 완료 화면
  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
        <h2 style={{ color: GOLD, fontSize: 22, marginBottom: 12 }}>후기가 등록되었어요</h2>
        <p style={{ color: SUB, fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          소중한 후기 감사합니다.<br />
          확인 후 후기 목록에 게시됩니다.
        </p>
        <button
          onClick={() => router.push('/manseryeok/reviews')}
          style={{ background: GOLD, color: '#000', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          후기 목록 보기
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* 헤더 */}
        <h1 style={{ color: GOLD, fontSize: 22, fontWeight: 800, marginBottom: 6 }}>추천 후기 작성</h1>
        <p style={{ color: SUB, fontSize: 14, marginBottom: 28 }}>
          명연재를 이용하신 경험을 들려주세요.
        </p>

        {/* 닉네임 */}
        <label style={{ display: 'block', fontSize: 14, color: GOLD, marginBottom: 8 }}>닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="후기에 표시될 닉네임"
          maxLength={20}
          style={{ width: '100%', boxSizing: 'border-box', background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 16, marginBottom: 24, outline: 'none' }}
        />

        {/* 별점 */}
        <label style={{ display: 'block', fontSize: 14, color: GOLD, marginBottom: 8 }}>별점</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 34, lineHeight: 1, padding: 0, color: n <= rating ? GOLD : '#555', transition: 'color .1s' }}
              aria-label={`${n}점`}
            >
              ★
            </button>
          ))}
          <span style={{ alignSelf: 'center', marginLeft: 8, color: SUB, fontSize: 15 }}>{rating}점</span>
        </div>

        {/* 서비스 선택 */}
        <label style={{ display: 'block', fontSize: 14, color: GOLD, marginBottom: 8 }}>어떤 서비스 후기인가요?</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {SERVICES.map((s) => (
            <button
              key={s}
              onClick={() => setServiceType(s)}
              style={{
                background: serviceType === s ? GOLD : CARD,
                color: serviceType === s ? '#000' : '#fff',
                border: `1px solid ${serviceType === s ? GOLD : LINE}`,
                borderRadius: 20, padding: '8px 16px', fontSize: 14, cursor: 'pointer', fontWeight: serviceType === s ? 700 : 400,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* 후기 내용 */}
        <label style={{ display: 'block', fontSize: 14, color: GOLD, marginBottom: 8 }}>후기 내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="상담·분석 경험이 어떠셨나요? 편하게 적어주세요."
          maxLength={1000}
          rows={6}
          style={{ width: '100%', boxSizing: 'border-box', background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 16, lineHeight: 1.6, resize: 'vertical', outline: 'none', marginBottom: 6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 28 }}>
          {/* 하단 고정 경고 안내문 */}
          <p style={{ color: SUB, fontSize: 11, lineHeight: 1.5, margin: 0, flex: 1 }}>
            운영정책에 따라, 비방·욕설·음란·광고성 등 부적절한 후기는 사전 안내 없이 삭제 또는 비공개 처리될 수 있습니다.
          </p>
          {/* 글자 수 표시 (네모 박스) */}
          <span style={{ color: SUB, fontSize: 12, whiteSpace: 'nowrap', background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: '4px 10px' }}>
            {content.length}/1000
          </span>
        </div>

        {/* 등록 버튼 */}
        <button
          onClick={submit}
          disabled={saving}
          style={{ width: '100%', background: saving ? '#7a6a45' : GOLD, color: '#000', border: 'none', borderRadius: 12, padding: '16px', fontSize: 17, fontWeight: 800, cursor: saving ? 'default' : 'pointer' }}
        >
          {saving ? '등록 중…' : '후기 등록하기'}
        </button>

        <p style={{ color: SUB, fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
          등록하신 후기는 확인 후 게시됩니다.
        </p>
      </div>
    </div>
  )
}
