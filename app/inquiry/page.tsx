'use client'
// app/inquiry/page.tsx
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-07 (48부 8차) — 💬 문의사항  [대표님 지시]
//    「질문 예시를 몇 개 만들어 놓고 계속 표시하되,
//      특정 고객이 등록하면 ★본인 화면에만 보이고
//      다른 고객 화면에는 안 보이는 걸로」
//    「그 질문들 중 좋은 내용은 ★선별적으로 공유」
//    「답변은 ★마스터인 류승현과 오연희 두 사람만 가능」
//    「로그인 안 한 사람은 ★볼 필요가 없도록」
//
//  ★무엇이 보이나 — 셋을 합칩니다
//     is_sample   대표님이 미리 넣어 둔 ★예시. 언제나 보입니다.
//     is_public   대표님이 좋다고 골라 ★공개로 바꾼 것
//     내가 쓴 것   ★나만 보입니다 (다른 손님에게는 안 보임)
//
//  ⚠️⚠️ ★거르기는 «DB 정책(RLS)» 이 합니다 — 화면이 아닙니다.
//     inquiries_select : auth.uid() IS NOT NULL
//                        AND (is_public OR is_sample OR user_id = auth.uid())
//     ⇒ ★화면 코드를 뚫어도 남의 글은 «안 옵니다». 그래서 안전합니다.
//     ⛔ 화면에서 다시 거르지 마십시오. 두 겹이 되면 어긋납니다.
//
//  ⚠️ ★공개된 글에 «이름을 안 냅니다» —
//     사주 문의는 사적인 것이 섞이기 쉽고, 닉네임만으로도 아는 사람은 압니다.
//     ⛔ 이름·닉네임을 붙이지 마십시오. 대표님과 의논해 정한 것입니다.
//
//  ⛔ ★답변·공개 전환은 «여기서 못 합니다». 관리자 「문의 관리」 탭에서 합니다.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import HomeBottomNav from '@/app/components/HomeBottomNav'

type Inquiry = {
  id: string
  user_id: string | null
  title: string
  body: string
  is_public: boolean
  is_sample: boolean
  answer: string | null
  answered_at: string | null
  created_at: string
}

