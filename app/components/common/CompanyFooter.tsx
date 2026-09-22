'use client'

// ══════════════════════════════════════════════════════════════════════
//  CompanyFooter — ★사업자정보 푸터 «공용 부품»        2026-09-23 (11부)
//
//  ┌──────────────────────────────────────────────────────────────────┐
//  │  [대표님 2026-09-23] 「홈이 아닌 화면에 사업자정보는 없는데」      │
//  │                                                                    │
//  │  [까닭] 45부에 ★홈 파일 «안» 에 박아 두었습니다.                   │
//  │    ⇒ 다른 화면에는 «한 줄도» 없었습니다.                           │
//  │    ⇒ 🔴 PG 심사가 ★「모든 화면 하단」 을 봅니다 (10부 6-3 에도      │
//  │       「둘 다 — 사업자정보를 모든 화면 하단으로」 라 적혀 있습니다).│
//  └──────────────────────────────────────────────────────────────────┘
//
//  ⛔ ★이 부품을 «복사» 하지 마십시오. 화면마다 붙여 쓰십시오 (9부 ⑤).
//  ⛔ 값을 여기에 적지 «마십시오» — ★companyInfo.ts «한 곳» 에서 옵니다.
//     ⇒ 통신판매업 신고번호가 나오면 ★그 파일의 mailOrderNo 만 채우면
//       모든 화면이 «함께» 바뀝니다.
//  ⚠️ 하단바(position:fixed)와는 «겹치지 않습니다» — 다만 화면 쪽에서
//     paddingBottom 으로 하단바 자리를 비워 두어야 합니다.
// ══════════════════════════════════════════════════════════════════════

import { COMPANY } from './companyInfo'

export default function CompanyFooter() {
  return (
    <footer style={{ background: '#f2f0ea', padding: '20px 20px 12px', borderTop: '1.5px solid #a89f8d' }}>
      {/* ★2026-09-10 — 45부가 「갈 화면이 없습니다」라 빼 두었던 링크 줄을 «되살립니다».
          ⇒ /terms · /privacy 가 생겼습니다.
          ⛔ 지우지 마십시오 —
             · 전자상거래법이 신원 정보 표시를 요구합니다.
             · ★PG 심사가 이 줄을 봅니다 (약관·방침이 열리는지).
             · ★카카오 콘솔에 넣을 방침 주소가 여기서 나옵니다. */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
        <a href="/terms" style={{ fontSize: '11px', color: '#5c4a34', textDecoration: 'underline' }}>이용약관</a>
        <a href="/privacy" style={{ fontSize: '11px', color: '#5c4a34', textDecoration: 'underline' }}>개인정보처리방침</a>
      </div>

      {/* 사업자 정보
          ★2026-08-04 (45부) — 대비 2단계. #888888(3.33:1) → #6b6b6b(5.66:1)
          ⚠️ 옅게 되돌리지 마십시오 — 대표님이 「흐려서 안 보인다」 하신 자리입니다. */}
      <div style={{ fontSize: '11px', color: '#6b6b6b', lineHeight: 1.6 }}>
        <div>{COMPANY.name} <span style={{ color: '#8f8878' }}>|</span> 대표 {COMPANY.ceo}</div>
        <div>사업자등록번호 {COMPANY.bizNo}</div>
        {/* ★통신판매업 신고번호 — 번호가 없으면 «아예 안 나옵니다».
            ⇒ PG 계약 → 에스크로 확인증 → 정부24 신고 «뒤» 에 companyInfo.ts 를 채우십시오.
            ⛔ 「신고 준비 중」 같은 글을 대신 넣지 마십시오 — 없는 것이 낫습니다. */}
        {COMPANY.mailOrderNo && <div>통신판매업 신고번호 {COMPANY.mailOrderNo}</div>}
        <div>{COMPANY.addr}</div>
        {/* ⚠️ 값은 ★app/components/common/companyInfo.ts 로 옮겼습니다 (2026-09-10).
            등록증(2026-09-04 도봉세무서장 발급)대로이며 ⛔ 임의로 고치지 마십시오.
            ⚠️ 「201호」로 되어 있던 것을 등록증의 「2층(미아동)」으로 바로잡은 자국이 있습니다. */}
      </div>

      {/* 고객센터 — ★이름과 메일을 «한 줄» 로 (대표님 지시)
          ⚠️ flexWrap 이 있어야 좁은 화면에서 메일이 «잘리지 않고» 아랫줄로 갑니다 */}
      <div style={{
        marginTop: '6px', fontSize: '11px', color: '#6b6b6b', lineHeight: 1.6,
        display: 'flex', gap: '6px', alignItems: 'baseline', flexWrap: 'wrap',
      }}>
        <strong style={{ color: '#3d3d3d', fontWeight: 600, flex: 'none' }}>고객센터</strong>
        <a href={`mailto:${COMPANY.email}`} style={{ color: '#6b6b6b', textDecoration: 'none' }}>
          {COMPANY.email}
        </a>
        {/* ★전화번호 — companyInfo.ts 의 tel 이 비어 있으면 «안 나옵니다».
            ⛔ 가짜 번호를 넣지 마십시오 (랜딩의 070-0000-0000 이 그 자국입니다).
            ⚠️ 전자상거래법 제13조가 전화번호 표시를 요구합니다 — 손님 받기 전에 채우십시오. */}
        {COMPANY.tel && (
          <a href={`tel:${COMPANY.tel.replace(/[^0-9]/g, '')}`} style={{ color: '#6b6b6b', textDecoration: 'none' }}>
            {COMPANY.tel}
          </a>
        )}
      </div>

      {/* ★2026-09-10 — 개인정보 보호책임자 [대표님 2026-09-10]
          ⛔ 지우지 마십시오 —
             · 지정하지 않는 것 자체가 법 위반입니다 (개인정보보호법 제31조).
             · ★PG 심사가 이 표시를 봅니다. */}
      <div style={{
        marginTop: '6px', fontSize: '11px', color: '#6b6b6b', lineHeight: 1.6,
        display: 'flex', gap: '6px', alignItems: 'baseline', flexWrap: 'wrap',
      }}>
        <strong style={{ color: '#3d3d3d', fontWeight: 600, flex: 'none' }}>개인정보 보호책임자</strong>
        <span>{COMPANY.privacyOfficer.name} ({COMPANY.privacyOfficer.title})</span>
      </div>

      {/* 카피라이트
          ⚠️ 글자는 ★11px «그대로» 입니다 — 10 으로 내리지 마십시오.
          ★2026-08-04 — #aaaaaa(2.18:1) → #767676(4.68:1). 옅게 되돌리지 마십시오.
          ⚠️ 아래 여백 12 밑으로 줄이지 마십시오 — 하단바 선에 «닿아» 보입니다. */}
      <div style={{
        marginTop: '8px', paddingTop: '8px',
        borderTop: '1px solid #b0a898',
        fontSize: '11px', color: '#6a6a6a',
      }}>
        © 2026 (주)명연재. All rights reserved.
      </div>
    </footer>
  )
}
