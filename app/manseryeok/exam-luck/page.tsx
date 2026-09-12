'use client'

/**
 * 합격운 · 취업운 · 승진운 보관함
 * ─────────────────────────────────────────────
 * 진입: 홈 > [합격운/취업운 🐍] → /manseryeok/exam-luck
 * 흐름: 이 목록 > 카드 선택(그때 본 사람으로 다시보기)
 *              > [+ 새로 보기] > 사람 선택 모달 > exam-luck-input > exam-luck-result
 *
 * 데이터: listRecordsByService('examluck') — saju_records
 * ★진로적성 보관함(career/page.tsx)을 그대로 본떴다. 새로 설계하지 않는다.
 *   (작업지시 2장 — 같은 흐름·같은 얼개)
 *
 * ★2026-07-27 — "지금 준비하고 있어요" 껍데기를 실제 화면으로 바꿨다.
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

//    ★서비스 색(ACCENT)도 걷어냈습니다 — 배지까지 한 모습입니다.
// ⚠️ 2026-08-03 (44부 26차) — 보관함 «전용 색» 을 걷어냈습니다.
//    대표님 지시 「모두 통일해줘. 서비스별로 보관함을 차별화할 필요없어」
//    ⇒ 바탕·카드·선·버튼 색은 StorageShell 의 S 하나가 정합니다.

function personToQuery(d: SavedInputData, name: string): string {
  const p = new URLSearchParams()
  p.set('year', d.year); p.set('month', d.month); p.set('day', d.day)
  p.set('gender', d.gender); p.set('calType', d.calType)
  p.set('leapMonth', d.leapMonth || '0'); p.set('hour', d.hour || '모름')
  if (name) p.set('name', name)
  //  ★2026-09-11 (6부) — 저장해 둔 직종·날짜·학년 등도 주소에 다시 싣습니다 (검사 ㉓-a).
  //     결과 화면이 이 값들로 판정 카드를 «처음과 같이» 다시 만듭니다. 옛 기록에는 없을 수 있습니다.
  const extra = d as unknown as Record<string, unknown>
  for (const k of EXTRA_KEYS) {
    const v = extra[k]
    if (typeof v === 'string' && v) p.set(k, v)
  }
  return p.toString()
}

/** ★6부 — 결과 화면(ExamResultShell)이 saveRecord 에 함께 저장하는 값들 — 짝입니다 */
//  ★6부 — 두 단계 콤보의 방식(way)도 싣습니다. ⛔ 고민 글은 싣지 않습니다 (결과 화면이 기록에서 읽음).
const EXTRA_KEYS = ['examKind', 'examDate', 'studentGrade', 'gradeLevel', 'track',
  'examCategory', 'targetType', 'targetCustomText', 'way', 'sit', 'gates', 'jobs', 'dateApprox', 'schoolExam'] as const

