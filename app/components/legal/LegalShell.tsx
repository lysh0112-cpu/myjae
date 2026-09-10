'use client'

// ==========================================================================
// 약관 · 개인정보처리방침 «공통» 틀
//
//   ★2026-09-10 신설 [대표님 목업 승낙]
//     위쪽 딱지로 ★약관 ↔ 방침을 오갑니다. 한 번 들어오면 둘 다 보십니다.
//     ⛔ 두 화면을 따로 만들지 마십시오 — 이 틀 «하나» 를 씁니다.
//
//   ⛔ 새 색을 짓지 않았습니다 — 홈·환영 화면과 «같은» 피치톤입니다 (3부 5장 결).
//   ⛔ 어두운 색으로 되돌리지 마십시오 (45부 자국 · 4부 2-3).
// ==========================================================================

import Link from 'next/link'
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

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* 머리 — 뒤로가기 */}
      <header style={{
        background: C.card, borderBottom: `0.5px solid ${C.line}`,
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ color: C.head, fontSize: 18, textDecoration: 'none', lineHeight: 1 }} aria-label="홈으로">
          ‹
        </Link>
        <span style={{ fontSize: 14, color: C.ink }}>{title}</span>
      </header>

      <main style={{ padding: 14, maxWidth: 720, margin: '0 auto' }}>
        {/* 딱지 */}
        <nav style={{ display: 'flex', gap: 6, marginBottom: 12 }} aria-label="문서 고르기">
          {TABS.map(t => {
            const on = t.key === which
            return (
              <Link
                key={t.key}
                href={t.href}
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

        <div style={{ textAlign: 'center', fontSize: 11, color: C.faint, margin: '14px 0 28px' }}>
          {updated}
        </div>
      </main>
    </div>
  )
}
