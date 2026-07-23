'use client'
// app/manseryeok/birth-timing/detail/page.tsx
//
// ★ 출산택일 v7 — 고른 시간의 해설 화면.
//
//   [무료 / 유료 경계]
//   여기(무료)는 "이 아이는 어떤 결인가"까지. 규칙 기반 조립이라 비용이 0이다.
//   "그래서 어떻게 살아야 하는가"(적성·진로·시기별 조언)는 결제 후 사주보기에서 AI 가 한다.
//   → 명식은 무료로 보여준다. 부모가 고른 결과물인데 그것마저 가리면 불신이 생긴다.
//      해석을 유료로 나눈다.
//
//   ⚠️ 문구는 1차안. 연재쌤 검수 예정(출산택일_성향문구_검수표.xlsx).
//   ⚠️ [이 아이 사주 자세히 보기] 에 ★결제 관문이 아직 없다 (22-0 최우선 과제).

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import UnTable from '@/app/manseryeok/result-new/UnTable'
import { getUnsung } from '@/lib/saju/unsung'
import { saveBirthRecord, type BirthSurvey } from '@/lib/saju/birthRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'
import { displayName } from '@/lib/saju/personName'
import { runRecommendV7, type HourOption, type DayOption } from '../lib/recommendV7'
import { describeBaby, type BabyDescription } from '../lib/babyDescribeV7'

interface PersonInput extends SavedInputData { name?: string }

const C = {
  bg: '#FDF6F0', card: '#FFFBF7', line: '#F0E0D5', ink: '#3A2E28',
  sub: '#B4785A', brand: '#96502E', accent: '#C8783C', soft: '#F6E3D6',
  warm: '#F5EDE6', faint: '#C9AA96',
}

interface SurveyInput {
  dueDate: string; method: string; timePref: string
  babyGender: string; wishes: string[]; avoidNote: string
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}
function toGenderCode(g: string): string {
  if (!g) return ''
  if (g.includes('아들') || g === '남') return '남'
  if (g.includes('딸') || g === '여') return '여'
  return g
}

