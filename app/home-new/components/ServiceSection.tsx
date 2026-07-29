'use client'

// ============================================================================
// 홈 「MyungCafe 서비스」 영역 — BEST 2개 + 갈래 묶음
// ----------------------------------------------------------------------------
// ★2026-07-29 (2차) — 색을 카드로 옮겼습니다. (대표님 지시)
//
//   [무엇이 문제였나]
//     아이콘 뒤에 원색 그라데이션 타일을 깔았더니 열 개가 나란히 서면서
//     보라·핑크·하늘·라임이 한 화면에 다 보였습니다. **아동용 앱처럼 알록달록**했습니다.
//     타일 하나만 보면 예쁜데, 목록이 되면 색이 서로 싸웁니다.
//
//   [어떻게 바꿨나]
//     ① 아이콘 뒤 원색 상자를 걷어냈습니다. 3D 이모지 자체가 보이게 둡니다.
//     ② 색은 **BEST 카드 두 장에만**, 그것도 카드 전체에 은은하게 깝니다.
//     ③ 나머지 목록은 백색 유리(Soft Off-White Glass)로 통일했습니다.
//     ★색을 쓰는 자리를 둘로 줄이니 그 둘이 오히려 눈에 들어옵니다.
//
// ----------------------------------------------------------------------------
// ★2026-07-29 (1차) — 대표님 지시로 서비스 목록을 다시 짰습니다.
//     ① 킬러 둘(내사주그림·진로적성)을 맨 위에 큰 카드로 세웁니다.
//     ② 나머지를 갈래로 묶어 여닫이(아코디언)로 넣습니다.
//
//   ⚠️ 이 부품은 **보여 주기만** 합니다. 서비스 목록(SERVICES)·압핀 처리·이동은
//      전부 부모(app/home-new/page.tsx)가 그대로 들고 있습니다.
//      연결(href)은 하나도 바뀌지 않았습니다.
//
//   ⚠️ 압핀(📌)은 살려 두었습니다. 회원이 최대 세 개까지 고정하는 기능이고
//      saju_records 에 저장됩니다(lib/saju/pinnedServices.ts).
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
  /** 3D 결의 아이콘 */
  icon: string
  /** [시작, 끝] — ★이제 타일 배경으로 쓰지 않습니다. 화살표·칩 같은 작은 강조에만 씁니다. */
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

/** BEST 카드에 쓸 한 줄 소개 */
const BEST_COPY: Record<string, string> = {
  '내사주그림': '어려운 내 사주를 한 장의 그림으로',
  '진로적성': '타고난 직무 역량과 사주 MBTI',
}

/**
 * ★BEST 카드 두 장의 결. (대표님 지시)
 *
 *   내사주그림  샴페인 골드 & 소프트 코랄 — 밝고 따뜻한 쪽
 *   진로적성    딥 미드나잇 & 라벤더 — 깊고 어두운 쪽
 *
 *   ⚠️ 일부러 **밝은 것 하나, 어두운 것 하나**로 짝지었습니다.
 *      둘 다 밝으면 구분이 안 되고, 둘 다 어두우면 홈이 무거워집니다.
 *   ⚠️ 진로적성이 너무 무겁게 느껴지시면 아래 dark:false 짝(soft violet slate)이
 *      주석으로 함께 있습니다. 한 덩이만 바꾸면 됩니다.
 */
