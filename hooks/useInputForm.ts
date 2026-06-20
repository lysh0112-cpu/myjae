import { useState } from 'react'

function timeToHourIdx(timeStr: string): number | null {
  if (!timeStr || timeStr.length < 3) return null
  const h = parseInt(timeStr.slice(0, 2))
  const m = parseInt(timeStr.slice(2, 4) || '0')
  const total = h * 60 + m
  if (total >= 1410 || total < 90) return 0
  if (total < 210) return 1
  if (total < 330) return 2
  if (total < 450) return 3
  if (total < 570) return 4
  if (total < 690) return 5
  if (total < 810) return 6
  if (total < 930) return 7
  if (total < 1050) return 8
  if (total < 1170) return 9
  if (total < 1290) return 10
  if (total < 1410) return 11
  return 0
}

export function formatBirth(val: string) {
  const n = val.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 4) return n
  if (n.length <= 6) return `${n.slice(0,4)}.${n.slice(4)}`
  return `${n.slice(0,4)}.${n.slice(4,6)}.${n.slice(6)}`
}

export { timeToHourIdx }

export function useInputForm(
  onSubmit: (params: Record<string, string>) => void,
  initialGender?: '남' | '여',
  initialCalType?: '양력' | '음력',
  initialBirth?: string,
  initialHour?: string,
) {
  const [birthInput, setBirthInput] = useState(initialBirth || '')
  const [timeInput, setTimeInput] = useState(initialHour || '')
  const [noTime, setNoTime] = useState(!initialHour || initialHour === '모름')
  const [gender, setGender] = useState<'남' | '여'>(initialGender || '남')
  const [calType, setCalType] = useState<'양력' | '음력'>(initialCalType || '양력')
  const [customerName, setCustomerName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    const digits = birthInput.replace(/\D/g, '')
    if (digits.length !== 8) {
      setError('생년월일 8자리를 입력해주세요 (예: 19980105)')
      return
    }
    const year = digits.slice(0, 4)
    const month = digits.slice(4, 6)
    const day = digits.slice(6, 8)
    let hourIdx = '모름'
    if (!noTime && timeInput.length >= 3) {
      const idx = timeToHourIdx(timeInput)
      hourIdx = idx !== null ? String(idx) : '모름'
    }
    setError('')
    onSubmit({
      gender, calType,
      year: String(parseInt(year)),
      month: String(parseInt(month)),
      day: String(parseInt(day)),
      hour: hourIdx,
      customerName,
    })
  }

  return {
    birthInput, setBirthInput,
    timeInput, setTimeInput,
    noTime, setNoTime,
    gender, setGender,
    calType, setCalType,
    customerName, setCustomerName,
    error, handleSubmit,
  }
}
