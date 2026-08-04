'use client'

// ============================================================================
// 홈 「MyungCafe 서비스」 영역 — Glass & Stroke 디자인 시스템
// ----------------------------------------------------------------------------
// ★2026-07-29 (3차) — 버튼/카드 시스템을 전면 재정의했습니다. (대표님 지시)
//
//   [무엇이 문제였나]
//     ① 1차: 아이콘마다 원색 그라데이션 타일 → 열 개가 서니 알록달록했다
//     ② 2차: 색을 BEST 둘로 옮겼으나 **밝은 것 하나·어두운 것 하나**로 짝지었더니
//            진로적성(딥 미드나잇)만 소리치고 내사주그림(샴페인)은 크림 배경에 묻혔다.
//            같은 BEST 인데 무게가 안 맞았다.
//     ③ 목록 카드도 배경(크림)과 비슷해 경계가 흐렸다.
//
//   [3차에서 어떻게 잡았나]
//     · 일반 카드를 **순백(#fff)** 으로 — 크림 바탕과 확실히 갈린다
//     · 카드마다 1px 테두리 + 소프트 섀도우 → 하나하나가 «떠 있는 판»이 된다
//     · BEST 둘을 **모두 밝게** 하고 그라데이션 테두리 + 글로우로 구분
//     · 글자를 딥 슬레이트로 — 따뜻한 갈색보다 대비가 세다
//
//   ★한 통에 담고 선으로 나누던 방식을 버리고 **카드를 낱장으로** 띄웠습니다.
//     그래서 「타로가 앞 갈래에 붙어 보인다」던 문제가 구조적으로 사라졌습니다.
//     카드 사이의 빈틈이 곧 경계입니다.
//
// ----------------------------------------------------------------------------
//   ⚠️ 이 부품은 **보여 주기만** 합니다. 서비스 목록(SERVICES)·압핀 처리·이동은
//      전부 부모(app/home-new/page.tsx)가 들고 있습니다. href 는 안 바뀝니다.
//   ⚠️ 압핀(📌)은 회원 기능이라 살려 두었습니다. (lib/saju/pinnedServices.ts)
//   ★새 서비스를 SERVICES 에 더할 때 GROUPS 에도 이름을 적어 주십시오.
//     안 적어도 「그 밖의 서비스」로 떨어져 사라지지는 않습니다(안전망).
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
  /** [시작, 끝] — ★타일 배경으로 쓰지 않습니다. 남겨 둔 것은 되돌릴 여지입니다. */
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

/* ── 디자인 토큰 ──────────────────────────────────────────────────────
 *   ★Tailwind 이름과 짝을 맞춘 실제 hex 입니다.
 *     이 파일은 인라인 스타일 방식이라 클래스를 섞지 않았습니다. */
