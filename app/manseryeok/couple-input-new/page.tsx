'use client'

/**
 * 궁합 입력 (새 버전 · 껍데기)
 * ─────────────────────────────────────────────
 * 방식① : 두 사람 슬롯 2칸 → 칸을 누르면 PersonPickerModal(나 / 가족·지인 / 새 입력)
 * mode  : couple(연인) | married(부부)  — 홈에서 ?mode= 로 들어옴
 *   · 연인(couple) : 슬롯 채운 뒤 각자 [직업]·[MBTI] 추가 입력  (직업=점수용, MBTI=통변용)
 *   · 부부(married): 직업·MBTI 없음. 슬롯만 채우면 끝.
 *
 * ※ 계산은 하지 않는다. 두 사람 사주정보를 URL(person1/person2)에 실어
 *   couple-result 로 넘기기만 한다. 저장(saju_records)·점수·통변은 나중에 붙임.
 *
 * 재사용(이미 배포된 검증 부품):
 *   PersonPickerModal (나+가족지인+새입력) / JobSelect / MbtiInput / SavedPerson·toResultQuery
 */

import { Suspense, useState } from 'react'
import { coupleKindOfPair, coupleTitleOf } from '@/lib/saju/coupleRelation'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import type { SavedPerson, SavedInputData } from '@/lib/saju/savedPeople'

type Mode = 'couple' | 'married'

const MODE_INFO: Record<Mode, { title: string; sub: string; accent: string }> = {
  couple:  { title: '연인 궁합', sub: '두 사람의 사주로 인연을 봐요', accent: '#c85a8c' },
  married: { title: '부부 궁합', sub: '더 깊이 이해하고 더 행복하게', accent: '#c85a6e' },
}

// 슬롯 한 칸이 담는 사람 (나 / 저장된 사람 / 새로 입력한 사람)
interface Slot {
  name: string
  input: SavedInputData
  isMe: boolean
  /** ★2026-07-24 — 관계로 부부/연인을 가른다. (메뉴 통합)
      본인('나')은 비어 있고, 상대 쪽에만 값이 붙는다. */
  relation?: string
}

function CoupleInputInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // ★2026-07-24 — 메뉴를 하나로 합쳤다. URL 의 mode 는 더 이상 안 쓴다.
  //   부부/연인은 두 사람의 '관계'로 가른다. (옛 링크로 들어와도 무시된다)

  const [slot1, setSlot1] = useState<Slot | null>(null)
  const [slot2, setSlot2] = useState<Slot | null>(null)

  // 두 사람의 관계로 갈래를 정한다. 아직 아무도 안 골랐으면 중립('궁합').
  const kind = coupleKindOfPair(slot1?.relation, slot2?.relation)
  const mode: Mode = kind === 'married' ? 'married' : 'couple'
  const info = MODE_INFO[kind === 'married' ? 'married' : 'couple']
  const [pickerFor, setPickerFor] = useState<1 | 2 | null>(null)
  const [meErr, setMeErr] = useState('')

  const setSlot = (n: 1 | 2, v: Slot | null) => (n === 1 ? setSlot1(v) : setSlot2(v))
  const getSlot = (n: 1 | 2) => (n === 1 ? slot1 : slot2)

  // 저장된 사람 선택
  const handlePick = (p: SavedPerson) => {
    if (!pickerFor) return
    // ★관계를 함께 담는다 — 부부/연인 판별에 쓴다 (2026-07-24 메뉴 통합)
    setSlot(pickerFor, { name: p.title, input: p.input_data, isMe: false, relation: p.relation })
    setPickerFor(null)
  }
  // "나"(로그인 본인) 선택 — profiles에서 실제 생년월일을 읽어 슬롯을 채운다.
  // (검증된 패턴: home-new/result-new와 동일하게 supabase.auth.getUser → profiles)
  // 못 읽으면(비로그인·미저장) 안내하고 빈 슬롯을 만들지 않는다 → 결과화면 명식 계산 실패 방지.
  const handlePickMe = async () => {
    if (!pickerFor) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMeErr('로그인 후 "나"를 선택할 수 있어요.'); return }
    const { data: p } = await supabase
      .from('profiles')
      .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, nickname, hangul_name')
      .eq('id', user.id)
      .maybeSingle()
    if (!p || !p.birth_year) {
      setMeErr('내 사주 정보가 없어요. 마이페이지에서 생년월일을 먼저 저장해 주세요.')
      return
    }
    const isUnknownHour = (h: unknown) => h == null || h === '' || h === '모름' || h === '99'
    const meInput: SavedInputData = {
      gender: p.gender ?? '',
      calType: p.cal_type ?? '양력',
      year: String(p.birth_year),
      month: String(p.birth_month ?? ''),
      day: String(p.birth_day ?? ''),
      leapMonth: p.leap_month != null ? String(p.leap_month) : '0',
      hour: isUnknownHour(p.birth_hour) ? '모름' : String(p.birth_hour),
    }
    const meName = p.nickname || p.hangul_name || '나'
    setMeErr('')
    setSlot(pickerFor, { name: meName, input: meInput, isMe: true })
    setPickerFor(null)
  }

  const bothReady = !!slot1 && !!slot2

  const goResult = () => {
    if (!slot1 || !slot2) return
    const pack = (s: Slot) => encodeURIComponent(JSON.stringify({
      ...s.input,
      name: s.name,
      isMe: s.isMe ? 'true' : 'false',
      relation: s.relation ?? '',
    }))
    // mode 는 결과 화면이 관계로 다시 판별한다. 옛 링크 호환을 위해 넘기기만 한다.
    router.push(`/manseryeok/couple-result-new?mode=${mode}&person1=${pack(slot1)}&person2=${pack(slot2)}`)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      {/* 밝은 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/home-new')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>{info.title}</div>
          <div style={{ fontSize: 10.5, color: '#5c3a1e' }}>{info.sub}</div>
        </div>
      </div>

      <div style={{ padding: '16px 14px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28' }}>궁합 볼 두 사람</div>
          <div style={{ fontSize: 10.5, color: '#5c3a1e', marginTop: 2 }}>칸을 눌러 사람을 골라주세요</div>
        </div>

        <SlotView n={1} slot={slot1} onOpen={() => setPickerFor(1)} />

        <div style={{ textAlign: 'center', color: '#d4537e', fontSize: 16, margin: '2px 0 8px' }}>♥</div>

        <SlotView n={2} slot={slot2} onOpen={() => setPickerFor(2)} />

        {meErr && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: '#fbece4', border: '0.5px solid #f0d5c5',
            color: '#96502e', fontSize: 12.5, lineHeight: 1.5,
          }}>
            {meErr}
          </div>
        )}

        <button onClick={goResult} disabled={!bothReady}
          style={{
            width: '100%', marginTop: 18, border: 'none', borderRadius: 11, padding: 14, fontSize: 14, fontWeight: 500,
            color: '#fff', cursor: bothReady ? 'pointer' : 'default',
            background: bothReady ? '#b46e46' : '#e8d5c6',
          }}>
          궁합 보기
        </button>
      </div>

      {/* 슬롯 선택 모달 (나 / 가족·지인 / 새 입력) — 검증된 공용 부품 재사용 */}
      <PersonPickerModal
        open={pickerFor !== null}
        serviceLabel={info.title}
        serviceType="couple_person"
        headline={pickerFor === 1 ? '첫 번째 사람을 골라주세요' : '두 번째 사람을 골라주세요'}
        onPick={handlePick}
        onPickMe={handlePickMe}
        onClose={() => setPickerFor(null)}
      />
    </main>
  )
}

