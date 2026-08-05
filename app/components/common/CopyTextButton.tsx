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
import { LINE_OUTER_COLOR } from '@/lib/ui/line'

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
  /**
   * ★2026-08-05 (47부 11차) — 다른 버튼과 «나란히» 놓을 때 true.
   *   [겪은 일]  대표님 — 「양쪽 두께가 안맞는 부분 보이지」
   *     물상 화면에서 「해설 복사」와 「카드로 저장」이 어긋나 보였습니다.
   *   [까닭 둘]
   *     ① 이 부품 안에 ★marginTop:8 이 박혀 있어, 줄에 넣으면 «혼자 8px 아래로» 내려앉습니다.
   *        (감싸는 줄에도 marginTop 이 있어 ★두 번» 밀렸습니다)
   *     ② 높이가 달랐습니다 — 이것 38.6px / 카드로 저장 37.0px / 진로적성 40.2px
   *   ⇒ inRow 를 주면 ★marginTop 을 0 으로 둡니다. 줄 간격은 «감싸는 쪽» 이 정합니다.
   */
  inRow?: boolean
}

export default function CopyTextButton({
  text, label, name, buttonLabel = '해설 복사', fullWidth = true, inRow = false,
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
        // ★2026-08-05 (47부 11차) — 높이를 ★44px 로 맞췄습니다. [대표님 지시 「알아서 통일해」]
        //   [전]  padding 11 + 글자 13 = ★38.6px — 손가락 최소선(44) «미달» 이었습니다.
        //   [후]  padding 13 + minHeight 44 + boxSizing border-box → ★정확히 44px
        //   ★나란히 놓이는 짝 버튼 셋도 같은 값으로 맞췄습니다 —
        //     물상 「카드로 저장」 · 진로적성 「A4 PDF저장/인쇄」 · 궁합 짝 버튼
        //   ⛔ 더 줄이지 마십시오. 44 는 «손가락으로 누를» 최소선입니다.
        //   ⚠️ 짝 버튼만 바꾸면 또 어긋납니다. ★넷을 «함께» 보십시오.
        padding: '13px 16px',
        minHeight: 44,
        boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10,
        marginTop: inRow ? 0 : 8,
        background: copied ? '#eef5e8' : 'transparent',
        // ★2026-08-05 (47부 25차) — 안 눌렀을 때의 선을 ★선 부품으로. [대표님 지시]
        //   [전] #d8c4b4 (1.68:1) — 흐려서 «버튼인지» 안 보였습니다.
        //   ⚠️ 복사 «뒤» 초록(#a8c898)은 ★«됐다» 는 뜻이 있는 색이라 «그대로» 둡니다.
        //   ⚠️⚠️ 이 부품은 ★네 화면이 씁니다 — 사주 · 궁합 · 진로적성 · 물상.
        //      ⇒ 여기를 바꾸면 ★넷이 «함께» 바뀝니다.
        border: `0.5px solid ${copied ? '#a8c898' : LINE_OUTER_COLOR}`,
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