const C = {
  white: '#ffffff',
  /**
   * ★2026-07-29 (4차) — 테두리를 slate-100(#f1f5f9) 에서 바꿨습니다. (대표님 지시)
   *
   *   [무엇이 문제였나]
   *     slate-100 은 «흰 카드 위»에서는 보이지만 이 앱의 바탕은 크림(#FDF6F0)입니다.
   *     크림 위에 흰 카드를 놓고 거의 흰 테두리를 두르니 **경계가 안 보였습니다.**
   *     BEST 둘만 컬러 테두리가 또렷해서 위아래가 따로 노는 화면이 됐습니다.
   *
   *   [무엇을 골랐나]
   *     amber-900/15 — 따뜻한 갈색 15%. 크림 바탕과 결이 같으면서 선은 또렷합니다.
   *     ⚠️ slate-200(#e2e8f0) 도 후보였으나 차가운 회색이라 크림 위에서 떠 보입니다.
   *        차가운 쪽으로 가시려면 border 를 '#e2e8f0' 로 두면 됩니다.
   */
  /* ══════════════════════════════════════════════════════════════════
     ★2026-08-04 (45부 · 대표님 지시) — «대비 2단계» 로 올렸습니다.

     [무엇이 문제였나]  대표님이 「너무 흐리고 안 보이지 않아?」 하셔서
       WCAG 로 실제 대비를 재 보니 ★다섯 곳이 기준 미달이었습니다.
         서브 설명   2.48:1 (본문 기준 4.5)   ← 제가 45부에 옅게 만든 것
         카피라이트  2.18:1
         푸터 글자   3.33:1
         선 넷       1.09~1.68:1 (선 기준 3.0)

     [무엇을 골랐나]  ★목업 두 단계를 보시고 «2단계» 로 확정하셨습니다.
       선을 여기서 «더» 올리면 갈색이 검게 보여 종이 표처럼 됩니다. 여기가 끝입니다.

     ⚠️ 선만 진하게 하면 ★선이 붕 떠 보입니다. 그래서 바닥(well)과
        아이콘 타일도 «한 톤씩» 함께 내렸습니다. 한쪽만 되돌리지 마십시오.
     ⚠️ 서브 카드는 반대로 ★순백으로 «올렸습니다» — 바닥이 진해져서
        이제 순백이라야 갈립니다. (45부 초에 낮췄던 것을 되돌린 셈입니다)
     ══════════════════════════════════════════════════════════════════ */
  border: '#9c7a58',        // 카드 바깥선 — 흰 위에서 3.93:1 (선 기준 3.0 넘김)
  borderIn: '#b59a7c',      // 열린 갈래 안쪽 카드
  well: '#f4ece1',          // 열린 갈래의 바닥 — 한 톤 내림
  subCard: '#ffffff',       // ★순백. 진해진 바닥과 갈리려면 이래야 합니다
  borderSub: '#b59a7c',     // 서브 카드 테두리 — 2.67:1
  iconBg: '#f0e6d8',        // 아이콘 타일 — 크림 결로 맞춤
  iconEdge: '#c4af95',
  text: '#141c28',          // 본문 — 흰 위에서 16.9:1
  sub: '#55636f',           // 설명 — 6.06:1 (전 #64748b 4.76)
  faint: '#41505c',         // 화살표 — 8.58:1 (전 #94a3b8 ★2.48 미달이었음)
  /** 4면 경계가 칼같이 보이도록 그림자는 촘촘하게 (퍼지면 선이 흐려집니다) */
  shadow: '0 2px 8px rgba(0,0,0,0.04)',
  shadowUp: '0 3px 12px rgba(0,0,0,0.06)',
}

/** 맨 위에 큰 카드로 세울 둘 (대표님 지정) */
const BEST_NAMES = ['내사주그림', '진로적성']

const BEST_COPY: Record<string, string> = {
  '내사주그림': '어려운 내 사주를 한 장의 그림으로',
  '진로적성': '타고난 직무 역량과 사주 MBTI',
}

/**
 * ★BEST 카드 두 장 — 둘 다 «밝게», 테두리와 글로우로만 구분합니다.
 *
 *   내사주그림  샴페인   amber-50/90 → rose-50/80 · 테두리 rose-300/60 · 로즈골드 글로우
 *   진로적성    라벤더   purple-50/90 → indigo-50/80 · 테두리 purple-300/60 · 바이올렛 글로우
 *
 *   ⚠️ 테두리는 진짜 그라데이션입니다. padding-box / border-box 두 겹으로 냅니다.
 *      단색 테두리로 바꾸시려면 border 를 `1.5px solid <색>` 으로 두면 됩니다.
 */