/** 사주 8글자 표 — 시·일·월·년 차례(원국표와 같은 오른쪽→왼쪽 흐름) */
function SajuGrid({ hour }: { hour: HourOption }) {
  const c = hour.candidate
  const cols = [
    { label: '시주', p: c.hour }, { label: '일주', p: c.day },
    { label: '월주', p: c.month }, { label: '년주', p: c.year },
  ]
  const EL: Record<string, string> = {
    甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토',
    庚: '금', 辛: '금', 壬: '수', 癸: '수',
    子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
    午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
  }
  const BG: Record<string, string> = { 목: '#e8f5e9', 화: '#ffebee', 토: '#fff8e1', 금: '#f5f5f5', 수: '#e3f2fd' }
  const FG: Record<string, string> = { 목: '#2e7d32', 화: '#c62828', 토: '#f57f17', 금: '#616161', 수: '#1565c0' }
  const cell = (ch: string, isDay: boolean) => {
    const el = EL[ch]
    return (
      <div style={{
        width: 46, height: 46, borderRadius: 9, margin: '0 auto',
        background: el ? BG[el] : '#f5f5f5',
        border: isDay ? `2px solid ${C.accent}` : '1px solid #E6DED6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 21, fontWeight: 700, color: el ? FG[el] : '#888' }}>{ch}</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
      {cols.map(col => (
        <div key={col.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 5 }}>{col.label}</div>
          {cell(col.p.stem, col.label === '일주')}
          <div style={{ height: 6 }} />
          {cell(col.p.branch, false)}
        </div>
      ))}
    </div>
  )
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: '15px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <span style={{
          width: 19, height: 19, borderRadius: 6, background: C.soft, color: C.brand,
          fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{n}</span>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.2px' }}>{title}</span>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.85, color: '#4a3d35' }}>{children}</div>
    </div>
  )
}

function DetailInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState('')
  const [day, setDay] = useState<DayOption | null>(null)
  const [hour, setHour] = useState<HourOption | null>(null)
  const [desc, setDesc] = useState<BabyDescription | null>(null)

  // 이미지 저장 — v5(ResultV5) 와 같은 html-to-image 방식
  const captureRef = useRef<HTMLDivElement | null>(null)
  const [sharing, setSharing] = useState(false)

  // 대운표 스크롤 — 원국표와 같은 '오른쪽→왼쪽' 흐름이라 열릴 때 오른쪽 끝으로 민다
  const dayunScrollRef = useRef<HTMLDivElement | null>(null)

  // 보관함 저장
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const dateKey = sp.get('date') ?? ''
  const hourIdx = Number(sp.get('hour') ?? '-1')

  useEffect(() => {
    let cancelled = false
    async function run() {
      const survey = parseJson<SurveyInput>(sp.get('survey'))
      const gender = toGenderCode(survey?.babyGender ?? '')
      if (!survey?.dueDate || !gender || !dateKey || hourIdx < 0) {
        setErrMsg('어떤 날을 고르셨는지 확인하지 못했어요. 이전 화면에서 다시 골라 주세요.')
        setLoading(false); return
      }
      try {
        const r = await runRecommendV7({ dueDate: survey.dueDate, gender })
        if (cancelled) return
        const d = r.days.find(x => x.dateKey === dateKey)
        const h = d?.hours.find(x => x.hourIdx === hourIdx)
        if (!d || !h) {
          setErrMsg('고르신 날짜를 찾지 못했어요. 이전 화면에서 다시 골라 주세요.')
        } else {
          setDay(d); setHour(h)
          setDesc(describeBaby(h.candidate, h.detail))
        }
      } catch {
        if (!cancelled) setErrMsg('해설을 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [sp, dateKey, hourIdx])

  // 대운표 스크롤을 오른쪽 끝(어릴 때)에서 시작시킨다.
  //   대운표를 원국표와 같은 '오른쪽→왼쪽' 흐름으로 뒤집었기 때문에,
  //   그냥 두면 화면에 노년이 먼저 보인다. (v5 ResultV5 와 동일 처리)
  useEffect(() => {
    const root = dayunScrollRef.current
    if (!root) return
    const boxes = root.querySelectorAll('div')
    for (const el of Array.from(boxes)) {
      const box = el as HTMLElement
      if (box.scrollWidth > box.clientWidth + 4) {
        box.scrollLeft = box.scrollWidth
        break
      }
    }
  }, [day, hour])

  /** 해설 카드를 PNG 로 내려받는다. 저장한 파일을 카톡 등에 첨부해 보내면 된다. */
  async function handleSaveImage() {
    const node = captureRef.current
    if (!node || sharing || !day || !hour) return
    setSharing(true)
    try {
      const { toPng } = await import('html-to-image')
      const png = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: C.bg })
      const label = `${day.m}월${day.d}일_${hour.hourLabel.split('(')[0]}`
      const a = document.createElement('a')
      a.href = png
      a.download = `명카페_출산택일_${label}.png`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch (e) {
      console.error('이미지 저장 실패:', e)
    } finally {
      setSharing(false)
    }
  }

  /** 고른 날짜 하나를 보관함에 저장한다. */
  async function handleSaveRecord() {
    if (saving || !day || !hour || !desc) return
    const p1 = parseJson<PersonInput>(sp.get('p1'))
    const p2 = parseJson<PersonInput>(sp.get('p2'))
    const survey = parseJson<SurveyInput>(sp.get('survey'))
    if (!p1 || !survey) { setSavedMsg('부모 정보가 없어 저장하지 못했어요'); return }
    setSaving(true); setSavedMsg('')
    try {
      const res = await saveBirthRecord({
        // ★교훈 K — 저장 함수에는 필요한 값을 전부 인자로 넘긴다(state 반영 전일 수 있음)
        name1: displayName(p1, '부모1'),
        name2: displayName(p2, '부모2'),
        summary: `${day.m}월 ${day.d}일 ${hour.hourLabel.split('(')[0]} · ${desc.headline}`,
        input1: p1,
        input2: (p2 ?? p1),
        survey: survey as unknown as BirthSurvey,
        // ★같은 부모·같은 예정일이면 옛 기록을 지우고 이것만 남긴다.
        //   여러 날을 눌러보며 저장해도 보관함에는 마지막에 고른 하루만 남는다.
        replaceSamePair: true,
        resultData: {
          version: 'v7',
          picked: {
            dateKey: day.dateKey, y: day.y, m: day.m, d: day.d,
            weekday: day.weekday, dayGanji: day.dayGanji,
            hourIdx: hour.hourIdx, hourLabel: hour.hourLabel,
            saju: hour.sajuText,
          },
          detail: hour.detail,
          describe: desc,
          dayunList: day.dayunList,
        },
      })
      setSavedMsg(res.ok ? '보관함에 저장했어요' : (res.message ?? '저장하지 못했어요'))
    } catch {
      setSavedMsg('저장하지 못했어요')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.bg, flexDirection: 'column', gap: 9,
      }}>
        <div style={{ fontSize: 15, color: C.brand, fontWeight: 600 }}>아이의 결을 풀어보는 중이에요</div>
        <div style={{ fontSize: 12.5, color: C.sub }}>여덟 글자를 하나하나 살펴보고 있습니다</div>
      </div>
    )
  }

  if (errMsg || !hour || !day || !desc) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: C.brand, lineHeight: 1.8, marginBottom: 18 }}>
          {errMsg || '해설을 만들지 못했어요.'}
        </div>
        <button onClick={() => router.back()} style={{
          padding: '11px 22px', borderRadius: 11, border: `1px solid ${C.line}`,
          background: '#fff', color: C.brand, fontSize: 13.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>이전으로</button>
      </div>
    )
  }

  // ★대운표는 원국표와 같은 '오른쪽 → 왼쪽' 흐름으로 본다.
  //   오른쪽이 어릴 때, 왼쪽으로 갈수록 노년. 그래서 목록을 뒤집는다. (v5 와 동일)
  const unItems = [...day.dayunList].reverse().map(d => ({
    label: `${d.age}세`, stem: d.cheongan, branch: d.jiji,
    stemSipsin: d.ganYukchin, branchSipsin: d.jiYukchin,
    unsung: getUnsung(hour.detail.dayStem, d.jiji),
  }))

  return (
    <main style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 70px' }}>

        <button onClick={() => router.back()} aria-label="뒤로" style={{
          border: 'none', background: 'none', fontSize: 19, color: C.sub,
          cursor: 'pointer', padding: 0, marginBottom: 12,
        }}>←</button>

        {/* 캡처 영역 시작 — 면책 문구를 안에 넣어 이미지에도 담기게 한다 */}
        <div ref={captureRef} style={{ background: C.bg, padding: '2px 0 8px' }}>

        <div style={{
          background: 'rgba(255,120,120,.06)', border: '1px solid rgba(255,120,120,.18)',
          borderRadius: 10, padding: '12px 14px', fontSize: 12.5, fontWeight: 600,
          color: '#C0705E', lineHeight: 1.7, marginBottom: 18,
        }}>
          ※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 출산일·수술일 결정은
          산모와 아기의 건강을 최우선으로, 반드시 담당 산부인과 전문의와 상의해 결정하세요.
        </div>

        {/* 날짜·시간 */}
        <div style={{ marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, margin: '0 0 3px', letterSpacing: '-.6px' }}>
            {day.m}월 {day.d}일 <span style={{ fontSize: 15, color: C.sub, fontWeight: 400 }}>{day.weekday}요일</span>
          </h1>
          <div style={{ fontSize: 14, color: C.sub }}>{hour.hourLabel}</div>
        </div>

        {/* 한 줄 요약 */}
        <div style={{
          background: `linear-gradient(135deg, ${C.soft}, #FBEEE2)`,
          borderRadius: 13, padding: '16px 17px', margin: '14px 0 18px',
        }}>
          <div style={{ fontSize: 11, color: C.brand, fontWeight: 700, marginBottom: 5 }}>이 아이는</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#7A3E20', lineHeight: 1.45, letterSpacing: '-.4px' }}>
            {desc.headline}
          </div>
        </div>

        {/* 명식 */}
        <div style={{
          background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
          padding: '15px 16px', marginBottom: 10,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 11 }}>타고나는 여덟 글자</div>
          <SajuGrid hour={hour} />
          <div style={{
            marginTop: 12, paddingTop: 11, borderTop: `1px solid #F7EDE5`,
            display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11.5, color: C.sub,
          }}>
            <span>일간 <b style={{ color: C.brand }}>{hour.detail.dayStem}({hour.detail.dayEl})</b></span>
            <span>{hour.detail.seasonKind}생</span>
            {hour.detail.gwiinSeats.length > 0 && (
              <span>천을귀인 <b style={{ color: C.brand }}>{hour.detail.gwiinSeats.join('·')}</b></span>
            )}
          </div>
        </div>

        <Section n="1" title="타고난 결">{desc.layer1}</Section>
        <Section n="2" title="힘의 세기">{desc.layer2}</Section>
        <Section n="3" title="채워진 기운">{desc.layer3}</Section>
        {desc.layer4 && <Section n="4" title="인생의 흐름">{desc.layer4}</Section>}

        {desc.layer5.length > 0 && (
          <Section n="5" title="눈에 띄는 것">
            <ul style={{ margin: 0, paddingLeft: 17 }}>
              {desc.layer5.map((p, i) => (
                <li key={i} style={{ marginBottom: i === desc.layer5.length - 1 ? 0 : 8 }}>{p}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* 대운표 — 공용 UnTable 재사용.
            ★원국표와 같이 '오른쪽 → 왼쪽' 흐름. 열릴 때 스크롤을 오른쪽 끝으로 민다. */}
        {unItems.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div ref={dayunScrollRef}>
              <UnTable title="10년마다 바뀌는 큰 흐름" badge="대운" items={unItems} />
            </div>
            <div style={{ fontSize: 10.5, color: C.sub, margin: '5px 4px 0' }}>
              옆으로 밀면 노년까지 볼 수 있어요 →
            </div>
          </div>
        )}

        {/* 타고난 연·월 안내 */}
        <div style={{
          marginTop: 16, background: C.warm, borderRadius: 11,
          padding: '13px 15px', fontSize: 12.5, color: C.sub, lineHeight: 1.8,
        }}>
          아이가 태어나는 <b style={{ color: C.brand }}>해와 달</b>은 예정일이 정해지면 바꿀 수 없어요.
          그 안에서 <b style={{ color: C.brand }}>날과 시간</b>을 골라 결을 다듬는 것이 택일입니다.
        </div>

        {/* 로고 — 이미지로 저장했을 때 출처가 남게 */}
        <div style={{
          textAlign: 'center', marginTop: 16, fontSize: 11.5, color: C.faint, letterSpacing: '.2px',
        }}>
          🌸 <b style={{ color: C.sub }}>명카페</b> 전통 사주명리 출산택일
        </div>

        </div>{/* 캡처 영역 끝 */}

        {/* 저장 · 이미지 내려받기 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={handleSaveRecord} disabled={saving} style={{
            flex: 1, padding: 13, borderRadius: 12, border: `1px solid ${C.accent}`,
            background: C.soft, color: C.brand, fontSize: 13.5, fontWeight: 700,
            cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? .6 : 1,
          }}>{saving ? '저장 중…' : '보관함에 저장'}</button>
          <button onClick={handleSaveImage} disabled={sharing} style={{
            flex: 1, padding: 13, borderRadius: 12, border: `1px solid ${C.accent}`,
            background: C.soft, color: C.brand, fontSize: 13.5, fontWeight: 700,
            cursor: sharing ? 'default' : 'pointer', fontFamily: 'inherit', opacity: sharing ? .6 : 1,
          }}>{sharing ? '만드는 중…' : '🖼 이미지로 저장'}</button>
        </div>
        {savedMsg && (
          <div style={{
            marginTop: 8, fontSize: 12.5, color: C.brand, textAlign: 'center', fontWeight: 600,
          }}>{savedMsg}</div>
        )}
        <div style={{ marginTop: 7, fontSize: 11.5, color: C.sub, textAlign: 'center', lineHeight: 1.6 }}>
          내려받은 이미지를 카카오톡 등에 첨부해 보내실 수 있어요
        </div>

        {/* 유료 안내 */}
        <button
          onClick={() => alert('결제 관문 연결 예정')}
          style={{
            width: '100%', marginTop: 18, padding: '15px 16px', borderRadius: 13,
            border: 'none', background: C.brand, color: '#fff', cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
          }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>이 아이 사주 자세히 보기</div>
          <div style={{ fontSize: 12, opacity: .85, lineHeight: 1.6 }}>
            타고난 적성과 진로, 시기별 흐름까지 깊이 풀어 드려요
          </div>
        </button>

        <button onClick={() => router.back()} style={{
          width: '100%', marginTop: 9, padding: 13, borderRadius: 12,
          border: `1px solid ${C.line}`, background: '#fff', color: C.brand,
          fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>다른 날도 보기</button>

      </div>
    </main>
  )
}

export default function DetailPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: C.bg, color: C.brand, fontSize: 14,
      }}>불러오는 중…</div>
    }>
      <DetailInner />
    </Suspense>
  )
}
