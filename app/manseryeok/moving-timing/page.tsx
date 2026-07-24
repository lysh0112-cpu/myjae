'use client'

/**
 * 이사택일 입구 — 갈래 선택
 * ─────────────────────────────────────────────
 * 진입: input(두 사람 + 명의 + 방향) → 여기
 * 흐름: [좋은 날 찾기] → find (기간 입력) → pick (날짜 목록)
 *       [정한 날 봐주기] → check (1~3개 진단)
 *
 * 결혼택일 page.tsx 와 같은 구조.
 *
 * ★들어온 조건(p1·p2·명의·방향)을 그대로 다음 화면에 넘긴다.
 *   여기서 성별로 순서를 바꾸지 않는다 — 이사택일의 역할은 계약자·배우자이고
 *   성별과 무관하므로 p1 은 항상 계약자다.
 */

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const line = '#EAE0CE'
const ink = '#3A3228'
const sub = '#9A8060'

const HOUR_LABELS: Record<string, string> = {
  '-1': '시간 모름', '모름': '시간 모름',
  '0': '子시(23:30~01:30)', '1': '丑시(01:30~03:30)', '2': '寅시(03:30~05:30)',
  '3': '卯시(05:30~07:30)', '4': '辰시(07:30~09:30)', '5': '巳시(09:30~11:30)',
  '6': '午시(11:30~13:30)', '7': '未시(13:30~15:30)', '8': '申시(15:30~17:30)',
  '9': '酉시(17:30~19:30)', '10': '戌시(19:30~21:30)', '11': '亥시(21:30~23:30)',
}

interface PersonInput {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string; name?: string
}

function summary(p: PersonInput | null): string {
  if (!p || !p.year) return '정보 없음'
  const hour = HOUR_LABELS[p.hour] ?? '시간 모름'
  return `${p.gender} · ${p.calType} ${p.year}.${p.month}.${p.day} · ${hour}`
}

function MenuInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const parse = (key: string): PersonInput | null => {
    try {
      const raw = sp.get(key)
      return raw ? JSON.parse(decodeURIComponent(raw)) as PersonInput : null
    } catch { return null }
  }

  const contractor = parse('p1')
  const spouse = parse('p2')
  const ownerMode = sp.get('owner') === 'single' ? 'single' : 'joint'
  const ownerWho = sp.get('who') === 'spouse' ? 'spouse' : 'contractor'
  const direction = sp.get('dir')

  const query = sp.toString()

  const go = (path: string) => {
    router.push(`/manseryeok/moving-timing/${path}${query ? '?' + query : ''}`)
  }

  const ownerText = ownerMode === 'joint'
    ? '공동명의'
    : `단독명의 · ${ownerWho === 'spouse' ? (spouse?.name ?? '배우자') : (contractor?.name ?? '계약자')}`

  const card = (title: string, desc: string, path: string) => (
    <button
      onClick={() => go(path)}
      style={{
        display: 'block', width: '100%', background: '#FFFDF9',
        border: `1px solid ${line}`, borderRadius: 14,
        padding: '19px 18px', marginBottom: 11, cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5,
      }}>
        <span style={{ fontSize: 15.5, fontWeight: 700, color: ink, letterSpacing: '-.3px' }}>
          {title}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 15, color: '#C0AC90' }}>›</span>
      </div>
      <div style={{ fontSize: 12.5, color: sub, lineHeight: 1.75 }}>{desc}</div>
    </button>
  )

  return (
    <main style={{
      minHeight: '100vh', background: '#FBF8F2', maxWidth: 480,
      margin: '0 auto', paddingBottom: 40,
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(251,248,242,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${line}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => router.push('/manseryeok/moving-timing/input')}
          style={{
            background: 'none', border: 'none', color: '#7A6440',
            fontSize: 17, cursor: 'pointer', padding: 0,
          }}
        >←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>이사택일</div>
          <div style={{ fontSize: 10.5, color: '#7A6440' }}>무엇을 도와드릴까요?</div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 0' }}>

        {/* 들어온 조건 요약 */}
        <div style={{
          background: '#F5F0E4', borderRadius: 12, padding: '13px 15px', marginBottom: 18,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7A6440', marginBottom: 8 }}>
            봐드릴 조건
          </div>
          <div style={{ fontSize: 12, color: sub, lineHeight: 1.9 }}>
            <div>
              <b style={{ color: ink }}>계약자</b> {contractor?.name ? `${contractor.name} · ` : ''}
              {summary(contractor)}
            </div>
            {spouse && (
              <div>
                <b style={{ color: ink }}>배우자</b> {spouse.name ? `${spouse.name} · ` : ''}
                {summary(spouse)}
              </div>
            )}
            <div style={{ marginTop: 4, color: '#7A6440' }}>
              {ownerText}
              {direction && ` · ${direction}쪽으로 이사`}
            </div>
          </div>
        </div>

        {card(
          '좋은 날 찾기',
          '기간을 알려주시면 그 안에서 이사하기 좋은 날을 모두 찾아 드려요.',
          'find',
        )}
        {card(
          '정한 날 봐주기',
          '이미 생각해 두신 날이 있으면 최대 세 개까지 하나씩 봐드려요.',
          'check',
        )}

        <div style={{
          fontSize: 11.5, color: '#BFAE96', lineHeight: 1.8, marginTop: 14, paddingLeft: 2,
        }}>
          두 갈래 모두 명절·공망·충·형 네 가지를 먼저 확인해요.
          손 없는 날은 켜고 끄실 수 있어요.
        </div>
      </div>
    </main>
  )
}

export default function MovingMenuPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: sub }}>불러오는 중…</div>}>
      <MenuInner />
    </Suspense>
  )
}