interface BestTheme { bg: string; glow: string; badge: string; arrow: string; iconBg: string }
const BEST_THEME: Record<string, BestTheme> = {
  '내사주그림': {
    bg:
      'linear-gradient(135deg, rgba(255,251,235,0.94) 0%, rgba(255,241,242,0.86) 100%) padding-box,' +
      ' linear-gradient(135deg, #fda4af 0%, #fcd34d 52%, #fda4af 100%) border-box',
    glow: '0 6px 22px -6px rgba(251,113,133,0.28), 0 2px 8px rgba(0,0,0,0.03)',
    badge: 'linear-gradient(100deg, #e8927f, #d4a05f)',
    arrow: '#9f6b62',
    iconBg: 'rgba(255,255,255,0.86)',
  },
  '진로적성': {
    bg:
      'linear-gradient(135deg, rgba(250,245,255,0.94) 0%, rgba(238,242,255,0.86) 100%) padding-box,' +
      ' linear-gradient(135deg, #d8b4fe 0%, #a5b4fc 52%, #d8b4fe 100%) border-box',
    glow: '0 6px 22px -6px rgba(168,85,247,0.26), 0 2px 8px rgba(0,0,0,0.03)',
    badge: 'linear-gradient(100deg, #9b7cd4, #7c86d8)',
    arrow: '#7566a8',
    iconBg: 'rgba(255,255,255,0.86)',
  },
}

/** 갈래 안에 하나뿐이어도 접지 않고 바로 보여 줄 갈래 */
const ALWAYS_OPEN = ['saju']

// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부 4차) — «폴더를 열지 않고» 바로 들어가는 카드 (대표님 지시)
//
//  🔴 [무엇이 문제였나]
//    ① 「궁합」과 「내이름 감정」이 «궁합 & 기타 (2)» 폴더 «안» 에 있었습니다.
//       손님이 궁합을 보려면 폴더를 «열고» 골라야 했습니다. 두 걸음입니다.
//       ⚠️ 이름표가 「궁합 & 기타」라 «이름 감정이 거기 있는 줄» 알기도 어려웠습니다.
//    ② ★「아기 작명」은 아예 «그 밖의 서비스» 폴더에 있었습니다.
//       43부에 홈 카드를 되살리며 SERVICES 에만 더하고 GROUPS 에 안 적었습니다.
//       → 아래 orphans 안전망이 받아 «🗂️ 그 밖의 서비스» 로 보내고 있었습니다.
//       ⚠️ 안전망이 «사라지는 것» 은 막았지만 «엉뚱한 자리» 는 못 막았습니다.
//         ★그래서 SOLO 를 검사로 못 박아 둡니다 (28-verify ⑲-n).
//
//  ★[이제]  셋을 «최상위 낱장 카드» 로 냅니다. 한 번만 누르면 들어갑니다.
//    ⚠️ 폴더가 아니므로 «개수 배지»(2) 도 «여닫이» 도 없습니다.
//
//  ⚠️ SOLO 에 이름을 적으면 GROUPS 에서는 «빼야» 합니다.
//     둘 다 적으면 같은 카드가 화면에 두 번 뜹니다. 아래 placed 가 함께 셉니다.
// ══════════════════════════════════════════════════════════════════

/**
 * ★폴더 없이 «낱장» 으로 내보내는 서비스 — 차례대로 뜹니다
 *
 * ★2026-08-01 (43부 13차) — 이름 두 가지를 «폴더로» 옮겼습니다 (대표님 지시).
 *   [왜]  둘은 «한 갈래» 입니다 — 있는 이름을 보는 일과 새 이름을 짓는 일.
 *         낱장 셋이 나란히 있으면 둘이 한 갈래라는 것이 안 보였습니다.
 *   ⚠️ 궁합은 «홀로» 남습니다 — 묶일 짝이 없습니다.
 */
const SOLO_NAMES = ['궁합']

/** 낱장 카드에만 쓰는 한 줄 — SERVICES 의 sub 보다 «이 자리에» 맞게 */
const SOLO_COPY: Record<string, string> = {
  '궁합': '두 사람의 결',
}

interface Group { key: string; icon: string; title: string; desc: string; names: string[] }

