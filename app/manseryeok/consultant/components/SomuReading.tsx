'use client'
// app/manseryeok/consultant/components/SomuReading.tsx
//
// ══════════════════════════════════════════════════════════════════
//  🌿 소무승 물상론 해설 — 상담사용
//
//  ★2026-08-07 (49부 1차 · 대표님 지시 · 연재쌤 의견)
//    「연재쌤이 소무승 물상론을 별도로 교재를 정리해서 넣은 후
//      고객상담 시에만 상담사 화면에서 만세력 옆에 해설들이 나오는 것처럼」
//    「★전혀 다른 판정함수 — 완전 ★별도의 물상 관련 부품들로 구성」
//    「상담사 화면에 물상론 탭을 하나 더 만들어 ★인적사항을 넣으면
//      교재내용들이 ★원본 그대로 나오게 하고,
//      상담사는 이걸 보고 고객에게 ★유선으로 설명하는 것」
//
//  ★무엇이 다른가 — 세 탭과 견주어
//    🔮 만세력     원국·점수·용신 셋·신살·대운을 «계산해» 보여 줍니다
//    📖 원본 해설  열다섯 갈래 교재 원문을 «넓게»
//    ⚖️ 용신       용신 하나의 «판정에 이른 길» 을 폅니다
//    🌿 물상       ★소무승 물상론 «한 책» 만. 보는 눈이 아예 다릅니다.
//
//  ⚠️⚠️ ★⚖️ 용신 탭과 «답이 달라도» 어긋난 것이 아닙니다  [연재쌤]
//     기존 파이프라인 : 오행 점수 → 신강약(30/42/47) → 억부·조후·격국 → 용신
//                      ★원국을 «재어서» 좋고 싫음을 정합니다
//     물상론          : 일간이 甲木이면 → 좋아하는 天干 丙庚壬 / 싫어하는 乙己辛
//                      ★일간이 정해지는 «순간» 이미 정해져 있습니다 (017쪽)
//                      「甲木은 丙火를 正用神으로 쓰는데」 — 신강약을 안 따집니다
//                      「寅月엔 庚辛金을 쓰지 않는다」 — 월지로 못 박습니다
//     ⛔ 두 탭이 다른 말을 한다고 «한쪽을 고치지» 마십시오. 그것이 정상입니다.
//
//  ⛔⛔ ★기존 판정 함수를 «하나도» 부르지 않습니다 [대표님 지시].
//     이 화면이 부르는 것은 ★somu/judge «하나» 와 만세력 훅뿐입니다.
//
//  ⛔⛔ ★«상담사용» 입니다. 손님 화면에 옮기지 마십시오.
//     「집에서 못 죽고 객사한다」·「망한 집안 출신이다」·「죽어도 棺이 없다」
//     같은 말이 ★다듬지 않고 그대로 나옵니다. 대표님이 「원본 그대로」라 하셨습니다.
//     ⇒ 손님 통변으로 보낼 때는 ★readSomu({ forCustomer: true }) 를 쓰십시오.
//        '상담사만' 줄과 通辯論 사례가 «통째로» 빠집니다.
//
//  ⛔ ★이 파일에 교재 말을 «직접» 적지 마십시오 —
//     자료는 lib/saju/somu/data.ts 한 곳입니다. 사본이 둘 되면 교훈 BQ 입니다.
// ══════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react'
import { useResultSaju } from '@/hooks/useResultSaju'
import { LINE_OUTER, LINE_INNER } from '@/lib/ui/line'
import { readSomu } from '@/lib/saju/somu/judge'
// ★2026-08-08 — 주제별 다섯 꼭지(十一·十二·十四·十五·十六).
//   ⚠️ 이것이 없을 때 자료 ★3,692줄이 «담겨만» 있고 아무도 못 보고 있었습니다.
import { readSomuTopics } from '@/lib/saju/somu/readTopics'
// 🔴 ★2026-08-08 — 음력 변환이 부본으로 넘어가면 «하루 밀린 원국» 이 됩니다.
//   ⛔ 이 경고를 빼지 마십시오 (LunarSourceNote 머리말 참조).
import LunarSourceNote from '@/app/components/common/LunarSourceNote'

type Props = {
  calType: '양력' | '음력'
  leap: boolean
  gender: '남' | '여'
  year: string
  month: string
  day: string
  hourIdx: number | null
  name: string
}

