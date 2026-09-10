'use client'

// ==========================================================================
// 자매 앱 바로가기 — 큐보드 · 골프온
//
//   ★2026-09-10 신설 [대표님 목업 승낙 · 「나안」]
//     두 단추를 «나란히» 두고, 칸 «안» 의 글씨는 위아래로 쌓지 않고 «옆으로» 흐릅니다.
//     ⛔ 아이콘 아래에 이름을 놓는 «세로» 배치로 되돌리지 마십시오 —
//        대표님이 「보기가 안 좋다」 하신 자리입니다.
//     설명(당구 점수판 · 골프 스코어)은 칸 밖 «아래 한 줄» 로 모았습니다.
//     ⚠️ 좁은 폰(320px)에서 칸 안에 설명까지 넣으면 글자가 겹칩니다. 그래서 뺐습니다.
//
//   ★같은 창으로 넘어갑니다 (target 없음)
//     ⇒ 지갑 화면의 「돌아가기」(app/wallet/page.tsx:45)와 «같은 방식» 입니다.
//     ⇒ 손님은 뒤로가기로 돌아옵니다. 새 탭은 폰에서 되돌아오기가 어렵습니다.
//     □ 새 탭으로 바꾸시려면 <a> 에 target="_blank" rel="noopener noreferrer" 를 더하십시오.
//
//   ⛔ 새 색을 짓지 않았습니다 — 홈·환영 화면과 «같은» 피치톤입니다 (3부 5장 결).
// ==========================================================================

import { SISTER_APPS } from './companyInfo'

const C = {
  head: '#96502e',
  card: '#FFFBF7',
  /* ★2026-09-10 [대표님 「테두리가 너무 희미하다 · 홈 다른 버튼들처럼 통일해줘」]
   *   [전] 0.5px solid #e8dccf  ← 거의 보이지 않았습니다
   *   [후] ★1.5px solid #9c7a58 — 홈 서비스 카드와 «같은 값» 입니다
   *        (app/home-new/components/ServiceSection.tsx:324 · 45부 값 · 흰 위에서 3.93:1)
   *
   *   ⛔ 새 색을 짓지 않았습니다. 홈에 이미 있는 값을 그대로 가져왔습니다.
   *   ⚠️ 47부 선 부품(lib/ui/line.ts · #ea8c46)은 ★홈이 아직 안 씁니다.
   *      홈이 그리로 옮겨 갈 때 ★이 파일도 «함께» 옮기십시오. 혼자 남으면 또 어긋납니다. */
  line: '#9c7a58',
  ink: '#5a4a3e',
  faint: '#a2907f',
  chev: '#9c7a58',
}

/** 앱마다 아이콘 빛깔 — ⚠️ 지갑 화면의 딱지 색과 «맞춰» 두었습니다 (WalletPanel:39) */
const TINT: Record<string, string> = {
  bil: '#5a4a7a',
  glf: '#3B6D11',
}

export default function SisterLinks() {
  return (
    <section style={{ padding: '0 20px', marginBottom: 20 }} aria-labelledby="sister-head">
      <div id="sister-head" style={{ fontSize: 12, color: C.head, marginBottom: 10 }}>
        함께 쓰는 서비스
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SISTER_APPS.map(app => (
          <a
            key={app.key}
            href={app.href}
            style={{
              background: C.card,
              border: `1.5px solid ${C.line}`,
              borderRadius: 12,
              padding: '13px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              textDecoration: 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: TINT[app.key] ?? C.faint, flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13.5, color: C.ink }}>{app.name}</span>
            <span style={{ marginLeft: 'auto', color: C.chev, fontSize: 15, lineHeight: 1 }} aria-hidden="true">›</span>
          </a>
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: C.faint, textAlign: 'center', marginTop: 9 }}>
        {SISTER_APPS.map(a => a.desc).join(' · ')} — 지갑은 세 곳이 함께 씁니다
      </div>
    </section>
  )
}
