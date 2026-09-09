'use client'
import { Suspense, useState, useEffect, type ReactNode } from 'react'
//  ★2026-09-09 — 결제 시트는 공용 부품 «한 곳» 입니다 [대표님 「통일」]
import WalletPaySheet from '@/app/components/common/WalletPaySheet'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { displayName } from '@/lib/saju/personName'

// 피치톤 (신버전 · 결혼택일과 통일)
const accent = '#b45a78'   // 출산택일 포인트(로즈핑크)
const cardBg = '#FFFBF7'   // 카드 배경
const sub = '#b4785a'      // 서브 텍스트
const text = '#3a2e28'     // 본문 텍스트

const HOUR_LABELS: Record<string, string> = {
  '-1': '시간 모름',
  '0': '子시(23:30~01:30)', '1': '丑시(01:30~03:30)', '2': '寅시(03:30~05:30)', '3': '卯시(05:30~07:30)',
  '4': '辰시(07:30~09:30)', '5': '巳시(09:30~11:30)', '6': '午시(11:30~13:30)', '7': '未시(13:30~15:30)',
  '8': '申시(15:30~17:30)', '9': '酉시(17:30~19:30)', '10': '戌시(19:30~21:30)', '11': '亥시(21:30~23:30)',
}

interface PersonInput {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string; job: string; mbti: string
  name?: string        // 입력화면(input/page.tsx)에서 담아 보내는 이름.
  isMe?: string        // 'true'면 본인
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
  babyGender: '', wishes: [], avoidNote: '',
}

const SURVEY_KEY = 'birth-timing-survey'

function Disclaimer({ full }: { full?: boolean }) {
  return (
    <div style={{ background: '#fbece4', border: '0.5px solid #b99a7d', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#b06a52', lineHeight: 1.6 }}>
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
        background: active ? '#f6e3d6' : '#fff',
        color: active ? '#96502e' : '#b4785a',
        border: '0.5px solid ' + (active ? accent : '#f0e0d5'),
      }}>
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: '13px', color: '#96502e', fontWeight: 600, margin: '20px 0 10px' }}>{children}</div>
}
function QLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: '13px', color: text, margin: '14px 0 8px' }}>{children}</div>
}

function personSummary(p: PersonInput | null): string {
  if (!p || !p.year) return '정보 없음'
  const hour = HOUR_LABELS[p.hour] ?? '시간 모름'
  return `${p.gender} · ${p.calType} ${p.year}.${p.month}.${p.day} · ${hour}`
}

function BirthTimingInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [parent1, setParent1] = useState<PersonInput | null>(null)
  const [parent2, setParent2] = useState<PersonInput | null>(null)
  const [survey, setSurvey] = useState<BirthSurvey>(DEFAULT_SURVEY)

  const [error, setError] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [price, setPrice] = useState(10000)

  useEffect(() => {
    supabase
      .from('analysis_prices')
      .select('price')
      .eq('price_key', 'birth_pick')
      .maybeSingle()
      .then(({ data }) => { if (data) setPrice(data.price) })
  }, [])

  useEffect(() => {
    try {
      const p1 = sp.get('p1')
      const p2 = sp.get('p2')
      if (p1) setParent1(JSON.parse(decodeURIComponent(p1)))
      if (p2) setParent2(JSON.parse(decodeURIComponent(p2)))
    } catch {}
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

  // 바라는 점은 '하나만' 고른다. (복수 선택이면 가중이 서로 상쇄돼 효과가 사라짐)
  //   같은 걸 다시 누르면 해제 → 선택 안 함(균등 채점)도 가능.
  function toggleWish(wish: string) {
    setSurvey(prev => {
      const already = prev.wishes.includes(wish)
      const next = { ...prev, wishes: already ? [] : [wish] }
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
    if (!survey.babyGender) {
      setError('아기 성별을 선택해 주세요. 아기 사주 풀이에 꼭 필요해요 😊')
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
    // ★v7(점수 없는 '날짜 고르기')로 보낸다. 2026-07-23 구조 전환.
    //   옛 v5(점수·순위 화면)는 /result 에 그대로 살려 두었다.
    //   되돌리려면 아래 경로만 '/manseryeok/birth-timing/result' 로 바꾸면 된다.
    router.push('/manseryeok/birth-timing/pick?' + params.toString())
  }

  const wishOptions = ['건강', '공부운', '재물운', '인덕', '부모화목']

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* 피치톤 sticky 헤더 (결혼택일과 통일) */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #9c7a58', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/manseryeok/birth-timing/input')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>출산 시기 택일</div>
          <div style={{ fontSize: 10.5, color: '#5c3a1e' }}>아기에게 좋은 출산일을 찾아드려요</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <Disclaimer full />

        <SectionLabel>부모 정보</SectionLabel>
        <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', border: '0.5px solid #9c7a58' }}>
          {/* 이름이 있으면 이름으로 표시. 없을 때만 '부모1/부모2' 로 떨어진다. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px' }}>🧑</span>
            <span style={{ fontSize: '12px', color: sub, minWidth: '44px', fontWeight: 600 }}>
              {displayName(parent1, '부모1')}
            </span>
            <span style={{ fontSize: '13px', color: text }}>{personSummary(parent1)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🤱</span>
            <span style={{ fontSize: '12px', color: sub, minWidth: '44px', fontWeight: 600 }}>
              {displayName(parent2, '부모2')}
            </span>
            <span style={{ fontSize: '13px', color: text }}>{personSummary(parent2)}</span>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: sub, marginTop: '6px' }}>
          수정하려면 ‹ 뒤로 가서 변경해 주세요
        </div>

        <SectionLabel>출산 정보를 알려주세요</SectionLabel>

        <QLabel>출산예정일이 언제인가요? <span style={{ color: accent }}>*</span></QLabel>
        <input type="date" value={survey.dueDate}
          onChange={e => setSurveyField('dueDate', e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: '0.5px solid #9c7a58', borderRadius: '10px', padding: '12px 14px', color: survey.dueDate ? '#96502e' : '#c5a590', fontSize: '15px', colorScheme: 'light', outline: 'none' }} />

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

        <QLabel>아기 성별을 선택해 주세요 <span style={{ color: sub, fontSize: '11px' }}>(필수)</span></QLabel>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['아들', '딸'].map(v => (
            <Chip key={v} label={v} active={survey.babyGender === v} onClick={() => setSurveyField('babyGender', v)} />
          ))}
        </div>

        <QLabel>아이에게 특히 바라는 점은? <span style={{ color: sub, fontSize: '11px' }}>(하나만 · 선택 안 해도 돼요)</span></QLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {wishOptions.map(v => (
            <Chip key={v} label={v} active={survey.wishes.includes(v)} onClick={() => toggleWish(v)} />
          ))}
        </div>

        {/* ★'피하고 싶은 날' 입력 칸을 뺐다 (2026-07-23).
            받기만 하고 계산에도 화면에도 쓰지 않아, 물어놓고 반영 안 하는 꼴이었다.
            (교훈 G — 화면에 표시한 것은 실제 동작과 일치시킨다)
            avoidNote 필드 자체는 저장 스키마 호환을 위해 빈 문자열로 남겨 둔다.
            나중에 실제로 반영할 때 이 칸을 되살리면 된다. */}

        {error && (
          <div style={{ marginTop: '14px', background: '#fbece4', border: '0.5px solid #b99a7d', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#c8506e', lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        <button onClick={handleAnalyze}
          style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '14px', background: accent, border: 'none', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          🍼 좋은 출산일 찾기
        </button>

        <div style={{ marginTop: '14px' }}>
          <Disclaimer />
        </div>
      </div>

      {/* 🔴 ★2026-09-09 — 여기 있던 «자기 결제 팝업» 을 ★공용 시트로 바꿨습니다
          [대표님]  「기존에 있던 결제화면과 다르다 · ★통일시켜야 하는 것 아닌가?」
                    「궁합부터 타로까지 ai결제화면을 ★동일하게 붙여줘」
          ⚠️ 아홉 화면이 «저마다» 팝업을 갖고 있어서 결이 갈렸습니다.
          ⚠️ 늘어난 것 — ★「지갑 잔액」 · 「보시고 나면」 두 줄 (1부 3-1)
          ⛔⛔ 여기에 결제 팝업을 ★«다시 만들지» 마십시오 — 시트는 한 곳입니다.
          ⛔ 낱말(item)을 지어내지 마십시오 — mc_price 의 것입니다 (2부 5-2). */}
      <WalletPaySheet
        open={payOpen}
        title="🍼 출산 시기 택일"
        subtitle={"아기에게 좋은 출산일 5곳을 찾아드려요"}
        includes={['추천 출산일 5순위', '각 날짜의 아기 사주 풀이', '피하면 좋은 날 안내', '부모와의 관계 분석']}
        item="birth_pick"
        actionLabel="시기 찾기"
        onClose={() => setPayOpen(false)}
        onConfirm={() => { setPayOpen(false); handlePay() }}
          footer={<Disclaimer />}
      />
    </main>
  )
}

export default function BirthTimingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF6F0' }}>
        <div style={{ color: '#5c3a1e' }}>로딩 중...</div>
      </div>
    }>
      <BirthTimingInner />
    </Suspense>
  )
}
