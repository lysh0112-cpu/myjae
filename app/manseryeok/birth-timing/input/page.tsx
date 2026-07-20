'use client'

/**
 * 출산택일 부모 두 사람 선택 (신버전 · 피치톤)
 * ─────────────────────────────────────────────
 * 진입: 출산택일 보관함 > [+ 새 출산택일 보기]
 * 흐름: 아빠·엄마 두 슬롯을 PersonPickerModal(나 / 가족·지인 / 새 입력)로 채움
 *       → 다음 > 출산택일 입구(예정일·설문 입력)로 p1·p2 넘김
 *
 * 결혼택일(input) 패턴 이식. 출산택일도 직업·MBTI 없음.
 * 재사용(검증 부품): PersonPickerModal / SavedPerson·SavedInputData
 *   부모 성별로 아빠(남)/엄마(여) 자동 표시 (결혼택일 신랑/신부와 동일 방식).
 */

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import type { SavedPerson, SavedInputData } from '@/lib/saju/savedPeople'

const accent = '#b45a78'   // 출산택일 포인트(로즈핑크)

// 슬롯 한 칸이 담는 사람 (나 / 저장된 사람 / 새로 입력한 사람)
interface Slot {
  name: string
  input: SavedInputData
  isMe: boolean
}

function BirthInputInner() {
  const router = useRouter()

  const [parent1, setParent1] = useState<Slot | null>(null)   // 부모1
  const [parent2, setParent2] = useState<Slot | null>(null)   // 부모2
  const [pickerFor, setPickerFor] = useState<1 | 2 | null>(null)
  const [meErr, setMeErr] = useState('')

  const setSlot = (n: 1 | 2, v: Slot | null) => (n === 1 ? setParent1(v) : setParent2(v))

  // 저장된 사람 선택
  const handlePick = (p: SavedPerson) => {
    if (!pickerFor) return
    setSlot(pickerFor, { name: p.title, input: p.input_data, isMe: false })
    setPickerFor(null)
  }

  // "나"(로그인 본인) 선택 — profiles에서 실제 생년월일을 읽어 슬롯을 채운다.
  //   (검증 패턴: couple-input-new/wedding input/home-new/result-new와 동일)
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

  const bothReady = !!parent1 && !!parent2

  // 두 부모 → 출산택일 입구(page.tsx)로. 거기서 예정일·설문 입력.
  //   입구가 기대하는 형식: p1, p2 = encodeURIComponent(JSON.stringify(person))
  const goNext = () => {
    if (!parent1 || !parent2) return
    const pack = (s: Slot) => encodeURIComponent(JSON.stringify({
      ...s.input,
      name: s.name,
      isMe: s.isMe ? 'true' : 'false',
    }))
    router.push(`/manseryeok/birth-timing?p1=${pack(parent1)}&p2=${pack(parent2)}`)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      {/* 밝은 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/manseryeok/birth-timing/birth-storage')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>출산택일</div>
          <div style={{ fontSize: 10.5, color: '#5c3a1e' }}>아기의 좋은 날을 함께 찾아드려요</div>
        </div>
      </div>

      <div style={{ padding: '16px 14px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28' }}>아기의 부모님</div>
          <div style={{ fontSize: 10.5, color: '#5c3a1e', marginTop: 2 }}>칸을 눌러 사람을 골라주세요</div>
        </div>

        <SlotView fallbackRole="부모" slot={parent1} onOpen={() => setPickerFor(1)} />

        <div style={{ textAlign: 'center', color: '#6b5340', fontSize: 16, margin: '2px 0 8px' }}>·</div>

        <SlotView fallbackRole="부모" slot={parent2} onOpen={() => setPickerFor(2)} />

        {meErr && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: '#fbece4', border: '0.5px solid #f0d5c5',
            color: '#96502e', fontSize: 12.5, lineHeight: 1.5,
          }}>
            {meErr}
          </div>
        )}

        <button onClick={goNext} disabled={!bothReady}
          style={{
            width: '100%', marginTop: 18, border: 'none', borderRadius: 11, padding: 14, fontSize: 14, fontWeight: 500,
            color: '#fff', cursor: bothReady ? 'pointer' : 'default',
            background: bothReady ? accent : '#e8d5c6',
          }}>
          다음
        </button>
      </div>

      {/* 슬롯 선택 모달 (나 / 가족·지인 / 새 입력) — 검증된 공용 부품 재사용 */}
      <PersonPickerModal
        open={pickerFor !== null}
        serviceLabel="출산택일"
        serviceType="birth"
        presetRelation={pickerFor === 1 ? '부' : '모'}
        headline={pickerFor === 1 ? '한 분을 골라주세요' : '나머지 한 분을 골라주세요'}
        onPick={handlePick}
        onPickMe={handlePickMe}
        onClose={() => setPickerFor(null)}
      />
    </main>
  )
}

function SlotView({ fallbackRole, slot, onOpen }: {
  fallbackRole: '부모'   // 빈 슬롯일 때 보여줄 기본 라벨
  slot: Slot | null
  onOpen: () => void
}) {
  // 사람이 채워지면 그 사람의 성별로 아빠/엄마를 정한다. (남=아빠, 여=엄마)
  //   빈 슬롯이면 자리 안내용 기본 라벨을 쓴다.
  const role: '아빠' | '엄마' | '부모' =
    slot ? (slot.input.gender === '여' ? '엄마' : slot.input.gender === '남' ? '아빠' : fallbackRole)
         : fallbackRole
  const emoji = role === '아빠' ? '🧑' : role === '엄마' ? '🤱' : '👨‍👩‍👧'
  const birthLabel = slot && slot.input.year
    ? `${slot.input.calType} ${slot.input.year}.${slot.input.month}.${slot.input.day}`
    : (slot?.isMe ? '내 저장 정보' : '')

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: '#96502e', marginBottom: 4 }}>{role}</div>

      {slot ? (
        <div onClick={onOpen} style={{
          background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: 12,
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#efe0d3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            {emoji}
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
          <span style={{ fontSize: 18 }}>{emoji}</span>
          <div style={{ fontSize: 12, marginTop: 4 }}>눌러서 {role} 선택</div>
        </div>
      )}
    </div>
  )
}

export default function BirthInputPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <BirthInputInner />
    </Suspense>
  )
}
