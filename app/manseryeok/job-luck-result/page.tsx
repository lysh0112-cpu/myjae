'use client'

/**
 * 취업·시험 합격운 결과 — 성인 전용 화면
 * ─────────────────────────────────────────────────────────────
 * ★2026-07-30 대표님 지시로 진학 화면과 갈랐습니다.
 *
 *   진학(학생)  /manseryeok/exam-luck-result
 *   취업(성인)  /manseryeok/job-luck-result   ← 이 파일
 *
 * ⚠️ 몸통은 exam-luck-result/components/ExamResultShell.tsx 하나입니다.
 *    이 파일에는 판정도 통변도 없습니다. mode 만 넘깁니다.
 *    ★새 판정을 여기에 쓰지 마십시오. 몸통에 넣으면 두 화면이 함께 받습니다.
 *
 * ⚠️ 취업 화면 «안에서» 다시 갈립니다.
 *      kind=exam  성인이 준비하는 시험 (공무원·자격증·임용 등)
 *      kind=job   일자리 구하기·이직
 *    그 값은 URL 로 옵니다. 폼(exam-luck-input)의 취업 탭이 정합니다.
 */

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ExamResultShell from '../exam-luck-result/components/ExamResultShell'

function ChwieopGate() {
  const router = useRouter()
  const sp = useSearchParams()

  /** ★URL 이 «학생» 이라고 또렷이 말하면 진학 화면으로 되돌려 줍니다 */
  const goJinhak = sp.get('target') === 'student'

  useEffect(() => {
    if (goJinhak) router.replace(`/manseryeok/exam-luck-result?${sp.toString()}`)
  }, [goJinhak, router, sp])

  if (goJinhak) {
    return (
      <main style={{
        minHeight: '100vh', background: '#FDF6F0', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#8c4a63', fontSize: 13.5 }}>
          <span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite', marginRight: 6 }}>✦</span>
          진학 합격운 화면으로 옮기고 있어요…
        </p>
      </main>
    )
  }
  return <ExamResultShell mode="chwieop" />
}

export default function JobLuckResultPage() {
  return (
    <Suspense fallback={null}>
      <ChwieopGate />
    </Suspense>
  )
}
