'use client'

/**
 * CopyTextButton — 해설(통변) 텍스트를 카톡 등에 붙여넣을 수 있게 복사하는 공용 버튼.
 * ─────────────────────────────────────────────────────────────
 * 왜 공용 부품인가:
 *   해설을 보여주는 화면이 여섯 곳(사주·궁합·결혼택일·출산택일·이름감정·개명)인데,
 *   각자 복사 코드를 두면 문구·형식이 제각각이 된다. 여기 하나만 고치면 전부 바뀐다.
 *
 * 쓰는 법:
 *   <CopyTextButton text={tongText} label="사주 풀이" name={info?.name} />
 *
 * 복사되는 형태:
 *   [명카페] 류승현님의 사주 풀이
 *
 *   (해설 전문)
 *
 * 주의:
 *   - navigator.clipboard 는 HTTPS 에서만 동작한다. 막히면 옛 방식(execCommand)으로 넘어간다.
 *   - text 가 비면 버튼을 그리지 않는다 (빈 것을 복사시키지 않는다).
 */

import { useState } from 'react'

interface Props {
  /** 복사할 본문 */
  text: string | null | undefined
  /** 무엇에 대한 해설인지 — 머리말에 들어간다 (예: '사주 풀이', '궁합 분석') */
  label: string
  /** 누구 것인지 (없으면 이름 없이) */
  name?: string
  /** 버튼에 쓸 문구 (기본: '해설 복사') */
  buttonLabel?: string
  /** 가로로 꽉 채울지 (기본 true) */
  fullWidth?: boolean
}

export default function CopyTextButton({
  text, label, name, buttonLabel = '해설 복사', fullWidth = true,
}: Props) {
  const [copied, setCopied] = useState(false)

  const body = (text ?? '').trim()
  if (!body) return null

  async function handleCopy() {
    // '나'·'본인'처럼 이름이 아닌 값이면 "나님의"가 되어 어색하다 → 이름 없이 쓴다.
    const raw = (name ?? '').trim()
    const usable = raw && !['나', '본인', '나님'].includes(raw) ? raw : ''
    const who = usable ? `${usable}님의 ` : ''
    const full = `[명카페] ${who}${label}\n\n${body}`
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API 가 막힌 경우(비 HTTPS·구형 브라우저) 옛 방식으로
      try {
        const ta = document.createElement('textarea')
        ta.value = full
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch { /* 복사 자체가 막힌 환경 — 조용히 넘어간다 */ }
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        width: fullWidth ? '100%' : undefined,
        padding: '11px 16px',
        borderRadius: 10,
        marginTop: 8,
        background: copied ? '#eef5e8' : 'transparent',
        border: `0.5px solid ${copied ? '#a8c898' : '#d8c4b4'}`,
        color: copied ? '#4a7a3a' : '#96502e',
        fontSize: 13,
        fontWeight: copied ? 700 : 400,
        fontFamily: 'inherit',
        cursor: 'pointer',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {copied ? '✓ 복사됐어요 — 붙여넣기 하세요' : `📋 ${buttonLabel}`}
    </button>
  )
}