interface BestTheme {
  bg: string
  border: string
  shadow: string
  fg: string
  sub: string
  badgeBg: string
  badgeFg: string
  iconBg: string
  iconBorder: string
  arrow: string
}
const BEST_THEME: Record<string, BestTheme> = {
  // 샴페인 골드 & 소프트 코랄 — amber-50/80 · orange-50/50 · rose-50/80
  '내사주그림': {
    bg: 'linear-gradient(135deg, rgba(255,251,235,0.92) 0%, rgba(255,247,237,0.72) 48%, rgba(255,241,242,0.92) 100%)',
    border: '1px solid rgba(198,150,104,0.34)',            // 로즈골드 실선
    shadow: '0 8px 24px -14px rgba(180,120,80,0.42)',
    fg: '#43352c', sub: '#7c6352',
    badgeBg: 'linear-gradient(100deg, #c8a06a, #d98b7a)',   // 로즈골드 배지
    badgeFg: '#fff',
    iconBg: 'rgba(255,255,255,0.72)',
    iconBorder: '1px solid rgba(255,255,255,0.9)',
    arrow: '#b48a63',
  },
  // 딥 미드나잇 & 라벤더 — slate-900 · purple-950 · indigo-900
  '진로적성': {
    bg: 'linear-gradient(135deg, #0f172a 0%, #2e1065 52%, #312e81 100%)',
    border: '1px solid rgba(255,255,255,0.16)',
    shadow: '0 10px 28px -14px rgba(30,20,70,0.62)',
    fg: '#ffffff', sub: 'rgba(255,255,255,0.72)',
    badgeBg: 'rgba(255,255,255,0.18)', badgeFg: '#ffffff',
    iconBg: 'rgba(255,255,255,0.12)',
    iconBorder: '1px solid rgba(255,255,255,0.22)',
    arrow: 'rgba(255,255,255,0.66)',
  },
  // ── 진로적성을 밝게 가시려면 위 덩이를 이걸로 바꾸십시오 (Soft Violet Slate) ──
  // '진로적성': {
  //   bg: 'linear-gradient(135deg, rgba(245,243,255,0.94) 0%, rgba(238,242,255,0.74) 50%, rgba(250,245,255,0.94) 100%)',
  //   border: '1px solid rgba(124,110,180,0.28)',
  //   shadow: '0 8px 24px -14px rgba(90,80,150,0.36)',
  //   fg: '#332c4a', sub: '#6b6188',
  //   badgeBg: 'linear-gradient(100deg, #8b7cc8, #a98fd0)', badgeFg: '#fff',
  //   iconBg: 'rgba(255,255,255,0.76)', iconBorder: '1px solid rgba(255,255,255,0.9)',
  //   arrow: '#8b7cc8',
  // },
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

/** 갈래 (대표님 지정) */
const GROUPS: Group[] = [
  {
    // ★사주·대운·연월운세가 하나로 합쳐져 항목이 하나뿐입니다.
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

/* ── 색을 뺀 자리를 대신하는 결 ──
 *   Soft Off-White Glass — 흰색에 아주 옅은 미세 그라데이션 + 가는 테두리.
 *   ⚠️ 여기서 색을 쓰지 마십시오. 색은 BEST 두 장의 몫입니다. */
const TILE_BG = 'linear-gradient(158deg, #ffffff 0%, #fbf7f3 100%)'
const TILE_BORDER = '1px solid rgba(90,60,30,0.07)'
/** 갈래와 갈래 사이 — 굵게. 같은 갈래 안 줄 사이 — 가늘게. */
const EDGE_GROUP = '1px solid #ece0d4'
const EDGE_ROW = '0.5px solid #f6efe8'

export default function ServiceSection({
  services, pinned, pinMsg, maxPins, onTogglePin, onOpen,
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(ALWAYS_OPEN.map(k => [k, true])),
  )

  const byName = new Map(services.map(s => [s.name, s]))
  const pinnedSvcs = pinned
    .map(n => byName.get(n))
    .filter((s): s is HomeService => !!s)
  const best = BEST_NAMES.map(n => byName.get(n)).filter((s): s is HomeService => !!s)

  // ── 안전망 — GROUPS 에 못 적은 서비스가 있어도 사라지지 않게 ──
  const placed = new Set<string>([...BEST_NAMES, ...GROUPS.flatMap(g => g.names)])
  const orphans = services.filter(s => !placed.has(s.name))
  const groups: Group[] = orphans.length
    ? [...GROUPS, {
        key: 'orphan', icon: '🗂️', title: '그 밖의 서비스',
        desc: 'GROUPS 에 갈래를 적어 주세요',
        names: orphans.map(s => s.name),
      }]
    : GROUPS

  /** 목록에 서는 아이콘 — 원색 상자 없이, 아주 연한 유리판 위에 */
  const Tile = ({ icon, size = 40 }: { icon: string; size?: number }) => (
    <span
      className="svcTile"
      style={{
        width: size, height: size, borderRadius: size * 0.32,
        background: TILE_BG, border: TILE_BORDER,
        fontSize: Math.round(size * 0.56),
      }}
    >{icon}</span>
  )

  /** 압핀 단추 — 여러 곳에서 같은 모양으로 쓴다 */
  const Pin = ({ name }: { name: string }) => {
    const on = pinned.includes(name)
    return (
      <button
        className="svcPin"
        onClick={() => onTogglePin(name)}
        aria-label={on ? `${name} 고정 해제` : `${name} 고정`}
        aria-pressed={on}
        style={{
          width: 32, height: 32, border: 'none', background: 'none',
          cursor: 'pointer', fontSize: 16, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: on ? 'none' : 'grayscale(1)',
          opacity: on ? 1 : 0.3,
          transform: on ? 'scale(1.05)' : 'none',
        }}
      >📌</button>
    )
  }

  return (
    <div style={{ padding: '6px 0 20px' }}>
      <style>{`
        /* 스프링 바운스 — active:scale-95 에 해당 */
        .svcRow { transition: background 0.14s ease; }
        .svcRow:active { background: #faf4ee; }
        .svcBest { transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .svcBest:active { transform: scale(0.95); }
        .svcChip { transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .svcChip:active { transform: scale(0.94); }
        .svcTile {
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; line-height: 1;
          box-shadow: 0 1px 3px rgba(90,60,30,0.05);
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
        marginBottom: 10, padding: '0 16px',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#3a2e28' }}>MyungCafe 서비스</span>
        {pinnedSvcs.length > 0 && (
          <span style={{ fontSize: 11, color: '#8f3d0e' }}>📌 {pinnedSvcs.length}/{maxPins}</span>
        )}
      </div>

      {pinMsg && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#c85a6e', marginBottom: 8 }}>{pinMsg}</div>
      )}

      {/* ═══ ① BEST — 카드 전체에 결을 입힌다 ═══ */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
          <span style={{ fontSize: 12 }}>🔥</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#96502e', letterSpacing: '-0.2px' }}>
            나만을 위한 특화 분석
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {best.map((s) => {
            const t = BEST_THEME[s.name]
            if (!t) return null
            return (
              <button
                key={s.name}
                className="svcBest"
                onClick={() => onOpen(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '16px 15px', borderRadius: 18,
                  background: t.bg, border: t.border, boxShadow: t.shadow,
                  backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                }}
              >
                <span style={{
                  width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: t.iconBg, border: t.iconBorder, fontSize: 29, lineHeight: 1,
                }}>{s.icon}</span>

                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: t.fg, letterSpacing: '-0.3px' }}>{s.name}</span>
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, color: t.badgeFg, background: t.badgeBg,
                      padding: '2px 7px', borderRadius: 20, letterSpacing: '0.3px',
                    }}>BEST</span>
                  </span>
                  <span style={{ fontSize: 11.5, color: t.sub, lineHeight: 1.45 }}>
                    {BEST_COPY[s.name] ?? s.sub}
                  </span>
                </span>

                <span style={{ fontSize: 15, color: t.arrow, flexShrink: 0 }}>›</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ ② 고정한 서비스 ═══ */}
      {pinnedSvcs.length > 0 && (
        <div style={{ padding: '15px 16px 0' }}>
          <div style={{ fontSize: 11, color: '#8f3d0e', marginBottom: 7, fontWeight: 600 }}>
            📌 고정한 서비스
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {pinnedSvcs.map((s) => (
              <button
                key={s.name}
                className="svcChip"
                onClick={() => onOpen(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 13px 7px 10px', borderRadius: 20, cursor: 'pointer',
                  background: TILE_BG, border: TILE_BORDER,
                  boxShadow: '0 1px 3px rgba(90,60,30,0.05)',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{s.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#3a2e28' }}>{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ③ 갈래 ═══ */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
          <span style={{ fontSize: 12 }}>📂</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#5c3a1e' }}>전체 서비스</span>
        </div>

        <div style={{
          borderRadius: 16, overflow: 'hidden',
          border: TILE_BORDER, background: '#fffdfb',
          boxShadow: '0 1px 3px rgba(90,60,30,0.04)',
        }}>
          {groups.map((g, gi) => {
            const list = g.names
              .map(n => byName.get(n))
              .filter((s): s is HomeService => !!s)
            if (!list.length) return null
            const isOpen = !!open[g.key]
            /* ★갈래와 갈래 사이는 굵은 선. 이게 없으면 「타로」가 앞 갈래에
               속한 것처럼 읽힙니다. (실제로 그렇게 보인다는 지적을 받았습니다) */
            const topEdge = gi === 0 ? 'none' : EDGE_GROUP

            // ── 갈래에 하나뿐이면 여닫이를 쓰지 않고 바로 들어가는 줄로 ──
            if (list.length === 1) {
              const s = list[0]
              return (
                <div
                  key={g.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '12px 14px', borderTop: topEdge,
                    background: pinned.includes(s.name) ? '#fdf3ea' : 'transparent',
                  }}
                >
                  <button
                    className="svcRow"
                    onClick={() => onOpen(s)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 11,
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', padding: 0, minWidth: 0,
                    }}
                  >
                    <Tile icon={s.icon} size={42} />
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#3a2e28' }}>{s.name}</span>
                        {/* 갈래 아이콘을 작게 곁들여 「어느 묶음인지」를 남긴다 */}
                        <span style={{ fontSize: 10, opacity: 0.5 }}>{g.icon}</span>
                      </span>
                      <span style={{ fontSize: 10.5, color: '#8a6a52' }}>{s.sub}</span>
                    </span>
                    <span style={{ fontSize: 13, color: '#c0a894', flexShrink: 0 }}>›</span>
                  </button>
                  <Pin name={s.name} />
                </div>
              )
            }

            return (
              <div key={g.key} style={{ borderTop: topEdge }}>
                <button
                  className="svcHead"
                  onClick={() => setOpen(o => ({ ...o, [g.key]: !o[g.key] }))}
                  aria-expanded={isOpen}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '13px 14px', background: isOpen ? '#fdf7f1' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{g.icon}</span>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#3a2e28' }}>{g.title}</span>
                      <span style={{
                        fontSize: 10, color: '#a07a5e', background: '#f5ece3',
                        padding: '1px 6px', borderRadius: 20, fontWeight: 600,
                      }}>{list.length}</span>
                    </span>
                    <span style={{ fontSize: 10.5, color: '#8a6a52' }}>{g.desc}</span>
                  </span>
                  <span
                    className="svcChev"
                    style={{
                      fontSize: 11, color: '#b09079', flexShrink: 0,
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}
                  >▼</span>
                </button>

                {isOpen && (
                  <div style={{ background: '#fffdfb' }}>
                    {list.map((s) => (
                      <div
                        key={s.name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 11,
                          padding: '10px 14px 10px 16px',
                          borderTop: EDGE_ROW,
                          background: pinned.includes(s.name) ? '#fdf3ea' : 'transparent',
                        }}
                      >
                        <button
                          className="svcRow"
                          onClick={() => onOpen(s)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 11,
                            background: 'none', border: 'none', cursor: 'pointer',
                            textAlign: 'left', padding: 0, minWidth: 0,
                          }}
                        >
                          <Tile icon={s.icon} size={40} />
                          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <span style={{ fontSize: 14, color: '#3a2e28', fontWeight: 700 }}>{s.name}</span>
                            <span style={{ fontSize: 10.5, color: '#8a6a52' }}>{s.sub}</span>
                          </span>
                        </button>
                        <Pin name={s.name} />
                      </div>
                    ))}
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
