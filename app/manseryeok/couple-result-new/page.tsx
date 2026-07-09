'use client'

/**
 * 궁합 결과 (새 버전 · 완전 껍데기)
 * ─────────────────────────────────────────────
 * 화면 구조만 확정한다. 점수·명식·통변 전부 "가짜 고정값".
 * 나중에 붙일 계산은 [TODO] 주석으로 자리를 표시해 둠.
 *
 * 구조(대표님 확정 목업):
 *   ① 상단 궁합점수(핑크 박스) + 관계라벨
 *   ② 두 사람 정보 + 하트  ← CoupleWonguk 안에 포함
 *   ③ CoupleWonguk (나란히 명식, 좌4+우4)
 *   ④ 통변 카드 (해설 자리)
 *
 * mode: couple(연인) | married(부부)
 */

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CoupleWonguk from '@/app/manseryeok/couple-result/components/CoupleWonguk'

type Mode = 'couple' | 'married'

const MODE_INFO: Record<Mode, { label: string; accent: string }> = {
  couple:  { label: '연인 궁합', accent: '#c85a8c' },
  married: { label: '부부 궁합', accent: '#c85a6e' },
}

// ── 가짜 명식 (껍데기용 고정 예시) ──────────────
// [TODO] 나중에 buildSajuPillars(person1) 결과로 교체
const DUMMY_SAJU_1 = [
  { pillar: '시주', stem: '壬', branch: '寅' },
  { pillar: '일주', stem: '壬', branch: '子' },
  { pillar: '월주', stem: '壬', branch: '子' },
  { pillar: '연주', stem: '丁', branch: '丑' },
]
const DUMMY_SAJU_2 = [
  { pillar: '시주', stem: '庚', branch: '午' },
  { pillar: '일주', stem: '己', branch: '酉' },
  { pillar: '월주', stem: '辛', branch: '巳' },
  { pillar: '연주', stem: '乙', branch: '亥' },
]

function fmtBirth(p: Record<string, string>): string {
  if (!p.year) return ''
  return `${p.year}.${p.month}.${p.day}`
}

function CoupleResultInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') === 'married' ? 'married' : 'couple') as Mode
  const info = MODE_INFO[mode]

  const parse = (key: string): Record<string, string> => {
    try { return JSON.parse(decodeURIComponent(searchParams.get(key) || '{}')) } catch { return {} }
  }
  const person1 = parse('person1')
  const person2 = parse('person2')

  const name1 = person1.name || '첫 번째'
  const name2 = person2.name || '두 번째'

  // [TODO] 점수: calcCoupleScore(person1, person2, mode) 로 교체
  const dummyScore = 78
  // [TODO] 관계 카피: 물상 기반 문장 생성으로 교체
  const dummyHeadline = `${name1}님과 ${name2}님, 두 사람의 만남`
  const dummyRelLabel = mode === 'couple' ? '서로를 채우는 인연' : '오래 함께할 사이'

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      {/* 밝은 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>{info.label} 결과</div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#c8783c', background: '#f9ebe0', borderRadius: 99, padding: '2px 10px' }}>
          껍데기 · 계산 예정
        </div>
      </div>

      <div style={{ padding: '16px 14px' }}>
        {/* ① 궁합점수 + 관계라벨 */}
        <div style={{ background: info.accent, borderRadius: 14, padding: '18px 16px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginBottom: 8 }}>{dummyHeadlineSafe(dummyHeadline)}</div>
          <div style={{ fontSize: 46, fontWeight: 500, color: '#fff', lineHeight: 1 }}>{dummyScore}</div>
          <div style={{ display: 'inline-block', fontSize: 11, color: info.accent, background: '#fff', borderRadius: 99, padding: '2px 13px', marginTop: 9 }}>
            {dummyRelLabel}
          </div>
        </div>

        {/* ②③ 두 사람 정보 + 나란히 명식 (CoupleWonguk) */}
        <CoupleWonguk
          left={{ name: name1, birth: fmtBirth(person1), isMe: person1.isMe === 'true' || person1.isMe === '1', saju: DUMMY_SAJU_1 }}
          right={{ name: name2, birth: fmtBirth(person2), saju: DUMMY_SAJU_2 }}
        />

        {/* ④ 통변 카드 (해설 자리) */}
        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: 14, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ color: '#c8783c' }}>✦</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#96502e' }}>두 사람의 궁합 이야기</span>
          </div>
          {/* [TODO] /api/tongbyeon 스트리밍 통변으로 교체 (사주 통변과 동일 방식) */}
          <div style={{ fontSize: 12.5, color: '#b4785a', lineHeight: 1.8, background: '#FDF6F0', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
            여기에 두 사람의 궁합 해설이 들어갈 자리예요.<br />
            (계산·통변은 다음 단계에서 붙입니다)
          </div>
        </div>

        {/* 저장/다시보기 자리 [TODO] saju_records 저장 + 보관함 연결 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={{ flex: 1, background: '#fff', border: '0.5px solid #e0c9b8', borderRadius: 11, padding: 12, fontSize: 13, color: '#96502e', cursor: 'pointer' }}>
            보관함에 저장
          </button>
          <button onClick={() => router.push(`/manseryeok/couple-input-new?mode=${mode}`)}
            style={{ flex: 1, background: '#b46e46', border: 'none', borderRadius: 11, padding: 12, fontSize: 13, color: '#fff', cursor: 'pointer' }}>
            다른 궁합 보기
          </button>
        </div>
      </div>
    </main>
  )
}

// 이름이 비었을 때 카피가 어색해지지 않게 방어
function dummyHeadlineSafe(s: string): string {
  return s.replace('undefined', '').replace('님과 님', '두 사람')
}

export default function CoupleResultNewPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <CoupleResultInner />
    </Suspense>
  )
}
