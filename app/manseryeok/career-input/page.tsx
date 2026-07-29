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
import MbtiSelect from '@/app/manseryeok/components/MbtiSelect'
import { STATUS_OPTIONS, statusToTarget, type CareerStatus } from '@/lib/saju/career/status'

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
  // ★2026-07-29 — 「학생/성인」 둘에서 «신분·직업 여섯»으로 넓혔습니다. (대표님 지시)
  //   [왜] 취업준비생과 직장인은 둘 다 '성인'이지만 묻는 것이 다릅니다.
  //        취준생은 «어디로 들어갈까», 직장인은 «여기 남을까 옮길까» 입니다.
  //   ⚠️ target(student|adult) 은 없애지 않았습니다. 카드 판정 부품 열 개가
  //      이미 그 값을 받고 있어, 신분에서 자동으로 뽑아 그대로 넘깁니다.
  const [status, setStatus] = useState<CareerStatus>(
    age !== null && age < 20 ? 'middle_high' : 'worker',
  )
  const target: Target = statusToTarget(status)
  const [mbti, setMbti] = useState('')

  const query = useMemo(() => {
    const p = new URLSearchParams()
    for (const k of ['year', 'month', 'day', 'gender', 'calType', 'leapMonth', 'hour', 'name']) {
      const v = sp.get(k)
      if (v) p.set(k, v)
    }
    p.set('target', target)
    p.set('status', status)
    if (mbti) p.set('mbti', mbti)
    return p.toString()
  }, [sp, target, status, mbti])



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
          {name ? `${name}님은 지금 어느 쪽인가요?` : '지금 어느 쪽인가요?'}
        </div>
        <div style={{ fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.7, marginBottom: 20 }}>
          신분에 따라 보는 것이 달라집니다. 학생은 계열·학과를, 성인은 직무와 조직을 중심으로 풀어 드려요.
          {age !== null && <><br />생년으로 보아 {age}세로 잡았습니다. 다르면 바꿔 주세요.</>}
        </div>

        {STATUS_OPTIONS.map(o => {
          const on = status === o.key
          return (
            <button key={o.key} onClick={() => setStatus(o.key)}
              style={{
                width: '100%', textAlign: 'left', marginBottom: 9, padding: '14px 15px',
                background: on ? '#efeaf7' : CARD,
                border: on ? `1.5px solid ${ACCENT}` : `1px solid rgba(120,53,15,0.15)`,
                borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 11,
              }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{o.icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: on ? ACCENT : '#3a2e28' }}>
                  {o.title}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: '#5c3a1e', lineHeight: 1.55, marginTop: 3 }}>
                  {o.sub}
                </span>
              </span>
            </button>
          )
        })}

        {/* ★MBTI — 있으면 사주와 견주고, 없으면 사주 추정만 보여 줍니다 */}
        <div style={{ marginTop: 20 }}>
          <MbtiSelect value={mbti} onChange={setMbti} accent={ACCENT} />
        </div>

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