const GROUPS: Group[] = [
  {
    // ★사주·대운·연월운세가 하나로 합쳐져 항목이 하나뿐입니다.
    key: 'saju', icon: '🧭', title: '내 사주와 운세보기',
    desc: '원국·10년 흐름·올해를 한 번에',
    names: ['내 사주와 운세보기'],
  },
  {
    // ⚠️ 제목의 차례는 ★아래 names 의 차례와 «같아야» 합니다 (2026-08-04 대표님 지시).
    //    names 가 결혼 → 출산 → 이사 이므로 제목도 그렇게 씁니다.
    //    ★names 를 바꾸시거든 이 제목도 «함께» 바꾸십시오.
    key: 'timing', icon: '🎯', title: '결혼, 출산, 이사 택일',
    // ⛔ 2026-08-04 (45부) — 「합격운/취업운」을 뺐습니다. 소개 글도 함께 고칩니다.
    //   ⚠️ 여기만 빼고 page.tsx 의 SERVICES 를 그대로 두면 «묶이지 않은 채» 남습니다.
    desc: '좋은 날 잡기',
    names: ['결혼택일', '출산택일', '이사택일'],
  },
  {
    // ★2026-08-01 (43부 13차) — 이름 두 가지를 한 갈래로 (대표님 지시)
    //   ⚠️ 「특화 목적 & 타이밍」과 «같은 모양» 의 폴더입니다 — 따로 만들지 않았습니다.
    key: 'naming', icon: '✍️', title: '개명 & 작명하기',
    desc: '내 이름 분석부터 아기 명품작명까지',
    names: ['내 이름 정밀분석', '내 아이 명품작명'],
  },
  { key: 'life', icon: '📅', title: '오늘의 라이프', desc: '오늘의 카드 한 장', names: ['타로'] },
  // ★2026-08-01 (43부 4차) — «궁합 & 기타» 갈래를 «없앴습니다».
  //   궁합·내이름 감정이 SOLO 로 나가면서 남는 것이 없어졌습니다.
  //   ⚠️ 빈 갈래를 두면 아래 `if (!list.length) return null` 로 조용히 사라져
  //      「왜 안 뜨지」를 찾게 됩니다. 아예 지웁니다.
]

