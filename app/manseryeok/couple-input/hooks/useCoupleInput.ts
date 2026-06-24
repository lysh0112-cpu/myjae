import { useState, useEffect } from 'react'

export type CalType = '양력' | '음력'
export type Gender = '남' | '여'
export type RelationType = 'couple' | 'prewedding' | 'married' | 'birth'

export interface PersonInput {
  year: string
  month: string
  day: string
  hour: string
  gender: Gender
  calType: CalType
  job: string
  mbti: string
}

export const DEFAULT_PERSON = (gender: Gender): PersonInput => ({
  year: '', month: '', day: '', hour: '-1',
  gender, calType: '양력', job: '', mbti: ''
})

export const STORAGE_KEY = 'couple-input-data'
export const MY_INFO_KEY = 'myinfo'

export function useCoupleInput() {
  const [relation, setRelation] = useState<RelationType>('couple')
  const [person1, setPerson1] = useState<PersonInput>(DEFAULT_PERSON('남'))
  const [person2, setPerson2] = useState<PersonInput>(DEFAULT_PERSON('여'))
  const [question, setQuestion] = useState('')
  const [autoLoaded, setAutoLoaded] = useState(false)

  // 초기 로드 — localStorage에서 복원
  useEffect(() => {
    const myInfo = sessionStorage.getItem(MY_INFO_KEY)
    if (myInfo) {
      const info = JSON.parse(myInfo)
      setPerson1(prev => ({
        ...prev,
        gender: info.gender || '남',
        calType: info.calType || '양력',
        year: info.year || '',
        month: info.month || '',
        day: info.day || '',
        hour: info.hour || '-1',
      }))
      setAutoLoaded(true)
    }

    // localStorage에서 저장된 데이터 복원
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      if (data.relation) setRelation(data.relation)
      if (data.person2) setPerson2(data.person2)
      if (data.question) setQuestion(data.question)
    }
  }, [])

  // 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ relation, person1, person2, question }))
  }, [relation, person1, person2, question])

  // 전체 초기화
  const handleClear = () => {
    if (confirm('입력 내용을 모두 초기화할까요?')) {
      localStorage.removeItem(STORAGE_KEY)
      setRelation('couple')
      setPerson2(DEFAULT_PERSON('여'))
      setQuestion('')
    }
  }

  // person1 개별 초기화
  const handleClearPerson1 = () => {
    if (confirm('나의 정보를 초기화할까요?')) {
      setPerson1(DEFAULT_PERSON('남'))
      setAutoLoaded(false)
    }
  }

  // person2 개별 초기화
  const handleClearPerson2 = () => {
    if (confirm('상대방 정보를 초기화할까요?')) {
      setPerson2(DEFAULT_PERSON('여'))
    }
  }

  return {
    relation, setRelation,
    person1, setPerson1,
    person2, setPerson2,
    question, setQuestion,
    autoLoaded, handleClear,
    handleClearPerson1,
    handleClearPerson2,
  }
}
