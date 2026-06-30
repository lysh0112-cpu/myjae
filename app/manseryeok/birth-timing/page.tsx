'use client'
import { Suspense, useState, useEffect, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'

const PRICE = 10000

const purple = '#7766dd'
const cardBg = '#13132a'
const sub = '#5555aa'
const text = '#e8e4ff'

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

interface BirthSurvey {
  dueDate: string
  method: string
  timePref: string
  babyGender: string
  wishes: string[]
  avoidNote: string
}

const DEFAULT_SURVEY: BirthSurvey = {
  dueDate: '', method: '제왕절개', timePref: '상관없음',
  babyGender: '상관없음', wishes: [], avoidNote: '',
}

const SURVEY_KEY = 'birth-timing-survey'

function Disclaimer({ full }: { full?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#d88', lineHeight: 1.6 }}>
      {full
        ? '※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 출산일·수술일 결정은 산모와 아기의 건강을 최우선으로, 반드시 담당 산부인과 전문의와 상의해 결정하세요.'
        : '※ 전통 명리 참고용 · 최종 결정은 전문의와 상의하세요.'}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        flex: '1 1 auto', minWidth: '64px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
        fontSize: '13px', fontWeight: active ? 600 : 400,
        background: active ? 'rgba(119,102,221,0.25)' : 'rgba(255,255,255,0.05)',
        color: active ? '#c8b0ff' : '#7777aa',
        border: '1px solid ' + (active ? purple : 'rgba(255,255,255,0.08)'),
      }}>
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '20px 0 10px' }}>{children}</div>
}
function QLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: '13px', color: text, margin: '14px 0 8px' }}>{children}</div>
}

// 부모 한 줄 요약 텍스트
function personSummary(p: PersonInput | null): string {
  if (!p || !p.year) return '정보 없음'
  const hour = HOUR_LABELS[p.hour] ?? '시간 모름'
  return `${p.gender} · ${p.calType} ${p.year}.${p.month}.${p.day} · ${hour}`
}

