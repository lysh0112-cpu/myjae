'use client'

// ============================================================================
// 오늘의 운세 카드 (공용 부품)
// ----------------------------------------------------------------------------
// 쓰는 법:  <TodayFortuneCard />   ← 이 한 줄이면 끝. 프로필 조회부터 알아서 함.
//
// 담긴 것: 프로필 조회 → 명식 계산(useResultSaju) → 오늘 운세 조회/생성 → 화면
//   - 오늘 것이 DB에 이미 있으면 그것을 그대로 씀 (AI 재호출 없음 = 비용 0)
//   - 없을 때만 /api/daily-fortune 을 1회 호출하고 결과를 저장
//
// 점수 표시: 100점 만점 총점 + 막대 + 우리말 등급.
//   ⚠ total 컬럼이 없던 시절(2026-07-19 이전) 기록에는 총점이 없다.
//     그런 경우 별점(score 1~5)을 100점으로 환산해 보여준다(gradeOf 참조).
//
// 접기/펼치기: 기본은 접힌 상태(요약·행운의 색/방향까지).
//   펼치면 애정·재물·건강 + 오늘의 명리 한 조각이 보인다.
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'
import { calcWolunList, calcIlunList } from '@/lib/saju/dayun'
import {
  scoreMonthlyFortune, monthTrend, pickGoodDays,
  MONTH_GRADE_LABEL, MONTH_GRADE_COLOR,
} from '@/lib/saju/monthlyFortune'

type Fortune = {
  fortune_date: string
  iljin_gan: string | null
  iljin_ji: string | null
  score: number | null          // 별점 1~5 (구버전 호환용으로 계속 저장)
  total: number | null          // 100점 만점 총점 (2026-07-19 신설)
  grade: string | null          // S / A / B / C
  summary: string | null
  love: string | null
  money: string | null
  health: string | null
  lucky_color: string | null
  lucky_dir: string | null
  today_insight: string | null
}

type FortuneProfile = {
  nickname: string | null
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_hour: string | null
  cal_type: string | null
  gender: string | null
  leap_month: boolean | null
  saju_saved: boolean | null
}

function toHourIdx(h: string | null): number | null {
  if (!h || h === '모름') return null
  const n = parseInt(h, 10)
  return isNaN(n) ? null : n
}

function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 행운의 색 이름 → 동그라미 색
function luckyColorChip(name: string | null): string {
  if (!name) return '#ddd'
  const n = name.replace(/\s/g, '')
  if (/(아이보리|미색|크림|상아)/.test(n)) return '#f5f0e0'
  if (/(흰|화이트|백)/.test(n)) return '#ffffff'
  if (/(검|블랙|흑)/.test(n)) return '#333333'
  if (/(빨|적|레드|다홍|주홍)/.test(n)) return '#e24b4a'
  if (/(주황|오렌지)/.test(n)) return '#ff9800'
  if (/(노랑|노란|옐로|황금|골드|금색)/.test(n)) return '#f5c518'
  if (/(초록|녹색|그린|연두)/.test(n)) return '#4caf50'
  if (/(파랑|파란|블루|남색|하늘|스카이)/.test(n)) return '#2196f3'
  if (/(보라|퍼플|자주|바이올렛)/.test(n)) return '#9c5fc4'
  if (/(분홍|핑크)/.test(n)) return '#ec87b1'
  if (/(갈색|브라운|밤색)/.test(n)) return '#8d6e63'
  if (/(회색|그레이|은색|실버)/.test(n)) return '#9e9e9e'
  return '#e0c890'
}

