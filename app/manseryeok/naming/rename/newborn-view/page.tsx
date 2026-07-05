'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ConsultButton from '@/app/components/common/ConsultButton'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

interface Commentary {
  title: string
  summary: string
  good: string
  improve: string
  advice: string
}

interface GradeItem { grade: string }
interface DiagnoseLike {
  yongsinBohwan?: GradeItem
  resourceFlow?: GradeItem
  soundFlow?: GradeItem
  suri?: GradeItem
  overallGrade?: string
}

interface NameRow {
  hangul_name: string | null
  hanja_name: string | null
  chars: SavedChar[] | null
  result: DiagnoseLike | null
  commentary: Commentary | null
  kind: string | null
}

function gradeColor(g: string) {
  if (g === '좋음') return GREEN
  if (g === '아쉬움') return '#E0A04A'
  return '#9a98b0'
}

function NewbornViewInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const nameId = sp.get('nameId') || ''

  const [row, setRow] = useState<NameRow | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!nameId) { setLoaded(true); return }
    supabase.from('my_names')
      .select('hangul_name, hanja_name, chars, result, commentary, kind')
      .eq('id', nameId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRow(data as NameRow)
        setLoaded(true)
      })
  }, [nameId])

  if (!loaded) {
    return <main style={{ minHeight: '100vh', background: '#1f1e1c' }} />
  }

  if (!row) {
    return (
      <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          저장된 이름을 찾을 수 없어요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/mypage')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              마이페이지로 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  const chars = row.chars || []
  const fullName = row.hanja_name || chars.map((c) => c.hanja).join('')
  const hangulName = row.hangul_name || chars.map((c) => c.hangul).join('')
  const r = row.result
  const c = row.commentary

  const rows = r ? [
    { label: '사주 보완 (용신)', g: r.yongsinBohwan?.grade || '' },
    { label: '한자 기운 (자원오행)', g: r.resourceFlow?.grade || '' },
    { label: '소리 기운 (발음오행)', g: r.soundFlow?.grade || '' },
    { label: '이름 수리 (81수리)', g: r.suri?.grade || '' },
  ].filter((x) => x.g) : []

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <Header router={router} />

      <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: 4 }}>{fullName}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{hangulName} · 아기 이름</div>
      </div>

      {rows.length > 0 && (
        <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.1)', borderRadius: 14, padding: 16, margin: '16px 0 14px' }}>
          <div style={{ fontSize: 12, color: GOLD, marginBottom: 12, fontWeight: 700 }}>이름 분석 (4가지 기준)</div>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i === rows.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 13, color: '#e8e4ff' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(row.g) }}>{row.g}</span>
            </div>
          ))}
          {r?.overallGrade && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: SUB }}>종합 </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: gradeColor(r.overallGrade) }}>{r.overallGrade}</span>
            </div>
          )}
        </div>
      )}

      {c && c.summary && (
        <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.15)', borderRadius: 16, padding: 18, marginBottom: 14 }}>
          {c.title && (
            <div style={{ fontSize: 16, fontWeight: 700, color: GOLD, marginBottom: 12, lineHeight: 1.5 }}>
              &ldquo;{c.title}&rdquo;
            </div>
          )}
          {[
            { label: '종합', text: c.summary },
            { label: '좋은 점', text: c.good },
            { label: '더 좋아지려면', text: c.improve },
            { label: '조언', text: c.advice },
          ].filter((s) => s.text).map((s, i) => (
            <div key={i} style={{ borderLeft: '3px solid ' + GOLD, padding: '4px 12px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: GOLD, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 14, color: '#e0dce8', lineHeight: 1.8 }}>{s.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* 전문가 상담 연결 (개명 상담 · mode=naming) */}
      <div style={{ marginBottom: 14 }}>
        <ConsultButton priceKey="naming" mode="naming" />
      </div>

      <button onClick={() => router.push('/manseryeok/naming/rename/newborn')} className="active:scale-95"
        style={{ width: '100%', background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 13, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        새 아기 이름 지어보기 →
      </button>
    </main>
  )
}

function Header({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
      <button onClick={() => router.push('/mypage')} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>아기 이름 다시보기</span>
    </div>
  )
}

export default function NewbornViewPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <NewbornViewInner />
    </Suspense>
  )
}