function BirthTimingInner() {
  const router = useRouter()
  const sp = useSearchParams()

  // 부모 사주는 궁합 입력 화면에서 URL로 넘겨받는다 (여기서 다시 입력받지 않음)
  const [parent1, setParent1] = useState<PersonInput | null>(null)
  const [parent2, setParent2] = useState<PersonInput | null>(null)
  const [survey, setSurvey] = useState<BirthSurvey>(DEFAULT_SURVEY)

  const [error, setError] = useState('')
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    // 부모 사주 파싱
    try {
      const p1 = sp.get('p1')
      const p2 = sp.get('p2')
      if (p1) setParent1(JSON.parse(decodeURIComponent(p1)))
      if (p2) setParent2(JSON.parse(decodeURIComponent(p2)))
    } catch {}
    // 설문은 직전 입력 복원 (뒤로 갔다 와도 유지)
    try {
      const saved = sessionStorage.getItem(SURVEY_KEY)
      if (saved) setSurvey({ ...DEFAULT_SURVEY, ...JSON.parse(saved) })
    } catch {}
  }, [sp])

  function setSurveyField<K extends keyof BirthSurvey>(key: K, value: BirthSurvey[K]) {
    setSurvey(prev => {
      const next = { ...prev, [key]: value }
      try { sessionStorage.setItem(SURVEY_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function toggleWish(wish: string) {
    setSurvey(prev => {
      const has = prev.wishes.includes(wish)
      const next = { ...prev, wishes: has ? prev.wishes.filter(w => w !== wish) : [...prev.wishes, wish] }
      try { sessionStorage.setItem(SURVEY_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function handleAnalyze() {
    if (!parent1 || !parent1.year) {
      setError('부모 사주 정보가 없어요. 이전 화면에서 부모님 생년월일을 입력해 주세요 😊')
      return
    }
    if (!survey.dueDate) {
      setError('출산예정일을 입력해 주세요. 예정일을 기준으로 좋은 날을 찾아드려요 😊')
      return
    }
    setError('')
    setPayOpen(true)
  }

  function handlePay() {
    const params = new URLSearchParams()
    params.set('p1', JSON.stringify(parent1))
    params.set('p2', JSON.stringify(parent2))
    params.set('survey', JSON.stringify(survey))
    router.push('/manseryeok/birth-timing/result?' + params.toString())
  }

  const wishOptions = ['건강', '공부운', '재물운', '인덕', '부모화목']

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader
        title="출산 시기 택일"
        subtitle="아기에게 좋은 출산일을 찾아드려요"
        onBack={() => router.push('/manseryeok/couple-input')}
      />

      <div style={{ padding: '16px' }}>
        <Disclaimer full />

        {/* 부모 정보 — 두 줄 요약 (입력은 이전 화면에서) */}
        <SectionLabel>부모 정보</SectionLabel>
        <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px' }}>👨</span>
            <span style={{ fontSize: '12px', color: sub, width: '44px' }}>부모1</span>
            <span style={{ fontSize: '13px', color: text }}>{personSummary(parent1)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>👩</span>
            <span style={{ fontSize: '12px', color: sub, width: '44px' }}>부모2</span>
            <span style={{ fontSize: '13px', color: text }}>{personSummary(parent2)}</span>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: sub, marginTop: '6px' }}>
          수정하려면 ‹ 뒤로 가서 변경해 주세요
        </div>

        {/* 출산 정보 설문 */}
        <SectionLabel>출산 정보를 알려주세요</SectionLabel>

        <QLabel>출산예정일이 언제인가요? <span style={{ color: purple }}>*</span></QLabel>
        <input type="date" value={survey.dueDate}
          onChange={e => setSurveyField('dueDate', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: survey.dueDate ? '#c8b0ff' : '#5555aa', fontSize: '15px', colorScheme: 'dark', outline: 'none' }} />

        <QLabel>분만 방식은 어떻게 예정하고 계세요?</QLabel>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['제왕절개', '유도분만', '미정'].map(v => (
            <Chip key={v} label={v} active={survey.method === v} onClick={() => setSurveyField('method', v)} />
          ))}
        </div>

        <QLabel>선호하는 수술 시간대가 있나요?</QLabel>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['평일오전', '평일 오전'], ['평일오후', '평일 오후'], ['상관없음', '상관없음']].map(([val, lab]) => (
            <Chip key={val} label={lab} active={survey.timePref === val} onClick={() => setSurveyField('timePref', val)} />
          ))}
        </div>

        <QLabel>바라는 아기 성별이 있나요?</QLabel>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['아들', '딸', '상관없음'].map(v => (
            <Chip key={v} label={v} active={survey.babyGender === v} onClick={() => setSurveyField('babyGender', v)} />
          ))}
        </div>

        <QLabel>아이에게 특히 바라는 점은? <span style={{ color: sub, fontSize: '11px' }}>(여러 개 선택 가능)</span></QLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {wishOptions.map(v => (
            <Chip key={v} label={v} active={survey.wishes.includes(v)} onClick={() => toggleWish(v)} />
          ))}
        </div>

        <QLabel>피하고 싶은 날이 있나요? <span style={{ color: sub, fontSize: '11px' }}>(선택)</span></QLabel>
        <textarea value={survey.avoidNote}
          onChange={e => setSurveyField('avoidNote', e.target.value)}
          placeholder="예) 3월 첫째 주는 가족 행사라 피하고 싶어요"
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: text, fontSize: '14px', outline: 'none', resize: 'none', lineHeight: 1.6 }} />

        {error && (
          <div style={{ marginTop: '14px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#ff8888', lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        <button onClick={handleAnalyze}
          style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg,#5544bb,#7766dd)', border: 'none', color: text, fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          🍼 좋은 출산일 찾기
        </button>

        <div style={{ marginTop: '14px' }}>
          <Disclaimer />
        </div>
      </div>

      {/* 결제창 (바텀시트) */}
      {payOpen && (
        <div onClick={() => setPayOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: '#15152e', borderRadius: '20px 20px 0 0', padding: '10px 20px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 18px' }} />

            <div style={{ fontSize: '17px', fontWeight: 700, color: text, marginBottom: '4px' }}>🍼 출산 시기 택일 분석</div>
            <div style={{ fontSize: '13px', color: sub, marginBottom: '16px', lineHeight: 1.6 }}>
              아기에게 좋은 출산일 5곳을 찾아드려요
            </div>

            <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', color: sub, marginBottom: '8px' }}>분석 내용</div>
              {['추천 출산일 5순위', '각 날짜의 아기 사주 풀이', '피하면 좋은 날 안내', '부모와의 관계 분석'].map((t, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#b8b4d8', lineHeight: 1.9 }}>· {t}</div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: sub }}>결제 금액</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#c8b0ff' }}>{PRICE.toLocaleString()}원</span>
            </div>

            <button onClick={handlePay}
              style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'linear-gradient(135deg,#5544bb,#7766dd)', border: 'none', color: text, fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '8px' }}>
              💳 {PRICE.toLocaleString()}원 결제하기
            </button>
            <div style={{ fontSize: '11px', color: sub, textAlign: 'center', marginBottom: '14px' }}>
              (결제 시스템 첨부 예정 — 지금은 바로 결과를 봐요)
            </div>

            <button onClick={() => setPayOpen(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: sub, fontSize: '13px', cursor: 'pointer', marginBottom: '14px' }}>
              취소
            </button>

            <Disclaimer />
          </div>
        </div>
      )}
    </main>
  )
}

export default function BirthTimingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}>
        <div style={{ color: '#c8b0ff' }}>로딩 중...</div>
      </div>
    }>
      <BirthTimingInner />
    </Suspense>
  )
}
