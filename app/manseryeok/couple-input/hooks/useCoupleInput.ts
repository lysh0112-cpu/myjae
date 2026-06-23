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
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      if (data.relation) setRelation(data.relation)
      if (data.person2) setPerson2(data.person2)
      if (data.question) setQuestion(data.question)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ relation, person1, person2, question }))
  }, [relation, person1, person2, question])

  const handleClear = () => {
    if (confirm('입력 내용을 초기화할까요?')) {
      sessionStorage.removeItem(STORAGE_KEY)
      setRelation('couple')
      setPerson2(DEFAULT_PERSON('여'))
      setQuestion('')
    }
  }

  return {
    relation, setRelation,
    person1, setPerson1,
    person2, setPerson2,
    question, setQuestion,
    autoLoaded, handleClear,
  }
}
