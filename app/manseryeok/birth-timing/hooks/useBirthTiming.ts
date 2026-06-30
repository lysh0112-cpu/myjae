import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type CalType = '양력' | '음력'
export type Gender = '남' | '여'

// 부모 사주 입력 — 궁합의 PersonInput과 동일 구조 (PersonForm 재활용 위해)
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
  gender, calType: '양력', job: '', mbti: '',
})

// 출산택일 설문 답변
export interface BirthSurvey {
  dueDate: string          // 출산예정일 'YYYY-MM-DD'
  method: string           // '제왕절개' | '유도분만' | '미정'
  timePref: string         // '평일오전' | '평일오후' | '상관없음'
  babyGender: string       // '아들' | '딸' | '상관없음'
  wishes: string[]         // ['건강','공부','재물','인덕','부모화목']
  avoidNote: string        // 피하고 싶은 날 (자유 입력)
}

const DEFAULT_SURVEY: BirthSurvey = {
  dueDate: '',
  method: '제왕절개',
  timePref: '상관없음',
  babyGender: '상관없음',
  wishes: [],
  avoidNote: '',
}

const STORAGE_KEY = 'birth-timing-data'
const MY_INFO_KEY = 'myinfo'

export function useBirthTiming() {
  // 부모1 = 본인(자동입력 대상), 부모2 = 배우자
  const [parent1, setParent1] = useState<PersonInput>(DEFAULT_PERSON('남'))
  const [parent2, setParent2] = useState<PersonInput>(DEFAULT_PERSON('여'))
  const [survey, setSurvey] = useState<BirthSurvey>(DEFAULT_SURVEY)
  const [autoLoaded, setAutoLoaded] = useState(false)

  const restored = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      // (1) 로그인한 본인 사주를 profiles에서 읽어 parent1 자동입력
      let filledFromProfile = false
      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, saju_saved')
            .eq('id', u.user.id)
            .single()
          if (!cancelled && p && p.saju_saved && p.birth_year) {
            const bh = p.birth_hour
            const hourValue =
              bh === '모름' || bh == null || bh === '' ? '-1' : String(bh)
            setParent1(prev => ({
              ...prev,
              gender: (p.gender ?? '남') as Gender,
              calType: (p.cal_type ?? '양력') as CalType,
              year: String(p.birth_year),
              month: String(p.birth_month ?? ''),
              day: String(p.birth_day ?? ''),
              hour: hourValue,
            }))
            setAutoLoaded(true)
            filledFromProfile = true
          }
        }
      } catch {}

      // (2) 폴백 — sessionStorage('myinfo')
      if (!filledFromProfile) {
        const myInfo = sessionStorage.getItem(MY_INFO_KEY)
        if (myInfo) {
          try {
            const info = JSON.parse(myInfo)
            if (!cancelled) {
              setParent1(prev => ({
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
          } catch {}
        }
      }

      // (3) parent2 · survey 는 localStorage에서 복원 (본인 사주는 저장 안 함 — 공용기기 안전)
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const data = JSON.parse(saved)
          if (!cancelled) {
            if (data.parent2) setParent2(data.parent2)
            if (data.survey) setSurvey({ ...DEFAULT_SURVEY, ...data.survey })
          }
        } catch {}
      }

      if (!cancelled) restored.current = true
    }

    loadInitial()
    return () => { cancelled = true }
  }, [])

  // 변경 저장 — 복원 끝난 뒤에만. parent1(본인 사주)은 저장하지 않는다.
  useEffect(() => {
    if (!restored.current) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ parent2, survey }))
  }, [parent2, survey])

  const handleClearParent2 = () => {
    if (confirm('배우자 정보를 초기화할까요?')) {
      setParent2(DEFAULT_PERSON('여'))
    }
  }

  const handleClearAll = () => {
    if (confirm('입력 내용을 모두 초기화할까요?')) {
      localStorage.removeItem(STORAGE_KEY)
      setParent2(DEFAULT_PERSON('여'))
      setSurvey(DEFAULT_SURVEY)
    }
  }

  // 설문 한 항목 업데이트 헬퍼
  const setSurveyField = <K extends keyof BirthSurvey>(key: K, value: BirthSurvey[K]) => {
    setSurvey(prev => ({ ...prev, [key]: value }))
  }

  // 바라는 점(복수 선택) 토글
  const toggleWish = (wish: string) => {
    setSurvey(prev => {
      const has = prev.wishes.includes(wish)
      return { ...prev, wishes: has ? prev.wishes.filter(w => w !== wish) : [...prev.wishes, wish] }
    })
  }

  return {
    parent1, setParent1,
    parent2, setParent2,
    survey, setSurvey, setSurveyField, toggleWish,
    autoLoaded,
    handleClearParent2,
    handleClearAll,
  }
}
