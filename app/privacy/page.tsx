'use client'

// 개인정보처리방침 화면 (/privacy)
//   ⚠️ 글은 app/components/legal/privacyText.ts 에 있습니다.
//   🔴 ★워드 원본(02-개인정보처리방침-최소.docx)과 «함께» 고치십시오.
//   🔴 ★이 주소를 카카오 콘솔에 넣으셔야 합니다.

import LegalShell from '../components/legal/LegalShell'
import { PRIVACY, PRIVACY_UPDATED } from '../components/legal/privacyText'

export default function PrivacyPage() {
  return <LegalShell which="privacy" articles={PRIVACY} updated={PRIVACY_UPDATED} />
}
