'use client'

// 서비스 이용약관 화면 (/terms)
//   ⚠️ 글은 app/components/legal/termsText.ts 에 있습니다.
//   🔴 ★워드 원본(01-이용약관-최소.docx)과 «함께» 고치십시오.

import LegalShell from '../components/legal/LegalShell'
import { TERMS, TERMS_UPDATED } from '../components/legal/termsText'

export default function TermsPage() {
  return <LegalShell which="terms" articles={TERMS} updated={TERMS_UPDATED} />
}
