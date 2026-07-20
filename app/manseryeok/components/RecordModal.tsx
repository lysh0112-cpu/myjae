// app/manseryeok/components/RecordModal.tsx
// ============================================================================
// "사주 기록" 모달 — 공용. 홈 12개 서비스가 함께 쓴다.
// ----------------------------------------------------------------------------
// 사람을 고른 뒤, 그 사람+서비스의 지난 기록이 있으면 이 모달을 띄운다.
// 사주아이처럼: "○○님의 사주 기록 · N일 전 · [새 해설 보려가기]"
//   - 지난 기록 줄을 누르면 → onOpenPast(기록)  (이전 해설 다시보기)
//   - "새 해설 보려가기" → onNew()             (질문 새로 고르고 새 통변)
//   - 기록이 하나도 없으면 이 모달을 띄우지 않고 바로 새로 보기 (부모가 판단)
//
// props:
//   open        : 표시 여부
//   personName  : 대상 이름
//   serviceLabel: 서비스 이름(예: "사주해설")
//   records     : 지난 기록 목록 (listRecords 결과)
//   onOpenPast  : 지난 기록 선택 시
//   onNew       : 새로 보기
//   onClose     : 닫기
// ============================================================================

'use client'

import type { SajuRecord } from '@/lib/saju/sajuRecords'
import { daysAgoLabel } from '@/lib/saju/sajuRecords'
import { withNim } from '@/lib/saju/honorific'

const C = {
  overlay: 'rgba(60,40,30,0.35)',
  cardBg: '#FFFBF7',
  border: '#f0e0d5',
  divider: '#f5e5da',
  point: '#c8783c',
  brown: '#b46e46',
  title: '#3a2e28',
  titleWarm: '#96502e',
  sub: '#b4785a',
  subLight: '#c5a590',
}

export interface RecordModalProps {
  open: boolean
  personName: string
  serviceLabel?: string
  records: SajuRecord[]
  onOpenPast: (record: SajuRecord) => void
  onNew: () => void
  onClose: () => void
}

export default function RecordModal({
  open, personName, serviceLabel = '사주해설', records, onOpenPast, onNew, onClose,
}: RecordModalProps) {
  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '340px', background: C.cardBg, borderRadius: '18px', border: `0.5px solid ${C.border}`, overflow: 'hidden' }}
      >
        {/* 헤더 */}
        <div style={{ padding: '16px 18px 12px', borderBottom: `0.5px solid ${C.divider}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.title }}>{withNim(personName)}의 {serviceLabel} 기록</div>
            <div style={{ fontSize: '11px', color: C.sub, marginTop: '3px' }}>지난 해설을 다시 보거나, 새로운 고민을 들어보세요</div>
          </div>
          <button type="button" onClick={onClose} style={{ color: C.subLight, fontSize: '17px', cursor: 'pointer', lineHeight: 1, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>✕</button>
        </div>

        {/* 지난 기록 목록 */}
        <div style={{ padding: '10px 14px', maxHeight: '260px', overflowY: 'auto' }}>
          {records.length === 0 ? (
            <div style={{ padding: '20px 8px', textAlign: 'center', color: C.subLight, fontSize: '12px' }}>
              아직 본 기록이 없어요. 첫 해설을 받아보세요.
            </div>
          ) : (
            records.map((r) => (
              <div
                key={r.id}
                onClick={() => onOpenPast(r)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 12px', border: `0.5px solid ${C.border}`, borderRadius: '11px', marginBottom: '8px', cursor: 'pointer', background: '#fff' }}
              >
                <span style={{ fontSize: '15px', color: C.point }}>✦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: C.title, fontWeight: 600 }}>{daysAgoLabel(r.createdAt)}</div>
                  <div style={{ fontSize: '10px', color: C.subLight, marginTop: '1px' }}>
                    {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <span style={{ color: C.subLight, fontSize: '14px' }}>›</span>
              </div>
            ))
          )}
        </div>

        {/* 새 해설 버튼 */}
        <div style={{ padding: '10px 14px 16px' }}>
          <button
            onClick={onNew}
            style={{ width: '100%', height: '46px', background: C.brown, border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            + 새 해설 보러가기
          </button>
        </div>
      </div>
    </div>
  )
}
