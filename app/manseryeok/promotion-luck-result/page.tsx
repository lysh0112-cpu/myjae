'use client'

/**
 * 승진운 결과 — 성인 전용 화면
 * ─────────────────────────────────────────────────────────────
 * ★2026-09-12 (7부) [대표님] — 「따로 입구를 만들되 ★같은 엔진으로」
 *
 *   진학(학생)  /manseryeok/exam-luck-result       mode="jinhak"
 *   취업(성인)  /manseryeok/job-luck-result        mode="chwieop"
 *   ★승진(성인) /manseryeok/promotion-luck-result  mode="seungjin"   ← 이 파일
 *
 * ⚠️ 몸통은 exam-luck-result/components/ExamResultShell.tsx ★하나입니다.
 *    이 파일에는 판정도 통변도 없습니다. mode 만 넘깁니다.
 *    ★새 판정을 여기에 쓰지 마십시오. 몸통에 넣으면 세 화면이 함께 받습니다.
 *
 * ⚠️ 승진도 target='adult' · kind='job' 입니다 — 엔진을 «그대로» 씁니다.
 *    갈리는 것은 jobSituation='promote' 하나뿐입니다.
 */

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ExamResultShell from '../exam-luck-result/components/ExamResultShell'

function SeungjinGate() {
  const router = useRouter()
  const sp = useSearchParams()

  /** ★URL 이 «학생» 이라고 또렷이 말하면 진학 화면으로 되돌려 줍니다 (옛 링크 보호) */
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
  return <ExamResultShell mode="seungjin" />
}

export default function PromotionLuckResultPage() {
  return (
    <Suspense fallback={null}>
      <SeungjinGate />
    </Suspense>
  )
}
