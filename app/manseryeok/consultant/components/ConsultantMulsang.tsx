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
  const [rows, setRows] = useState<MulsangRow[]>([])

  useEffect(() => {
    if (!consultationId) {
      setRows([])
      return
    }
    setLoading(true)
    supabase
      .from('mulsang_images')
      .select('id, image_url, commentary, style, created_at')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setRows((data as MulsangRow[]) || [])
        setLoading(false)
      })
  }, [consultationId])

  const gold = '#FAC775'
  const cardBg = 'rgba(255,255,255,0.06)'
  const textColor = '#e8e2f5'

  if (!consultationId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '24px' }}>🖼️</span>
        <span style={{ fontSize: '11px', color: '#8a88b0' }}>고객 선택 시 표시됩니다</span>
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

  if (rows.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '8px', padding: '20px', textAlign: 'center' }}>
        <span style={{ fontSize: '24px' }}>🖼️</span>
        <span style={{ fontSize: '11px', color: '#8a88b0' }}>이 고객의 물상도 그림이<br />아직 없습니다</span>
      </div>
    )
  }

  const mainCommentary = rows.find(r => r.commentary)?.commentary || {}

  const styleLabel = (style: string | null) => {
    if (style === 'ghibli') return '지브리풍'
    if (style === 'oriental') return '수묵담채화'
    return style || '그림'
  }

  return (
    <div style={{ fontSize: fontSize + 'px', color: textColor }}>
      {rows.map((row, i) => (
        row.image_url && (
          <div key={row.id} style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: (fontSize - 2) + 'px', color: gold, marginBottom: '4px' }}>
              {styleLabel(row.style)} {rows.length > 1 ? `(${i + 1}/${rows.length})` : ''}
            </div>
            <img src={row.image_url} alt="물상도" style={{ width: '100%', borderRadius: '8px', display: 'block', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'right', marginTop: '4px' }}>
              <a href={row.image_url} download={`mulsang_${i + 1}.png`} style={{ fontSize: (fontSize - 2) + 'px', color: gold, textDecoration: 'none' }}>⬇ 저장</a>
            </div>
          </div>
        )
      ))}

      <div style={{ background: cardBg, borderRadius: '10px', padding: '12px', border: '1px solid rgba(250,199,117,0.15)' }}>
        {mainCommentary.title && (
          <div style={{ fontSize: (fontSize + 2) + 'px', fontWeight: 'bold', color: gold, marginBottom: '10px', lineHeight: 1.5 }}>
            "{mainCommentary.title}"
          </div>
        )}
        {[
          { label: '주인공 (나)', text: mainCommentary.subject },
          { label: '환경', text: mainCommentary.environment },
          { label: '핵심 에너지 (용신)', text: mainCommentary.yongsin },
          { label: '삶의 조언', text: mainCommentary.advice },
        ].filter(s => s.text).map((s, i) => (
          <div key={i} style={{ borderLeft: `3px solid ${gold}`, padding: '2px 10px', marginBottom: '12px' }}>
            <div style={{ fontSize: (fontSize - 1) + 'px', color: gold, marginBottom: '3px' }}>{s.label}</div>
            <div style={{ lineHeight: 1.7, color: textColor }}>{s.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
