'use client'

/**
 * 이사택일 — 계약자·배우자 선택 + 명의 형태 + 이사 방향
 * ─────────────────────────────────────────────
 * 진입: 이사택일 보관함 > [+ 새 이사택일 보기]
 * 흐름: 두 슬롯을 PersonPickerModal(나 / 가족·지인 / 새 입력)로 채우고
 *       명의 형태와 이사 방향을 고른 뒤
 *       → 이사택일 입구(정한 날 / 좋은 날 갈래)로 넘김
 *
 * 결혼택일 input 패턴을 이식했다. 재사용 부품: PersonPickerModal / SavedPerson
 *
 * ★결혼택일과 결정적으로 다른 점 — 역할을 성별로 가르지 않는다.
 *   결혼택일은 신랑·신부라 성별이 역할을 정했고, 그래서 슬롯 순서와 표시가
 *   어긋나 두 사람이 뒤바뀌는 버그가 있었다(교훈 R).
 *   이사택일의 역할은 '계약자'와 '배우자'다. 성별과 무관하므로
 *   슬롯 순서를 그대로 쓰면 되고, 뒤바뀔 여지가 없다.
 *   대신 어느 쪽이 계약자인지를 화면에서 분명히 보여 준다.
 */

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import type { SavedPerson, SavedInputData } from '@/lib/saju/savedPeople'
import { DIRECTIONS, DIR_HANJA, type Direction } from '../lib/movingTables'

const accent = '#967850'   // 이사택일 포인트(흙빛)
const line = '#EAE0CE'
const ink = '#3A3228'
const sub = '#9A8060'

interface Slot {
  name: string
  input: SavedInputData
  isMe: boolean
}

type OwnerMode = 'single' | 'joint'
type OwnerWho = 'contractor' | 'spouse'

