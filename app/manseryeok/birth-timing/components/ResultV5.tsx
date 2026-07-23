'use client'
// app/manseryeok/birth-timing/components/ResultV5.tsx
//
// ★ 출산택일 v5 결과 화면 (설계안 §7 · 목업 반영)
//   날짜 카드마다: 별점(대표시각 기준) + 좋은 시간 여러 개 버튼.
//   시간 버튼을 누르면 → 그 시각의 모달(원국표·공망·해설·오행·대운).
//   점수·등급 숫자는 감춤(교훈 A).

import { useState, useRef } from 'react'
import type { DayRecommendation, HourPick } from '../lib/recommendV5'
import { toStarLines } from '../lib/starMapV5'
import SajuWonguk from '@/app/manseryeok/result-new/SajuWonguk'
import UnTable from '@/app/manseryeok/result-new/UnTable'
import { getGongmang } from '@/lib/saju/gongmang'
import { getUnsung } from '@/lib/saju/unsung'
import type { DayunItem } from '@/lib/saju/dayun'

interface AiNote { oneLine: string; detail?: string }

const C = {
  bg: '#fbf6ef', card: '#fffdfa', cardGold: '#fffaf2',
  text: '#4a3728', sub: '#9b8574', gold: '#c8963e',
  line: '#f0e0d5', lineGold: '#f0d5b8', accent: '#96502e', rose: '#b45a78',
}

const GRADE_COLOR: Record<string, string> = {
  결핍: '#c85a5a', 약함: '#c8963e', 발달: '#5a9e6f', 과다: '#c85a5a',
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ letterSpacing: '1px', fontSize: '13px', color: C.gold }}>
      {'★'.repeat(n)}<span style={{ color: '#e6d5c4' }}>{'☆'.repeat(5 - n)}</span>
    </span>
  )
}

function rankBadge(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
}

// "연 월 일 시" → SajuWonguk용 Pillar[](시→일→월→연)
function parseToWonguk(saju: string): { pillar: string; stem: string; branch: string }[] {
  const parts = saju.trim().split(/\s+/)
  if (parts.length < 4) return []
  const [yr, mo, dy, hr] = parts
  const mk = (g: string, name: string) => ({ pillar: name, stem: g[0] ?? '', branch: g[1] ?? '' })
  return [mk(hr, '시주'), mk(dy, '일주'), mk(mo, '월주'), mk(yr, '년주')]
}

