'use client'

/**
 * StorageShell — 보관함 «틀» 공용 부품.
 * ─────────────────────────────────────────────────────────────
 *  ★2026-08-03 신설 — 대표님 지시 「모두 통일해줘. 서비스별로 보관함을
 *    차별화할 필요없다」 (44부 26차)
 *
 * ══ 왜 공용 부품인가 ══
 *   보관함이 열 곳인데 틀이 «열 벌 복사» 되어 있었습니다.
 *   아홉 곳은 값이 우연히 같았고, 이사택일 하나가 어긋나 있었으며,
 *   아래 버튼 색은 서비스마다 제각각이었습니다(보라·분홍·갈색·자주…).
 *   ⇒ ★대표님 확정 — 보관함은 «서비스별로 다를 까닭이 없습니다». 한 모습입니다.
 *
 * ⚠️⚠️ 화면마다 머리말·빈 화면·아래 버튼을 «다시 짓지 마십시오».
 *    그렇게 해서 열 벌이 되었습니다. 이 부품에 넘기십시오.
 * ⚠️ 색·크기를 바꾸시려면 «이 파일 한 곳» 만 고치십시오. 열 화면이 함께 바뀝니다.
 *
 * 쓰는 법:
 *   <StorageShell
 *     title="궁합 보관함"
 *     count={records?.length}
 *     loading={records === null}
 *     showEmpty={!!records && records.length === 0}
 *     emptyIcon="💝"
 *     emptyTitle="아직 저장된 궁합이 없어요"
 *     emptyDesc="새 궁합을 보면 여기에 차곡차곡 쌓여요"
 *     actionLabel="+ 새 궁합 보기"
 *     onAction={() => router.push('/manseryeok/couple-input-new')}
 *   >
 *     {records?.map(r => <StorageRow …/>)}
 *   </StorageShell>
 */

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

/* ══ 보관함 «한 모습» — ★고치려면 여기만 ══ */
export const S = {
  bg: '#FDF6F0',            // 바탕
  bar: 'rgba(250,250,248,0.96)', // 머리말
  line: '#f0e0d5',          // 선
  card: '#FFFBF7',          // 줄카드
  ink: '#3a2e28',           // 제목 글자
  sub: '#5c3a1e',           // 잔글씨
  back: '#96502e',          // ← 화살표
  del: '#6b5340',           // ✕
  btn: '#b46e46',           // ★아래 버튼 — 서비스별 색을 걷어내고 하나로
  emp: '#96502e',           // 빈 화면 한 줄
} as const

interface Props {
  title: string
  /** 오른쪽 끝 「N건」 — 없으면 감춥니다 */
  count?: number | null
  /** 기본은 홈으로 */
  onBack?: () => void
  loading?: boolean
  showEmpty?: boolean
  emptyIcon?: string
  emptyTitle?: ReactNode
  emptyDesc?: ReactNode
  /** 아래 큰 버튼 — 글이 없으면 그리지 않습니다 */
  actionLabel?: ReactNode
  onAction?: () => void
  children?: ReactNode
  /** 아래 버튼 «뒤» 에 더 붙일 것 (안내문 등) */
  footer?: ReactNode
}

export default function StorageShell({
  title, count, onBack, loading = false,
  showEmpty = false, emptyIcon = '📁', emptyTitle, emptyDesc,
  actionLabel, onAction, children, footer,
}: Props) {
  const router = useRouter()

  return (
    <main style={{
      minHeight: '100vh', background: S.bg, maxWidth: 480,
      margin: '0 auto', paddingBottom: 40,
    }}>
      {/* ── 머리말 ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: S.bar, backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${S.line}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => (onBack ? onBack() : router.push('/home-new'))}
          aria-label="뒤로"
          style={{
            background: 'none', border: 'none', color: S.back,
            fontSize: 17, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
          }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: S.ink }}>{title}</div>
        {count != null && (
          <div style={{ marginLeft: 'auto', fontSize: 12, color: S.sub }}>{count}건</div>
        )}
      </div>

      <div style={{ padding: '16px 14px 0' }}>
        {/* ── 불러오는 중 ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: S.sub, fontSize: 13 }}>
            보관함을 불러오는 중…
          </div>
        )}

        {/* ── 비었을 때 ── */}
        {showEmpty && (
          <div style={{ textAlign: 'center', padding: '46px 20px', color: S.sub }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>{emptyIcon}</div>
            <div style={{ fontSize: 14, color: S.emp, fontWeight: 500, marginBottom: 4 }}>
              {emptyTitle}
            </div>
            {emptyDesc && (
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>{emptyDesc}</div>
            )}
          </div>
        )}

        {children}

        {/* ── 아래 큰 버튼 ── */}
        {actionLabel && (
          <button
            onClick={onAction}
            style={{
              width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
              background: S.btn, border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {actionLabel}
          </button>
        )}

        {footer}
      </div>
    </main>
  )
}
