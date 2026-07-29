'use client'

// ============================================================================
// 홈 「MyungCafe 서비스」 영역 — BEST 2개 + 갈래 4묶음
// ----------------------------------------------------------------------------
// ★2026-07-29 — 대표님 지시로 서비스 목록을 다시 짰습니다.
//
//   [무엇이 문제였나]
//     열두 서비스가 한 줄로 길게 늘어서 있었고, [전체 12개 보기]로 접혀 있었습니다.
//     접힘 상태에서 넷만 보이니 손님은 나머지 여덟이 있는 줄도 몰랐고,
//     열두 개가 나란하니 무엇부터 봐야 하는지도 알 수 없었습니다.
//
//   [어떻게 바꿨나]
//     ① 킬러 둘(내사주그림·진로적성)을 맨 위에 큰 카드로 세웁니다.
//     ② 나머지 열을 네 갈래로 묶어 여닫이(아코디언)로 넣습니다.
//
//   ⚠️ 이 부품은 **보여 주기만** 합니다. 서비스 목록(SERVICES)·압핀 처리·이동은
//      전부 부모(app/home-new/page.tsx)가 그대로 들고 있습니다.
//      연결(href)은 하나도 바뀌지 않았습니다.
//
//   ⚠️ 압핀(📌)은 살려 두었습니다. 회원이 최대 세 개까지 고정하는 기능이고
//      saju_records 에 저장됩니다(lib/saju/pinnedServices.ts). 지시에 없었지만
//      말없이 없애면 이미 고정해 둔 회원의 설정이 사라집니다.
//      → 고정한 것은 BEST 아래 「빠른 이동」 줄로 따로 띄웁니다.
//
//   ★새 서비스를 SERVICES 에 더할 때 GROUPS 에도 이름을 적어 주십시오.
//     안 적어도 「그 밖의 서비스」로 떨어져 **사라지지는 않습니다**(아래 안전망).
// ============================================================================

import { useState } from 'react'

export interface HomeService {
  name: string
  color: string
  bg: string
  href: string
  cat: string
  sub: string
  /** ★2026-07-29 — 3D 결의 아이콘. 12지신 동물을 대신합니다. */
  icon: string
  /** 타일 그라데이션 [시작, 끝] */
  grad: [string, string] | string[]
}

interface Props {
  services: HomeService[]
  pinned: string[]
  pinMsg: string
  maxPins: number
  onTogglePin: (name: string) => void
  onOpen: (svc: HomeService) => void
}

/** 맨 위에 큰 카드로 세울 둘 (대표님 지정) */
const BEST_NAMES = ['내사주그림', '진로적성']

/** BEST 카드에 쓸 한 줄 소개 — 리스트의 sub 보다 길게 적는다 */
const BEST_COPY: Record<string, string> = {
  '내사주그림': '어려운 내 사주를 한 장의 그림으로',
  '진로적성': '타고난 직무 역량과 사주 MBTI',
}

/** 갈래 안에 하나뿐이어도 접지 않고 바로 보여 줄 갈래 */
const ALWAYS_OPEN = ['saju']

interface Group {
  key: string
  icon: string
  title: string
  desc: string
  names: string[]
}

/** 네 갈래 (대표님 지정) */
const GROUPS: Group[] = [
  {
    // ★2026-07-29 — 사주·대운·연월운세가 하나로 합쳐졌습니다. (대표님 확정)
    //   갈래 안에 하나뿐이라 심심해 보이지만, 그 하나가 셋을 다 담고 있습니다.
    key: 'saju', icon: '🧭', title: '내 사주 & 운세',
    desc: '원국·10년 흐름·올해를 한 번에',
    names: ['내 사주 & 운세'],
  },
  {
    key: 'timing', icon: '🎯', title: '특화 목적 & 타이밍',
    desc: '시험·취업과 좋은 날 잡기',
    names: ['합격운/취업운', '결혼택일', '출산택일', '이사택일'],
  },
  {
    key: 'life', icon: '📅', title: '오늘의 라이프',
    desc: '오늘의 카드 한 장',
    names: ['타로'],
  },
  {
    key: 'etc', icon: '💞', title: '궁합 & 기타',
    desc: '두 사람의 결, 그리고 이름',
    names: ['궁합', '내이름 감정'],
  },
]