function dateText(s: string) {
  const d = new Date(s)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

export default function InquiryPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [list, setList] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Set<string>>(new Set())

  const [writing, setWriting] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUid(data.user?.id ?? null)
      setChecked(true)
    })
  }, [])

  // ⚠️⚠️ ★useEffect 안에서 setState 를 부르면 react-hooks 가 ★오류로 잡습니다
  //    (47부 1-7 · eslint 기준선이 깨집니다).
  //    ⇒ ★«그릴 때» 견주어 곧바로 바꿉니다.
  //    ⛔ useEffect 로 되돌리지 마십시오.
  const [lastKey, setLastKey] = useState('')
  const key = `${checked}:${uid ?? ''}`
  if (key !== lastKey) {
    setLastKey(key)
    if (checked) {
      if (uid) load()
      else setLoading(false)
    }
  }

  async function load() {
    // ⚠️ ★거르기는 RLS 가 합니다. 여기서 조건을 더 걸지 않습니다.
    const { data } = await supabase
      .from('inquiries')
      .select('id, user_id, title, body, is_public, is_sample, answer, answered_at, created_at')
      .order('created_at', { ascending: false })
    setList((data ?? []) as Inquiry[])
    setLoading(false)
  }

  async function submit() {
    if (!title.trim() || !body.trim()) { alert('제목과 내용을 넣어 주세요.'); return }
    if (!uid) return
    setSaving(true)
    const { error } = await supabase.from('inquiries').insert({
      user_id: uid, title: title.trim(), body: body.trim(),
    })
    setSaving(false)
    if (error) { alert('등록하지 못했어요.\n\n잠시 후 다시 시도해 주세요.\n(' + error.message + ')'); return }
    setTitle(''); setBody(''); setWriting(false)
    load()
  }

  const toggle = (id: string) => setOpen(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  // ★로그인 안 하면 «아무것도» 안 보입니다 [대표님 지시]
  if (checked && !uid) {
    return (
      <div style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 430, margin: '0 auto', paddingBottom: 76 }}>
        <div style={{ padding: '18px 16px 12px', background: '#FFFBF7', borderBottom: '0.5px solid #e8d9c9' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#3a2e28' }}>문의사항</div>
        </div>
        <div style={{ padding: '60px 24px', textAlign: 'center', fontSize: 13.5, color: '#8a7461', lineHeight: 1.9 }}>
          로그인하시면 문의를 남기고<br />답변을 받아보실 수 있어요.
          <button onClick={() => router.push('/auth/login')}
            style={{
              display: 'block', width: '100%', marginTop: 20, height: 44,
              background: '#b46e46', color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
            }}>
            로그인하기
          </button>
        </div>
        <HomeBottomNav />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 430, margin: '0 auto', paddingBottom: 76 }}>
      <div style={{ padding: '18px 16px 12px', background: '#FFFBF7', borderBottom: '0.5px solid #e8d9c9' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#3a2e28' }}>문의사항</div>
            <div style={{ fontSize: 12, color: '#8a7461', marginTop: 4 }}>
              궁금한 것을 남겨 주시면 답변해 드려요
            </div>
          </div>
          <button onClick={() => setWriting(v => !v)}
            style={{
              marginLeft: 'auto', height: 34, padding: '0 14px',
              background: writing ? '#f2eee9' : '#b46e46',
              color: writing ? '#8a7461' : '#fff',
              border: 'none', borderRadius: 9, fontSize: 12.5,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>
            {writing ? '닫기' : '문의 남기기'}
          </button>
        </div>
      </div>

      {writing && (
        <div style={{ padding: 14, background: '#FFFBF7', borderBottom: '0.5px solid #e8d9c9' }}>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="어떤 것이 궁금하세요?"
            style={{
              width: '100%', height: 42, padding: '0 12px', fontSize: 13.5,
              border: '1px solid #ea8c46', borderRadius: 9, background: '#fff',
              fontFamily: 'inherit', color: '#3a2e28', outline: 'none',
            }} />
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="자세히 적어 주시면 더 정확히 답변해 드릴 수 있어요."
            rows={5}
            style={{
              width: '100%', marginTop: 8, padding: '10px 12px', fontSize: 13.5,
              border: '1px solid #ea8c46', borderRadius: 9, background: '#fff',
              fontFamily: 'inherit', color: '#3a2e28', outline: 'none',
              lineHeight: 1.8, resize: 'vertical',
            }} />
          {/* ★손님이 «누가 보는지» 알아야 마음 놓고 씁니다 */}
          <div style={{ fontSize: 11.5, color: '#8a7461', margin: '8px 2px 0', lineHeight: 1.7 }}>
            남기신 문의는 <b style={{ color: '#96502e' }}>회원님과 저희만</b> 봅니다.
            다른 분들께 도움이 될 내용은 여쭤본 뒤 함께 나눌 수 있어요.
          </div>
          <button onClick={submit} disabled={saving}
            style={{
              width: '100%', marginTop: 10, height: 44,
              background: saving ? '#d8c5b5' : '#b46e46', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14,
              fontFamily: 'inherit', cursor: saving ? 'default' : 'pointer',
            }}>
            {saving ? '보내는 중…' : '문의 보내기'}
          </button>
        </div>
      )}

      <div style={{ padding: 14 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#8a7461' }}>불러오는 중…</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#8a7461' }}>
            아직 문의가 없어요.
          </div>
        ) : (
          list.map((q) => {
            const isMine = !!uid && q.user_id === uid
            const isOpen = open.has(q.id)
            return (
              <div key={q.id} style={{
                background: '#fff', border: '1px solid #ea8c46', borderRadius: 12,
                marginBottom: 10, overflow: 'hidden',
              }}>
                <button onClick={() => toggle(q.id)}
                  style={{
                    width: '100%', padding: '13px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {isMine && (
                        <span style={{
                          fontSize: 10.5, color: '#8f3d0e', background: '#fdf0e8',
                          padding: '2px 7px', borderRadius: 5,
                        }}>내 문의</span>
                      )}
                      {/* ⚠️ 내 글이 «아직 나만 보이는» 상태임을 알려 줍니다 */}
                      {isMine && !q.is_public && (
                        <span style={{ fontSize: 10.5, color: '#a08d7d' }}>나만 보임</span>
                      )}
                      {q.answer && (
                        <span style={{
                          fontSize: 10.5, color: '#0F6E56', background: '#E1F5EE',
                          padding: '2px 7px', borderRadius: 5,
                        }}>답변 완료</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: '#3a2e28', marginTop: 4, lineHeight: 1.5 }}>
                      {q.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#a08d7d', marginTop: 3 }}>
                      {dateText(q.created_at)}
                    </div>
                  </div>
                  <span aria-hidden style={{
                    color: '#96502e', fontSize: 16, lineHeight: 1, marginTop: 4,
                    transition: 'transform .2s', transform: `rotate(${isOpen ? 180 : 0}deg)`,
                  }}>▾</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <div style={{
                      fontSize: 13, color: '#4a3f38', lineHeight: 1.9,
                      paddingLeft: 10, borderLeft: '1px solid #ea8c46', whiteSpace: 'pre-line',
                    }}>
                      {q.body}
                    </div>
                    {q.answer ? (
                      <div style={{
                        marginTop: 11, padding: '11px 13px', background: '#faf3ec', borderRadius: 9,
                        fontSize: 13, color: '#3a2e28', lineHeight: 1.9, whiteSpace: 'pre-line',
                      }}>
                        <div style={{ fontSize: 11.5, color: '#96502e', marginBottom: 5 }}>답변</div>
                        {q.answer}
                      </div>
                    ) : (
                      <div style={{ marginTop: 11, fontSize: 12, color: '#a08d7d' }}>
                        답변을 준비하고 있어요.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <HomeBottomNav />
    </div>
  )
}
