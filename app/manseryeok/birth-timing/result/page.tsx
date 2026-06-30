'use client'
import { Suspense, useState, useEffect, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'

const purple = '#7766dd'
const cardBg = '#13132a'
const sub = '#5555aa'
const text = '#e8e4ff'
const gold = '#FAC775'

const HOUR_LABELS: Record<string, string> = {
  '-1': '시간 모름',
  '0': '子시(23~01)', '1': '丑시(01~03)', '2': '寅시(03~05)', '3': '卯시(05~07)',
  '4': '辰시(07~09)', '5': '巳시(09~11)', '6': '午시(11~13)', '7': '未시(13~15)',
  '8': '申시(15~17)', '9': '酉시(17~19)', '10': '戌시(19~21)', '11': '亥시(21~23)',
}

interface PersonInput {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string; job: string; mbti: string
}

// 추천 1건 구조 (나중에 계산 결과가 이 형태로 들어옴)
interface Candidate {
  rank: number
  date: string
  hour: string
  score: number
  saju: string
  stars: { label: string; n: number; desc: string }[]
  oneLine: string
  note: string
}

// ── 예시(목업) 데이터 — 나중에 실제 계산으로 교체 ──
const SAMPLE: Candidate[] = [
  {
    rank: 1, date: '2027년 3월 9일 (화)', hour: '卯시 (05~07)', score: 92,
    saju: '己 乙 癸 丁 / 卯 巳 卯 未',
    stars: [
      { label: '오행 균형', n: 4, desc: '목·화·수가 고루 있어 안정적이에요.' },
      { label: '온도(조후)', n: 5, desc: '봄 기운으로 따뜻하고 생기가 돌아요.' },
      { label: '지지 안정', n: 5, desc: '충·형이 없어 평안한 구조예요.' },
      { label: '부모와의 관계', n: 4, desc: '아빠의 기운을 살려주는 자식이에요.' },
    ],
    oneLine: '집안에 생기를 더하는, 균형 잡힌 봄의 아이',
    note: '금(金) 기운이 다소 약하니, 훗날 이름에 금을 보완해주면 좋아요.',
  },
  {
    rank: 2, date: '2027년 3월 12일 (금)', hour: '巳시 (09~11)', score: 87,
    saju: '辛 戊 癸 丁 / 巳 申 卯 未',
    stars: [
      { label: '오행 균형', n: 4, desc: '다섯 기운이 비교적 고른 편이에요.' },
      { label: '온도(조후)', n: 4, desc: '따뜻한 기운이 잘 자리잡았어요.' },
      { label: '지지 안정', n: 3, desc: '큰 충은 없으나 약한 긴장이 있어요.' },
      { label: '부모와의 관계', n: 5, desc: '부모 띠와 육합을 이뤄 정이 깊어요.' },
    ],
    oneLine: '부모와 인연이 깊은, 다정한 아이',
    note: '토(土) 기운이 약간 강하니 활동적인 환경이 도움돼요.',
  },
  {
    rank: 3, date: '2027년 3월 7일 (일)', hour: '卯시 (05~07)', score: 81,
    saju: '己 癸 癸 丁 / 卯 卯 卯 未',
    stars: [
      { label: '오행 균형', n: 3, desc: '무난하나 수(水)가 다소 많아요.' },
      { label: '온도(조후)', n: 4, desc: '봄볕으로 차갑지 않게 균형이 잡혀요.' },
      { label: '지지 안정', n: 4, desc: '대체로 평안한 흐름이에요.' },
      { label: '부모와의 관계', n: 3, desc: '무난하게 어울리는 관계예요.' },
    ],
    oneLine: '차분하고 안정적인 기질의 아이',
    note: '화(火) 기운을 더해주는 활동이 좋아요.',
  },
  {
    rank: 4, date: '2027년 3월 11일 (목)', hour: '巳시 (09~11)', score: 78,
    saju: '辛 丁 癸 丁 / 巳 未 卯 未',
    stars: [
      { label: '오행 균형', n: 3, desc: '화(火)가 다소 강한 편이에요.' },
      { label: '온도(조후)', n: 3, desc: '따뜻하나 약간 건조할 수 있어요.' },
      { label: '지지 안정', n: 4, desc: '큰 충돌 없이 흐르는 구조예요.' },
      { label: '부모와의 관계', n: 3, desc: '무난한 조화를 이뤄요.' },
    ],
    oneLine: '열정과 생기가 넘치는 아이',
    note: '수(水) 기운을 보완해주면 균형이 더 좋아져요.',
  },
  {
    rank: 5, date: '2027년 3월 6일 (토)', hour: '卯시 (05~07)', score: 75,
    saju: '己 庚 癸 丁 / 卯 午 卯 未',
    stars: [
      { label: '오행 균형', n: 3, desc: '대체로 무난한 분포예요.' },
      { label: '온도(조후)', n: 3, desc: '온도가 적당히 유지돼요.' },
      { label: '지지 안정', n: 3, desc: '약한 긴장이 있으나 무난해요.' },
      { label: '부모와의 관계', n: 4, desc: '부모를 돕는 기운이 있어요.' },
    ],
    oneLine: '성실하고 듬직한 기질의 아이',
    note: '목(木) 기운을 더하면 유연함이 살아나요.',
  },
]

const AVOID_SAMPLE = {
  dates: '3월 13일 (토) · 3월 14일 (일)',
  reasons: ['지지에 충(沖)이 겹쳐 전통적으로 피해온 날이에요.', '오행이 한쪽으로 치우치는 구조예요.'],
}

function Disclaimer({ full }: { full?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#d88', lineHeight: 1.6 }}>
      {full
        ? '※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 출산일·수술일 결정은 산모와 아기의 건강을 최우선으로, 반드시 담당 산부인과 전문의와 상의해 결정하세요.'
        : '※ 전통 명리 참고용 · 최종 결정은 전문의와 상의하세요.'}
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: gold, fontSize: '12px', letterSpacing: '1px' }}>
      {'★'.repeat(n)}<span style={{ color: '#444466' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function personSummary(p: PersonInput | null): string {
  if (!p || !p.year) return '정보 없음'
  const hour = HOUR_LABELS[p.hour] ?? '시간 모름'
  return `${p.gender} · ${p.calType} ${p.year}.${p.month}.${p.day} · ${hour}`
}

function rankBadge(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`
}

function CandidateCard({ c }: { c: Candidate }) {
  const [open, setOpen] = useState(c.rank === 1)

  return (
    <div style={{ background: cardBg, borderRadius: '12px', border: '1px solid ' + (c.rank === 1 ? 'rgba(250,199,117,0.35)' : 'rgba(255,255,255,0.06)'), marginBottom: '10px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: '16px' }}>{rankBadge(c.rank)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: text, fontWeight: 600 }}>{c.date}</div>
          <div style={{ fontSize: '12px', color: sub, marginTop: '2px' }}>{c.hour}</div>
        </div>
        <span style={{ fontSize: '15px', fontWeight: 700, color: c.rank === 1 ? gold : '#c8b0ff' }}>{c.score}점</span>
        <span style={{ fontSize: '12px', color: sub }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 16px' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <div style={{ fontSize: '11px', color: sub, marginBottom: '4px' }}>아기 사주</div>
            <div style={{ fontSize: '15px', color: '#c8b0ff', letterSpacing: '3px', marginBottom: '14px' }}>{c.saju}</div>

            {c.stars.map((s, i) => (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#b8b4d8' }}>{s.label}</span>
                  <Stars n={s.n} />
                </div>
                <div style={{ fontSize: '12px', color: sub, marginTop: '3px', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}

            <div style={{ background: 'rgba(119,102,221,0.1)', borderRadius: '8px', padding: '10px 12px', margin: '12px 0' }}>
              <div style={{ fontSize: '11px', color: sub, marginBottom: '3px' }}>한 줄 요약</div>
              <div style={{ fontSize: '13px', color: text, lineHeight: 1.5 }}>"{c.oneLine}"</div>
            </div>

            <div style={{ fontSize: '12px', color: sub, lineHeight: 1.6 }}>
              <span style={{ color: gold }}>참고</span> · {c.note}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BirthResultInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [parent1, setParent1] = useState<PersonInput | null>(null)
  const [parent2, setParent2] = useState<PersonInput | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [method, setMethod] = useState('')

  useEffect(() => {
    try {
      const p1 = sp.get('p1'); const p2 = sp.get('p2'); const s = sp.get('survey')
      if (p1) setParent1(JSON.parse(decodeURIComponent(p1)))
      if (p2) setParent2(JSON.parse(decodeURIComponent(p2)))
      if (s) {
        const survey = JSON.parse(decodeURIComponent(s))
        setDueDate(survey.dueDate || '')
        setMethod(survey.method || '')
      }
    } catch {}
  }, [sp])

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader
        title="출산 시기 결과"
        subtitle="아기에게 좋은 출산일이에요"
        onBack={() => router.back()}
      />

      <div style={{ padding: '16px' }}>
        <Disclaimer full />

        <div style={{ margin: '16px 0', padding: '12px 14px', background: cardBg, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '11px', color: sub, marginBottom: '6px' }}>분석 조건</div>
          <div style={{ fontSize: '12px', color: '#b8b4d8', lineHeight: 1.7 }}>
            출산예정일 {dueDate || '-'} · {method || '-'}<br />
            예정일 전후 약 2주 / 부모 {personSummary(parent1) !== '정보 없음' ? '사주 반영' : '-'}
          </div>
        </div>

        <div style={{ marginBottom: '14px', padding: '8px 12px', background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.2)', borderRadius: '8px', fontSize: '11px', color: gold, lineHeight: 1.5 }}>
          ⚙️ 아래는 화면 예시예요. 곧 실제 사주 계산 결과로 채워집니다.
        </div>

        <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '4px 0 12px' }}>
          ◆ 추천 출산일 <span style={{ fontSize: '11px', color: sub, fontWeight: 400 }}>(탭하면 자세히)</span>
        </div>
        {SAMPLE.map(c => <CandidateCard key={c.rank} c={c} />)}

        <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '22px 0 12px' }}>◆ 피하면 좋은 날</div>
        <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '13px', color: '#e0a0a0', fontWeight: 600, marginBottom: '8px' }}>⚠ {AVOID_SAMPLE.dates}</div>
          {AVOID_SAMPLE.reasons.map((r, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#c89090', lineHeight: 1.7 }}>· {r}</div>
          ))}
        </div>

        <button
          onClick={() => alert('전문가 상담 연결은 준비 중이에요 😊')}
          style={{ width: '100%', marginTop: '22px', padding: '15px', borderRadius: '12px', background: 'linear-gradient(135deg,#5544bb,#7766dd)', border: 'none', color: text, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          ✨ 전문가에게 자세히 물어보기
        </button>

        <button
          onClick={() => router.push('/manseryeok/couple-input')}
          style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,176,255,0.2)', color: '#c8b0ff', fontSize: '13px', cursor: 'pointer' }}>
          ↩ 다시 분석하기
        </button>

        <div style={{ marginTop: '16px' }}>
          <Disclaimer />
        </div>
      </div>
    </main>
  )
}

export default function BirthResultPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}>
        <div style={{ color: '#c8b0ff' }}>로딩 중...</div>
      </div>
    }>
      <BirthResultInner />
    </Suspense>
  )
}
