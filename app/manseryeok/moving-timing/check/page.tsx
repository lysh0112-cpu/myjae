'use client'

/**
 * 이사택일 — 정한 날 봐주기 (check)
 * ─────────────────────────────────────────────
 * 진입: 이사택일 입구 > [정한 날 봐주기] / 보관함 다시보기(recordId)
 * 흐름: 날짜 1~3개 입력 → 진단 → CheckResultV1 이 6줄 O/X 로 그린다
 *
 * ⚠️ 결제 관문 — 결혼택일 check 는 analysis_prices('wedding_check')를 읽는다.
 *    이사택일은 나중에 한꺼번에 붙이기로 했다. price_key = 'moving_check'.
 *    붙일 자리는 아래 runDiagnose() 안이다.
 */

import { Suspense, useEffect, useState, useRef } from 'react'
//  ★2026-09-09 — 결제 시트는 공용 부품 «한 곳» 입니다 [대표님 「통일」]
import WalletPaySheet from '@/app/components/common/WalletPaySheet'
//  ★2026-09-09 — 보관함 자리는 공용 부품 «한 곳» 입니다 [대표님 「색상 통일」]
import StorageLinkRow from '@/app/components/common/StorageLinkRow'
import { useRouter, useSearchParams } from 'next/navigation'
import CheckResultV1 from '../components/CheckResultV1'
import { runDiagnoseV1, type DiagnoseV1Result, type RawPerson } from '../lib/recommendV1'
import { getMovingRecord, saveMovingRecord } from '@/lib/saju/movingRecords'
import type { Direction } from '../lib/movingTables'
import type { SavedInputData } from '@/lib/saju/savedPeople'

const accent = '#967850'
const line = '#9c7a58'
const ink = '#3A3228'
const sub = '#9A8060'

const MAX_DATES = 3

function CheckInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [dates, setDates] = useState<string[]>([''])
  const [result, setResult] = useState<DiagnoseV1Result | null>(null)
  // recordId 로 들어오면 처음부터 불러오는 중이다
  const [loading, setLoading] = useState(() => !!sp.get('recordId'))
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  //  ★2026-09-09 — 결제 시트 [대표님 「이사택일 ai결제창」]
  const [payOpen, setPayOpen] = useState(false)
  //  ★2026-09-09 — 보관함에 담겼는가 [대표님 「보관함 버튼」]
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'failed'>('saving')
  const savedRef = useRef(!!sp.get('recordId'))

  // 보관함 다시보기 — 스냅샷을 그대로 쓴다
  //   ★setState 를 effect 본문이 아니라 비동기 콜백 안에서만 부른다.
  //     본문에서 바로 부르면 렌더가 연쇄로 돌아 lint 가 잡는다.
  useEffect(() => {
    let cancelled = false
    const recordId = sp.get('recordId')
    if (!recordId) return
    getMovingRecord(recordId).then(rec => {
      if (cancelled) return
      if (rec?.resultData) setResult(rec.resultData as DiagnoseV1Result)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [sp])

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

  async function runDiagnose() {
    const clean = dates.filter(d => d && d.trim())
    if (clean.length === 0) { setErr('봐드릴 날짜를 한 개 이상 골라 주세요.'); return }

    // ⚠️ 결제 관문이 들어올 자리. price_key = 'moving_check'

    setErr('')
    setLoading(true)

    const dirRaw = sp.get('dir')
    const direction = (['동', '서', '남', '북'].includes(dirRaw ?? '')
      ? dirRaw : null) as Direction | null

    const r = await runDiagnoseV1({
      dates: clean,
      contractor: parse('p1'),
      spouse: parse('p2'),
      ownerMode: sp.get('owner') === 'single' ? 'single' : 'joint',
      ownerWho: sp.get('who') === 'spouse' ? 'spouse' : 'contractor',
      direction,
    })
    setResult(r)
    setLoading(false)

    // 결과가 나오면 보관함에 저장
    if (!r.error && r.contractor) {
      const unpack = (key: string): (SavedInputData & { name?: string }) | null => {
        try {
          const raw = sp.get(key)
          return raw ? JSON.parse(decodeURIComponent(raw)) : null
        } catch { return null }
      }
      const in1 = unpack('p1')
      const in2 = unpack('p2')
      //  🔴 ★2026-09-09 — 저장 막이 [대표님 「보관함」 건]
      //     ⛔ 이 막이를 빼면 ★두 번 담길 수 있습니다 (보관함에 두 줄).
      //     ⚠️ useState 로 막지 마십시오 — «다시 그릴 때» 반영되어 «샙니다».
      if (in1 && !savedRef.current) {
        savedRef.current = true
        const okCount = r.results.filter(x => x.detail.passFixed).length
        const res = await saveMovingRecord({
          kind: 'check',
          name1: r.contractor.name,
          name2: r.spouse?.name ?? '',
          summary: `${r.results.length}일 중 ${okCount}일 괜찮아요`,
          input1: in1,
          input2: in2 ?? in1,
          ownerMode: r.ownerMode,
          ownerWho: sp.get('who') === 'spouse' ? 'spouse' : 'contractor',
          direction: r.direction,
          resultData: r,
        })
        //  🔴 ★2026-09-09 — 실패해도 «아무 말이 없던» 자리입니다 (14부 「조용히 실패하는 코드」)
        //     ⇒ 손님은 담긴 줄 알고 나가시고 보관함은 «비어» 있었습니다.
        //     ⛔ else 를 지우지 마십시오.
        if (res.ok) {
          setSaveState('saved')
          setSaved('보관함에 담았어요.')
          setTimeout(() => setSaved(null), 2600)
        } else {
          savedRef.current = false        // ★다시 담으실 수 있게 막이를 풉니다
          setSaveState('failed')
        }
      }
    }
  }

  const setDate = (i: number, v: string) => {
    setDates(prev => prev.map((x, idx) => (idx === i ? v : x)))
    setErr('')
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
          onClick={() => (result ? setResult(null) : router.back())}
          style={{
            background: 'none', border: 'none', color: '#7A6440',
            fontSize: 17, cursor: 'pointer', padding: 0,
          }}
        >←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>정한 날 봐주기</div>
          <div style={{ fontSize: 10.5, color: '#7A6440' }}>
            {result ? '봐드린 결과예요' : '생각해 두신 날이 있으신가요?'}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: sub, fontSize: 13.5 }}>
          살펴보는 중이에요…
        </div>
      )}

      {!loading && !result && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontSize: 12.5, color: sub, lineHeight: 1.8, marginBottom: 16 }}>
            최대 세 개까지 봐드려요. 각 날짜마다 명절·공망·충·형 네 가지와
            쉬는 날·손 관련 세 가지를 하나씩 확인해 드려요.
          </div>

          {dates.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
              <input
                type="date"
                value={d}
                onChange={e => setDate(i, e.target.value)}
                style={{
                  flex: 1, padding: '12px 13px', background: '#FFFDF9',
                  border: `1px solid ${line}`, borderRadius: 11, fontSize: 14,
                  color: ink, fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              {dates.length > 1 && (
                <button
                  onClick={() => setDates(prev => prev.filter((_, idx) => idx !== i))}
                  aria-label="이 날짜 지우기"
                  style={{
                    width: 42, background: '#FFFDF9', border: `1px solid ${line}`,
                    borderRadius: 11, color: '#C0AC90', fontSize: 16,
                    cursor: 'pointer', fontFamily: 'inherit', flex: 'none',
                  }}
                >×</button>
              )}
            </div>
          ))}

          {dates.length < MAX_DATES && (
            <button
              onClick={() => setDates(prev => [...prev, ''])}
              style={{
                width: '100%', padding: '12px 0', background: 'none',
                border: `1px dashed ${line}`, borderRadius: 11, color: sub,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + 날짜 더하기
            </button>
          )}

          {err && (
            <div style={{ fontSize: 12.5, color: '#9E4F3E', marginTop: 11, paddingLeft: 2 }}>
              {err}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              🔴 ★2026-09-09 — 「진단」 를 누를 때 결제 시트  [대표님 지시]
                「이사택일 ai결제창은 어디있는지 확인해봐」  ⇒ ★없었습니다.
              ⚠️ 앞선 창이 「이사택일은 나중에 한꺼번에 붙이기로 했다」라
                 자리만 표시해 두었습니다 (price_key = 'moving_check').
              ⚠️ 결혼택일과 ★«같은 모양» 입니다 — 시트는 «묻기만» 합니다.
              ⛔ 낱말을 지어내지 마십시오 — mc_price 의 것입니다 (2부 5-2).
              ══════════════════════════════════════════════════════ */}
          <button
            onClick={() => setPayOpen(true)}
            style={{
              width: '100%', marginTop: 22, padding: '15px 0',
              background: accent, color: '#fff', border: 'none', borderRadius: 13,
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'transform .08s, filter .12s',
            }}
            onPointerDown={e => {
              e.currentTarget.style.transform = 'scale(0.98)'
              e.currentTarget.style.filter = 'brightness(0.92)'
            }}
            onPointerUp={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.filter = 'none'
            }}
            onPointerLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.filter = 'none'
            }}
          >
            이 날들 봐주세요
          </button>
        </div>
      )}

      {!loading && result?.error && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, color: '#9E4F3E', lineHeight: 1.8 }}>
            {result.error}
          </div>
        </div>
      )}

      {!loading && result && !result.error && <CheckResultV1 result={result} />}

      {/* 🔴 ★2026-09-09 — 결과 맨 아래 「보관함」 자리  [대표님 지시]
          「최종결과화면에서 ★보관함 버튼을 만들면 어때」
          ⚠️ 이 화면에는 보관함으로 가는 길이 ★«아예 없었습니다».
          ⛔ 단추를 여기에 «직접 만들지» 마십시오 — StorageLinkRow 한 곳입니다. */}
      {!loading && result && !result.error && (
        <div style={{ padding: '0 16px 24px' }}>
          <StorageLinkRow
            label="이사택일 보관함"
            href="/manseryeok/moving-timing/moving-storage"
            state={saveState}
            onRetry={() => { savedRef.current = false; void runDiagnose() }}
            accent={accent}
          />
        </div>
      )}

      {saved && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
          background: 'rgba(58,50,40,.93)', color: '#fff', fontSize: 13,
          padding: '11px 20px', borderRadius: 22, zIndex: 50,
        }}>
          {saved}
        </div>
      )}
      {/* ★공용 결제 시트 — ⛔ 여기에 팝업을 «따로 만들지» 마십시오 */}
      <WalletPaySheet
        open={payOpen}
        title="🏡 이사 정한 날 진단"
        subtitle="생각해 둔 날짜가 이사에 괜찮은 날인지 봐드려요"
        includes={['고르신 날짜를 하루씩 판정', '손 없는 날·삼살·대장군 확인', '계약자와 배우자 각각의 결', '보관함 저장']}
        item="moving_check"
        actionLabel="진단 보기"
        onClose={() => setPayOpen(false)}
        onConfirm={() => { setPayOpen(false); void runDiagnose() }}
      />

    </main>
  )
}

export default function MovingCheckPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: sub }}>불러오는 중…</div>}>
      <CheckInner />
    </Suspense>
  )
}
