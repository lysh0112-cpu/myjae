'use client'

// ==========================================================================
// 약관 · 개인정보처리방침 «공통» 틀
//
//   ★2026-09-10 신설 [대표님 목업 승낙]
//     위쪽 딱지로 ★약관 ↔ 방침을 오갑니다. 한 번 들어오면 둘 다 보십니다.
//     ⛔ 두 화면을 따로 만들지 마십시오 — 이 틀 «하나» 를 씁니다.
//
//   🔴 ★?from=bil · ?from=glf 로 들어오면 «돌아가는 길» 을 냅니다
//        [대표님 「닫으면 바로 골프온·큐보드로 돌아가도록」 2026-09-10]
//        · 머리의 ‹ 가 ★그 앱으로 갑니다 (명카페 홈이 아닙니다)
//        · 글 끝에 ★큰 단추 하나 — 「골프온으로 돌아가기」
//     ⚠️ 지갑 화면(app/wallet/page.tsx)이 ★쓰던 방식 «그대로» 입니다.
//        ⛔ 새로 짓지 않았습니다. 낱말(bil·glf)도 같은 것을 씁니다.
//     ⛔ from 이 없으면 단추가 «안 나옵니다». 명카페 손님에게는 필요 없습니다.
//
//   ⚠️ useSearchParams 는 ★Suspense 안에 있어야 합니다 (Next.js 규칙).
//      ⛔ terms/page.tsx · privacy/page.tsx 의 Suspense 를 빼지 마십시오 — 빌드가 깨집니다.
//
//   ⛔ 새 색을 짓지 않았습니다 — 홈·환영 화면과 «같은» 피치톤입니다 (3부 5장 결).
//   ⛔ 어두운 색으로 되돌리지 마십시오 (45부 자국 · 4부 2-3).
// ==========================================================================

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { APPS } from '../common/companyInfo'
import type { LegalArticle } from './termsText'

const C = {
  bg: '#FDF6F0',
  card: '#FFFBF7',
  line: '#e8dccf',
  head: '#96502e',
  ink: '#5a4a3e',
  faint: '#a2907f',
  on: '#96502e',
  onText: '#FFFBF7',
}

type Props = {
  which: 'terms' | 'privacy'
  articles: LegalArticle[]
  updated: string
}

const TABS = [
  { key: 'terms', label: '이용약관', href: '/terms' },
  { key: 'privacy', label: '개인정보처리방침', href: '/privacy' },
] as const

export default function LegalShell({ which, articles, updated }: Props) {
  const title = which === 'terms' ? '서비스 이용약관' : '개인정보처리방침'

  /* ★from 이 bil·glf 면 그 앱으로 돌아갑니다. 그 밖의 값(장난 포함)은 «무시» 합니다.
     ⛔ from 값을 그대로 href 에 넣지 마십시오 — 남의 사이트로 보내는 길이 됩니다.
        ★표에 있는 것만 씁니다 (4부 9장의 「열린 넘기기」와 같은 까닭). */
  const from = useSearchParams().get('from') ?? ''
  const back = from === 'bil' || from === 'glf' ? APPS[from] : null

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* 머리 — 뒤로가기 */}
      <header style={{
        background: C.card, borderBottom: `0.5px solid ${C.line}`,
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {back ? (
          <a href={back.href} style={{ color: C.head, fontSize: 18, textDecoration: 'none', lineHeight: 1 }} aria-label={back.back}>
            ‹
          </a>
        ) : (
          <Link href="/" style={{ color: C.head, fontSize: 18, textDecoration: 'none', lineHeight: 1 }} aria-label="홈으로">
            ‹
          </Link>
        )}
        <span style={{ fontSize: 14, color: C.ink }}>{title}</span>
      </header>

      <main style={{ padding: 14, maxWidth: 720, margin: '0 auto' }}>
        {/* 딱지 */}
        <nav style={{ display: 'flex', gap: 6, marginBottom: 12 }} aria-label="문서 고르기">
          {TABS.map(t => {
            const on = t.key === which
            /* ⛔ from 을 «실어» 보내야 합니다 — 딱지를 눌렀다가 돌아가는 길을 잃습니다 */
            const href = from ? `${t.href}?from=${from}` : t.href
            return (
              <Link
                key={t.key}
                href={href}
                aria-current={on ? 'page' : undefined}
                style={{
                  background: on ? C.on : C.card,
                  color: on ? C.onText : '#8a7565',
                  border: on ? 'none' : `0.5px solid ${C.line}`,
                  fontSize: 11.5, padding: '6px 13px', borderRadius: 20,
                  textDecoration: 'none',
                }}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>

        <article style={{
          background: C.card, border: `0.5px solid ${C.line}`,
          borderRadius: 12, padding: 16,
        }}>
          {articles.map(a => (
            <section key={a.title} style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 13.5, color: C.head, margin: '0 0 5px', fontWeight: 600 }}>
                {a.title}
              </h2>
              {a.paras.map((p, i) => (
                <p key={i} style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.8, margin: '0 0 5px' }}>
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>

        <div style={{ textAlign: 'center', fontSize: 11, color: C.faint, margin: '14px 0 0' }}>
          {updated}
        </div>

        {/* ★돌아가기 — from 이 있을 때«만» 나옵니다
            ⚠️ 44px 이상이라야 손가락으로 누르기 좋습니다 (46부 기준). 지금 48px 입니다.
            ⛔ 이 단추를 빼지 마십시오 — 큐보드·골프온 손님이 «돌아갈 길» 입니다. */}
        {back && (
          <a
            href={back.href}
            style={{
              display: 'block', marginTop: 18, padding: '15px 0',
              background: C.on, color: C.onText,
              borderRadius: 12, textAlign: 'center',
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}
          >
            {back.back}
          </a>
        )}

        <div style={{ height: 28 }} />
      </main>
    </div>
  )
}
