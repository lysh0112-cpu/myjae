'use client'

/**
 * 이사택일 — 좋은 날 목록 (pick)
 * ─────────────────────────────────────────────
 * 진입: find(기간 입력) → 여기 / 보관함 다시보기 → 여기(recordId)
 * 흐름: 후보 계산 → PickMovingV1 이 그린다 → 날짜를 누르면 보관함 저장
 *
 * ★API 호출: 사주 2회 + 공휴일 1회 = 3회.
 *   일주는 자체 계산, 음력은 내장 대조표라 호출이 없다.
 */

import { Suspense, useEffect, useState, useRef } from 'react'
//  ★2026-09-09 — 보관함 자리는 공용 부품 «한 곳» 입니다 [대표님 「색상 통일」]
import StorageLinkRow from '@/app/components/common/StorageLinkRow'
import { useRouter, useSearchParams } from 'next/navigation'
import PickMovingV1 from '../components/PickMovingV1'
import { runMovingV1, type MovingV1Result, type DayResult, type RawPerson } from '../lib/recommendV1'
import { getMovingRecord, saveMovingRecord, updateMovingRecord } from '@/lib/saju/movingRecords'
import type { Direction } from '../lib/movingTables'
import type { SavedInputData } from '@/lib/saju/savedPeople'

const accent = '#967850'
const line = '#9c7a58'
const ink = '#3A3228'
const sub = '#9A8060'

function PickInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [result, setResult] = useState<MovingV1Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<string | null>(null)
  //  ★2026-09-09 — 보관함에 담겼는가 [대표님 「보관함 버튼」]
  //  ⚠️ 이 화면은 ★날짜를 «누를 때» 담깁니다 — 처음에는 아직 안 담긴 상태입니다.
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'failed'>('saving')
  //  ★담아 둔 줄의 id — 날짜를 누르시면 «이 줄을 덮어씁니다» (새 줄을 안 만듭니다)
  const savedIdRef = useRef<string | null>(null)
  //  ⛔ useState 로 막지 마십시오 — «다시 그릴 때» 반영되어 «샙니다» (두 줄이 생깁니다)
  const savingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)

      // 보관함 다시보기 — 저장해 둔 스냅샷을 그대로 쓴다(재계산 없음)
      const recordId = sp.get('recordId')
      if (recordId) {
        const rec = await getMovingRecord(recordId)
        if (!cancelled && rec?.resultData) {
          setResult(rec.resultData as MovingV1Result)
          //  ★다시보기 — 이미 담긴 것입니다. ⛔ 또 담지 마십시오.
          savedIdRef.current = recordId
          setSaveState('saved')
          setLoading(false)
          return
        }
      }

      const parse = (key: string): RawPerson | null => {
        try {
          const raw = sp.get(key)
          if (!raw) return null
          const o = JSON.parse(decodeURIComponent(raw))
          return {
            year: String(o.year ?? ''), month: String(o.month ?? ''),
            day: String(o.day ?? ''), hour: String(o.hour ?? '-1'),
            gender: String(o.gender ?? ''), calType: String(o.calType ?? '양력'),
            name: o.name,
          }
        } catch { return null }
      }

      const dirRaw = sp.get('dir')
      const direction = (['동', '서', '남', '북'].includes(dirRaw ?? '')
        ? dirRaw : null) as Direction | null

      const r = await runMovingV1({
        startDate: sp.get('start') ?? '',
        endDate: sp.get('end') ?? '',
        contractor: parse('p1'),
        spouse: parse('p2'),
        ownerMode: sp.get('owner') === 'single' ? 'single' : 'joint',
        ownerWho: sp.get('who') === 'spouse' ? 'spouse' : 'contractor',
        direction,
      })

      if (!cancelled) {
        setResult(r)
        setLoading(false)
        //  🔴 ★결과가 나오면 «저절로» 담습니다 [대표님 「보관함에 없어」]
        //     ⛔ 이 줄을 빼면 ★날짜를 눌러야만 담기던 예전으로 돌아갑니다.
        if (!r.error && r.contractor) {
          void keepRecord(r, `${r.days.length}일 가운데 고르실 수 있어요`)
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [sp])

  // ══════════════════════════════════════════════════════════════════
  //  🔴 ★2026-09-09 — 결과가 나오면 «저절로» 담습니다  [대표님 지시]
  //    「이렇게 조회하고 하단의 보관함에 저장을 하면 ★보관함에 없어」
  //
  //   [까닭]  전에는 ★«날짜를 누를 때» 만 담겼습니다.
  //      조회만 하고 나가시면 ★아무것도 안 남았습니다.
  //   ⇒ 결과가 나오면 한 줄 담고, 날짜를 누르시면 ★그 줄을 «덮어씁니다».
  //   ⛔ 날짜마다 «새 줄» 을 만들지 마십시오 — 눌러 본 만큼 쌓입니다.
  //   ⚠️ 다시보기(recordId)로 들어오면 ★담지 않습니다 — 이미 담긴 것입니다.
  // ══════════════════════════════════════════════════════════════════
  async function keepRecord(res2: MovingV1Result, summary: string) {
    if (savingRef.current) return
    const in1 = ((): (SavedInputData & { name?: string }) | null => {
      try { const raw = sp.get('p1'); return raw ? JSON.parse(decodeURIComponent(raw)) : null } catch { return null }
    })()
    const in2 = ((): (SavedInputData & { name?: string }) | null => {
      try { const raw = sp.get('p2'); return raw ? JSON.parse(decodeURIComponent(raw)) : null } catch { return null }
    })()
    if (!in1) return
    //  ⚠️ 계약자가 없으면 담을 것이 없습니다 — 조용히 넘어갑니다.
    if (!res2.contractor) return

    //  ★이미 담아 둔 줄이 있으면 «덮어씁니다»
    if (savedIdRef.current) {
      const ok = await updateMovingRecord(savedIdRef.current, { summary, resultData: res2 })
      setSaveState(ok ? 'saved' : 'failed')
      return
    }
    savingRef.current = true
    const r = await saveMovingRecord({
      kind: 'find',
      name1: res2.contractor.name,
      name2: res2.spouse?.name ?? '',
      summary,
      input1: in1,
      input2: in2 ?? in1,
      ownerMode: res2.ownerMode,
      ownerWho: sp.get('who') === 'spouse' ? 'spouse' : 'contractor',
      direction: res2.direction,
      resultData: res2,
    })
    savingRef.current = false
    if (r.ok && r.id) { savedIdRef.current = r.id; setSaveState('saved') }
    else setSaveState('failed')
  }

  /** 날짜를 누르면 «담아 둔 줄» 에 그 날짜를 얹습니다. */
  async function handlePick(day: DayResult) {
    if (!result?.contractor) return
    //  ★담아 둔 줄에 «고르신 날짜» 를 얹습니다 — ⛔ 새 줄을 만들지 않습니다.
    await keepRecord(result, `${day.fullLabel} 외 ${Math.max(result.days.length - 1, 0)}일`)
    setSaved(`${day.fullLabel}을 보관함에 담았어요.`)
    setTimeout(() => setSaved(null), 2600)
  }

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
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', color: '#7A6440',
            fontSize: 17, cursor: 'pointer', padding: 0,
          }}
        >←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>이사택일</div>
          <div style={{ fontSize: 10.5, color: '#7A6440' }}>이사하기 좋은 날</div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: sub, fontSize: 13.5 }}>
          좋은 날을 고르는 중이에요…
        </div>
      )}

      {!loading && result?.error && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, color: '#9E4F3E', lineHeight: 1.8 }}>
            {result.error}
          </div>
          <button
            onClick={() => router.push('/manseryeok/moving-timing/input')}
            style={{
              marginTop: 18, padding: '12px 24px', background: accent, color: '#fff',
              border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            처음부터 다시
          </button>
        </div>
      )}

      {!loading && result && !result.error && (
        <PickMovingV1 result={result} onPickDay={handlePick} />
      )}

      {saved && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
          background: 'rgba(58,50,40,.93)', color: '#fff', fontSize: 13,
          padding: '11px 20px', borderRadius: 22, zIndex: 50, maxWidth: 400,
        }}>
          {saved}
        </div>
      )}
      {/* 🔴 ★2026-09-09 — 결과 맨 아래 「보관함」 자리 [대표님 「보관함 버튼을 만들면 어때」]
          ⚠️ 이 화면에는 보관함으로 가는 길이 ★«아예 없었습니다».
          ⛔ 단추를 «직접 만들지» 마십시오 — StorageLinkRow 한 곳입니다. */}
      <div style={{ padding: '0 16px 24px' }}>
        <StorageLinkRow
          label="이사택일 보관함"
          href="/manseryeok/moving-timing/moving-storage"
          state={saveState}
          accent={accent}
        />
      </div>
    </main>
  )
}

export default function MovingPickPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: sub }}>불러오는 중…</div>}>
      <PickInner />
    </Suspense>
  )
}
