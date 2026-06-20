import { useState, useEffect } from 'react'

export function formatBirth(val: string) {
  const n = val.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 4) return n
  if (n.length <= 6) return `${n.slice(0,4)}.${n.slice(4)}`
  return `${n.slice(0,4)}.${n.slice(4,6)}.${n.slice(6)}`
}

export function useInputForm(
  onSubmit: (params: Record<string, string>) => void,
  initialGender?: '남' | '여',
  initialCalType?: '양력' | '음력',
  initialBirth?: string,
  initialHourIdx?: number | null,
) {
  const [birthInput, setBirthInput] = useState(initialBirth || '')
  const [hourIdx, setHourIdx] = useState<number | null>(initialHourIdx ?? null)
  const [gender, setGender] = useState<'남' | '여'>(initialGender || '남')
  const [calType, setCalType] = useState<'양력' | '음력'>(initialCalType || '양력')
  const [customerName, setCustomerName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { if (initialGender) setGender(initialGender) }, [initialGender])
  useEffect(() => { if (initialCalType) setCalType(initialCalType) }, [initialCalType])
  useEffect(() => { if (initialBirth) setBirthInput(initialBirth) }, [initialBirth])
  useEffect(() => { if (initialHourIdx !== undefined) setHourIdx(initialHourIdx ?? null) }, [initialHourIdx])

  function handleSubmit() {
    const digits = birthInput.replace(/\D/g, '')
    if (digits.length !== 8) {
      setError('생년월일 8자리를 입력해주세요 (예: 19980105)')
      return
    }
    const year = digits.slice(0, 4)
    const month = digits.slice(4, 6)
    const day = digits.slice(6, 8)
    setError('')
    onSubmit({
      gender, calType,
      year: String(parseInt(year)),
      month: String(parseInt(month)),
      day: String(parseInt(day)),
      hour: hourIdx !== null ? String(hourIdx) : '모름',
      customerName,
    })
  }

  return {
    birthInput, setBirthInput,
    hourIdx, setHourIdx,
    gender, setGender,
    calType, setCalType,
    customerName, setCustomerName,
    error, handleSubmit,
  }
}