// 날짜 카드: 대표시각 별점 + 시간 버튼들
function DayCard({ day, note, onOpenHour }: {
  day: DayRecommendation
  note?: AiNote
  onOpenHour: (day: DayRecommendation, h: HourPick) => void
}) {
  const top = day.rank === 1
  const rep = day.hours[0]
  if (!rep) return null

  if (rep.needExpert) {
    return (
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.line}`, marginBottom: 14, padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>{rankBadge(day.rank)}</span>
          <span style={{ fontSize: 15, color: C.text, fontWeight: 700 }}>{day.dateLabel}</span>
        </div>
        <div style={{ fontSize: 12, color: C.accent, lineHeight: 1.6 }}>
          이 아기 사주는 특수한 구성이라, 정확한 건 전문가 상담을 권해요.
        </div>
      </div>
    )
  }

  const stars = toStarLines(rep.breakdown, rep.dayunScore)

  return (
    <div style={{
      background: top ? C.cardGold : C.card,
      borderRadius: 14, border: `1.5px solid ${top ? C.lineGold : C.line}`,
      marginBottom: 14, padding: 16,
    }}>
      {/* 날짜 + 순위 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>{rankBadge(day.rank)}</span>
          <span style={{ fontSize: 15, color: C.text, fontWeight: 700 }}>{day.dateLabel}</span>
        </div>
        <span style={{ fontSize: 11, color: C.rose, background: '#f7e6ec', borderRadius: 20, padding: '3px 10px' }}>
          {day.rank}순위
        </span>
      </div>

      {/* 별점 3줄 (대표시각) — 가로 배치 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginBottom: 12 }}>
        {stars.map((s) => (
          <span key={s.label} style={{ fontSize: 12, color: C.accent, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {s.label} <Stars n={s.stars} />
          </span>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.sub, marginBottom: 8 }}>
        눌러서 자세히 보기
      </div>

      {/* 좋은 시간 버튼들 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {day.hours.map((h) => (
          <button
            key={h.hourIdx}
            onClick={() => onOpenHour(day, h)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: '#fdf3e9', border: `1px solid ${C.lineGold}`, borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <span style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{h.hourLabel}</span>
            <span style={{ fontSize: 13, color: C.gold }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function DetailModal({ day, hour, note, onClose, onViewSaju }: {
  day: DayRecommendation
  hour: HourPick
  note?: AiNote
  onClose: () => void
  onViewSaju?: (day: DayRecommendation, h: HourPick) => void
}) {
  const stars = toStarLines(hour.breakdown, hour.dayunScore)
  const pillars = parseToWonguk(hour.saju)
  const dayStem = pillars.find(p => p.pillar === '일주')?.stem ?? ''
  const iljji = pillars.find(p => p.pillar === '일주')?.branch ?? ''
  const yeonjji = pillars.find(p => p.pillar === '년주')?.branch ?? ''
  const [gm1, gm2] = dayStem && iljji ? getGongmang(dayStem, iljji) : ['', '']
  const grade = hour.breakdown.elementGrade
  const els = ['목', '화', '토', '금', '수']

  // 카드 캡처용 (mulsang 사주그림과 같은 html-to-image 방식)
  const captureRef = useRef<HTMLDivElement | null>(null)
  const [sharing, setSharing] = useState(false)

  async function handleShareCard() {
    const node = captureRef.current
    if (!node || sharing) return
    setSharing(true)
    try {
      const { toPng } = await import('html-to-image')
      const png = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: C.card })
      const fileName = `명카페_출산택일_${day.dateLabel.replace(/[^0-9가-힣]/g, '')}.png`
      // 바로 이미지 파일로 저장(다운로드). 저장한 파일을 카톡 등에 직접 첨부해 보내면 된다.
      //   (공유 시트는 PC에서 카톡 전송이 잘 안 돼 혼란을 줘서 제거함)
      const a = document.createElement('a')
      a.href = png; a.download = fileName
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch (e) {
      console.error('카드 저장 실패:', e)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(40,28,18,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.card, borderRadius: 16, padding: 20, maxWidth: 380, width: '100%', maxHeight: '86vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.sub, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div ref={captureRef} style={{ background: C.card, padding: '4px 2px' }}>
        {/* 면책 안내 — 맨 위. 캡처 영역 안이라 카톡 공유 이미지에도 함께 담긴다. */}
        <div style={{
          background: '#fbe3d8', border: '1px solid #e8b79f', borderRadius: 10,
          padding: '11px 13px', fontSize: 11.5, fontWeight: 700, color: '#9a4a30',
          lineHeight: 1.6, marginBottom: 12,
        }}>
          ※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 출산일·수술일 결정은 산모와 아기의 건강을 최우선으로, 반드시 담당 산부인과 전문의와 상의해 결정하세요.
        </div>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{day.dateLabel}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{hour.hourLabel}</div>
        </div>

        {note?.oneLine && (
          <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, lineHeight: 1.5, margin: '10px 0 14px' }}>
            &ldquo;{note.oneLine}&rdquo;
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginBottom: 16 }}>
          {stars.map((s) => (
            <span key={s.label} style={{ fontSize: 12, color: C.accent, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {s.label} <Stars n={s.stars} />
            </span>
          ))}
        </div>

        {pillars.length === 4 && (
          <div style={{ margin: '0 -4px 8px', overflowX: 'auto' }}>
            <SajuWonguk saju={pillars} dayStem={dayStem} yeonjji={yeonjji} iljji={iljji} gm1={gm1} gm2={gm2} />
          </div>
        )}

        {/* 대운표 — 원국 아래. UnTable 공용 부품 재사용(가로 스크롤). */}
        {day.dayunList && day.dayunList.length > 0 && (
          <div style={{ margin: '0 -8px 14px' }}>
            <UnTable
              title="대운"
              badge="10년마다 바뀌는 큰 흐름"
              items={day.dayunList.map((du: DayunItem) => ({
                label: `${du.age}세`,
                stem: du.cheongan,
                branch: du.jiji,
                stemSipsin: du.ganYukchin,
                branchSipsin: du.jiYukchin,
                unsung: getUnsung(dayStem, du.jiji),
              }))}
            />
            <div style={{ fontSize: 10, color: C.sub, margin: '4px 8px 0' }}>← 옆으로 밀면 노년까지 볼 수 있어요</div>
          </div>
        )}

        {note?.detail && (
          <div style={{ background: C.cardGold, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.gold, marginBottom: 5 }}>이 아이는</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{note.detail}</div>
          </div>
        )}

        {hour.dayunNote && (
          <div style={{ background: '#f2f6f8', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#5a8ba0', marginBottom: 5 }}>대운 흐름</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>🌊 {hour.dayunNote}</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.gold, marginBottom: 6 }}>오행 분포</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {els.map((e) => (
              <div key={e} style={{ flex: 1, textAlign: 'center', background: '#faf5ee', borderRadius: 8, padding: '8px 0' }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{e}</div>
                <div style={{ fontSize: 10, color: GRADE_COLOR[grade[e]] ?? C.sub, marginTop: 2 }}>{grade[e]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 카드 하단 로고 (캡처 이미지에 들어감) */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>🌸 명카페</span>
          <span style={{ fontSize: 10, color: C.sub, marginLeft: 6 }}>전통 사주명리 출산택일</span>
        </div>
        </div>{/* ← captureRef 끝 */}

        {/* 카톡 공유 (사주그림과 같은 방식: 이 카드를 이미지로) */}
        <button
          onClick={handleShareCard}
          disabled={sharing}
          style={{ width: '100%', padding: 13, borderRadius: 11, border: `1px solid ${C.lineGold}`, background: '#fdf3e9', color: C.accent, fontSize: 13, fontWeight: 600, cursor: sharing ? 'default' : 'pointer', marginBottom: 6, marginTop: 6 }}
        >
          {sharing ? '이미지 만드는 중…' : '🖼 이미지로 저장하기'}
        </button>
        <div style={{ fontSize: 10, color: C.sub, textAlign: 'center', marginBottom: 6 }}>
          저장한 이미지를 카톡·문자에 첨부해 보낼 수 있어요
        </div>

        <button
          onClick={() => onViewSaju?.(day, hour)}
          style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', background: C.rose, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 6 }}
        >
          이 아이 사주 자세히 보기
        </button>
        <div style={{ fontSize: 10, color: C.sub, textAlign: 'center', marginBottom: 10 }}>
          십신 해설·대운·용신까지 상세 풀이는 사주보기에서 (결제)
        </div>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: 12, borderRadius: 11, border: `1px solid ${C.line}`, background: '#fff', color: C.sub, fontSize: 13, cursor: 'pointer' }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}

export default function ResultV5({
  recommendations,
  aiNotes,
  onViewSaju,
}: {
  recommendations: DayRecommendation[]
  aiNotes?: Record<number, AiNote>
  onViewSaju?: (day: DayRecommendation, h: HourPick) => void
}) {
  const [open, setOpen] = useState<{ day: DayRecommendation; hour: HourPick } | null>(null)

  if (recommendations.length === 0) {
    return (
      <div style={{ background: C.bg, borderRadius: 12, padding: 20, textAlign: 'center', color: C.sub, fontSize: 13 }}>
        조건에 맞는 평일이 없어요. 예정일 범위를 넓혀 다시 시도해 주세요.
      </div>
    )
  }

  return (
    <div style={{ background: C.bg, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 4 }}>
        예정일 전 3주 중, 평일에서 고른 좋은 날·시간이에요
      </div>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>
        타고난 사주(원국)를 봅니다. 인생의 운은 살면서 정해져요.
      </div>

      {recommendations.map((day) => (
        <DayCard
          key={`${day.dateKey}-${day.rank}`}
          day={day}
          note={aiNotes?.[day.rank]}
          onOpenHour={(d, h) => setOpen({ day: d, hour: h })}
        />
      ))}

      {open && (
        <DetailModal
          day={open.day}
          hour={open.hour}
          note={aiNotes?.[open.day.rank]}
          onClose={() => setOpen(null)}
          onViewSaju={onViewSaju}
        />
      )}
    </div>
  )
}