export default function ServiceSection({
  services, pinned, pinMsg, maxPins, onTogglePin, onOpen,
}: Props) {
  // 첫 갈래만 열어 둔다 — 다 접혀 있으면 빈 화면처럼 보이고, 다 열면 예전과 같아진다.
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(ALWAYS_OPEN.map(k => [k, true])),
  )

  const byName = new Map(services.map(s => [s.name, s]))
  const pinnedSvcs = pinned
    .map(n => byName.get(n))
    .filter((s): s is HomeService => !!s)
  const best = BEST_NAMES.map(n => byName.get(n)).filter((s): s is HomeService => !!s)

  // ── 안전망 — GROUPS 에 못 적은 서비스가 있어도 사라지지 않게 ──
  //    (교훈 BO 의 결 — 표에서 빠지면 없는 것이 된다)
  const placed = new Set<string>([...BEST_NAMES, ...GROUPS.flatMap(g => g.names)])
  const orphans = services.filter(s => !placed.has(s.name))
  const groups: Group[] = orphans.length
    ? [...GROUPS, {
        key: 'orphan', icon: '🗂️', title: '그 밖의 서비스',
        desc: 'GROUPS 에 갈래를 적어 주세요',
        names: orphans.map(s => s.name),
      }]
    : GROUPS

  return (
    <div style={{ padding: '6px 0 20px' }}>
      <style>{`
        /* ★2026-07-29 — 스프링 바운스(터치 시 튕김) · 글로시 결
           ⚠️ 이 파일은 인라인 스타일 방식이라 Tailwind 클래스를 섞지 않고
              같은 효과를 CSS 로 냈습니다. active:scale-95 에 해당합니다. */
        .svcRow { transition: background 0.14s ease; }
        .svcRow:active { background: #f7ece2; }
        .svcBest { transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .svcBest:active { transform: scale(0.95); }
        .svcChip { transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .svcChip:active { transform: scale(0.94); }
        .svcTile {
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
          box-shadow: 0 3px 10px -2px var(--glow, rgba(0,0,0,0.18));
        }
        /* 유리 하이라이트 — 타일 위쪽에 얹히는 빛 */
        .svcTile::after {
          content: ''; position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(160deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 52%);
          pointer-events: none;
        }
        .svcHead:focus-visible, .svcRow:focus-visible, .svcBest:focus-visible,
        .svcChip:focus-visible, .svcPin:focus-visible {
          outline: 2px solid #c8783c; outline-offset: 2px;
        }
        .svcChev { transition: transform 0.18s ease; }
        @media (prefers-reduced-motion: reduce) {
          .svcRow, .svcBest, .svcChip, .svcChev { transition: none; }
        }
      `}</style>

      {/* ── 영역 제목 ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px', padding: '0 16px',
      }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#3a2e28' }}>MyungCafe 서비스</span>
        {/* ★2026-07-29 — 살아 있는 핀만 셉니다.
            없어진 서비스의 핀은 부모가 홈에 들어올 때 걷어냅니다. */}
        {pinnedSvcs.length > 0 && (
          <span style={{ fontSize: '11px', color: '#8f3d0e' }}>📌 {pinnedSvcs.length}/{maxPins}</span>
        )}
      </div>

      {/* 압핀 안내 메시지 (부모가 내려 줌) */}
      {pinMsg && (
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#c85a6e', marginBottom: '8px' }}>
          {pinMsg}
        </div>
      )}

      {/* ═══ ① BEST — 킬러 둘 ═══ */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '9px',
        }}>
          <span style={{ fontSize: '12px' }}>🔥</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#96502e', letterSpacing: '-0.2px' }}>
            나만을 위한 특화 분석
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {best.map((s) => (
            <button
              key={s.name}
              className="svcBest"
              onClick={() => onOpen(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: '13px',
                width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '15px 14px', borderRadius: '18px',
                // ★글래스모피즘 — 반투명 유리 + 흰 테두리 (지시대로)
                border: '1px solid rgba(255,255,255,0.8)',
                background: `linear-gradient(120deg, ${s.grad[0]}1f 0%, ${s.grad[1]}1a 48%, rgba(255,255,255,0.72) 100%)`,
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: `0 6px 20px -8px ${s.grad[0]}59`,
              }}
            >
              <span
                className="svcTile"
                style={{
                  width: '54px', height: '54px', borderRadius: '17px',
                  background: `linear-gradient(140deg, ${s.grad[0]} 0%, ${s.grad[1]} 100%)`,
                  ['--glow' as string]: `${s.grad[0]}66`,
                }}
              >
                <span style={{ fontSize: '30px', lineHeight: 1, position: 'relative', zIndex: 1 }}>{s.icon}</span>
              </span>

              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15.5px', fontWeight: 700, color: '#3a2e28' }}>{s.name}</span>
                  <span style={{
                    fontSize: '9.5px', fontWeight: 700, color: '#fff',
                    background: `linear-gradient(100deg, ${s.grad[0]}, ${s.grad[1]})`,
                    padding: '2px 7px', borderRadius: '20px', letterSpacing: '0.2px',
                  }}>BEST</span>
                </span>
                <span style={{ fontSize: '11.5px', color: '#6b4a33', lineHeight: 1.45 }}>
                  {BEST_COPY[s.name] ?? s.sub}
                </span>
              </span>

              <span style={{ fontSize: '15px', color: s.grad[0], flexShrink: 0 }}>›</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ ② 고정한 서비스 (압핀) — 있을 때만 ═══ */}
      {pinnedSvcs.length > 0 && (
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: '11px', color: '#8f3d0e', marginBottom: '7px', fontWeight: 600 }}>
            📌 고정한 서비스
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {pinnedSvcs.map((s) => (
              <button
                key={s.name}
                className="svcChip"
                onClick={() => onOpen(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '7px 12px 7px 9px', borderRadius: '20px', cursor: 'pointer',
                  background: `linear-gradient(115deg, ${s.grad[0]}26, ${s.grad[1]}1c)`,
                  border: '1px solid rgba(255,255,255,0.75)',
                }}
              >
                <span style={{ fontSize: '14px', lineHeight: 1 }}>{s.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#3a2e28' }}>{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ③ 갈래 넷 (여닫이) ═══ */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '9px' }}>
          <span style={{ fontSize: '12px' }}>📂</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#5c3a1e' }}>전체 서비스</span>
        </div>

        <div style={{
          borderRadius: '14px', overflow: 'hidden',
          border: '0.5px solid #f0e0d5', background: '#FFFBF7',
        }}>
          {groups.map((g, gi) => {
            const list = g.names
              .map(n => byName.get(n))
              .filter((s): s is HomeService => !!s)
            if (!list.length) return null
            const isOpen = !!open[g.key]

            // ★2026-07-29 — 갈래 안에 서비스가 **하나뿐이면 여닫이를 쓰지 않습니다.**
            //
            //   [무엇이 어색했나]
            //     사주·대운·연월운세를 하나로 합치면서 「내 사주 & 운세」 갈래에
            //     같은 이름의 서비스 하나만 남았습니다. 화면에 이렇게 떴습니다.
            //         🧭 내 사주 & 운세   1        ← 갈래 머리
            //            내 사주 & 운세            ← 그 안의 서비스
            //     같은 말이 두 줄로 겹쳐 보이고, 한 번 더 눌러야 들어갑니다.
            //
            //   [어떻게 고쳤나]
            //     하나뿐이면 갈래 머리 자체를 **바로 들어가는 줄**로 만듭니다.
            //     ⚠️ 「오늘의 라이프(타로)」도 하나라 같이 적용됩니다. 그쪽도 한 번에 들어갑니다.
            //     ⚠️ 서비스가 둘 이상으로 늘면 자동으로 여닫이로 돌아갑니다.
            if (list.length === 1) {
              const s = list[0]
              const isPinned = pinned.includes(s.name)
              return (
                <div
                  key={g.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px',
                    borderTop: gi === 0 ? 'none' : '0.5px solid #f4e7db',
                    background: isPinned ? '#fdf0e4' : 'transparent',
                  }}
                >
                  <button
                    className="svcRow"
                    onClick={() => onOpen(s)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', padding: 0, minWidth: 0,
                    }}
                  >
                    <span
                      className="svcTile"
                      style={{
                        width: '40px', height: '40px', borderRadius: '13px',
                        background: `linear-gradient(140deg, ${s.grad[0]} 0%, ${s.grad[1]} 100%)`,
                        ['--glow' as string]: `${s.grad[0]}59`,
                      }}
                    >
                      <span style={{ fontSize: '21px', lineHeight: 1, position: 'relative', zIndex: 1 }}>{s.icon}</span>
                    </span>
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#3a2e28' }}>{s.name}</span>
                      <span style={{ fontSize: '10.5px', color: '#8a6a52' }}>{s.sub}</span>
                    </span>
                    <span style={{ fontSize: '13px', color: '#b09079', flexShrink: 0 }}>›</span>
                  </button>
                  <button
                    className="svcPin"
                    onClick={() => onTogglePin(s.name)}
                    aria-label={isPinned ? `${s.name} 고정 해제` : `${s.name} 고정`}
                    aria-pressed={isPinned}
                    style={{
                      width: '32px', height: '32px', border: 'none', background: 'none',
                      cursor: 'pointer', fontSize: '16px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      filter: isPinned ? 'none' : 'grayscale(1)',
                      opacity: isPinned ? 1 : 0.32,
                      transform: isPinned ? 'scale(1.05)' : 'none',
                    }}
                  >📌</button>
                </div>
              )
            }

            return (
              <div key={g.key} style={{ borderTop: gi === 0 ? 'none' : '0.5px solid #f4e7db' }}>
                {/* 갈래 머리 */}
                <button
                  className="svcHead"
                  onClick={() => setOpen(o => ({ ...o, [g.key]: !o[g.key] }))}
                  aria-expanded={isOpen}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '13px 14px', background: isOpen ? '#fdf4ec' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '17px', lineHeight: 1, flexShrink: 0 }}>{g.icon}</span>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#3a2e28' }}>{g.title}</span>
                      <span style={{
                        fontSize: '10px', color: '#a07a5e', background: '#f4e9df',
                        padding: '1px 6px', borderRadius: '20px', fontWeight: 600,
                      }}>{list.length}</span>
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#8a6a52' }}>{g.desc}</span>
                  </span>
                  <span
                    className="svcChev"
                    style={{
                      fontSize: '11px', color: '#b09079', flexShrink: 0,
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}
                  >▼</span>
                </button>

                {/* 갈래 속 서비스 */}
                {isOpen && (
                  <div style={{ background: '#fffdfb' }}>
                    {list.map((s, idx) => {
                      const isPinned = pinned.includes(s.name)
                      return (
                        <div
                          key={s.name}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px 10px 16px',
                            borderTop: idx === 0 ? '0.5px solid #f4e7db' : '0.5px solid #f7eee5',
                            background: isPinned ? '#fdf0e4' : 'transparent',
                          }}
                        >
                          <button
                            className="svcRow"
                            onClick={() => onOpen(s)}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', gap: '12px',
                              background: 'none', border: 'none', cursor: 'pointer',
                              textAlign: 'left', padding: 0, minWidth: 0,
                            }}
                          >
                            <span
                              className="svcTile"
                              style={{
                                width: '40px', height: '40px', borderRadius: '13px',
                                background: `linear-gradient(140deg, ${s.grad[0]} 0%, ${s.grad[1]} 100%)`,
                                ['--glow' as string]: `${s.grad[0]}59`,
                              }}
                            >
                              <span style={{ fontSize: '21px', lineHeight: 1, position: 'relative', zIndex: 1 }}>{s.icon}</span>
                            </span>
                            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <span style={{ fontSize: '14px', color: '#3a2e28', fontWeight: 700 }}>{s.name}</span>
                              <span style={{ fontSize: '10.5px', color: '#5c3a1e' }}>{s.sub}</span>
                            </span>
                          </button>

                          <button
                            className="svcPin"
                            onClick={() => onTogglePin(s.name)}
                            aria-label={isPinned ? `${s.name} 고정 해제` : `${s.name} 고정`}
                            aria-pressed={isPinned}
                            style={{
                              width: '32px', height: '32px', border: 'none', background: 'none',
                              cursor: 'pointer', fontSize: '16px', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              filter: isPinned ? 'none' : 'grayscale(1)',
                              opacity: isPinned ? 1 : 0.32,
                              transform: isPinned ? 'scale(1.05)' : 'none',
                            }}
                          >📌</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