function SlotView({ n, slot, onOpen }: {
  n: 1 | 2
  slot: Slot | null
  onOpen: () => void
}) {
  const birthLabel = slot && slot.input.year
    ? `${slot.input.calType} ${slot.input.year}.${slot.input.month}.${slot.input.day}`
    : (slot?.isMe ? '내 저장 정보' : '')

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: '#96502e', marginBottom: 4 }}>
        {n === 1 ? '첫 번째 사람' : '두 번째 사람'}
      </div>

      {slot ? (
        <div onClick={onOpen} style={{
          background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: 12,
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#efe0d3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#96502e', fontSize: 14 }}>
            {slot.isMe ? '나' : slot.name.slice(0, 1)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#3a2e28' }}>
              {slot.name}
              {slot.isMe && <span style={{ fontSize: 9, color: '#b46e46', background: '#f6e3d6', borderRadius: 99, padding: '0 6px', marginLeft: 3 }}>나</span>}
            </div>
            {birthLabel && <div style={{ fontSize: 10, color: '#5c3a1e' }}>{birthLabel}</div>}
          </div>
          <span style={{ color: '#8f3d0e', fontSize: 11 }}>바꾸기</span>
        </div>
      ) : (
        <div onClick={onOpen} style={{
          background: '#FFFBF7', border: '1.5px dashed #e0c9b8', borderRadius: 12, padding: '16px 12px',
          textAlign: 'center', cursor: 'pointer', color: '#5c3a1e',
        }}>
          <span style={{ fontSize: 18, color: '#c8a086' }}>＋</span>
          <div style={{ fontSize: 12, marginTop: 4 }}>눌러서 {n === 1 ? '첫 번째' : '두 번째'} 사람 선택</div>
        </div>
      )}

      {/* ★2026-07-24 — 직업·MBTI 입력을 없앴다. (대표님 지시)
             심산 판정은 직업·MBTI 를 보지 않고, 자동 통변도 걷어내
             쓸 자리가 없어졌다. JobSelect·MbtiInput 파일은 지우지 않았다. */}
    </div>
  )
}

export default function CoupleInputPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <CoupleInputInner />
    </Suspense>
  )
}
