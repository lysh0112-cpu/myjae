import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type CalType = '양력' | '음력'
export type Gender = '남' | '여'
export type RelationType = 'couple' | 'prewedding' | 'married' | 'birth'

export interface PersonInput {
  year: string
  month: string
  day: string
  hour: string
  leapMonth: string   // '0'=평달, '1'=윤달 (음력일 때만 의미)
  gender: Gender
  calType: CalType
  job: string
  mbti: string
}

export const DEFAULT_PERSON = (gender: Gender): PersonInput => ({
  year: '', month: '', day: '', hour: '-1', leapMonth: '0',
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

  // 복원이 끝나기 전에는 저장하지 않도록 막는 표시
  const restored = useRef(false)

  // 초기 로드
  // - 본인(person1): 로그인했으면 profiles(DB)에서 직접 읽어 채운다 (가장 안정적).
  //   profiles로 못 채우면 기존 sessionStorage('myinfo')로 폴백.
  // - person2(상대방)·관계·질문: localStorage에서 복원.
  //   ※ person1(내 사주)은 localStorage에 저장하지 않는다 → 공용기기 잔존 방지.
  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      // (1) 로그인한 본인 사주를 profiles에서 먼저 시도 (leap_month 포함)
      let filledFromProfile = false
      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
            .eq('id', u.user.id)
            .single()
          if (!cancelled && p && p.saju_saved && p.birth_year) {
            const bh = p.birth_hour
            const hourValue =
              bh === '모름' || bh == null || bh === '' ? '-1' : String(bh)
            setPerson1(prev => ({
              ...prev,
              gender: (p.gender ?? '남') as Gender,
              calType: (p.cal_type ?? '양력') as CalType,
              year: String(p.birth_year),
              month: String(p.birth_month ?? ''),
              day: String(p.birth_day ?? ''),
              hour: hourValue,
              leapMonth: p.leap_month != null ? String(p.leap_month) : '0',
            }))
            setAutoLoaded(true)
            filledFromProfile = true
          }
        }
      } catch {}

      // (2) profiles로 못 채웠으면 기존 sessionStorage('myinfo') 폴백 (비로그인 등)
      if (!filledFromProfile) {
        const myInfo = sessionStorage.getItem(MY_INFO_KEY)
        if (myInfo) {
          try {
            const info = JSON.parse(myInfo)
            if (!cancelled) {
              setPerson1(prev => ({
                ...prev,
                gender: info.gender || '남',
                calType: info.calType || '양력',
                year: info.year || '',
                month: info.month || '',
                day: info.day || '',
                hour: info.hour || '-1',
                leapMonth: info.leapMonth || '0',
              }))
              setAutoLoaded(true)
            }
          } catch {}
        }
      }

      // (3) 상대방(person2)·관계·질문만 localStorage에서 복원 (person1은 복원하지 않음)
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const data = JSON.parse(saved)
          if (!cancelled) {
            if (data.relation) setRelation(data.relation)
            if (data.person2) setPerson2({ ...DEFAULT_PERSON('여'), ...data.person2 })
            if (data.question) setQuestion(data.question)
          }
        } catch {}
      }

      // 복원이 모두 끝난 뒤에만 저장을 허용
      if (!cancelled) restored.current = true
    }

    loadInitial()
    return () => { cancelled = true }
  }, [])

  // 변경 시 localStorage에 저장 — 단, 복원이 끝난 뒤에만
  // ※ person1(내 사주)은 저장하지 않는다. relation·person2·question만 저장.
  useEffect(() => {
    if (!restored.current) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ relation, person2, question }))
  }, [relation, person2, question])

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
