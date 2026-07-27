'use client'

/**
 * 진로적성 입력 — 무엇을 볼지 고르기
 * ─────────────────────────────────────────────
 * 진입: career(보관함) > 사람 선택 모달 > 이 화면
 * 다음: career-result
 *
 * 사람은 이미 정해져서 URL 로 넘어온다. 여기서는 "학생이냐 성인이냐"만 고른다.
 * 교재가 학생(입시)과 성인(직업)을 다르게 다루기 때문이다.
 *   학생 : 문·이과, 학과, 특목고/일반고, 수시/정시, 학업운   (교재 126~139쪽)
 *   성인 : 직업 구조, 어울리는 직업, 이직·창업              (교재 162~191쪽)
 *
 * 나이로 미리 골라 두되 바꿀 수 있게 한다. (만 19세 미만이면 학생)
 */

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ageOf } from '@/lib/saju/career/calcPerson'

const ACCENT = '#785aaa'
const BG = '#FDF6F0'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'

type Target = 'student' | 'adult'

function CareerInputInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const name = sp.get('name') || ''
  const year = sp.get('year') || ''
  const age = useMemo(() => ageOf(year), [year])
  const [target, setTarget] = useState<Target>(age !== null && age < 20 ? 'student' : 'adult')

  const query = useMemo(() => {
    const p = new URLSearchParams()
    for (const k of ['year', 'month', 'day', 'gender', 'calType', 'leapMonth', 'hour', 'name']) {
      const v = sp.get(k)
      if (v) p.set(k, v)
    }
    p.set('target', target)
    return p.toString()
  }, [sp, target])

  const opts: Array<{ key: Target; title: string; sub: string }> = [
    { key: 'student', title: '학생이에요', sub: '문·이과와 학과, 고교 선택, 학업운까지 함께 봅니다' },
    { key: 'adult', title: '성인이에요', sub: '어울리는 직업과 일하는 자리를 중심으로 봅니다' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${LINE}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>진로적성</div>
      </div>

      <div style={{ padding: '22px 16px 0' }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: '#3a2e28', marginBottom: 6 }}>
          {name ? `${name}님은 어느 쪽인가요?` : '어느 쪽인가요?'}
        </div>
        <div style={{ fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.7, marginBottom: 20 }}>
          학생과 성인은 보는 것이 다릅니다. 고르시면 그에 맞춰 풀어 드려요.
          {age !== null && <><br />생년으로 보아 {age}세로 잡았습니다. 다르면 바꿔 주세요.</>}
        </div>

        {opts.map(o => {
          const on = target === o.key
          return (
            <button key={o.key} onClick={() => setTarget(o.key)}
              style={{
                width: '100%', textAlign: 'left', marginBottom: 10, padding: '16px 16px',
                background: on ? '#efeaf7' : CARD,
                border: on ? `1.5px solid ${ACCENT}` : `0.5px solid ${LINE}`,
                borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: on ? ACCENT : '#3a2e28', marginBottom: 4 }}>
                {o.title}
              </div>
              <div style={{ fontSize: 12, color: '#5c3a1e', lineHeight: 1.6 }}>{o.sub}</div>
            </button>
          )
        })}

        <button onClick={() => router.push(`/manseryeok/career-result?${query}`)}
          style={{
            width: '100%', marginTop: 14, padding: 15, borderRadius: 12,
            background: ACCENT, border: 'none', color: '#fff',
            fontSize: 14.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          진로적성 보기
        </button>

        <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, marginTop: 16, textAlign: 'center' }}>
          태어난 시(時)를 모르셔도 볼 수 있어요.<br />다만 시주를 비워 두고 보게 되니, 그만큼 조심해서 읽어 주세요.
        </div>
      </div>
    </main>
  )
}

export default function CareerInputPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <CareerInputInner />
    </Suspense>
  )
}