/** 한 묶음 — 제목 · 출전 · 여러 줄 (⚖️ 용신 탭과 «같은» 모양) */
function Block({
  title, source, lines, img, open, onToggle,
}: {
  title: string; source?: string; lines: string[]
  img?: { ko: string; prompt: string }
  open: boolean; onToggle: () => void
}) {
  if (lines.length === 0) return null
  return (
    <div style={{
      background: '#fff', border: LINE_OUTER, borderRadius: 10,
      padding: '11px 13px', marginBottom: 8,
    }}>
      <button type="button" onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'baseline', gap: 7,
          background: 'transparent', border: 'none', padding: 0, marginBottom: open ? 7 : 0,
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3a2e28' }}>{title}</span>
        <span style={{ fontSize: 10.5, color: '#a08d7d' }}>{lines.length}</span>
        {source && (
          <span style={{ fontSize: 10, color: '#a08d7d', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {source}
          </span>
        )}
        <span aria-hidden style={{
          color: '#96502e', fontSize: 15, lineHeight: 1, marginLeft: source ? 5 : 'auto',
          transition: 'transform .2s', transform: `rotate(${open ? 180 : 0}deg)`,
        }}>▾</span>
      </button>

      {open && lines.map((l, i) => (
        <div key={i} style={{
          fontSize: 12, color: '#4a3f38', lineHeight: 1.85,
          paddingLeft: 9, borderLeft: LINE_INNER, marginBottom: 5,
        }}>{l}</div>
      ))}

      {/* ★그림 — 교재 삽화를 «쓰지» 않습니다. 물상 낱말로 «새로» 그릴 재료입니다.
          ⛔ 교재 삽화를 스캔해 넣지 마십시오. 저작물입니다. */}
      {open && img && (
        <div style={{
          marginTop: 8, paddingTop: 8, borderTop: LINE_INNER,
          fontSize: 11, color: '#8a7461', lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 700, color: '#96502e', marginBottom: 3 }}>🖼 그림 — {img.ko}</div>
          <div style={{ fontSize: 10, color: '#a08d7d', wordBreak: 'break-word' }}>{img.prompt}</div>
        </div>
      )}
    </div>
  )
}

export default function SomuReading(p: Props) {
  const yearN = Number(p.year) || 0
  const monthN = Number(p.month) || 0
  const dayN = Number(p.day) || 0

  // ⚠️ 만세력 계산은 ★손님 화면·원본 해설·용신 탭과 «똑같은» 훅입니다.
  //    ⛔ 새로 계산하지 마십시오. 원국이 갈리면 아래가 전부 어긋납니다.
  //    ⚠️ 이것은 «판정» 이 아니라 «원국 뽑기» 라 별도 원칙에 어긋나지 않습니다.
  const { saju, converting, dayStem, lunarSource, lunarReason, lunarMismatch } = useResultSaju(
    p.calType, yearN, monthN, dayN, p.leap ? '1' : '0', p.hourIdx,
  )

  /** 접힌 묶음 — ⚠️ 通辯論 사례만 «접은 채» 로 시작합니다 (남의 사례라 길어서) */
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const toggle = (k: string) => setClosed(prev => {
    const n = new Set(prev)
    if (n.has(k)) n.delete(k); else n.add(k)
    return n
  })

  const res = useMemo(() => {
    if (saju.length === 0 || !dayStem) return null
    return readSomu({ saju, dayStem, gender: p.gender })
  }, [saju, dayStem, p.gender])

  /** ★주제별 다섯 꼭지 — 일간을 «안 고르고도» 읽는 글입니다 */
  const topics = useMemo(() => {
    if (saju.length === 0 || !dayStem) return []
    return readSomuTopics({ saju, dayStem })
  }, [saju, dayStem])

  /** 어느 꼭지를 펴 놓았는가 — ★걸린 자리가 «있는» 꼭지만 처음부터 펼칩니다 */
  const [openTopic, setOpenTopic] = useState<Set<string>>(new Set())

  // ★2026-08-08 — 접힘 규칙이 «셋» 이 되었습니다.
  //   ① 通辯論 사례      — 접은 채 (남의 사례라 길어서 · 49부부터)
  //   ② 안 걸린 자리      — 접은 채 (원국에 없는 天干論 짝 · 다른 계절 · 안 걸린 神殺)
  //   ③ 그 밖             — 펼친 채 (47부 6-2 「펼친 채로 시작」)
  //   ⛔ ②를 «빼지» 마십시오. 안 걸린 것까지 다 펼치면 한 화면이 1,400줄이 됩니다.
  //      ★안 걸렸다고 «없애지는» 않습니다 — 접어서 «둡니다». 눌러서 보십니다.
  const startsClosed = (key: string, matched?: boolean) =>
    key.startsWith('case-') ? !matched : matched === false
  const isOpen = (key: string, matched?: boolean) =>
    startsClosed(key, matched) ? closed.has(`open:${key}`) : !closed.has(key)
  const flip = (key: string, matched?: boolean) =>
    toggle(startsClosed(key, matched) ? `open:${key}` : key)

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#FDF6F0', padding: 12 }}>
      {/* 머리 — 탭 이름이 짧아 여기에 온전히 적습니다 */}
      <div style={{
        background: '#fff', border: LINE_OUTER, borderRadius: 10,
        padding: '10px 12px', marginBottom: 10,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#96502e' }}>
          🌿 소무승 물상론 해설 — 교재 원문 그대로
        </div>
        <div style={{ fontSize: 11, color: '#8a7461', lineHeight: 1.8, marginTop: 4 }}>
          출전 『물(物), 형상 명리학』(소무승)
          {res?.chapter && ` · ${res.chapter.label} ${res.chapter.pages}`}
        </div>
      </div>

      {converting ? (
        <div style={{ padding: 20, fontSize: 12, color: '#8a7461', textAlign: 'center' }}>
          사주 불러오는 중…
        </div>
      ) : !yearN || !monthN || !dayN ? (
        <div style={{ padding: 20, fontSize: 12, color: '#8a7461', textAlign: 'center', lineHeight: 1.8 }}>
          생년월일을 넣으면<br />소무승 물상론 교재 원문이 그대로 펼쳐집니다.
        </div>
      ) : !res ? (
        <div style={{ padding: 20, fontSize: 12, color: '#8a7461', textAlign: 'center', lineHeight: 1.8 }}>
          사주를 못 뽑았습니다. 생년월일을 확인해 주세요.
        </div>
      ) : !res.chapter ? (
        <div style={{
          background: '#fff', border: LINE_OUTER, borderRadius: 10,
          padding: '14px 13px', fontSize: 12, color: '#4a3f38', lineHeight: 1.9,
        }}>
          일간이 <b>{res.stem}</b> 입니다 — 이 장은 <b>아직 안 담겼습니다</b>.
          <br /><br />
          일간 열 장(甲乙丙丁戊己庚辛壬癸)은 모두 담겨 있습니다.
          여기에 걸렸다면 <b>일간을 못 뽑은 것</b>입니다 — 생년월일과 시를 확인해 주십시오.
        </div>
      ) : (
        <>
          {/* 🔴 ★원국 «위» 에 냅니다 — 원국을 읽기 «전» 에 보셔야 뜻이 있습니다 */}
          <LunarSourceNote
            source={lunarSource} reason={lunarReason} mismatch={lunarMismatch}
            isLunar={p.calType === '음력'}
          />

          {/* 원국 — 무엇을 딛고 폈는지 먼저 */}
          <div style={{
            background: '#fff', border: LINE_OUTER, borderRadius: 10,
            padding: '11px 13px', marginBottom: 8,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3a2e28', marginBottom: 7 }}>
              원국 — 무엇으로 골랐나
            </div>
            {[
              saju.map(s => `${s.pillar} ${s.stem}${s.branch}`).join(' · '),
              `일간 ${res.stem} → 『${res.chapter.label}』 장`,
              `월지 ${res.monthBranch || '—'} → 地支論 ${res.season ?? '—'}月 묶음`,
              `원국 천간 ${res.presentStems.join(' · ') || '—'} → 天干論은 ★이것만 폅니다`,
              p.hourIdx === null
                ? '🔴 시간 «모름» — 시주가 빠졌습니다. 시주 천간의 天干論이 안 나옵니다.'
                : '시주까지 다 들어왔습니다.',
            ].map((l, i) => (
              <div key={i} style={{
                fontSize: 12, color: '#4a3f38', lineHeight: 1.85,
                paddingLeft: 9, borderLeft: LINE_INNER, marginBottom: 5,
              }}>{l}</div>
            ))}
          </div>

          {res.blocks.map(b => (
            <Block key={b.key} title={b.title} source={b.source} lines={b.lines} img={b.img}
              open={isOpen(b.key, b.matched)} onToggle={() => flip(b.key, b.matched)} />
          ))}

          {/* ── ★주제별 다섯 꼭지 ────────────────────────────────
              ⚠️ 일간을 «안 고르고도» 읽는 글이라 본장과 «갈라» 둡니다.
              ⛔ SOMU_CHAPTERS 에 섞지 마십시오 — 뿌리가 다릅니다. */}
          {topics.length > 0 && (
            <div style={{
              background: '#fff', border: LINE_OUTER, borderRadius: 10,
              padding: '11px 13px', marginTop: 12, marginBottom: 8,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3a2e28' }}>
                주제별 꼭지 — 일간을 안 가리고 읽는 글
              </div>
              <div style={{ fontSize: 11, color: '#8a7461', lineHeight: 1.8, marginTop: 4 }}>
                十一 自然現象論 · 十二 変證論 · 十四 十二運星 · 十五 十二支神殺 · 十六 通辯要論
                <br />★표는 이 손님 원국에 <b>걸린</b> 자리입니다.
                <span style={{ color: '#a08d7d' }}>　（十三 神殺論은 아직 안 담겼습니다）</span>
              </div>
            </div>
          )}

          {topics.map(g => {
            const on = openTopic.has(g.key)
            return (
              <div key={g.key} style={{ marginBottom: 8 }}>
                <button type="button"
                  onClick={() => setOpenTopic(prev => {
                    const n = new Set(prev)
                    if (n.has(g.key)) n.delete(g.key); else n.add(g.key)
                    return n
                  })}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'baseline', gap: 7,
                    background: '#fff', border: LINE_OUTER, borderRadius: 10,
                    padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#96502e' }}>
                    {g.no} {g.label}
                  </span>
                  <span style={{ fontSize: 10.5, color: '#a08d7d' }}>
                    {g.hits > 0 ? `★걸린 자리 ${g.hits}` : `덩이 ${g.blocks.length}`}
                  </span>
                  <span style={{ fontSize: 10, color: '#a08d7d', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {g.pages}쪽
                  </span>
                  <span aria-hidden style={{
                    color: '#96502e', fontSize: 15, lineHeight: 1, marginLeft: 5,
                    transition: 'transform .2s', transform: `rotate(${on ? 180 : 0}deg)`,
                  }}>▾</span>
                </button>

                {on && (
                  <div style={{ marginTop: 8 }}>
                    {g.blocks.map(b => (
                      <Block key={b.key} title={b.title} source={b.source} lines={b.lines}
                        img={b.img ? { ko: b.imgKo || '물상 낱말로 그릴 그림', prompt: b.img } : undefined}
                        open={isOpen(b.key, b.matched)} onToggle={() => flip(b.key, b.matched)} />
                    ))}
                    {/* ⚠️ 스캔이 흐려 원문 대조가 필요한 자리 — 상담사가 알고 읽어야 합니다.
                        ⛔ 지우지 마십시오. 교재를 고친 것이 아니라 «그대로 두었다» 는 표시입니다. */}
                    {g.notes?.length ? (
                      <div style={{
                        background: '#fff', border: LINE_OUTER, borderRadius: 10,
                        padding: '10px 12px', marginBottom: 8,
                        fontSize: 11, color: '#8a7461', lineHeight: 1.8,
                      }}>
                        <div style={{ fontWeight: 700, color: '#96502e', marginBottom: 4 }}>
                          ⚠️ 원문 대조가 필요한 자리 {g.notes.length}
                        </div>
                        {g.notes.map((n, i) => <div key={i}>· {n}</div>)}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* ⚠️ 이 안내가 «없으면» 다음 세션이나 상담사가 두 탭을 견주다
          「버그다」 하고 한쪽을 고칩니다. 그때 답이 갈립니다. ⛔ 지우지 마십시오. */}
      <div style={{
        background: '#fff', border: LINE_OUTER, borderRadius: 10,
        padding: '10px 12px', marginTop: 4, fontSize: 11, color: '#8a7461', lineHeight: 1.8,
      }}>
        <div style={{ fontWeight: 700, color: '#96502e', marginBottom: 5 }}>읽으실 때</div>
        ⚖️ 용신 탭과 <b>답이 다를 수 있습니다</b>. 물상론은 보는 눈이 다릅니다 — 어긋남이 아닙니다.
        <br /><br />
        <b>교재 원문 그대로</b>입니다. 거친 말이 다듬어지지 않고 나옵니다.
        손님께는 <b>가려서</b> 전해 주십시오.
        <br /><br />
        通辯論은 <b>교재에 실린 남의 사례</b>입니다. 이 손님 것이 아닙니다 — 견주어 보시는 자료입니다.
        <br /><br />
        <b>★표가 없는 자리</b>는 이 원국에 안 걸리는 것입니다. 지우지 않고 <b>접어서</b> 두었습니다 —
        대운·세운으로 그 글자가 들어오면 눌러서 보십시오.
        <br /><br />
        일간 <b>열 장</b>(甲乙丙丁戊己庚辛壬癸)과 주제별 <b>다섯 꼭지</b>가 담겨 있습니다.
        <b>十三 神殺論</b>만 아직 안 담겼습니다.
      </div>
    </div>
  )
}
