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
  type CareerCard, type CareerInput,
} from '@/lib/saju/career'
import { calcPerson, type PersonCalc } from '@/lib/saju/career/calcPerson'
import { saveRecord } from '@/lib/saju/sajuRecords'
import { getGongmang } from '@/lib/saju/gongmang'
import SajuWonguk from '@/app/manseryeok/result-new/SajuWonguk'
import CareerJudgeCard from './components/CareerJudgeCard'

const ACCENT = '#785aaa'
const BG = '#FDF6F0'
const LINE = '#f0e0d5'

/** 화면 묶음 — 통변 순서와 1:1 로 맞춘다. (교훈 AS) */
const GROUPS: Array<{ label: string; keys: string[] }> = [
  { label: '', keys: ['special'] },                       // 경고는 맨 위, 제목 없이
  { label: '타고난 결', keys: ['ohaeng_gijil', 'yukchin'] },
  { label: '그릇과 자리', keys: ['gyeokguk', 'sinsal', 'yongsin'] },
  { label: '어울리는 자리', keys: ['gyeyeol', 'jobs'] },
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
  const recordId = sp.get('recordId') || ''

  const [calc, setCalc] = useState<PersonCalc | null>(null)
  const [err, setErr] = useState('')
  const savedRef = useRef(false)   // 두 번 저장되지 않게 (교훈 AQ)

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
      judgeGyeokguk(input),
      judgeSinsal(input),
      judgeYongsin(input),
      judgeGyeyeol(input),
      judgeJobs(input),
    ].filter(Boolean) as CareerCard[]
  }, [calc, target])

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
    }).catch(e => console.error('진로적성 기록 저장 실패', e))
  }, [calc, recordId, person])

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

            {/* [통변 붙일 자리 — 여는말]
                궁합처럼 /api/tongbyeon(SSE)을 붙이면 여기에 여는말이 들어온다.
                프롬프트 재료는 각 카드의 reasons 를 모아 넘긴다. */}

            {GROUPS.map(g => {
              const list = g.keys.map(byKey).filter(Boolean) as CareerCard[]
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
                    <CareerJudgeCard key={c.key} card={c} />
                  ))}
                </div>
              )
            })}

            {/* [통변 붙일 자리 — 맺는말] */}

            {/* 아직 없는 대목 */}
            <div style={{
              border: `0.5px dashed #d8c6b8`, borderRadius: 14, padding: '14px 16px',
              marginTop: 6, color: '#8a7063', fontSize: 12, lineHeight: 1.8,
            }}>
              <div style={{ fontWeight: 500, marginBottom: 4, color: '#6b5340' }}>곧 더해질 대목</div>
              일주 60갑자 · 직업 구조 8종
              {target === 'student' && <> · 학과와 대학 · 학업운</>}
              <br />그리고 이 모두를 사람 말로 엮어 주는 풀이
            </div>

            <div style={{ fontSize: 11, color: '#a08d7d', textAlign: 'center', marginTop: 18, lineHeight: 1.7 }}>
              출전 『명리적성 비법노트』(심산)<br />
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
