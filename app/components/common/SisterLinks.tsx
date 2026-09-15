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

import { APPS, SISTER_KEYS } from './companyInfo'

const C = {
  /* 🔴 ★2026-09-15 (10부) [대표님 「함께 쓰는 서비스 제목을 전체 서비스와 «완벽하게» 통일」]
   *   [전] fontSize 12 · 굵기 없음 · 색 #96502e (벽돌빛)
   *   [후] ★fontSize 12 · fontWeight 700 · 색 #55636f
   *        ⇒ ServiceSection 의 「전체 서비스」(C.sub)와 ★한 값도 안 다릅니다.
   *   ⛔ 여기만 고치지 마십시오 — ★두 곳이 «같은 값» 이라야 합니다.
   *      검사 57 ① 이 두 파일을 «대조» 합니다. 어긋나면 멈춥니다. */
  head: '#55636f',
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

/*  ★앱 아이콘 — 2026-09-15 (10부)
 *  ⚠️ ★companyInfo 의 APPS 에는 아이콘 칸이 «없습니다». 여기만 씁니다.
 *     ⛔ APPS 에 억지로 칸을 만들지 마십시오 — 큐보드·골프온 쪽 코드도 그 표를 씁니다.
 *  ⛔ 상표 그림이 아니라 ★«무엇을 하는 앱인가» 로 골랐습니다 (당구 · 골프). */
const ICON: Record<string, string> = {
  bil: '🎱',
  glf: '⛳',
}

export default function SisterLinks() {
  return (
    <section style={{ padding: '0 20px', marginBottom: 20 }} aria-labelledby="sister-head">
      {/*  ★제목 — 「전체 서비스」와 «같은 모양» 입니다
        *     아이콘 + gap 6 + marginBottom 9 + 12px/700/C.head 까지 그대로 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
        <span style={{ fontSize: 12 }} aria-hidden="true">🤝</span>
        <span id="sister-head" style={{ fontSize: 12, fontWeight: 700, color: C.head }}>
          함께 쓰는 서비스
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SISTER_KEYS.map(key => {
          const app = APPS[key]
          return (
          <a
            key={key}
            href={app.href}
            style={{
              /*  🔴 ★2026-09-15 (10부) [대표님 「다른 카드들처럼 완성도 높게 다듬어 줘」]
               *    [전] 모서리 12 · 그림자 없음 · 왼쪽 띠 없음 · 아이콘이 «점» 하나
               *         ⇒ 위 서비스 카드들과 «마감» 이 달라 덜 만든 것처럼 보였습니다.
               *    [후] ★ServiceSection 의 cardStyle 과 «같은 값» —
               *         모서리 ★16 · inset 4px 왼쪽 띠 · 0 2px 8px rgba(0,0,0,0.04)
               *    ⚠️ 왼쪽 띠만 ★앱 빛깔(보라·초록)로 둡니다 —
               *       마감은 같게, 어느 앱인지는 갈리게. 지갑 딱지 색과 맞춰 둔 값입니다.
               *    ⛔ 모서리 12 로 되돌리지 마십시오 — 검사 57 ② 가 셉니다. */
              background: C.card,
              border: `1.5px solid ${C.line}`,
              borderRadius: 16,
              boxShadow: `inset 4px 0 0 ${TINT[key] ?? C.faint}, 0 2px 8px rgba(0,0,0,0.04)`,
              overflow: 'hidden',
              padding: '12px 12px 12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              textDecoration: 'none',
            }}
          >
            {/*  ★아이콘 타일 — 홈 카드의 Tile 과 «같은 결» 입니다
              *    ⚠️ 옛것은 지름 10px «점» 이라 카드가 비어 보였습니다. */}
            <span
              aria-hidden="true"
              style={{
                width: 32, height: 32, borderRadius: 11, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f0e6d8', border: '1px solid #c4af95',
                fontSize: 15, lineHeight: 1,
              }}
            >{ICON[key] ?? '•'}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, letterSpacing: '-0.2px' }}>{app.name}</span>
            <span style={{ marginLeft: 'auto', color: C.chev, fontSize: 15, lineHeight: 1 }} aria-hidden="true">›</span>
          </a>
          )
        })}
      </div>

      <div style={{ fontSize: 10.5, color: C.faint, textAlign: 'center', marginTop: 9 }}>
        {SISTER_KEYS.map(k => APPS[k].desc).join(' · ')} — 지갑은 세 곳이 함께 씁니다
      </div>
    </section>
  )
}
