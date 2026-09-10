'use client'

// 서비스 이용약관 화면 (/terms)
//   ⚠️ 글은 app/components/legal/termsText.ts 에 있습니다.
//   🔴 ★워드 원본(01-이용약관-최소.docx)과 «함께» 고치십시오.
//   ⛔ Suspense 를 빼지 마십시오 — LegalShell 이 useSearchParams 를 씁니다 (빌드가 깨집니다).

import { Suspense } from 'react'
import LegalShell from '../components/legal/LegalShell'
import { TERMS, TERMS_UPDATED } from '../components/legal/termsText'

export default function TermsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <LegalShell which="terms" articles={TERMS} updated={TERMS_UPDATED} />
    </Suspense>
  )
}