function MovingInputInner() {
  const router = useRouter()

  const [contractor, setContractor] = useState<Slot | null>(null)
  const [spouse, setSpouse] = useState<Slot | null>(null)
  const [pickerFor, setPickerFor] = useState<1 | 2 | null>(null)
  const [meErr, setMeErr] = useState('')

  const [ownerMode, setOwnerMode] = useState<OwnerMode>('joint')
  const [ownerWho, setOwnerWho] = useState<OwnerWho>('contractor')
  const [direction, setDirection] = useState<Direction | null>(null)

  const setSlot = (n: 1 | 2, v: Slot | null) =>
    (n === 1 ? setContractor(v) : setSpouse(v))

  const handlePick = (p: SavedPerson) => {
    if (!pickerFor) return
    setSlot(pickerFor, { name: p.title, input: p.input_data, isMe: false })
    setPickerFor(null)
  }

  /** "나"(로그인 본인) — profiles 에서 실제 생년월일을 읽어 채운다. */
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
    setSlot(pickerFor, {
      name: p.hangul_name || p.nickname || '나',
      input: meInput,
      isMe: true,
    })
    setPickerFor(null)
    setMeErr('')
  }

  /**
   * 다음 화면으로.
   *
   * ★슬롯 순서를 그대로 쓴다. p1 = 계약자, p2 = 배우자.
   *   성별로 가르지 않으므로 결혼택일 같은 뒤바뀜이 생기지 않는다.
   *   받는 쪽(page/find/check)도 p1 을 계약자로만 읽는다.
   */
  const goNext = () => {
    if (!contractor) return
    const pack = (s: Slot) => encodeURIComponent(JSON.stringify({
      ...s.input,
      name: s.name,
      isMe: s.isMe ? 'true' : 'false',
    }))
    const q = new URLSearchParams()
    q.set('p1', pack(contractor))
    if (spouse) q.set('p2', pack(spouse))
    q.set('owner', ownerMode)
    q.set('who', ownerMode === 'single' ? ownerWho : 'contractor')
    if (direction) q.set('dir', direction)
    router.push(`/manseryeok/moving-timing?${q.toString()}`)
  }

  const canGo = !!contractor && (ownerMode === 'joint' ? true : true)

  const slotView = (n: 1 | 2, s: Slot | null, label: string, hint: string) => (
    <button
      onClick={() => { setPickerFor(n); setMeErr('') }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        background: '#FFFDF9', border: `1px solid ${s ? accent : line}`,
        borderRadius: 13, padding: '15px 16px', marginBottom: 9,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}
    >
      <span style={{
        background: s ? accent : '#F2EADA', color: s ? '#fff' : sub,
        fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 8,
        flex: 'none',
      }}>
        {label}
      </span>
      <span style={{ flex: 1 }}>
        {s ? (
          <>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: ink, display: 'block' }}>
              {s.name}
            </span>
            <span style={{ fontSize: 11.5, color: sub }}>
              {s.input.gender} · {s.input.calType} {s.input.year}.{s.input.month}.{s.input.day}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 13.5, color: sub }}>{hint}</span>
        )}
      </span>
      <span style={{ fontSize: 15, color: '#C0AC90' }}>›</span>
    </button>
  )

  return (
    <main style={{
      minHeight: '100vh', background: '#FBF8F2', maxWidth: 480,
      margin: '0 auto', paddingBottom: 40,
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(251,248,242,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${line}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => router.push('/manseryeok/moving-timing/moving-storage')}
          style={{
            background: 'none', border: 'none', color: '#7A6440',
            fontSize: 17, cursor: 'pointer', padding: 0,
          }}
        >←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>이사택일</div>
          <div style={{ fontSize: 10.5, color: '#7A6440' }}>좋은 이사 날을 봐드려요</div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 0' }}>

        <div style={{
          background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)',
          borderRadius: 10, padding: '10px 14px', fontSize: 11.5, color: '#d88',
          lineHeight: 1.6, marginBottom: 18,
        }}>
          ※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 이사일은 계약·잔금·
          이삿짐 업체 사정을 함께 고려해 결정하세요.
        </div>

        {/* 두 사람 */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#7A6440', marginBottom: 4 }}>
          누구의 이사인가요?
        </div>
        <div style={{ fontSize: 12, color: sub, lineHeight: 1.7, marginBottom: 11 }}>
          계약서에 이름을 올리시는 분을 계약자로 넣어 주세요.
        </div>

        {slotView(1, contractor, '계약자', '계약자를 골라 주세요')}
        {slotView(2, spouse, '배우자', '배우자를 골라 주세요 (없으면 건너뛰기)')}

        {meErr && (
          <div style={{ fontSize: 12, color: '#C0705E', marginBottom: 10 }}>{meErr}</div>
        )}

        {/* 명의 */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7A6440', marginBottom: 4 }}>
            명의는 어떻게 되나요?
          </div>
          <div style={{ fontSize: 12, color: sub, lineHeight: 1.7, marginBottom: 11 }}>
            예로부터 이사는 명의자 사주로 날을 잡았어요.
            공동명의면 두 분 모두 보고 골라 드려요.
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
            {([
              ['joint', '공동명의', '두 분 모두 봐요'],
              ['single', '단독명의', '한 분 사주로 봐요'],
            ] as const).map(([v, label, desc]) => (
              <button
                key={v}
                onClick={() => setOwnerMode(v)}
                disabled={v === 'joint' && !spouse}
                style={{
                  flex: 1, background: ownerMode === v ? '#F2EADA' : '#FFFDF9',
                  border: `1px solid ${ownerMode === v ? accent : line}`,
                  borderRadius: 12, padding: '13px 12px', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                  opacity: v === 'joint' && !spouse ? 0.45 : 1,
                }}
              >
                <span style={{
                  fontSize: 13.5, fontWeight: 700, color: ink, display: 'block',
                }}>{label}</span>
                <span style={{ fontSize: 11, color: sub }}>{desc}</span>
              </button>
            ))}
          </div>

          {ownerMode === 'single' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                ['contractor', contractor?.name ?? '계약자'],
                ['spouse', spouse?.name ?? '배우자'],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setOwnerWho(v)}
                  disabled={v === 'spouse' && !spouse}
                  style={{
                    flex: 1, background: ownerWho === v ? accent : '#FFFDF9',
                    color: ownerWho === v ? '#fff' : ink,
                    border: `1px solid ${ownerWho === v ? accent : line}`,
                    borderRadius: 10, padding: '11px 12px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                    opacity: v === 'spouse' && !spouse ? 0.45 : 1,
                  }}
                >
                  {label} 명의
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 방향 */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7A6440', marginBottom: 4 }}>
            어느 쪽으로 가시나요?
          </div>
          <div style={{ fontSize: 12, color: sub, lineHeight: 1.7, marginBottom: 11 }}>
            &lsquo;손&rsquo;은 날짜에 따라 동·남·서·북을 돌아다녀요.
            가시는 쪽만 피하면 되니, 방향을 알려주시면 고르실 수 있는 날이 늘어나요.
            <br />
            <span style={{ color: '#BFAE96' }}>모르시면 안 고르셔도 괜찮아요.</span>
          </div>

          <div style={{ display: 'flex', gap: 7 }}>
            {DIRECTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDirection(direction === d ? null : d)}
                style={{
                  flex: 1, background: direction === d ? accent : '#FFFDF9',
                  color: direction === d ? '#fff' : ink,
                  border: `1px solid ${direction === d ? accent : line}`,
                  borderRadius: 10, padding: '13px 0', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                }}
              >
                {d}
                <span style={{
                  fontSize: 9.5, opacity: 0.7, display: 'block', fontWeight: 400,
                }}>{DIR_HANJA[d]}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={goNext}
          disabled={!canGo}
          style={{
            width: '100%', marginTop: 26, padding: '15px 0',
            background: canGo ? accent : '#DDD3C0', color: '#fff',
            border: 'none', borderRadius: 13, fontSize: 15, fontWeight: 700,
            cursor: canGo ? 'pointer' : 'default', fontFamily: 'inherit',
          }}
        >
          다음
        </button>
      </div>

      <PersonPickerModal
        open={pickerFor !== null}
        serviceLabel="이사택일"
        serviceType="moving"
        presetRelation={pickerFor === 1 ? '계약자' : '배우자'}
        headline={pickerFor === 1 ? '계약자를 골라주세요' : '배우자를 골라주세요'}
        onPick={handlePick}
        onPickMe={handlePickMe}
        onClose={() => setPickerFor(null)}
      />
    </main>
  )
}

export default function MovingInputPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: sub }}>불러오는 중…</div>}>
      <MovingInputInner />
    </Suspense>
  )
}