export default function ServiceSection({
  services, pinned, pinMsg, maxPins, onTogglePin, onOpen,
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(ALWAYS_OPEN.map(k => [k, true])),
  )

  const byName = new Map(services.map(s => [s.name, s]))
  const pinnedSvcs = pinned.map(n => byName.get(n)).filter((s): s is HomeService => !!s)
  const best = BEST_NAMES.map(n => byName.get(n)).filter((s): s is HomeService => !!s)

  /** ★낱장 카드 — 차례는 SOLO_NAMES 그대로입니다 */
  const solo = SOLO_NAMES.map(n => byName.get(n)).filter((s): s is HomeService => !!s)

  // ── 안전망 — GROUPS 에 못 적은 서비스가 있어도 사라지지 않게 ──
  //   ⚠️ SOLO 도 «자리를 잡은» 것으로 셉니다. 안 세면 낱장으로도 뜨고
  //      「그 밖의 서비스」에도 뜨어 같은 카드가 두 번 나옵니다.
  const placed = new Set<string>([...BEST_NAMES, ...SOLO_NAMES, ...GROUPS.flatMap(g => g.names)])
  const orphans = services.filter(s => !placed.has(s.name))
  const groups: Group[] = orphans.length
    ? [...GROUPS, {
        key: 'orphan', icon: '🗂️', title: '그 밖의 서비스',
        desc: 'GROUPS 에 갈래를 적어 주세요', names: orphans.map(s => s.name),
      }]
    : GROUPS

  /** 아이콘 — 아주 연한 모노톤 둥근 타일 위에 3D 이모지만 */
  const Tile = ({ icon, size = 42, bg = C.iconBg }: { icon: string; size?: number; bg?: string }) => (
    <span
      className="svcTile"
      style={{
        width: size, height: size, borderRadius: size * 0.34,
        background: bg, border: `1px solid ${C.iconEdge}`,
        fontSize: Math.round(size * 0.55),
      }}
    >{icon}</span>
  )

  // ★2026-08-04 (45부) — small 을 더했습니다. ⚠️ 안 넘기면 «예전 그대로» 입니다.
  //   다른 화면(낱장·BEST·메인)은 하나도 안 바뀝니다.
  const Pin = ({ name, small = false }: { name: string; small?: boolean }) => {
    const on = pinned.includes(name)
    return (
      <button
        className="svcPin"
        onClick={() => onTogglePin(name)}
        aria-label={on ? `${name} 고정 해제` : `${name} 고정`}
        aria-pressed={on}
        style={{
          width: small ? 26 : 32, height: small ? 26 : 32,
          border: 'none', background: 'none', cursor: 'pointer',
          fontSize: small ? 12 : 15,
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: on ? 'none' : 'grayscale(1)', opacity: on ? 1 : 0.28,
          transform: on ? 'scale(1.05)' : 'none',
        }}
      >📌</button>
    )
  }

  /** 순백 카드 — 목록의 기본 단위 */
  const cardStyle = (pinnedOn: boolean): React.CSSProperties => ({
    background: C.white,
    border: `1.5px solid ${C.border}`,
    borderRadius: 16,
    boxShadow: pinnedOn ? C.shadowUp : C.shadow,
    overflow: 'hidden',
  })

  return (
    <div style={{ padding: '6px 0 20px' }}>
      <style>{`
        /* 쫀득하게 눌리는 미크로 인터랙션 — active:scale-[0.98] */
        .svcTap { transition: transform 0.16s cubic-bezier(0.34,1.4,0.64,1), background 0.14s ease; }
        .svcTap:active { transform: scale(0.98); }
        .svcRow:active { background: #f8fafc; }
        .svcTile {
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; line-height: 1;
        }
        .svcHead:focus-visible, .svcRow:focus-visible, .svcBest:focus-visible,
        .svcChip:focus-visible, .svcPin:focus-visible {
          outline: 2px solid #a5b4fc; outline-offset: 2px;
        }
        .svcChev { transition: transform 0.18s ease; }
        @media (prefers-reduced-motion: reduce) {
          .svcTap, .svcChev { transition: none; }
        }
      `}</style>

      {/* ── 영역 제목 ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 11, padding: '0 16px',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.3px' }}>
          MyungCafe 서비스
        </span>
        {pinnedSvcs.length > 0 && (
          <span style={{ fontSize: 11, color: C.sub }}>📌 {pinnedSvcs.length}/{maxPins}</span>
        )}
      </div>

      {pinMsg && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#e11d48', marginBottom: 8 }}>{pinMsg}</div>
      )}

      {/* ═══ ① BEST ═══ */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
          <span style={{ fontSize: 12 }}>🔥</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, letterSpacing: '-0.2px' }}>
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
                className="svcTap svcBest"
                onClick={() => onOpen(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '16px 15px', borderRadius: 18,
                  // ★진짜 그라데이션 테두리 — 안쪽은 배경, 바깥쪽은 테두리
                  background: t.bg,
                  border: '1.5px solid transparent',
                  boxShadow: t.glow,
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                <Tile icon={s.icon} size={52} bg={t.iconBg} />
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: C.text, letterSpacing: '-0.3px' }}>
                      {s.name}
                    </span>
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, color: '#fff', background: t.badge,
                      padding: '2px 7px', borderRadius: 20, letterSpacing: '0.3px',
                    }}>BEST</span>
                  </span>
                  <span style={{ fontSize: 11.5, color: C.sub, lineHeight: 1.45 }}>
                    {BEST_COPY[s.name] ?? s.sub}
                  </span>
                </span>
                <span style={{ fontSize: 16, color: t.arrow, flexShrink: 0 }}>›</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ ② 고정한 서비스 ═══ */}
      {pinnedSvcs.length > 0 && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 7, fontWeight: 600 }}>
            📌 고정한 서비스
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {pinnedSvcs.map((s) => (
              <button
                key={s.name}
                className="svcTap svcChip"
                onClick={() => onOpen(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px 8px 10px', borderRadius: 20, cursor: 'pointer',
                  background: C.white, border: `1.5px solid ${C.border}`, boxShadow: C.shadow,
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{s.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ③ 전체 서비스 — 카드를 낱장으로 띄운다 ═══
          ★한 통에 담고 선으로 나누던 것을 버렸습니다.
            카드 사이의 빈틈이 곧 갈래 경계라 「타로가 앞 묶음에 붙어 보인다」는
            문제가 구조적으로 사라집니다. */}
      <div style={{ padding: '17px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
          <span style={{ fontSize: 12 }}>📂</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>전체 서비스</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ══════════════════════════════════════════════════════
              ★낱장 카드 — 폴더를 «열지 않고» 한 번에 들어갑니다 (43부 4차)
                궁합 · 내 이름 정밀분석 · 내 아이 명품작명
              ⚠️ 폴더가 아니므로 개수 배지도 여닫이 화살표도 없습니다.
                 «누르면 바로 간다» 는 것이 모양으로도 보여야 합니다.
              ⚠️ 압핀(📌)은 그대로 답니다 — 회원 설정을 말없이 없애면 안 됩니다.
              ══════════════════════════════════════════════════════ */}
          {solo.map((s) => (
            <div key={s.name} style={{
              ...cardStyle(pinned.includes(s.name)),
              display: 'flex', alignItems: 'center', gap: 11, padding: '13px 13px',
            }}>
              <button
                className="svcTap svcRow"
                onClick={() => onOpen(s)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 11,
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', padding: 0, minWidth: 0, borderRadius: 12,
                }}
              >
                <Tile icon={s.icon} size={44} />
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: C.text, letterSpacing: '-0.2px' }}>
                    {s.name}
                  </span>
                  <span style={{ fontSize: 11, color: C.sub }}>{SOLO_COPY[s.name] ?? s.sub}</span>
                </span>
                <span style={{ fontSize: 15, color: C.text, flexShrink: 0 }}>›</span>
              </button>
              <Pin name={s.name} />
            </div>
          ))}

          {groups.map((g) => {
            const list = g.names.map(n => byName.get(n)).filter((s): s is HomeService => !!s)
            if (!list.length) return null
            const isOpen = !!open[g.key]

            // ── 갈래에 하나뿐이면 여닫이 없이 바로 들어가는 카드 ──
            if (list.length === 1) {
              const s = list[0]
              return (
                <div key={g.key} style={{
                  ...cardStyle(pinned.includes(s.name)),
                  display: 'flex', alignItems: 'center', gap: 11, padding: '13px 13px',
                }}>
                  <button
                    className="svcTap svcRow"
                    onClick={() => onOpen(s)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 11,
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', padding: 0, minWidth: 0, borderRadius: 12,
                    }}
                  >
                    <Tile icon={s.icon} size={44} />
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 700, color: C.text, letterSpacing: '-0.2px' }}>
                          {s.name}
                        </span>
                        {/* 어느 묶음인지 작게 남긴다 */}
                        <span style={{ fontSize: 10, opacity: 0.45 }}>{g.icon}</span>
                      </span>
                      <span style={{ fontSize: 11, color: C.sub }}>{s.sub}</span>
                    </span>
                    <span style={{ fontSize: 15, color: C.text, flexShrink: 0 }}>›</span>
                  </button>
                  <Pin name={s.name} />
                </div>
              )
            }

            return (
              <div key={g.key} style={cardStyle(false)}>
                <button
                  className="svcTap svcHead"
                  onClick={() => setOpen(o => ({ ...o, [g.key]: !o[g.key] }))}
                  aria-expanded={isOpen}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                    padding: '14px 13px', background: 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Tile icon={g.icon} size={44} />
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: C.text, letterSpacing: '-0.2px' }}>
                        {g.title}
                      </span>
                      <span style={{
                        fontSize: 10, color: C.sub, background: C.iconBg,
                        border: `1.5px solid ${C.border}`,
                        padding: '1px 7px', borderRadius: 20, fontWeight: 600,
                      }}>{list.length}</span>
                    </span>
                    <span style={{ fontSize: 11, color: C.sub }}>{g.desc}</span>
                  </span>
                  <span
                    className="svcChev"
                    style={{
                      fontSize: 11, color: C.faint, flexShrink: 0,
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}
                  >▼</span>
                </button>

                {/* ★2026-07-29 (4차) — 접히는 구간 안쪽도 **낱장 카드**로 바꿨습니다.
                    전에는 선 하나로만 나뉘어 있어, 열었을 때 안쪽 항목들이
                    경계 없이 이어져 보였습니다. 이제 항목마다 테두리가 있습니다.
                    바닥(well)을 살짝 눌러 안쪽 카드가 떠 보이게 했습니다.

                    ★2026-08-04 (45부 · 대표님 지시) — 서브 버튼을 «작게» 했습니다.
                      [까닭] 메인 카드와 크기·굵기가 «같아» 계층이 안 보였습니다.
                      너비 92% + 가운데 · 여백 축소 · 아이콘 40→28 · 제목 14→12
                      바탕은 순백보다 «한 톤 연하게», 테두리는 «더 옅게».
                    ⚠️ 설명 글자는 ★11 «그대로» 둡니다 — 10 으로 내리면 작은 화면에서
                       읽기 어렵습니다. 대신 «색을 옅게» 해서 뒤로 물립니다.
                    ⚠️ 높이가 약 56 → 44 가 됩니다. ★44 는 손가락으로 누를 «최소선» 입니다.
                       더 줄이지 «마십시오» — 어르신 손님이 못 누릅니다.
                    ⚠️ 메인 카드(위 머리 버튼)는 ★하나도 안 건드렸습니다. */}
                {isOpen && (
                  <div style={{
                    background: C.well,
                    borderTop: `1.5px solid ${C.border}`,
                    padding: '9px 9px 10px',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    {list.map((s) => (
                      <div
                        key={s.name}
                        style={{
                          // ★서브임이 한눈에 보이도록 «좁게 + 가운데»
                          width: '92%', margin: '0 auto',
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 9px',
                          borderRadius: 11,
                          // ★순백(메인)보다 «한 톤 연하게» — 바닥과 메인 사이에 놓습니다
                          background: C.subCard,
                          border: `1px solid ${C.borderSub}`,
                          boxShadow: pinned.includes(s.name) ? C.shadowUp : C.shadow,
                        }}
                      >
                        <button
                          className="svcTap svcRow"
                          onClick={() => onOpen(s)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                            background: 'none', border: 'none', cursor: 'pointer',
                            textAlign: 'left', padding: 0, minWidth: 0, borderRadius: 10,
                          }}
                        >
                          <Tile icon={s.icon} size={28} />
                          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12, color: C.text, fontWeight: 600, letterSpacing: '-0.2px' }}>
                              {s.name}
                            </span>
                            {/* ⚠️ 11 «그대로» — 10 으로 내리지 마십시오 (읽기 어려워집니다) */}
                            <span style={{ fontSize: 11, color: C.faint }}>{s.sub}</span>
                          </span>
                          <span style={{ fontSize: 11, color: C.sub, flexShrink: 0 }}>›</span>
                        </button>
                        <Pin name={s.name} small />
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
