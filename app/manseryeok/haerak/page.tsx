'use client'
/**
 * 하락이수 보관함
 * ─────────────────────────────────────────────
 * 진입: 홈 > [하락이수]  → /manseryeok/haerak
 * 흐름: 이 목록 > 카드 선택(그때 본 것 다시보기)
 *              > [새로운 사람 보기] > 사람 선택 모달 > haerak-input > haerak-result
 *
 * 데이터: listRecordsByService('haerak') — saju_records
 * ★진로적성 보관함(career)과 «같은 패턴» 입니다. 검증된 부품을 그대로 씁니다.
 *
 * ⚠️⚠️ ★하락이수만 다른 점 하나 —
 *    다른 보관함은 카드 한 장이 «사람» 하나입니다.
 *    하락이수는 ★«사람 + 어느 해» 입니다 — 같은 분이 26년·27년을 «따로» 보십니다.
 *    ⇒ 그래서 왼쪽 딱지에 ★「26년」 을 씁니다.
 *    ⇒ 볼 해는 ★resultData 에 담습니다 (SavedInputData 에는 넣을 칸이 없습니다).
 *
 * ⛔ 아래 단추 이름은 ★「새로운 사람 보기」 입니다  [대표님 2026-09-14]
 *    다른 보관함 열넷은 「+ 새 ○○ 보기」 입니다. ★여기만 다릅니다.
 *    ⛔ 「+ 새 하락이수 보기」 로 되돌리지 마십시오 — 대표님이 «이상하다» 하셨습니다.
 *
 * ⛔ 틀(머리말·빈 화면·아래 버튼)을 «다시 짓지» 마십시오 — StorageShell 한 곳입니다.
 */
import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listRecordsByService, deleteRecord, daysAgoLabel, type SajuRecord,
} from '@/lib/saju/sajuRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, myResultQuery, type SavedPerson, type SavedInputData } from '@/lib/saju/savedPeople'
import ConfirmDeleteDialog from '@/app/components/common/ConfirmDeleteDialog'
import StorageShell, { S } from '@/app/components/common/StorageShell'
import StorageRow from '@/app/components/common/StorageRow'
import ServiceIntroDialog from '@/app/components/common/ServiceIntroDialog'
//  ⚠️ ★글은 «한 곳» 에서 옵니다 — ⛔ 여기에 문장을 적지 마십시오
import {
  HAERAK_INTRO_TITLE, HAERAK_INTRO_LEAD, HAERAK_INTRO_POINTS,
  HAERAK_INTRO_TAIL, HAERAK_INTRO_CTA, HAERAK_PLAIN_NOTE,
} from '@/lib/saju/haerak/intro'

/** 저장된 입력값 → 결과 화면이 읽는 주소 */
function personToQuery(d: SavedInputData, name: string): string {
  const p = new URLSearchParams()
  p.set('year', d.year); p.set('month', d.month); p.set('day', d.day)
  p.set('gender', d.gender); p.set('calType', d.calType)
  p.set('leapMonth', d.leapMonth || '0'); p.set('hour', d.hour || '모름')
  if (name) p.set('name', name)
  return p.toString()
}

/**
 *  기록에서 «본 해» 를 꺼냅니다.
 *  ⛔ 없으면 ★null 입니다 — 「올해」 로 지어내지 «않습니다».
 *     (지어내면 옛 기록을 열었을 때 엉뚱한 해가 뜹니다)
 */
function targetYearOf(r: SajuRecord): number | null {
  const rd = r.resultData as { year?: unknown } | null | undefined
  const y = Number(rd?.year)
  return Number.isInteger(y) && y > 1900 && y < 2200 ? y : null
}

/*  ⚠️ ★2026-09-14 (9부) — baseYearOf 를 없앴습니다.
 *     나이가 «보려는 해» 기준으로 바뀌어, 볼 해만 넘기면 나이도 정해집니다 [연재쌤 확정].
 *     ⛔ 「그때 그 해」 를 따로 들고 다닐 까닭이 사라졌습니다.
 */

