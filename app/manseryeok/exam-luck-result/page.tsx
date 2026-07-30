'use client'

/**
 * 진학 합격운 결과 — 학생 전용 화면
 * ─────────────────────────────────────────────────────────────
 * ★2026-07-30 대표님 지시 — «학생 합격운과 취업 합격운을 별도 화면으로»
 *
 *   진학(학생)  /manseryeok/exam-luck-result   ← 이 파일
 *   취업(성인)  /manseryeok/job-luck-result
 *
 * ⚠️ **이 주소는 바꾸지 않았습니다.** 보관함에 이미 저장된 링크와
 *    손님이 즐겨찾기한 주소가 이 주소를 가리킵니다. 새 주소를 만들 때
 *    옛 주소를 옮기지 않는 것이 이 저장소의 방식입니다. (35-3장 DB 단권화와 같은 결)
 *
 * ⚠️ 몸통은 components/ExamResultShell.tsx 하나입니다.
 *    화면을 둘로 나누라는 지시이지만 판정·통변·저장 흐름은 똑같아서,
 *    베끼면 한쪽만 고치는 순간 갈립니다. (교훈 CJ)
 */

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ExamResultShell from './components/ExamResultShell'

function JinhakGate() {
  const router = useRouter()
  const sp = useSearchParams()

  /**
   * ★옛 링크 보호 —
   *   URL 이 «성인» 이라고 또렷이 말하면 취업 화면으로 넘겨 줍니다.
   *   ⚠️ target 이 «없는» 경우는 넘기지 않습니다. 옛 기록에는 target 이 안 실려 있어
   *      없는 것을 성인으로 보면 학생 기록이 어른 화면으로 갑니다.
   *      없으면 이 화면(진학)에서 저장본을 그대로 보여 주는 쪽이 안전합니다.
   */
  const goJob = sp.get('target') === 'adult'

  useEffect(() => {
    if (goJob) router.replace(`/manseryeok/job-luck-result?${sp.toString()}`)
  }, [goJob, router, sp])

  if (goJob) {
    return (
      <main style={{
        minHeight: '100vh', background: '#FDF6F0', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#8c4a63', fontSize: 13.5 }}>
          <span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite', marginRight: 6 }}>✦</span>
          취업운 화면으로 옮기고 있어요…
        </p>
      </main>
    )
  }
  return <ExamResultShell mode="jinhak" />
}

export default function ExamLuckResultPage() {
  return (
    <Suspense fallback={null}>
      <JinhakGate />
    </Suspense>
  )
}
