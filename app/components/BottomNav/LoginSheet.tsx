'use client'

// ==========================================================================
// 하단바에서 올라오는 «로그인 시트»
//
//   ★2026-09-10 [대표님 「로그인 화면의 색상은 명연재 색상으로 유지」]
//      [전]  배경 #2C2C2A · 단추 linear-gradient(#3C3489, #FAC775)
//            ⇒ ★어두운 회색과 «남보라» — 명연재 어디에도 없는 색이었습니다.
//      [후]  ★피치톤 (#FFFBF7 · #b46e46 · #9c7a58) — 홈·로그인 화면과 «같은 색»
//
//   ⛔ 새 색을 짓지 않았습니다. 이미 쓰던 값만 가져왔습니다 (3부 5장 결).
//   ⛔ 여기에 이메일 칸이나 카카오 단추를 «만들지» 마십시오 —
//      로그인 화면은 ★/login «하나» 입니다. 여기는 그리로 보내는 자리입니다.
// ==========================================================================

import { useRouter } from 'next/navigation'

export default function LoginSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const go = () => {
    onClose()
    router.push('/login')
  }
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(58,46,40,0.45)' }} onClick={onClose} />
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 w-full px-4"
        style={{ maxWidth: '430px' }}>
        <div className="rounded-2xl p-5"
          style={{ background: '#FFFBF7', border: '0.5px solid #9c7a58' }}>
          <p className="text-center text-base mb-2" style={{ color: '#3a2e28', fontWeight: 600 }}>
            로그인 / 회원가입
          </p>
          {/* ⚠️ 「이메일로 간편하게」였는데 ★카카오가 먼저입니다. 말을 사실에 맞췄습니다. */}
          <p className="text-center text-xs mb-4" style={{ color: '#6b5340', lineHeight: 1.6 }}>
            카카오로 3초 만에 시작하세요<br />
            큐보드 · 골프온과 같은 계정입니다
          </p>
          <button onClick={go}
            className="w-full py-4 rounded-2xl text-sm"
            style={{ background: '#b46e46', color: '#fff', fontWeight: 600 }}>
            시작하기 →
          </button>
        </div>
      </div>
    </>
  )
}
