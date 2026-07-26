// app/manseryeok/career/page.tsx
// ============================================================================
//  진로적성 — 자리만 잡아 둔 화면
//
//  ★2026-07-27 — 홈 서비스 '물어보살'(사주 없이 AI에게 묻던 빈 문) 자리를
//    진로적성으로 바꾸면서 만들었다. 아직 내용은 없다.
//    홈에서 눌렀을 때 아무것도 없으면 고장인 줄 아시므로
//    "준비 중"임을 알리고 돌아갈 길을 둔다. (exam-luck 과 같은 방식)
//
//  ※ 다음에 만들 때 이 파일을 지우고 실제 화면으로 바꾸면 된다.
//    다른 서비스처럼 보관함 → 사람 선택 → 입력 → 결과 흐름이 될 것이다.
//      career/page.tsx          보관함 (이 파일 자리)
//      career-input/page.tsx    무엇을 볼지 고르기
//      career-result/page.tsx   판정 + 통변
//
//  [무엇을 담을 화면인가 — 심산 명리적성학]
//    오행·육친 강약 → 기질 / 오행×육친 25칸 격자 / 신살 9종 / 용신 /
//    격국(십정격) / 60갑자 일주 / 문·이과 비율 / 학과·대학 / 직업 구조 8종
//
//  ⚠️ 형제 서비스가 있다. 경계를 지킬 것.
//      진로적성(이 화면)  = 원국을 본다. 평생 안 바뀜.  "어디로 갈까"
//      합격운/취업운      = 운을 본다.   해마다 바뀜.   "언제 될까"
//                           → app/manseryeok/exam-luck
// ============================================================================
'use client'

import { useRouter } from 'next/navigation'

export default function CareerPage() {
  const router = useRouter()

  return (
    <main style={{
      minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 머리말 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => router.push('/home-new')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}
        >←</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>진로적성</div>
      </div>

      {/* 본문 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px 24px',
      }}>
        <div style={{ fontSize: 40 }}>🌱</div>

        <div style={{ textAlign: 'center', lineHeight: 1.8 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#785aaa', marginBottom: 6 }}>
            지금 준비하고 있어요
          </div>
          <div style={{ fontSize: 12.5, color: '#8a7063', letterSpacing: '-.01em' }}>
            타고난 결과 어울리는 자리를 찾는 자리예요.<br />
            곧 만나 보실 수 있도록 다듬고 있습니다.
          </div>
        </div>

        <button
          onClick={() => router.push('/home-new')}
          style={{
            marginTop: 8, background: '#785aaa', border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 13.5, fontWeight: 600, padding: '12px 26px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          홈으로 돌아가기
        </button>
      </div>
    </main>
  )
}
