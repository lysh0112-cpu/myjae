'use client'
import { useState } from 'react'
import ToneManager from './ToneManager'
import PromptViewer from './PromptViewer'
import AiErrorLog from './AiErrorLog'

// ══════════════════════════════════════════════════════════════════
//  ★2026-09-09 — 「🤖 AI관리」 ★한 탭  [대표님 지시]
//    「관리회계와 AI도 하나로 묶어줘」 · 「★위에 탭들이 너무 많아서 헷갈려」
//    ⇒ 어투 관리 · AI 통변 구조 · AI 오류 ★셋을 담았습니다.
//      셋 다 «AI 가 하는 일의 뒷면» 이라 한자리에 있는 것이 맞습니다.
//
//  ★이 파일이 하는 일은 «안쪽 탭을 가르는 것» «하나» 뿐입니다.
//  ⛔⛔ 알맹이를 여기로 옮기지 마십시오 — 셋이 각자 제 일을 그대로 합니다.
//
//  ⚠️ ★열자마자 «어투» 가 나옵니다 — 셋 중 유일하게 «고치는» 화면입니다.
//     통변 구조는 읽기만, 오류는 일이 생겼을 때만 봅니다.
//
//  ⛔⛔ 「🔍 통변 구조」는 ★읽기 전용입니다 —
//     lib/saju/premium 의 AI 재료를 «보여만» 줍니다. 여기서 고치게 만들지 마십시오
//     (58부 10장 ⛔⛔ buildCareerMbtiPrompt · buildGeneralSajuPrompt).
//
//  ⚠️ ★주소로 여는 길이 «셋 다» 살아 있습니다 [48부 10차] —
//        /admin#tone → 어투 · /admin#prompt → 통변 구조 · /admin#aierror → 오류
//     ⛔ 없애지 마십시오. 즐겨찾기 해 두셨을 수 있습니다.
// ══════════════════════════════════════════════════════════════════

export type AiInner = 'tone' | 'prompt' | 'aierror'

export default function AiHub({ initial }: { initial?: AiInner } = {}) {
  const [inner, setInner] = useState<AiInner>(initial ?? 'tone')

  const tabStyle = (on: boolean) => ({
    background: 'none',
    border: 'none',
    padding: '0 0 10px',
    marginBottom: -1,
    fontSize: 14,
    fontWeight: on ? 700 : 500,
    color: on ? '#FAC775' : '#8a88a0',
    borderBottom: on ? '2px solid #FAC775' : '2px solid transparent',
    cursor: 'pointer',
  })

  return (
    <div>
      <div className="flex gap-6 mb-5 flex-wrap"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button type="button" onClick={() => setInner('tone')} style={tabStyle(inner === 'tone')}>
          💬 어투 관리
        </button>
        <button type="button" onClick={() => setInner('prompt')} style={tabStyle(inner === 'prompt')}>
          🔍 AI 통변 구조
        </button>
        <button type="button" onClick={() => setInner('aierror')} style={tabStyle(inner === 'aierror')}>
          🚨 AI 오류
        </button>
      </div>

      {/* ⚠️ 셋을 «함께» 그리지 않습니다 — 안 보이는 쪽까지 조회가 돕니다. */}
      {inner === 'tone' && <ToneManager />}
      {inner === 'prompt' && <PromptViewer />}
      {inner === 'aierror' && <AiErrorLog />}
    </div>
  )
}
