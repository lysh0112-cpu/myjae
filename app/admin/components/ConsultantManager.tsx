'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ConsultantForm, { ConsultantFormData, emptyForm } from './ConsultantForm'
import ConsultantTable from './ConsultantTable'
import { specialtyLabel } from './consultantData'
// DB가 돌려주는 영어 오류를 우리말로 바꾼다. (2026-07-21 2차)
//   화면에 영어 원문이 그대로 뜨면 무슨 뜻인지 알 수 없다.
function friendlyDbError(msg: string, name: string): string {
  const m = msg || ''
  // 외래키 위반 — 다른 표가 이 상담사를 붙들고 있다
  if (m.includes('violates foreign key constraint')) {
    if (m.includes('consultations')) {
      return `${name} 선생님에게 상담 기록이 남아 있어 삭제할 수 없어요.\n\n` +
             '대신 [비활] 로 바꾸면 고객 화면에는 보이지 않아요.'
    }
    if (m.includes('profiles')) {
      return `${name} 선생님이 회원 계정과 연결되어 있어 삭제할 수 없어요.\n\n` +
             '잠시 후 다시 시도해 주세요.'
    }
    if (m.includes('consultant_slots') || m.includes('bookings')) {
      return `${name} 선생님에게 예약이나 열어둔 시간이 남아 있어 삭제할 수 없어요.\n\n` +
             '대신 [비활] 로 바꾸면 고객 화면에는 보이지 않아요.'
    }
    return `${name} 선생님과 연결된 자료가 남아 있어 삭제할 수 없어요.\n\n` +
           '대신 [비활] 로 바꿔 주세요.'
  }
  // 권한 문제
  if (m.includes('permission denied') || m.includes('policy')) {
    return '삭제 권한이 없어요.\n\n관리자 계정으로 로그인했는지 확인해 주세요.'
  }
  // 그 밖 — 원문도 함께 보여준다(개발자가 볼 수 있게)
  return `삭제하지 못했어요.\n\n(${m})`
}

// 상담사별 "아직 살아 있는 예약" — 완료도 취소도 안 된 건들
export type PendingInfo = { count: number; names: string[] }

