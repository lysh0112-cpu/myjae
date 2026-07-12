'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getNamingRecord } from '@/lib/saju/namingRecords'
import ConsultButton from '@/app/components/common/ConsultButton'
import PerspectiveAccordion from '@/app/manseryeok/components/PerspectiveAccordion'

const GOLD = '#c8783c'
const CARD = '#fffbf7'
const SUB = '#b4785a'

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

interface Perspective {
  intro: string
  name: string
  meaning: string
}
interface Commentary {
  title: string
  yinyang: Perspective
  baleum: Perspective
  suri: Perspective
  jawon: Perspective
  yongsin: Perspective
  conclusion: string
}

const EMPTY_PERSPECTIVE: Perspective = { intro: '', name: '', meaning: '' }

// ── 방어: 통변 문자열에 "파싱 실패한 원본 JSON"이 섞였는지 감지 → 화면에 안 뿌린다 ──
//   (기존에 저장돼버린 오염 기록도 이 게이트로 걸러 원본 JSON 노출을 막는다.)
const RAW_JSON_HINTS = [
  '{"title"', '"title":', '"intro":', '"name":', '"meaning":',
  '"yinyang"', '"baleum"', '"suri"', '"jawon"', '"yongsin"', '"conclusion"',
]
function looksLikeRawJson(text: string): boolean {
  if (!text) return false
  const t = text.trim()
  if (RAW_JSON_HINTS.some((h) => t.includes(h))) return true
  if (t.startsWith('{') && t.includes('"')) return true
  return false
}
// 오염된 문자열이면 빈 문자열로 대체 (원본 JSON 노출 차단)
function clean(text: string): string {
  return looksLikeRawJson(text) ? '' : text
}

function normalizeCommentary(raw: unknown): Commentary | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const asPersp = (v: unknown): Perspective => {
    if (v && typeof v === 'object') {
      const p = v as Record<string, unknown>
      return {
        intro: clean(typeof p.intro === 'string' ? p.intro : ''),
        name: clean(typeof p.name === 'string' ? p.name : ''),
        meaning: clean(typeof p.meaning === 'string' ? p.meaning : ''),
      }
    }
    return { ...EMPTY_PERSPECTIVE }
  }
  const hasNew = 'yinyang' in o || 'baleum' in o || 'jawon' in o || 'conclusion' in o
  if (hasNew) {
    return {
      title: clean(typeof o.title === 'string' ? o.title : ''),
      yinyang: asPersp(o.yinyang), baleum: asPersp(o.baleum), suri: asPersp(o.suri),
      jawon: asPersp(o.jawon), yongsin: asPersp(o.yongsin),
      conclusion: clean(typeof o.conclusion === 'string' ? o.conclusion : ''),
    }
  }
  const legacy = [o.summary, o.good, o.improve, o.advice]
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((x) => clean(x))
    .filter((x) => x !== '')
    .join('\n\n')
  return {
    title: clean(typeof o.title === 'string' ? o.title : ''),
    yinyang: { ...EMPTY_PERSPECTIVE }, baleum: { ...EMPTY_PERSPECTIVE },
    suri: { ...EMPTY_PERSPECTIVE }, jawon: { ...EMPTY_PERSPECTIVE },
    yongsin: { ...EMPTY_PERSPECTIVE }, conclusion: legacy,
  }
}

function hasCommentary(c: Commentary | null): boolean {
  if (!c) return false
  return !!(c.conclusion || c.yinyang.intro || c.baleum.intro || c.suri.intro || c.jawon.intro || c.yongsin.intro)
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

function NewbornViewInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const nameId = sp.get('nameId') || ''
  const recordId = sp.get('recordId') || ''

  const [row, setRow] = useState<NameRow | null>(null)
  const [loaded, setLoaded] = useState(false)

  // 뒤로가기 목적지: 보관함(recordId)에서 왔으면 아기 보관함, 아니면 마이페이지
  const backTo = recordId ? '/manseryeok/naming/rename/newborn-storage' : '/mypage'

  useEffect(() => {
    // ① 보관함(saju_records)에서 온 경우: recordId 로 스냅샷 로드
    if (recordId) {
      getNamingRecord(recordId).then(rec => {
        if (rec) {
          setRow({
            hangul_name: rec.hangulName,
            hanja_name: rec.hanjaName,
            chars: (rec.chars.filter(Boolean) as SavedChar[]),
            result: (rec.snapshot?.result as DiagnoseLike) ?? null,
            commentary: normalizeCommentary(rec.snapshot?.commentary),
            kind: 'newborn',
          })
        }
        setLoaded(true)
      })
      return
    }
    // ② 마이페이지(my_names)에서 온 경우: nameId 로 로드
    if (!nameId) { setLoaded(true); return }
    supabase.from('my_names')
      .select('hangul_name, hanja_name, chars, result, commentary, kind')
      .eq('id', nameId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as Record<string, unknown>
          setRow({ ...(data as NameRow), commentary: normalizeCommentary(d.commentary) })
        }
        setLoaded(true)
      })
  }, [nameId, recordId])

  if (!loaded) {
    return <main style={{ minHeight: '100vh', background: '#FDF6F0' }} />
  }

  if (!row) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} backTo={backTo} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          저장된 이름을 찾을 수 없어요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/mypage')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
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
  const c = row.commentary

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <Header router={router} backTo={backTo} />

      <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: 4 }}>{fullName}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{hangulName} · 아기 이름</div>
      </div>

      {hasCommentary(c) && c && (
        <PerspectiveAccordion commentary={c} />
      )}

      {/* 전문가 상담 연결 (개명 상담 · mode=naming) */}
      <div style={{ marginBottom: 14 }}>
        <ConsultButton priceKey="naming" mode="naming" />
      </div>

      <button onClick={() => router.push('/manseryeok/naming/rename/newborn')} className="active:scale-95"
        style={{ width: '100%', background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 13, color: GOLD, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        새 아기 이름 지어보기 →
      </button>
    </main>
  )
}

function Header({ router, backTo }: { router: ReturnType<typeof useRouter>; backTo: string }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
      background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)', borderBottom: '0.5px solid #f0e0d5',
    }}>
      <button onClick={() => router.push(backTo)} aria-label="뒤로" style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: 0 }}>{'\u2039'}</button>
      <span style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>아기 이름 다시보기</span>
    </div>
  )
}

export default function NewbornViewPage() {
  return (
    <Suspense fallback={<div style={{ background: '#FDF6F0', minHeight: '100vh' }} />}>
      <NewbornViewInner />
    </Suspense>
  )
}
