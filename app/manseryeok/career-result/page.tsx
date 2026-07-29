'use client'

/**
 * 진로적성 결과
 * ─────────────────────────────────────────────
 * 진입: career-input > 이 화면   /  보관함 카드 > 이 화면(&recordId=)
 *
 * 흐름
 *   URL(생년월일시) → /api/lunar → 4기둥
 *                   → lib/saju/career 판정 6가지
 *                   → CareerJudgeCard 로 그리기
 *                   → saveRecord('career')   ★기록 남기기
 *
 * ★아직 없는 것 — AI 통변
 *   지금은 판정 문장을 그대로 늘어놓는다. 궁합처럼 통변을 얹으면
 *   card.reasons 를 프롬프트 재료로 넘겨 사람 말로 엮게 된다.
 *   그 자리를 아래 [통변 붙일 자리] 주석에 표시해 두었다.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  judgeOhaengGijil, judgeYukchin, judgeGyeokguk,
  judgeSinsal, judgeGyeyeol, judgeSpecial, judgeYongsin, judgeJobs,
  judgeIlju, judgeJobStructure, judgeJobFit, judgeRoleFit,
  type CareerCard, type CareerInput,
} from '@/lib/saju/career'
import { calcPerson, ageOf, type PersonCalc } from '@/lib/saju/career/calcPerson'
import { buildCareerPrompt, parseCareerTongbyeon, keyOfTitle } from '@/lib/saju/career'
import { saveRecord, updateRecordResult } from '@/lib/saju/sajuRecords'
import { calcSajuMbti, compareMbti } from '@/lib/saju/career/sajuMbti'
import { type CareerStatus, STATUS_LABEL } from '@/lib/saju/career/status'
import MbtiCard from './components/MbtiCard'
import { getGongmang } from '@/lib/saju/gongmang'
import SajuWonguk from '@/app/manseryeok/result-new/SajuWonguk'
import CareerJudgeCard from './components/CareerJudgeCard'

const ACCENT = '#785aaa'
const BG = '#FDF6F0'
const LINE = '#f0e0d5'

/** 화면 묶음 — 통변 순서와 1:1 로 맞춘다. (교훈 AS) */
const GROUPS: Array<{ label: string; keys: string[] }> = [
  { label: '', keys: ['special'] },                       // 경고는 맨 위, 제목 없이
  { label: '타고난 결', keys: ['ohaeng_gijil', 'yukchin', 'ilju'] },
  { label: '그릇과 자리', keys: ['gyeokguk', 'sinsal', 'yongsin'] },
  // ★성인은 jobfit·rolefit 이 메인, 학생은 gyeyeol·jobs 가 메인.
  //   해당 없는 카드는 빈 카드로 와서 아래 렌더에서 걸러집니다.
  { label: '어울리는 자리', keys: ['jobfit', 'rolefit', 'gyeyeol', 'jobstruct', 'jobs'] },
]

function CareerResultInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const person = useMemo(() => ({
    name: sp.get('name') || '',
    gender: sp.get('gender') || '남',
    calType: sp.get('calType') || '양력',
    year: sp.get('year') || '',
    month: sp.get('month') || '',
    day: sp.get('day') || '',
    leapMonth: sp.get('leapMonth') || '0',
    hour: sp.get('hour') || '모름',
  }), [sp])
  const target = (sp.get('target') === 'student' ? 'student' : 'adult') as 'student' | 'adult'
  // ★2026-07-29 — 신분·직업과 실제 MBTI. (대표님 지시)
  //   status 가 없으면 target 으로 미뤄 잡습니다. 예전 링크가 깨지지 않게.
  const status = (sp.get('status') as CareerStatus | null)
    ?? (target === 'student' ? 'middle_high' : 'worker')
  const realMbti = (sp.get('mbti') || '').toUpperCase()
  /** 입력 화면으로 되돌아갈 때 쓸 쿼리 — 사람 정보는 그대로 들고 간다 */
  const backQuery = useMemo(() => {
    const p = new URLSearchParams()
    for (const k of ['year', 'month', 'day', 'gender', 'calType', 'leapMonth', 'hour', 'name']) {
      const v = sp.get(k); if (v) p.set(k, v)
    }
    return p.toString()
  }, [sp])
  const recordId = sp.get('recordId') || ''

  const [calc, setCalc] = useState<PersonCalc | null>(null)
  const [err, setErr] = useState('')
  const savedRef = useRef(false)     // 두 번 저장되지 않게 (교훈 AQ)
  const savedIdRef = useRef<string>('')  // ★async 가 길어 state 대신 ref 로 읽는다 (교훈 K)
  const [tong, setTong] = useState('')
  const [tongState, setTongState] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle')
  const tongStartedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    if (!person.year) { setErr('생년월일이 없어요. 보관함에서 다시 들어와 주세요.'); return }
    calcPerson(person).then(r => {
      if (cancelled) return
      if (!r) { setErr('사주를 계산하지 못했어요. 잠시 후 다시 시도해 주세요.'); return }
      setCalc(r)
    })
    return () => { cancelled = true }
  }, [person])

  // 명식 부품(SajuWonguk)이 요구하는 값들
  const dayStem = calc?.saju.find(p => p.pillar === '일주')?.stem ?? ''
  const iljji = calc?.saju.find(p => p.pillar === '일주')?.branch ?? ''
  const yeonjji = calc?.saju.find(p => p.pillar === '년주')?.branch ?? ''
  const [gm1, gm2] = (dayStem && iljji && dayStem !== '?' && iljji !== '?')
    ? getGongmang(dayStem, iljji) : ['', '']

  const cards: CareerCard[] = useMemo(() => {
    if (!calc) return []
    const input: CareerInput = {
      saju: calc.saju, solarMonth: calc.solarMonth,
      solarDay: calc.solarDay, hourBranch: calc.hourBranch, target,
    }
    return [
      judgeSpecial(input),
      judgeOhaengGijil(input),
      judgeYukchin(input),
      judgeIlju(input),
      judgeGyeokguk(input),
      judgeSinsal(input),
      judgeYongsin(input),
      judgeJobStructure(input),
      // ★학생이면 「계열과 학과」, 성인이면 「잘 맞는 직무 & 조직 성향」.
      //   둘 중 하나만 lines 를 채우고 나머지는 빈 카드를 돌려줍니다.
      //   빈 카드는 아래 GROUPS 렌더에서 걸러집니다.
      judgeGyeyeol(input),
      judgeJobFit(input),
      // ★2026-07-29 — 성인에게는 「어울리는 직업」 대신 「핵심 직무 & 전문 분야」.
      //   교재 직업 목록에 유흥업·목욕탕·사채업 같은 옛 어휘가 있어
      //   직장인 리포트에 그대로 나가면 리포트 전체를 못 믿게 됩니다.
      //   ⚠️ 교재 표는 안 고쳤습니다. 성인 출력만 바꾼 것입니다. (roleFit 머리말)
      judgeRoleFit(input),
      judgeJobs(input),
    ].filter(Boolean) as CareerCard[]
  }, [calc, target])

  // ★사주 추정 MBTI — 카드 판정과 별개로 한 번만 잰다
  const sajuMbti = useMemo(
    () => (calc ? calcSajuMbti(calc.saju, calc.solarMonth, calc.solarDay, calc.hourBranch) : null),
    [calc],
  )
  const mbtiCmp = useMemo(
    () => (sajuMbti && realMbti ? compareMbti(sajuMbti, realMbti) : null),
    [sajuMbti, realMbti],
  )

  // 기록 남기기 — 다시보기로 들어온 경우(recordId)에는 저장하지 않는다
  useEffect(() => {
    if (!calc || recordId || savedRef.current) return
    savedRef.current = true
    saveRecord({
      serviceType: 'career',
      title: person.name || '이름 없음',
      inputData: {
        gender: person.gender, calType: person.calType,
        year: person.year, month: person.month, day: person.day,
        leapMonth: person.leapMonth, hour: person.hour,
      },
    }).then(r => { if (r.ok && r.id) savedIdRef.current = r.id })
      .catch(e => console.error('진로적성 기록 저장 실패', e))
  }, [calc, recordId, person])

  // ── 통변 ────────────────────────────────────────────────────
  //   ★다시보기(recordId)로 들어오면 새로 돌리지 않는다. 돈이 든다.
  //     저장해 둔 풀이를 그대로 보여 준다.
  useEffect(() => {
    if (!calc || !cards.length || tongStartedRef.current) return
    if (recordId) return           // 다시보기 — 아래 effect 가 저장본을 불러온다
    tongStartedRef.current = true
    let cancelled = false

    ;(async () => {
      setTongState('loading')
      const systemPrompt = buildCareerPrompt({
        name: person.name, gender: person.gender, age: ageOf(person.year),
        target, saju: calc.saju, hourUnknown: calc.hourUnknown, cards,
        // ★2026-07-29 — 신분과 MBTI 를 실어 보냅니다. (대표님 지시)
        status,
        sajuMbti: sajuMbti?.code,
        realMbti: realMbti || undefined,
      })
      let acc = ''
      try {
        const res = await fetch('/api/tongbyeon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt, premium: true }),
        })
        if (!res.ok || !res.body) {
          console.error('진로적성 통변 실패', res.status)
          setTongState('failed'); return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        // ★청크가 줄 중간에 잘릴 수 있다. buf 로 완성된 줄만 처리한다. (교훈 AG)
        let buf = ''
        const take = (line: string) => {
          if (!line.startsWith('data: ')) return
          const d = line.slice(6)
          if (d === '[DONE]') return
          try {
            const parsed = JSON.parse(d)
            if (parsed.text) { acc += parsed.text; if (!cancelled) setTong(acc) }
          } catch (e) { console.error('tongbyeon parse', e) }
        }
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const ls = buf.split('\n')
          buf = ls.pop() ?? ''
          for (const line of ls) take(line)
        }
        // ★2026-07-27 — 마지막 줄에 개행이 없으면 여기 남는다. 버리면 끝 문장이 잘린다.
        buf += decoder.decode()
        if (buf.trim()) take(buf.trim())
        if (cancelled) return
        setTongState('done')

        // ★풀이를 보관함에 남긴다. insert 가 아니라 update 다. (교훈 AQ)
        //   판정 저장이 먼저 일어나므로, 그 행을 덮어써야 한다.
        //   id 는 state 가 아니라 ref 로 읽는다. async 가 길어 클로저가 낡는다.
        for (let i = 0; i < 10 && !savedIdRef.current; i++) {
          await new Promise(r => setTimeout(r, 500))
        }
        if (savedIdRef.current) {
          const ok = await updateRecordResult(savedIdRef.current, { tong: acc })
          if (!ok) console.error('진로적성 풀이 저장 실패 (update)')
        } else {
          console.error('진로적성 풀이 저장 실패 — 저장된 기록 id 를 찾지 못했습니다')
        }
      } catch (e) {
        console.error('진로적성 통변 오류', e)
        if (!cancelled) setTongState('failed')
      }
    })()
    return () => { cancelled = true }
  }, [calc, cards, recordId, person, target, status, sajuMbti?.code, realMbti])

  // 다시보기 — 저장해 둔 풀이 불러오기
  useEffect(() => {
    if (!recordId) return
    let cancelled = false
    import('@/lib/saju/sajuRecords').then(({ getRecord }) =>
      getRecord(recordId).then(r => {
        if (cancelled || !r) return
        const t = (r.resultData as { tong?: string } | undefined)?.tong
        if (t) { setTong(t); setTongState('done') }
      }),
    ).catch(e => console.error('저장된 풀이 불러오기 실패', e))
    return () => { cancelled = true }
  }, [recordId])

  // 대목별로 갈라 카드에 넣는다
  const { tongIntro, tongByKey, tongOutro } = useMemo(() => {
    if (!tong) return { tongIntro: '', tongByKey: {} as Record<string, string>, tongOutro: '' }
    const { intro, byTitle, outro } = parseCareerTongbyeon(tong)
    const map: Record<string, string> = {}
    // ★2026-07-27 — 짝을 못 찾은 대목을 버리지 않는다.
    //   전에는 keyOfTitle 이 null 이면 그 글이 화면 어디에도 안 나오고 사라졌다.
    //   자리가 조금 어긋나더라도 보이는 편이 낫다. 맺는말 앞에 이어 붙인다.
    const leftover: string[] = []
    for (const title of Object.keys(byTitle)) {
      const k = keyOfTitle(title)
      if (k) map[k] = byTitle[title]
      else if (byTitle[title]) leftover.push(byTitle[title])
    }
    const outroAll = [...leftover, outro].filter(Boolean).join('\n\n')
    return { tongIntro: intro, tongByKey: map, tongOutro: outroAll }
  }, [tong])

  const byKey = (k: string) => cards.find(c => c.key === k)

  return (
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', paddingBottom: 48 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${LINE}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/manseryeok/career')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>
          {person.name ? `${person.name}님의 진로적성` : '진로적성'}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: ACCENT, background: '#efeaf7', padding: '2px 9px', borderRadius: 8 }}>
          {target === 'student' ? '학생' : '성인'}
        </span>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {err && (
          <div style={{ textAlign: 'center', padding: '46px 20px', color: '#5c3a1e', fontSize: 13, lineHeight: 1.7 }}>{err}</div>
        )}

        {!err && !calc && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#5c3a1e', fontSize: 13 }}>
            사주를 세우는 중…
          </div>
        )}

        {calc && (
          <>
            {/* 명식 — 사주보기·출산택일과 같은 공용 부품을 그대로 쓴다.
                십성·12운성·신살·귀인까지 한 표에 담기고, 용어를 누르면 설명이 뜬다.
                손으로 다시 그리면 세 화면의 명식이 서로 달라진다. */}
            <div style={{ marginBottom: 14 }}>
              <SajuWonguk
                saju={calc.saju}
                dayStem={dayStem}
                yeonjji={yeonjji}
                iljji={iljji}
                gm1={gm1}
                gm2={gm2}
              />
              {calc.hourUnknown && (
                <div style={{ fontSize: 11, color: '#8a7063', marginTop: 8, textAlign: 'center' }}>
                  태어난 시(時)를 몰라 시주를 비워 두고 보았어요
                </div>
              )}
            </div>

            {/* 여는말 */}
            {tongState === 'loading' && !tongIntro && (
              <div style={{ textAlign: 'center', padding: '18px 0', color: '#8a7063', fontSize: 12.5 }}>
                풀이를 쓰고 있어요…
              </div>
            )}
            {tongIntro && (
              <div style={{
                background: '#f7f3fb', border: `0.5px solid #e5dcf0`, borderRadius: 14,
                padding: '15px 16px', marginBottom: 14,
                fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85, whiteSpace: 'pre-wrap',
              }}>{tongIntro}</div>
            )}

            {/* ★2026-07-29 — 어느 신분으로 본 리포트인지 밝힙니다.
                손님이 잘못 골랐을 때 바로 알아채고 되돌아갈 수 있어야 합니다. */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap',
              margin: '2px 2px 10px',
            }}>
              <span style={{
                fontSize: 11, color: '#4a3b60', background: '#f3eefa',
                border: '1px solid #785aaa26', padding: '4px 10px', borderRadius: 20, fontWeight: 600,
              }}>{STATUS_LABEL[status]} 기준</span>
              {realMbti && (
                <span style={{
                  fontSize: 11, color: '#64748b', background: '#f8fafc',
                  border: '1px solid rgba(120,53,15,0.11)', padding: '4px 10px', borderRadius: 20,
                }}>MBTI {realMbti}</span>
              )}
              <button
                onClick={() => router.push(`/manseryeok/career-input?${backQuery}`)}
                style={{
                  fontSize: 11, color: '#94a3b8', background: 'none', border: 'none',
                  cursor: 'pointer', textDecoration: 'underline', padding: '4px 2px',
                }}
              >바꾸기</button>
            </div>

            {GROUPS.map(g => {
              // ★2026-07-29 — lines 가 빈 카드는 안 그립니다.
              //   「계열과 학과」(학생)와 「직무 & 조직」(성인)이 서로 자리를 바꾸는데,
              //   해당 없는 쪽은 빈 카드를 돌려주기 때문입니다.
              const list = g.keys.map(byKey)
                .filter((c): c is CareerCard => !!c && c.lines.length > 0)
              if (!list.length) return null
              return (
                <div key={g.label || 'top'}>
                  {g.label && (
                    <div style={{
                      fontSize: 12, color: '#8a7063', fontWeight: 500,
                      margin: '18px 2px 8px', letterSpacing: '.02em',
                    }}>{g.label}</div>
                  )}
                  {list.map(c => (
                    <CareerJudgeCard key={c.key} card={c} tong={tongByKey[c.key]} />
                  ))}
                  {/* ★사주 MBTI — 「타고난 결」 묶음 끝에 붙입니다.
                      성향 이야기라 오행·육친·일주 바로 뒤가 결이 맞습니다. */}
                  {g.label === '타고난 결' && sajuMbti && (
                    <MbtiCard
                      result={sajuMbti}
                      realMbti={realMbti}
                      compare={mbtiCmp}
                      onWantInput={() => router.push(`/manseryeok/career-input?${backQuery}`)}
                    />
                  )}
                </div>
              )
            })}

            {/* 맺는말 */}
            {tongOutro && (
              <div style={{
                background: '#f7f3fb', border: `0.5px solid #e5dcf0`, borderRadius: 14,
                padding: '15px 16px', margin: '4px 0 14px',
                fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85, whiteSpace: 'pre-wrap',
              }}>{tongOutro}</div>
            )}
            {tongState === 'failed' && (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#8a7063', fontSize: 12 }}>
                풀이를 불러오지 못했어요. 판정은 그대로 보실 수 있습니다.
              </div>
            )}

            {/* ★2026-07-27 — "곧 더해질 대목" 상자를 뺐다. (대표님 지시)
                  준비 중이라는 안내는 만드는 쪽 사정이지 읽는 분께 드릴 말이 아니다.
                  학과도 이제 나오므로 "학과와 대학"이라는 예고 자체가 어긋나 있었다.
                  학업운·합격운은 홈의 '합격운/취업운'(🐍)에서 따로 들어간다. */}

            <div style={{ fontSize: 11, color: '#a08d7d', textAlign: 'center', marginTop: 18, lineHeight: 1.7 }}>
              사주는 참고입니다. 길은 본인의 노력과 의지로 얼마든지 바꿀 수 있어요.
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function CareerResultPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <CareerResultInner />
    </Suspense>
  )
}
