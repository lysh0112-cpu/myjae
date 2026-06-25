'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Commentary {
  title?: string
  subject?: string
  environment?: string
  yongsin?: string
  advice?: string
}

interface MulsangRow {
  id: string
  image_url: string | null
  commentary: Commentary | null
  style: string | null
  created_at: string
}

export default function ConsultantMulsang({
  consultationId,
  fontSize = 13,
}: {
  consultationId: string | null
  fontSize?: number
}) {
  const [loading, setLoading] = useState(false)
  const [row, setRow] = useState<MulsangRow | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!consultationId) {
      setRow(null)
      setNotFound(false)
      return
    }
    setLoading(true)
    setNotFound(false)
    // 이 상담에 연결된 물상도 그림 찾기 (나중에 연결되면 자동으로 표시됨)
    supabase
      .from('mulsang_images')
      .select('id, image_url, commentary, style, created_at')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRow(data[0] as MulsangRow)
        } else {
          setNotFound(true)
        }
        setLoading(false)
      })
  }, [consultationId])

  const gold = '#FAC775'

  if (!consultationId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '24px' }}>🖼️</span>
        <span style={{ fontSize: '11px', color: '#5555aa' }}>고객 선택 시 표시됩니다</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: gold, fontSize: '12px' }}>
        불러오는 중...
      </div>
    )
  }

  if (notFound || !row) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '8px', padding: '20px', textAlign: 'center' }}>
        <span style={{ fontSize: '24px' }}>🖼️</span>
        <span style={{ fontSize: '11px', color: '#5555aa' }}>이 고객의 물상도 그림이<br />아직 없습니다</span>
      </div>
    )
  }

  const c = row.commentary || {}

  return (
    <div style={{ fontSize: fontSize + 'px', color: '#d8d0f0' }}>
      {row.image_url && (
        <img src={row.image_url} alt="물상도" style={{ width: '100%', borderRadius: '8px', marginBottom: '10px', display: 'block' }} />
      )}
      {c.title && (
        <div style={{ fontSize: (fontSize + 2) + 'px', fontWeight: 'bold', color: gold, marginBottom: '10px', lineHeight: 1.5 }}>
          "{c.title}"
        </div>
      )}
      {[
        { label: '주인공 (나)', text: c.subject },
        { label: '환경', text: c.environment },
        { label: '핵심 에너지 (용신)', text: c.yongsin },
        { label: '삶의 조언', text: c.advice },
      ].filter(s => s.text).map((s, i) => (
        <div key={i} style={{ borderLeft: `3px solid ${gold}`, padding: '2px 10px', marginBottom: '12px' }}>
          <div style={{ fontSize: (fontSize - 1) + 'px', color: gold, marginBottom: '3px' }}>{s.label}</div>
          <div style={{ lineHeight: 1.7 }}>{s.text}</div>
        </div>
      ))}
    </div>
  )
}