// 총점 → 우리말 등급.
// ⚠ 겁주지 않기 원칙: 낮은 점수도 "나쁨"이라 하지 않는다.
//   기준은 dailyFortune.ts 의 등급표(90/84/72)와 같게 맞춤. (2026-07-19 상향)
function gradeOf(total: number): { label: string; color: string; bar: string } {
  if (total >= 90) return { label: '아주 좋은 날', color: '#96502e', bar: '#e09030' }
  if (total >= 84) return { label: '좋은 날', color: '#96502e', bar: '#e09030' }
  if (total >= 72) return { label: '순조로운 날', color: '#96502e', bar: '#d9a878' }
  return { label: '차분한 날', color: '#b4785a', bar: '#c8a882' }
}

// 총점 구하기. total 이 있으면 그대로, 없으면 옛 별점을 환산.
// (별 1~5 → 20/40/60/80/100 이 아니라, 등급 경계에 맞춰 대표값을 쓴다)
function totalOf(f: Fortune): number | null {
  if (typeof f.total === 'number' && f.total > 0) return f.total
  const s = f.score
  if (!s) return null
  return s >= 5 ? 92 : s === 4 ? 78 : s === 3 ? 60 : s === 2 ? 45 : 30
}

export default function TodayFortuneCard() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<FortuneProfile | null>(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  const [fortune, setFortune] = useState<Fortune | null>(null)
  const [fortuneChecked, setFortuneChecked] = useState(false)
  const [fortuneLoading, setFortuneLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'day' | 'month'>('day')

  const { saju, dayStem, iljji, converting } = useResultSaju(
    profile?.cal_type || '양력',
    profile?.birth_year || 0,
    profile?.birth_month || 0,
    profile?.birth_day || 0,
    '0',
    toHourIdx(profile?.birth_hour ?? null),
  )

  // ① 로그인·프로필·오늘 운세를 한 번에 확인
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) {
        if (!cancelled) { setIsLoggedIn(false); setProfileChecked(true); setFortuneChecked(true) }
        return
      }
      if (cancelled) return
      setIsLoggedIn(true)
      setUserId(u.user.id)

      const { data: p } = await supabase.from('profiles')
        .select('nickname, birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
        .eq('id', u.user.id)
        .maybeSingle()
      if (cancelled) return
      if (p) setProfile(p as FortuneProfile)
      setProfileChecked(true)

      const { data: fRow } = await supabase.from('daily_fortune')
        .select('fortune_date, iljin_gan, iljin_ji, score, total, grade, summary, love, money, health, lucky_color, lucky_dir, today_insight')
        .eq('user_id', u.user.id)
        .eq('fortune_date', todayKST())
        .maybeSingle()
      if (cancelled) return
      if (fRow) setFortune(fRow as Fortune)
      setFortuneChecked(true)
    })()
    return () => { cancelled = true }
  }, [])

  // ② 오늘 것이 없을 때만 AI 호출 (하루 1회)
  useEffect(() => {
    if (!fortuneChecked) return
    if (fortune) return
    if (fortuneLoading) return
    if (converting) return
    if (!userId) return
    if (!profile?.saju_saved || !dayStem || !iljji) return

    let cancelled = false
    ;(async () => {
      setFortuneLoading(true)
      try {
        const res = await fetch('/api/daily-fortune', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saju, dayStem, iljji, nickname: profile?.nickname || undefined }),
        })
        const data = await res.json()
        if (data.error) { console.error('운세 생성 오류:', data.error); return }
        if (cancelled) return

        const row: Fortune = {
          fortune_date: data.fortune_date,
          iljin_gan: data.iljin_gan, iljin_ji: data.iljin_ji,
          score: data.score ?? null,
          total: data.total ?? null,
          grade: data.grade ?? null,
          summary: data.summary,
          love: data.love, money: data.money, health: data.health,
          lucky_color: data.lucky_color, lucky_dir: data.lucky_dir,
          today_insight: data.today_insight,
        }
        setFortune(row)
        await supabase.from('daily_fortune')
          .upsert({ user_id: userId, ...row }, { onConflict: 'user_id,fortune_date' })
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setFortuneLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fortuneChecked, converting, dayStem, iljji, userId, profile?.saju_saved])

  // ── 이달의 운세 (계산만 — AI 호출 없음) ───────────────────────
  //    월지가 필요해서 명식 배열에서 직접 꺼낸다.
  //    소스 84쪽: "대운이나 세운을 일단 月支에 대입해라. 月支가 총사령관이다"
  const monthly = (() => {
    if (!saju || saju.length < 4 || !dayStem) return null
    const myMonthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
    const myDayBranch = saju.find(p => p.pillar === '일주')?.branch ?? iljji
    if (!myMonthBranch || !myDayBranch || myMonthBranch === '?') return null

    const ys = calcYongsin(saju, dayStem)
    if (!ys) return null

    const now = new Date(Date.now() + 9 * 60 * 60 * 1000)   // KST
    const year = now.getUTCFullYear()
    const month = now.getUTCMonth() + 1

    const wolun = calcWolunList(dayStem, year)
    const thisMonth = wolun.find(w => w.month === month)
    if (!thisMonth) return null

    const base = {
      myDayStem: dayStem,
      myDayBranch,
      myMonthBranch,
      yongsin: ys.yongsin,
      heeksin: ys.heeksin,
      gisin: ys.gisin,
    }
    const score = scoreMonthlyFortune({ ...base, monthStem: thisMonth.cheongan, monthBranch: thisMonth.jiji })
    const trend = monthTrend(base, wolun)
    // 오늘 이후 날짜만 (이미 지난 날을 "조심하세요"라고 하면 쓸모없다)
    const today = now.getUTCDate()
    const remaining = calcIlunList(dayStem, year, month).filter(d => d.day >= today)
    const days = pickGoodDays(remaining, myDayBranch)
    const prev = trend.find(t => t.month === (month === 1 ? 12 : month - 1))

    return { year, month, ganji: thisMonth, score, trend, days, prev }
  })()

  // ── 화면 ──────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = {
    background: '#FFFBF7', border: '0.5px solid #f5d5b8',
    borderRadius: 14, padding: 15,
  }

  // 로그인 확인 전에는 아무것도 그리지 않는다(깜빡임 방지)
  if (isLoggedIn === null) return null

  // 탭 (오늘 / 이달) — 월운 계산이 가능할 때만 탭을 띄운다
  const tabBar = monthly ? (
    <div style={{ display: 'flex', gap: 4, background: '#f5ebe2', borderRadius: 9, padding: 3, marginBottom: 12 }}>
      {([['day', '오늘의 운세'], ['month', '이달의 운세']] as const).map(([k, label]) => {
        const on = tab === k
        return (
          <button key={k} onClick={() => { setTab(k); setOpen(false) }}
            style={{
              flex: 1, padding: '7px 0', fontSize: 12, cursor: 'pointer', border: 'none',
              borderRadius: 7, fontWeight: on ? 600 : 400,
              background: on ? '#b46e46' : 'transparent',
              color: on ? '#fff' : '#b4785a',
            }}>{label}</button>
        )
      })}
    </div>
  ) : null

  const header = (
    <>
      {tabBar}
      <div style={{ display: 'flex', justifyContent: monthly ? 'flex-end' : 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {!monthly && <span style={{ fontSize: 13, fontWeight: 600, color: '#96502e' }}>✦ 오늘의 운세</span>}
        {tab === 'day' && fortune?.iljin_gan && (
          <span style={{ fontSize: 10, color: '#b4785a', background: '#faede0', padding: '3px 9px', borderRadius: 10 }}>
            {todayKST().slice(5).replace('-', '.')} · {fortune.iljin_gan}{fortune.iljin_ji}일
          </span>
        )}
        {tab === 'month' && monthly && (
          <span style={{ fontSize: 10, color: '#b4785a', background: '#faede0', padding: '3px 9px', borderRadius: 10 }}>
            {monthly.month}월 · {monthly.ganji.cheongan}{monthly.ganji.jiji}월
          </span>
        )}
      </div>
    </>
  )

  // 비회원
  if (!isLoggedIn) {
    return (
      <div style={wrap}>
        {header}
        <div style={{ fontSize: 13, color: '#b4785a', textAlign: 'center', padding: '10px 0', lineHeight: 1.7 }}>
          로그인하면 매일 나만의 운세를 볼 수 있어요.<br />
          <button
            onClick={() => router.push('/login')}
            style={{ marginTop: 8, fontSize: 12, color: '#c8783c', background: 'none', border: '0.5px solid #f0d0a0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
          >로그인하기</button>
        </div>
      </div>
    )
  }

  // 사주 미등록
  if (profileChecked && !profile?.saju_saved) {
    return (
      <div style={wrap}>
        {header}
        <div style={{ fontSize: 13, color: '#b4785a', textAlign: 'center', padding: '10px 0', lineHeight: 1.7 }}>
          사주를 등록하면 매일 나만의 운세를 볼 수 있어요.<br />
          <button
            onClick={() => router.push('/mypage-new')}
            style={{ marginTop: 8, fontSize: 12, color: '#c8783c', background: 'none', border: '0.5px solid #f0d0a0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
          >사주 등록하러 가기</button>
        </div>
      </div>
    )
  }

  // ── 이달의 운세 탭 ───────────────────────────────────────────
  if (tab === 'month' && monthly) {
    const { score: ms, trend, days, prev, month } = monthly
    const gl = MONTH_GRADE_LABEL[ms.grade]
    const gc = MONTH_GRADE_COLOR[ms.grade]
    const diff = prev ? ms.total - prev.total : 0
    const maxTrend = Math.max(...trend.map(t => t.total), 1)
    // 월지와 일지가 같은 사주면 두 영역 결과가 똑같아진다 → 한 줄로 합쳐 보여준다
    const sameBranch = ms.area.envTag === ms.area.selfTag && ms.area.env === ms.area.self

    const areaRow = (icon: string, label: string, pct: number, gradeTxt: string, tag: string) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 11.5, color: '#96502e', fontWeight: 600, width: 46, flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1, height: 7, background: '#ecd9c6', borderRadius: 4, overflow: 'hidden' }}>
          {/* 낮은 등급이어도 최소 18%는 채워서 막대가 보이게 한다 */}
          <div style={{ width: `${Math.max(18, pct)}%`, height: '100%', background: pct >= 70 ? '#3b8b3f' : pct >= 45 ? '#c8873c' : '#9a7358', borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: 9.5, color: '#b4785a', width: 52, textAlign: 'right', flexShrink: 0 }}>{tag || gradeTxt}</span>
      </div>
    )

    return (
      <div style={wrap}>
        {header}

        {/* 점수 + 지난달 대비 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 7 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: '#c8783c', lineHeight: 1 }}>{ms.total}</span>
          <span style={{ fontSize: 13, color: '#c5a590' }}>/ 100</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: gc.text, background: '#faede0', padding: '3px 10px', borderRadius: 9 }}>{gl}</span>
        </div>
        <div style={{ height: 7, background: '#f5e6da', borderRadius: 4, marginBottom: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(0, Math.min(100, ms.total))}%`, height: '100%', background: gc.bar, borderRadius: 4 }} />
        </div>
        {prev && diff !== 0 && (
          <div style={{ fontSize: 10.5, color: diff > 0 ? '#3b6d11' : '#b4785a', marginBottom: 11, textAlign: 'right' }}>
            지난달보다 {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}점
          </div>
        )}

        {/* 영역별 — 일·환경 / 나·건강
            월지와 일지가 같은 사주(예: 子월 子일)는 두 줄이 똑같이 나오므로 한 줄로 합친다 */}
        <div style={{ background: '#f7e2cc', borderRadius: 9, padding: 11, marginBottom: 11 }}>
          {sameBranch ? (
            <div style={{ marginBottom: -8 }}>
              {areaRow('✦', '이번 달', ms.area.env, ms.area.envGrade, ms.area.envTag)}
            </div>
          ) : (
            <>
              {areaRow('🏢', '일·환경', ms.area.env, ms.area.envGrade, ms.area.envTag)}
              <div style={{ marginBottom: -8 }}>
                {areaRow('🌿', '나·건강', ms.area.self, ms.area.selfGrade, ms.area.selfTag)}
              </div>
            </>
          )}
        </div>

        {/* 이번 달 좋은 날 */}
        {(days.good.length > 0 || days.bad.length > 0) && (
          <div style={{ marginBottom: 11 }}>
            <div style={{ fontSize: 10, color: '#b4785a', marginBottom: 6 }}>📅 이번 달 눈여겨볼 날</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {days.good.map(d => (
                <span key={`g${d.day}`} style={{ fontSize: 10.5, background: '#f0f7ec', color: '#3b6d11', padding: '4px 9px', borderRadius: 7, border: '0.5px solid #d8e8cc' }}>
                  {month}/{d.day}
                </span>
              ))}
              {days.bad.map(d => (
                <span key={`b${d.day}`} style={{ fontSize: 10.5, background: '#fdf0ec', color: '#c0705a', padding: '4px 9px', borderRadius: 7, border: '0.5px solid #f0d5cc' }}>
                  {month}/{d.day} 조심
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 펼치면: 1년 흐름 + 명리 근거 */}
        {open && (
          <>
            <div style={{ paddingTop: 11, borderTop: '0.5px solid #f0e0d5', marginBottom: 11 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#c8783c', marginBottom: 9 }}>📈 올해 흐름</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 58 }}>
                {trend.map(t => {
                  const on = t.month === month
                  return (
                    <div key={t.month} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{
                        height: Math.max(4, Math.round((t.total / maxTrend) * 42)),
                        background: on ? '#e09030' : '#f5e0cc',
                        borderRadius: '3px 3px 0 0',
                      }} />
                      <div style={{ fontSize: 8, color: on ? '#c8783c' : '#c5a590', marginTop: 3, fontWeight: on ? 600 : 400 }}>{t.month}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ paddingTop: 11, borderTop: '0.5px solid #f0e0d5', marginBottom: 11 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#c8783c', marginBottom: 6 }}>📖 이달의 명리 한 조각</div>
              {ms.area.envDesc && (
                <p style={{ fontSize: 11.5, color: '#7a6858', lineHeight: 1.75, margin: '0 0 6px' }}>{ms.area.envDesc}</p>
              )}
              {ms.area.selfDesc && ms.area.selfDesc !== ms.area.envDesc && (
                <p style={{ fontSize: 11.5, color: '#7a6858', lineHeight: 1.75, margin: 0 }}>{ms.area.selfDesc}</p>
              )}
              <div style={{ fontSize: 9.5, color: '#c5a590', marginTop: 6 }}>
                명리 근거: {ms.area.envTag}{ms.area.selfTag && ms.area.selfTag !== ms.area.envTag ? ` · ${ms.area.selfTag}` : ''}
              </div>
            </div>
          </>
        )}

        <div onClick={() => setOpen(o => !o)} role="button" aria-expanded={open}
          style={{ textAlign: 'center', fontSize: 11.5, color: '#b4785a', padding: '9px 0 2px', cursor: 'pointer' }}>
          {open ? '접기 ▲' : '자세히 보기 ▼'}
        </div>
      </div>
    )
  }

  // 준비 중
  if (fortuneLoading || (!fortune && !fortuneChecked) || converting || !profileChecked) {
    return (
      <div style={wrap}>
        {header}
        <div style={{ fontSize: 13, color: '#c0a898', textAlign: 'center', padding: '16px 0' }}>
          오늘의 운세를 준비하는 중…
        </div>
      </div>
    )
  }

  // 실패
  if (!fortune) {
    return (
      <div style={wrap}>
        {header}
        <div style={{ fontSize: 13, color: '#c0a898', textAlign: 'center', padding: '12px 0' }}>
          운세를 불러오지 못했어요. 잠시 후 다시 들어와 주세요.
        </div>
      </div>
    )
  }

  const total = totalOf(fortune)
  const g = gradeOf(total ?? 0)

  return (
    <div style={wrap}>
      {header}

      {/* 총점 + 막대 + 우리말 등급 */}
      {total != null && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 7 }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: '#c8783c', lineHeight: 1 }}>{total}</span>
            <span style={{ fontSize: 13, color: '#c5a590' }}>/ 100</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: g.color, background: '#faede0', padding: '3px 10px', borderRadius: 9 }}>
              {g.label}
            </span>
          </div>
          <div style={{ height: 7, background: '#f5e6da', borderRadius: 4, marginBottom: 11, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, total))}%`, height: '100%', background: g.bar, borderRadius: 4 }} />
          </div>
        </>
      )}

      {/* 한 줄 요약 — 접혔을 땐 2줄까지만 */}
      <p
        style={{
          fontSize: 12.5, color: '#6a5848', lineHeight: 1.75, margin: '0 0 12px',
          ...(open ? {} : {
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }),
        }}
      >{fortune.summary}</p>

      {/* 행운의 색·방향 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, background: '#faede0', borderRadius: 8, padding: '9px 7px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#b4785a', marginBottom: 4 }}>행운의 색</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <span style={{ width: 13, height: 13, borderRadius: '50%', background: luckyColorChip(fortune.lucky_color), border: '1px solid #ddd', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#96502e' }}>{fortune.lucky_color || '-'}</span>
          </div>
        </div>
        <div style={{ flex: 1, background: '#faede0', borderRadius: 8, padding: '9px 7px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#b4785a', marginBottom: 4 }}>행운의 방향</div>
          <div style={{ fontSize: 12, color: '#96502e' }}>{fortune.lucky_dir || '-'}</div>
        </div>
      </div>

      {/* 펼쳤을 때만: 애정·재물·건강 + 명리 한 조각 */}
      {open && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: fortune.today_insight ? 12 : 0 }}>
            <div style={{ flex: 1, background: '#fdf4ec', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 9, color: '#c8967a', marginBottom: 3 }}>❤️ 애정</div>
              <div style={{ fontSize: 10.5, color: '#8a7868', lineHeight: 1.5 }}>{fortune.love || '-'}</div>
            </div>
            <div style={{ flex: 1, background: '#fdf4ec', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 9, color: '#c8967a', marginBottom: 3 }}>💰 재물</div>
              <div style={{ fontSize: 10.5, color: '#8a7868', lineHeight: 1.5 }}>{fortune.money || '-'}</div>
            </div>
            <div style={{ flex: 1, background: '#fdf4ec', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 9, color: '#c8967a', marginBottom: 3 }}>🌿 건강</div>
              <div style={{ fontSize: 10.5, color: '#8a7868', lineHeight: 1.5 }}>{fortune.health || '-'}</div>
            </div>
          </div>

          {fortune.today_insight && (
            <div style={{ paddingTop: 12, borderTop: '0.5px solid #f0e0d5' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#c8783c', marginBottom: 6 }}>🔥 오늘의 명리 한 조각</div>
              <p style={{ fontSize: 11.5, color: '#7a6858', lineHeight: 1.7, margin: 0 }}>{fortune.today_insight}</p>
            </div>
          )}
        </>
      )}

      {/* 펼치기 (내 사주 자세히 보기 버튼은 유저 카드로 옮겼음) */}
      <div
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-expanded={open}
        style={{ textAlign: 'center', fontSize: 11.5, color: '#b4785a', padding: '9px 0 2px', cursor: 'pointer' }}
      >{open ? '접기 ▲' : '자세히 보기 ▼'}</div>
    </div>
  )
}