export default function ConsultantManager() {
  const [list, setList] = useState<ConsultantFormData[]>([])
  const [form, setForm] = useState<ConsultantFormData>(emptyForm)
  /** ★48부 7차 — 등록 폼 자리. 「수정」·「＋ 상담사 등록」이 여기로 내려갑니다 */
  const formRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  // ★2026-07-21 2차: 상담사별 진행중 예약을 목록에 미리 보여준다.
  //   삭제를 누르고 나서 실패하는 것보다, 왜 못 지우는지 미리 아는 편이 낫다.
  const [pending, setPending] = useState<Record<string, PendingInfo>>({})

  useEffect(() => { fetchList(); fetchPending() }, [])

  // 완료(completed)도 취소(cancelled/canceled)도 아닌 상담 = 아직 살아 있는 예약
  //   ⚠️ 취소 상태 철자가 두 가지로 섞여 쓰인다. 둘 다 걸러야 한다.
  async function fetchPending() {
    const { data, error } = await supabase
      .from('consultations')
      .select('consultant_id, customer_name, customer_phone, status, deleted_at')
    if (error) { console.error('진행중 예약 조회 실패:', error.message); return }

    const map: Record<string, PendingInfo> = {}
    for (const r of data ?? []) {
      const st = (r.status as string) || ''
      if (st === 'completed' || st === 'cancelled' || st === 'canceled') continue
      if (r.deleted_at) continue          // 취소 시각이 찍힌 건도 제외
      const cid = r.consultant_id as string
      if (!cid) continue
      // 이름이 없으면 전화번호 뒷 4자리로 대신 표시
      const phone = String(r.customer_phone || '')
      const nm = (r.customer_name as string)?.trim()
        || (phone ? `…${phone.slice(-4)}` : '이름없음')
      if (!map[cid]) map[cid] = { count: 0, names: [] }
      map[cid].count += 1
      map[cid].names.push(nm)
    }
    setPending(map)
  }

  async function fetchList() {
    const { data, error } = await supabase.from('consultants').select('*').order('sort').order('created_at')
    if (error) { alert('상담사 목록을 불러오지 못했어요.\n\n잠시 후 새로고침해 주세요.\n(' + error.message + ')'); return }
    if (data) setList(data)
  }
  async function handleSave() {
    if (!form.name || !form.phone || !form.email) return alert('이름, 전화번호, 이메일은 필수입니다')
    setLoading(true)
    const payload = {
      name: form.name,
      // ★48부 4차 — 별칭(호). 비면 손님 화면에 본명이 나갑니다.
      alias: form.alias?.trim() || null,
      phone: form.phone, email: form.email,
      // ★2026-08-06 (48부 3차) — 전문분야 «여러 개» [대표님 지시]
      //   specialties  ★price_key 배열 (예: ['saju','couple']) — 거르기에 쓸 값
      //   specialty    ★사람이 읽는 한 줄 — «손님 화면» 이 아직 이 칸을 읽습니다
      //                (consultant-select 의 상담사 이름 아래 한 줄)
      //   ⚠️ 둘을 «함께» 넣습니다. ⛔ 한쪽만 넣지 마십시오 —
      //      specialties 만 넣으면 손님 화면 한 줄이 «빈칸» 이 됩니다.
      specialties: form.specialties,
      specialty: specialtyLabel(form.specialties),
      price: form.price,
      bank: form.bank, account: form.account,
      region: form.region, commission_rate: form.commission_rate,
      commission_amount: form.commission_amount,
      photo_url: form.photo_url, career: form.career, intro: form.intro,
      rating: form.rating, review_count: form.review_count, review_text: form.review_text,
    }
    if (editing) {
      const { error } = await supabase.from('consultants')
        .update({ ...payload, active: form.active })
        .eq('id', form.id)
      if (error) { alert('수정하지 못했어요.\n\n잠시 후 다시 시도해 주세요.\n(' + error.message + ')'); setLoading(false); return }
    } else {
      const { error } = await supabase.from('consultants')
        .insert({ ...payload, active: true })
      if (error) { alert('등록하지 못했어요.\n\n이미 같은 이메일로 등록된 상담사가 있는지 확인해 주세요.\n(' + error.message + ')'); setLoading(false); return }
    }
    setForm(emptyForm)
    setEditing(false)
    setLoading(false)
    fetchList()
    // ★48부 7차 — 저장하면 ★목록(위)으로 올려 «결과를 보이게» 합니다.
    //   ⚠️ 폼이 아래로 갔으므로 그대로 두면 «빈 폼» 만 보고 있게 됩니다.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function handleDelete(id: string) {
    const target = list.find(c => c.id === id)
    const name = target?.name || '이 상담사'

    // ★① 상담 기록이 있으면 지우지 않는다. (2026-07-21 2차)
    //   consultations.consultant_id 가 이 상담사를 가리키므로, 지우면
    //   정산·취소내역·대시보드에서 상담사 이름이 깨진다.
    const { count, error: cntErr } = await supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('consultant_id', id)
    if (cntErr) { alert('상담 기록을 확인하지 못했어요.\n\n잠시 후 다시 시도해 주세요.'); return }
    if ((count ?? 0) > 0) {
      // 목록에 표시한 것과 같은 정보를 안내에도 넣는다.
      const p = pending[id]
      const who = p && p.names.length > 0
        ? `\n진행중 예약: ${p.names.slice(0, 3).join(' · ')}` +
          (p.count > 3 ? ` 외 ${p.count - 3}명` : '')
        : ''
      alert(
        `${name} 선생님은 상담 기록이 ${count}건 있어 삭제할 수 없어요.${who}\n\n` +
        '지우면 정산·취소내역에서 상담사 이름이 사라집니다.\n' +
        '대신 [비활] 로 바꾸면 고객 화면에는 보이지 않아요.'
      )
      return
    }

    // ★② 회원 계정과의 연결을 확인한다.
    //   profiles.consultant_id 가 이 상담사를 가리키면 외래키에 걸려 삭제가 실패한다.
    //     ERROR 23503: profiles_consultant_id_fkey
    //   이 칸은 "상담사가 자기 화면에 들어갈 때 본인 목록을 자동으로 찾는" 용도라
    //   (hooks/useConsultantState.ts) 연결만 끊으면 된다. 계정은 그대로 남는다.
    const { data: linked, error: linkErr } = await supabase
      .from('profiles').select('id, nickname').eq('consultant_id', id)
    if (linkErr) { alert('회원 연결을 확인하지 못했어요.\n\n잠시 후 다시 시도해 주세요.'); return }

    const who = (linked ?? []).map(p => p.nickname || '이름없음').join(', ')
    const msg = (linked && linked.length > 0)
      ? `${name} 선생님을 삭제할까요?\n\n` +
        `회원 계정(${who})과의 상담사 연결이 함께 끊어져요.\n` +
        '로그인 계정과 등급은 그대로 남습니다.\n\n되돌릴 수 없어요.'
      : `${name} 선생님을 삭제할까요?\n\n되돌릴 수 없어요.`
    if (!confirm(msg)) return

    // ③ 연결 끊기 — 이걸 먼저 해야 외래키에 안 걸린다.
    if (linked && linked.length > 0) {
      const { error: unlinkErr } = await supabase
        .from('profiles').update({ consultant_id: null }).eq('consultant_id', id)
      if (unlinkErr) { alert('회원 연결을 끊지 못했어요.\n\n잠시 후 다시 시도해 주세요.'); return }
    }

    // ④ 열어둔 시간(슬롯)도 정리한다. 안 그러면 고아로 남는다.
    const { error: slotErr } = await supabase
      .from('consultant_slots').delete().eq('consultant_id', id)
    if (slotErr) console.error('슬롯 정리 실패:', slotErr.message)

    // ★⑤ 몇 건이 지워졌는지 확인한다.
    //   .delete() 는 RLS 정책에 막혀도 오류를 내지 않는다.
    //   0건 삭제하고 성공으로 돌아오기 때문에, 예전에는 눌러도 그대로 남아 있었다.
    //   (14부 "조용히 실패하는 코드")
    const { data, error } = await supabase
      .from('consultants').delete().eq('id', id).select('id')
    if (error) { alert(friendlyDbError(error.message, name)); return }
    if (!data || data.length === 0) {
      alert('삭제되지 않았어요.\n\n권한(RLS 정책)을 확인해 주세요.\n우선 [비활] 로 바꿔두셔도 됩니다.')
      return
    }

    fetchList()
    fetchPending()
  }
  async function handleToggleActive(c: ConsultantFormData) {
    const { error } = await supabase.from('consultants').update({ active: !c.active }).eq('id', c.id)
    if (error) { alert('활성 상태를 바꾸지 못했어요.\n\n잠시 후 다시 시도해 주세요.\n(' + error.message + ')'); return }
    fetchList()
  }
  async function handleSaveSort(id: string, sort: number) {
    setList(prev => prev.map(c => c.id === id ? { ...c, sort } : c))
    const { error } = await supabase.from('consultants').update({ sort }).eq('id', id)
    if (error) { alert('순번을 저장하지 못했어요.\n\n잠시 후 다시 시도해 주세요.\n(' + error.message + ')'); fetchList(); return }
  }
  function handleEdit(c: ConsultantFormData) {
    // ★2026-08-06 (48부 3차) — DB 의 specialties 가 «없는» 옛 자료면 빈 배열로.
    //   ⚠️ null 이 그대로 들어오면 form.specialties.includes 에서 터집니다.
    setForm({ ...emptyForm, ...c, alias: c.alias ?? '', specialties: Array.isArray(c.specialties) ? c.specialties : [] })
    setEditing(true)
    // ★48부 7차 — 목록이 «위» 로 갔으므로 ★폼 자리로 내려갑니다.
    //   ⛔ scrollTo({ top: 0 }) 으로 되돌리지 마십시오. 폼이 안 보입니다.
    goForm()
  }

  /** ★48부 7차 — 등록 폼 자리로 내려갑니다 (목록이 위로 가서 필요해졌습니다) */
  function goForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <div>
      {/* ★2026-08-07 (48부 7차) — ★목록을 «위» 로 [대표님 지시]
          「상담사 리스트가 ★위로 가게 해야 관리하기 좋을 것 같은데」
          ⚠️ 전에는 등록 폼이 위, 목록이 아래였습니다 —
             상담사를 보려면 ★언제나 긴 폼을 지나 내려가야 했습니다.
          ⚠️ 자리를 바꾸면서 ★handleEdit 의 «스크롤» 도 함께 고쳤습니다.
             맨 위로 가면 이제 «목록» 이 나와 폼이 안 보입니다. */}
      <div className="rounded-2xl overflow-hidden mb-4"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-sm font-bold text-white">
            상담사 목록 <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>총 {list.length}명</span>
          </div>
          {/* ★폼이 «아래» 로 갔으니 바로 갈 수 있게 */}
          <button type="button" onClick={goForm}
            className="px-3 py-1 rounded-lg text-xs"
            style={{ background: 'rgba(250,199,117,0.12)', border: '1px solid rgba(250,199,117,0.3)', color: '#FAC775' }}>
            ＋ 상담사 등록
          </button>
        </div>
        <ConsultantTable
          list={list}
          pending={pending}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onSaveSort={handleSaveSort}
        />
      </div>

      <div ref={formRef}>
        <ConsultantForm
          form={form} editing={editing} loading={loading}
          onChange={setForm} onSave={handleSave}
          onCancel={() => { setForm(emptyForm); setEditing(false) }}
        />
      </div>
    </div>
  )
}
