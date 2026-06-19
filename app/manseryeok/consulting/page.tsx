'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Consultant = {
  id: string
  name: string
  specialty: string
  price: number
  active: boolean
}

type Step = 'select' | 'phone' | 'pay' | 'chat'

export default function ConsultingPage() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('select')
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [selected, setSelected] = useState<Consultant | null>(null)
  const [phone, setPhone] = useState('')
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payMethod, setPayMethod] = useState<string>('휴대폰 결제')

  const gender = searchParams.get('gender') ?? ''
  const calType = searchParams.get('calType') ?? '양력'
  const year = searchParams.get('year') ?? ''
  const month = searchParams.get('month') ?? ''
  const day = searchParams.get('day') ?? ''
  const hour = searchParams.get('hour') ?? ''
  const birthData = { gender, calType, year, month, day, hour }

  useEffect(() => { fetchConsultants() }, [])

  async function fetchConsultants() {
    const { data } = await supabase
      .from('consultants')
      .select('id, name, specialty, price, active')
      .eq('active', true)
      .order('name')
    if (data) setConsultants(data)
  }

  function formatPhone(value: string) {
    const n = value.replace(/\D/g, '')
    if (n.length <= 3) return n
    if (n.length <= 7) return `${n.slice(0,3)}-${n.slice(3)}`
    return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7,11)}`
  }

  async function handlePhoneSubmit() {
    if (phone.replace(/\D/g, '').length < 10) {
      setError('올바른 핸드폰 번호를 입력해주세요')
      return
    }
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      await supabase
        .from('customers')
        .upsert({ phone: phone.replace(/\D/g, '') }, { onConflict: 'phone' })

      const { data, error } = await supabase
        .from('consultations')
        .insert({
          customer_phone: phone.replace(/\D/g, ''),
          consultant_id: selected.id,
          birth_data: birthData,
          status: 'pending'
        })
        .select('id')
        .single()

      if (error) throw error
      setConsultationId(data.id)
      setStep('pay')
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePayComplete() {
    if (!consultationId || !selected) return
    await supabase
      .from('payments')
      .insert({
        consultation_id: consultationId,
        amount: selected.price,
        method: payMethod,
        status: 'done'
      })
    await supabase
      .from('consultations')
      .update({ status: 'paid', paid_amount: selected.price })
      .eq('id', consultationId)
    setStep('chat')
  }

  // ── 1단계: 상담사 선택 ──
  if (step === 'select') return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-amber-400 mb-1">명연재 상담</h1>
        <p className="text-stone-400 text-sm mb-6">상담사를 선택해주세요</p>
        {consultants.length === 0 ? (
          <div className="text-center text-stone-500 py-20">현재 활동중인 상담사가 없습니다</div>
        ) : (
          <div className="space-y-3">
            {consultants.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelected(c); setStep('phone') }}
                className="w-full text-left bg-stone-900 border border-stone-700 hover:border-amber-500 rounded-xl p-4 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg">{c.name}</div>
                    <div className="text-stone-400 text-sm mt-1">{c.specialty}</div>
                  </div>
                  <div className="text-amber-400 font-bold text-lg">
                    {c.price.toLocaleString()}원
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── 2단계: 핸드폰 입력 ──
  if (step === 'phone') return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setStep('select')} className="text-stone-400 text-sm mb-6 flex items-center gap-1">
          ← 상담사 선택으로
        </button>
        <h2 className="text-xl font-bold text-amber-400 mb-1">연락처 입력</h2>
        <p className="text-stone-400 text-sm mb-6">
          상담 연결을 위해 핸드폰 번호를 입력해주세요<br/>
          <span className="text-stone-500 text-xs">별도 회원가입 없이 번호로 상담방이 열립니다</span>
        </p>
        <div className="bg-stone-900 rounded-xl p-4 mb-4 border border-stone-700">
          <div className="text-stone-400 text-sm">선택한 상담사</div>
          <div className="font-bold text-lg mt-1">{selected?.name}</div>
          <div className="text-amber-400">{selected?.price.toLocaleString()}원</div>
        </div>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          maxLength={13}
          className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-lg text-center tracking-widest focus:outline-none focus:border-amber-500"
        />
        {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
        <button
          onClick={handlePhoneSubmit}
          disabled={loading || phone.replace(/\D/g, '').length < 10}
          className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 rounded-xl transition-all disabled:opacity-40"
        >
          {loading ? '처리중...' : '다음 — 결제하기'}
        </button>
      </div>
    </div>
  )

  // ── 3단계: 결제 ──
  if (step === 'pay') return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setStep('phone')} className="text-stone-400 text-sm mb-6 flex items-center gap-1">
          ← 연락처 입력으로
        </button>
        <h2 className="text-xl font-bold text-amber-400 mb-6">결제</h2>
        <div className="bg-stone-900 rounded-xl p-5 border border-stone-700 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-stone-400">상담사</span>
            <span className="font-bold">{selected?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">연락처</span>
            <span>{phone}</span>
          </div>
          <div className="border-t border-stone-700 pt-3 flex justify-between">
            <span className="text-stone-400">결제 금액</span>
            <span className="text-amber-400 font-bold text-lg">{selected?.price.toLocaleString()}원</span>
          </div>
        </div>

        <p className="text-stone-400 text-sm mb-3">결제 수단 선택</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['휴대폰 결제', '계좌이체', '카카오페이'].map((m) => (
            <button
              key={m}
              onClick={() => setPayMethod(m)}
              className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                payMethod === m
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-stone-700 text-stone-400 bg-stone-900'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={handlePayComplete}
          className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 rounded-xl transition-all"
        >
          토스페이먼츠로 결제하기
        </button>
        <p className="text-center text-stone-500 text-xs mt-3">결제 후 즉시 상담방이 열립니다</p>
      </div>
    </div>
  )

  // ── 4단계: 채팅방 ──
  if (step === 'chat') return (
    <ChatRoom
      consultationId={consultationId!}
      consultantName={selected?.name ?? ''}
      customerPhone={phone}
    />
  )

  return null
}

// ── 채팅방 컴포넌트 ──
type Message = {
  id: string
  sender: string
  message: string
  created_at: string
}

function ChatRoom({
  consultationId,
  consultantName,
  customerPhone,
}: {
  consultationId: string
  consultantName: string
  customerPhone: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchMessages()
    const channel = supabase
      .channel(`chat:${consultationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `consultation_id=eq.${consultationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [consultationId])

  async function fetchMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at')
    if (data) setMessages(data)
  }

  async function sendMessage() {
    if (!input.trim()) return
    setSending(true)
    await supabase.from('chat_messages').insert({
      consultation_id: consultationId,
      sender: 'customer',
      message: input.trim(),
    })
    setInput('')
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <div className="bg-stone-900 border-b border-stone-700 px-4 py-3">
        <div className="font-bold">{consultantName} 상담사</div>
        <div className="text-stone-400 text-xs">{customerPhone}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-stone-500 py-10 text-sm">
            상담사가 곧 입장합니다<br/>궁금한 점을 먼저 입력해주세요
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
              m.sender === 'customer'
                ? 'bg-amber-500 text-stone-950'
                : m.sender === 'summary'
                ? 'bg-stone-700 text-stone-100 whitespace-pre-wrap w-full max-w-sm'
                : 'bg-stone-800 text-stone-100'
            }`}>
              {m.sender === 'summary' && (
                <div className="text-amber-400 text-xs font-bold mb-2">📋 상담 요약</div>
              )}
              {m.message}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-stone-900 border-t border-stone-700 px-4 py-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="메시지를 입력하세요"
          className="flex-1 bg-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50"
        >
          전송
        </button>
      </div>
    </div>
  )
}