function ExamLuckStorageInner() {
  const router = useRouter()
  const [records, setRecords] = useState<SajuRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<SajuRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    listRecordsByService('examluck').then(list => { if (!cancelled) setRecords(list) })
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
      title="합격운 · 취업운 · 승진운 보관함"
      count={records ? records.length : null}
      loading={records === null}
      showEmpty={!!records && records.length === 0}
      emptyIcon="🍀"
      emptyTitle={"아직 저장된 합격운 기록이 없어요"}
      emptyDesc={"새로 보면 여기에 차곡차곡 쌓여요"}
      actionLabel={"+ 새로 보기"}
      onAction={() => setPickerOpen(true)}
    >
        {records && records.map(r => (
          <StorageRow key={r.id} onClick={() => {
              /**
               * ★2026-07-30 — 저장할 때 함께 남긴 target 으로 «되돌아갈 화면» 을 가릅니다.
               *   ⚠️ 옛 기록에는 target 이 없습니다. 그때는 진학 화면으로 보냅니다.
               *      진학 화면이 저장본을 그대로 보여 주므로 글이 사라지지는 않습니다.
               *      (성인 기록이면 화면 제목과 맺음말만 학생 결로 보입니다 — 새로 발행하면 맞아집니다)
               */
              /*  🔴 ★2026-09-13 (7부) [대표님이 보관함에서 찾아내심] —
               *    승진운으로 본 기록을 다시 열면 ★«취업운» 화면으로 갔습니다.
               *    제목 · 연표(다섯 해) · 머리글이 다 취업운 것이 되었습니다.
               *    ⇒ 저장해 둔 sit='promote' 를 보고 ★승진 화면으로 보냅니다.
               *    ⛔ 이 갈래를 지우지 마십시오 (검사 51 ⑲). */
              const d = r.inputData as {
                target?: string; kind?: string; sit?: string
                pJob?: string; pCur?: string | number; pNext?: string | number
                pGate?: string; pYears?: string; pSeason?: string
              }
              const isPromo = d?.sit === 'promote'
              const to = isPromo
                ? '/manseryeok/promotion-luck-result'
                : d?.target === 'adult'
                  ? '/manseryeok/job-luck-result'
                  : '/manseryeok/exam-luck-result'
              const extra = d?.kind ? `&kind=${d.kind}` : ''
              //  ★승진은 재료(직업 · 직급 · 문 · 대상연차 · 인사 시기)를 함께 실어야
              //    다시 열 때도 «같은 글» 이 나옵니다. ⛔ 고민 글은 싣지 않습니다.
              const promo = isPromo
                ? '&sit=promote&gates=' + ([
                    ['pJob', d.pJob], ['pCur', d.pCur], ['pNext', d.pNext],
                    ['pGate', d.pGate], ['pYears', d.pYears], ['pSeason', d.pSeason],
                  ] as Array<[string, unknown]>)
                    .filter(([, v]) => v != null && v !== '')
                    .map(([k, v]) => `&${k}=${encodeURIComponent(String(v))}`).join('')
                : ''
              router.push(`${to}?${personToQuery(r.inputData, r.title)}&recordId=${r.id}${extra}${promo}`)
            }} onDelete={() => setConfirmDel(r)}>
            <div style={{
              minWidth: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: S.btn, color: '#fff', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {(r.title || '?').slice(0, 2)}
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
        ))}

        <div style={{
          marginTop: 14, background: S.card, border: `0.5px solid ${S.line}`, borderRadius: 12,
          padding: '11px 14px', fontSize: 11.5, color: S.sub, lineHeight: 1.7,
        }}>
          시험 · 일자리 · 자리의 흐름을 봅니다. 사주가 말해 주는 건 흐름이고,
          결과를 만드는 건 준비한 시간이에요.
        </div>

      {/* 🔴 ★2026-09-09 — «사람» 갈래를 «결과» 와 갈랐습니다  [대표님 지시]
          「조회한 1건에 대해 ★2개 이상 복수로 보관함에 들어가 있네」
          [까닭]  saju_records 한 표에 「사람」과 「결과」가 «함께» 들어가는데
             둘이 ★같은 갈래 이름을 써서 보관함 목록에 둘 다 나왔습니다.
          ⇒ 궁합이 «이미» 쓰던 방식(couple_person)을 그대로 따릅니다.
          ⛔⛔ serviceType 을 ★'examluck' 로 되돌리지 마십시오 — 두 개로 다시 보입니다.
          ⚠️ 사람 목록(listSavedPeople)도 ★이 값으로 찾습니다 — 저장·조회가 한 짝입니다.
          ⛔ 이 주석을 ★속성 «사이» 에 넣지 마십시오 — 화면이 통째로 안 뜹니다 (58부). */}
      <PersonPickerModal
        open={pickerOpen}
        serviceLabel="합격운"
        serviceType="examluck_person"
        headline="누구의 합격운을 볼까요?"
        submitLabel="저장하고 합격운 보기"
        onPick={(person: SavedPerson) => {
          setPickerOpen(false)
          router.push(`/manseryeok/exam-luck-input?${toResultQuery(person)}`)
        }}
        onPickMe={async () => {
          // ★2026-09-11 (6부) [대표님 · 목업 승낙] — 「나」 를 넘깁니다 (다른 여섯 서비스와 같이).
          //   [전] 이 창만 「나」 가 없어, 본인을 보려면 자기를 사람으로 따로 저장해야 했습니다.
          //   ⚠️ 입력 화면이 주소로 사람을 받으므로, 회원 정보로 주소를 만들어 넘깁니다 (myResultQuery).
          //   ⛔ 빼지 마십시오 — 검사 ㉒-x 가 창마다 봅니다.
          //   ⛔ 이 주석을 창의 속성 «사이» 로 옮기지 마십시오 (58부 — 화면이 통째로 안 뜬 일).
          const q = await myResultQuery()
          setPickerOpen(false)
          if (!q) { alert('내 사주 정보를 불러오지 못했어요. 마이페이지에서 먼저 저장해 주세요.'); return }
          router.push(`/manseryeok/exam-luck-input?${q}`)
        }}
        onClose={() => setPickerOpen(false)}
      />

      {confirmDel && (
        <ConfirmDeleteDialog
          open
          message={<>{confirmDel.title || '이름 없음'}의 합격운·취업운 기록을 삭제해요.</>}
          busy={deleting}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </StorageShell>
  )
}

export default function ExamLuckStoragePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <ExamLuckStorageInner />
    </Suspense>
  )
}