function HaerakStorageInner() {
  const router = useRouter()
  const [records, setRecords] = useState<SajuRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<SajuRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  /*  🔴 ★2026-09-14 (9부) [대표님] — 「하락이수란?」 을 «눌렀을 때» 뜹니다.
   *     ⛔ 홈 카드를 누를 때는 «안 띄웁니다» — 대표님이 그렇게 정하셨습니다. */
  const [introOpen, setIntroOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    //  🔴 ★true — «볼 해» 와 «기준 해» 가 result_data 에 있습니다 (9부).
    //     ⛔ 빼면 목록이 그 값을 못 읽어 ★「볼 해가 이상해요」 가 납니다.
    listRecordsByService('haerak', true).then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteRecord(confirmDel.id)
    setDeleting(false)
    if (ok) {
      setRecords(prev => prev ? prev.filter(x => x.id !== confirmDel.id) : prev)
      setConfirmDel(null)
    } else {
      alert('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <StorageShell
      title="하락이수 보관함"
      count={records ? records.length : null}
      loading={records === null}
      showEmpty={!!records && records.length === 0}
      emptyIcon="☯️"
      emptyTitle={'아직 저장된 하락이수 기록이 없어요'}
      emptyDesc={'새로 보면 여기에 차곡차곡 쌓여요'}
      actionLabel={'새로운 사람 보기'}
      onAction={() => setPickerOpen(true)}
      /*  ★아래 단추 «뒤» 에 붙습니다 — StorageShell 을 손대지 않았습니다 */
      footer={
        <button
          type="button"
          onClick={() => setIntroOpen(true)}
          style={{
            width: '100%', marginTop: 10, padding: 11, borderRadius: 12,
            background: 'transparent', border: '1px solid #d9e3ec',
            color: '#3f6fa8', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >하락이수란? 河洛理數</button>
      }
    >
      {records && records.map(r => {
        const y = targetYearOf(r)
        return (
          <StorageRow
            key={r.id}
            onClick={() => router.push(
              /*  ⛔ ★볼 해가 없는 «옛 기록» 은 결과로 보내지 «않습니다».
               *     보내 봐야 창구가 「볼 해가 이상해요」 로 막습니다 — ★막다른 길입니다.
               *     ⇒ 해를 고르실 수 있게 ★입력 화면으로 모십니다. */
              y
                ? `/manseryeok/haerak-result?${personToQuery(r.inputData, r.title)}`
                  + `&target=${y}`
                  + `&recordId=${r.id}`
                : `/manseryeok/haerak-input?${personToQuery(r.inputData, r.title)}`,
            )}
            onDelete={() => setConfirmDel(r)}
          >
            <div style={{
              minWidth: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: S.btn, color: '#fff', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* ★같은 분이 해마다 따로 쌓이므로 «본 해» 를 딱지에 씁니다 */}
              {/*  ⚠️ 볼 해가 없는 옛 기록은 ★이름 두 글자로 둡니다 (지어내지 않습니다) */}
              {y ? `${String(y).slice(2)}년` : (r.title || '?').slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 3 }}>
                {r.title || '이름 없음'}
                {r.relation ? <span style={{ fontSize: 11, color: '#5c3a1e', marginLeft: 6 }}>{r.relation}</span> : null}
              </div>
              <div style={{ fontSize: 11, color: '#5c3a1e' }}>
                {r.inputData.year}.{r.inputData.month}.{r.inputData.day} · {daysAgoLabel(r.createdAt)}
              </div>
            </div>
          </StorageRow>
        )
      })}

      {/* 🔴 «사람» 갈래를 «결과» 와 갈라 둡니다 (2026-09-09 대표님 지시와 같은 결)
          ⛔⛔ serviceType 을 ★'haerak' 으로 되돌리지 마십시오 — 목록에 두 번 보입니다.
          ⚠️ 사람 목록(listSavedPeople)도 ★이 값으로 찾습니다 — 저장·조회가 한 짝입니다.
          ⛔ 이 주석을 ★속성 «사이» 에 넣지 마십시오 — 화면이 통째로 안 뜹니다 (58부). */}
      <PersonPickerModal
        open={pickerOpen}
        serviceLabel="하락이수"
        serviceType="haerak_person"
        headline="누구의 하락이수를 볼까요?"
        submitLabel="저장하고 하락이수 보기"
        onPick={(person: SavedPerson) => {
          setPickerOpen(false)
          router.push(`/manseryeok/haerak-input?${toResultQuery(person)}`)
        }}
        onPickMe={async () => {
          //  ⛔ 「나」 를 빼지 마십시오 — 검사 ㉒-x 가 창마다 봅니다.
          const q = await myResultQuery()
          setPickerOpen(false)
          if (!q) { alert('내 사주 정보를 불러오지 못했어요. 마이페이지에서 먼저 저장해 주세요.'); return }
          router.push(`/manseryeok/haerak-input?${q}`)
        }}
        onClose={() => setPickerOpen(false)}
      />

      {confirmDel && (
        <ConfirmDeleteDialog
          open
          message={<>{confirmDel.title || '이름 없음'}의 하락이수 기록을 삭제해요.</>}
          busy={deleting}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
      <ServiceIntroDialog
        open={introOpen}
        title={HAERAK_INTRO_TITLE}
        lead={HAERAK_INTRO_LEAD}
        points={HAERAK_INTRO_POINTS}
        tail={HAERAK_INTRO_TAIL}
        note={HAERAK_PLAIN_NOTE}
        ctaLabel={HAERAK_INTRO_CTA}
        /*  ★여기서는 이미 «하락이수 안» 이므로, 들어가는 단추가
         *     ⇒ 바로 «사람 고르기» 로 이어집니다. ⛔ 막다른 길이 아닙니다. */
        onStart={() => { setIntroOpen(false); setPickerOpen(true) }}
        onClose={() => setIntroOpen(false)}
      />
    </StorageShell>
  )
}

export default function HaerakStoragePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <HaerakStorageInner />
    </Suspense>
  )
}
