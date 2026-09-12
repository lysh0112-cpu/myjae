'use client'

/**
 * 합격운 · 취업운 · 승진운 입력 — 무엇을 볼지 고르기
 * ─────────────────────────────────────────────
 * 진입: exam-luck(보관함) > 사람 선택 모달 > 이 화면
 * 다음: ★2026-07-30 — 탭에 따라 «다른 화면» 으로 보냅니다. (대표님 지시)
 *         진학 탭 → exam-luck-result   (학생 전용)
 *         취업 탭 → job-luck-result    (성인 전용)
 *
 * 사람은 이미 정해져서 URL 로 넘어온다. 여기서는 "무엇을 볼지"만 고른다.
 * ★진로적성 career-input 과 같은 모양(큰 버튼 목록). 새로 설계하지 않는다.
 *
 * ⚠️ 나이는 lib/saju/ageDayun.ts 의 exactAge() 를 쓴다.
 *    career/calcPerson.ts 의 ageOf() 는 세는나이라 대운수(만 나이)와 잣대가 다르다. (작업지시 7장)
 */

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  PROMO_JOBS, promoJobOf, defaultNextIdx, PROMO_YEARS, PROMO_SEASONS,
  PROMO_WISH_SAMPLES, PROMO_WISH_MAX, PROMO_WISH_NUDGE_UNDER,
} from '@/lib/saju/examLuck/tables/promotion'
import WalletPaySheet from '@/app/components/common/WalletPaySheet'
import { EXAM_PRICE_KEYS, examPriceKey } from '@/lib/wallet/consultGate'
import { exactAge } from '@/lib/saju/ageDayun'
// ★2026-07-27 — 손님이 시험 종류를 고르면 교재 230쪽 짝에 따라 볼 십신이 정해진다.
import { EXAM_KINDS } from '@/lib/saju/examLuck/tables/rules'
import { EXAM_CATEGORIES, TARGETS, STUDENT_GRADES, GRADE_LEVELS, TRACKS, examKindFromTarget, SCHOOL_EXAMS, asksSchoolExam } from '@/lib/saju/examLuck/tables/studentTarget'
import { JOB_FIELDS, JOB_WAYS, itemsFor, WISH_MAX, writeWishHandoff, JOB_SITUATIONS, JOB_GATES, dateLabelFor, PICK_MAX, JOB_TEXT_MAX, CERT_MAX, type JobSituation, type JobGate } from '@/lib/saju/examLuck/tables/jobFields'

const ACCENT = '#c85a8c'
const SOFT = '#f7e6ee'
const BG = '#FDF6F0'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'

/** 무엇을 볼까 */
type Kind = 'exam' | 'job'
/** 누구인가 */
type Target = 'student' | 'adult'

function ExamLuckInputInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const name = sp.get('name') || ''
  const year = parseInt(sp.get('year') || '') || 0
  const month = parseInt(sp.get('month') || '') || 1
  const day = parseInt(sp.get('day') || '') || 1
  const age = useMemo(() => (year ? exactAge(year, month, day) : null), [year, month, day])

  /**
   * ★2026-07-29 — [진학] / [취업] 두 탭으로 묶었습니다. (대표님 지시)
   *
   *   [무엇이 문제였나] 전에는 «무엇을 볼까(kind)» 와 «누구인가(target)» 를
   *     따로 골랐습니다. 넷을 다 고를 수 있는데 «학생 + 취업운» 은 뜻이 거의 안 맞고,
   *     학생인데 화면에 취업 항목이 보이고 그 반대도 마찬가지였습니다.
   *   [어떻게] 탭이 둘을 «함께» 정합니다.
   *     진학 = 학생 + 시험      취업 = 성인 + (시험 준비 또는 일자리)
   *   ★성인이 공무원·자격증을 준비하는 경우는 취업 탭 «안에서» 갈래를 둡니다.
   *     그분들이 갈 곳이 없어지면 안 되기 때문입니다. (EXAM_KINDS 를 그대로 씁니다)
   */
  /*  ★2026-09-12 (7부) [대표님] — ★«승진» 탭을 더했습니다.
   *    진학 = 학생 + 시험 · 취업 = 성인 + (시험 또는 일자리) · ★승진 = 성인 + 일자리(지금 회사)
   *    ⚠️ 승진도 target='adult' · kind='job' 입니다 — 엔진은 «그대로» 씁니다.
   *      갈리는 것은 jobSituation='promote' 하나뿐입니다. */
  const [tab, setTab] = useState<'jinhak' | 'chwieop' | 'seungjin'>(
    age !== null && age < 20 ? 'jinhak' : 'chwieop',
  )
  /** 취업 탭 안의 갈래 — 시험 준비냐 일자리 구하기냐 */
  const [jobMode, setJobMode] = useState<Kind>('job')

  const target: Target = tab === 'jinhak' ? 'student' : 'adult'
  const kind: Kind = tab === 'jinhak' ? 'exam' : tab === 'seungjin' ? 'job' : jobMode
  const isPromo = tab === 'seungjin'

  /*  ★승진 입력 — 표는 lib/saju/examLuck/tables/promotion.ts «한 곳» 에 있습니다.
   *  ⛔ 직급 이름을 여기 붙박이로 적지 마십시오. */
  const [pJob, setPJob] = useState<string>('hoesa')
  const [pCur, setPCur] = useState<number>(0)      // -2 = 직접 적기
  const [pNext, setPNext] = useState<number>(1)    // -2 = 직접 적기 · -1 = 아직 모르겠어요
  const [pJobText, setPJobText] = useState('')     // 「그 밖」 일 때 직업 이름
  const [pCurText, setPCurText] = useState('')
  const [pNextText, setPNextText] = useState('')
  const [pGate, setPGate] = useState<'yes' | 'no' | 'unknown'>('unknown')
  const [pYears, setPYears] = useState<string>('yes')
  const [pSeason, setPSeason] = useState<string>('year_end')
  /** 🔴 고민 칸은 승진에서 ★«꼭» 입니다 [대표님 2026-09-12] */
  const [pWish, setPWish] = useState('')
  /*  🔴 ★2026-09-13 (7부) [대표님 「결과표가 나오기 «직전» 화면에 AI 가격표가 나와야 함」]
   *    [보기] 를 누르면 ★결제 시트가 먼저 뜹니다 — 진로적성 · 사주그림과 «같은 모양».
   *    ⛔ 팝업을 «따로 만들지» 마십시오. 공용 시트(WalletPaySheet)를 씁니다.
   *    ⚠️ 시트는 ★«묻기만» 합니다. 실제 차감은 결과 화면이 AI 를 부르기 직전에 합니다. */
  const [payOpen, setPayOpen] = useState(false)
  const [priceItem, setPriceItem] = useState<string>('examluck_ai')
  const pRanks = promoJobOf(pJob)?.ranks ?? []
  const pIsEtc = pJob === 'etc'
  /** 표를 못 쓰면 «문인지» 를 직접 여쭙습니다 */
  const pAsksGate = pIsEtc || pCur === -2 || pNext === -2
  const pCurLabel = pIsEtc || pCur === -2 ? pCurText.trim() : (pRanks[pCur] ?? '')
  const pNextLabel = pIsEtc || pNext === -2 ? pNextText.trim()
    : pNext === -1 ? '아직 모르겠어요' : (pRanks[pNext] ?? '')
  const pOk = !isPromo || (
    (!pIsEtc || pJobText.trim().length > 0)
    && pCurLabel.length > 0 && pNextLabel.length > 0
    && pWish.trim().length > 0
  )
  /** ★어떤 시험인가 — 교재 230쪽이 십신마다 시험을 짝지어 놨다 */
  const [examKind, setExamKind] = useState<string>('')
  /* ★2026-09-11 (6부) [대표님 「직종별로 세분화 · 콤보 두 개로 좁혀지게」] — 일자리를 구해요 쪽 두 단계 콤보
   *   ① 분야 (교재 206~210쪽 · 시기) — 꼭 고름   ② 일하는 방식 (202~204쪽 · 적성) — 기본 「아직 모르겠어요」 */
  const [field, setField] = useState<string>('')
  const [way, setWay] = useState<string>('unknown')
  /* ★6부 [대표님 알약] 일자리를 구해요 — 지금 상황(하나 · 꼭) · 거쳐야 할 관문(여러 개 · 선택) (검사 46) */
  const [situation, setSituation] = useState<JobSituation | ''>('')
  const [gates, setGates] = useState<JobGate[]>([])
  const toggleGate = (g: JobGate) => setGates(prev => (prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]))
  /* ★6부 [대표님 「이 분야의 일을 버튼으로 · 선택하게」] 직업 알약 고르기 — 최대 셋 (검사 47) */
  const [picks, setPicks] = useState<string[]>([])
  const togglePick = (n: string) => setPicks(prev =>
    prev.includes(n) ? prev.filter(x => x !== n) : (prev.length >= PICK_MAX ? prev : [...prev, n]))
  /* ★6부 [대표님] ② 방식 «직접 적기» — 요리사 · 간호사처럼 소속 · 프리랜서가 섞인 분 (30자 · 주소에 싣지 않음) */
  const [jobText, setJobText] = useState<string>('')
  /* ★6부 [대표님 「취업 · 이직이면 소지한 자격증도」] 가진 자격증 — 선택 · 60자 · 주소에 싣지 않음 */
  const [certs, setCerts] = useState<string>('')
  /** ★6부 [대표님 「희망사항을 자유롭게」] 궁금한 것이나 고민 — 선택 · 200자 */
  const [wish, setWish] = useState<string>('')
  /** ★시험 날짜 — 몰라도 된다. 알면 그 달·그 날까지 짚어 준다 (교재 195쪽) */
  const [examDate, setExamDate] = useState<string>('')
  /* 🔴 ★2026-09-12 (6부) [대표님 「연말로 잡았는데 12.15 로 특정하네」] — 정해진 날인가 · 어림 시기인가 (검사 46 ⑥)
   *   [상반기] · [하반기] · [연말] 단추는 «어림» — 그날 일진 · 공망은 보지 않고 그 달의 흐름으로만 봅니다.
   *   달력에서 고르면 «정해진 날» — 그날의 일진 · 공망 · 당일 수칙까지 봅니다. */
  const [dateApprox, setDateApprox] = useState<boolean>(false)
  /* ★6부 [대표님] 고3 · 재수생이 아닌 학생 — 무슨 시험인지 (검사 45 ⑮) */
  const [schoolExam, setSchoolExam] = useState<string>('')
  const [schoolExamText, setSchoolExamText] = useState<string>('')
  /**
   * ★2026-07-29 — 학생 목표 (2단 드롭다운). 대표님 지시.
   *   [왜] «어디를 목표로 하는지» 를 알면 그 자리에 쓰이는 힘을 짚어 줄 수 있습니다.
   *   ⚠️ 학생일 때만 씁니다. 성인에게는 뜻이 안 맞습니다.
   */
  /** ★2026-07-29 — 학년·신분. 같은 학생이라도 초등과 N수생은 결이 완전히 다릅니다. */
  const [studentGrade, setStudentGrade] = useState<string>('')
  /** ★2026-07-29 — 고1 이상에게 묻는 «지금 어디쯤». (대표님 지시)
   *   고교를 이미 다니는 아이에게 «어느 고교가 맞나» 는 지난 이야기입니다.
   *   대신 지금 성적대와 희망 계열을 물어 «여기서 무엇을 하면 되는가» 를 말합니다. */
  const [gradeLevel, setGradeLevel] = useState<string>('')
  const [track, setTrack] = useState<string>('')
  const [examCategory, setExamCategory] = useState<string>('')
  const [targetType, setTargetType] = useState<string>('')
  const [targetCustomText, setTargetCustomText] = useState<string>('')

  /**
   * ★2026-07-29 — 목표와 날짜를 «필수» 로 돌렸습니다. (대표님 지시)
   *
   *   [왜] 목표와 D-Day 가 없으면 리포트가 «뜬구름» 이 됩니다.
   *     «어느 해가 좋다» 까지만 말할 수 있고, «그 학교에 이 힘이 쓰인다»·
   *     «그날 일진이 이러니 이렇게 하라» 는 못 합니다.
   *   ⚠️ 필수로 막으면 손님이 떠날 수도 있습니다. 그래서 **모를 때 고를 길**을 함께 둡니다.
   *     날짜는 [상반기]·[하반기]·[연말] 단추로, 목표는 «그 밖의 시험» 으로.
   */
  /** 고교를 이미 다니거나 마친 학년인가 — 성적·계열을 묻는 자리 */
  //  ★6부 — 학년을 세분화하면서 고1 · 고2 도 성적대를 받습니다 (옛 high12 는 기록용)
  const needsLevel = ['high1', 'high2', 'high3', 'nsu', 'high12'].includes(studentGrade)
  const gradeOk = target !== 'student' || !!studentGrade
  const targetOk = target === 'student'
    ? !!examCategory && !!targetType && (targetType !== 'custom' || !!targetCustomText.trim())
    : (kind === 'job' ? !!field && !!situation : !!examKind)   // ★6부 — 일자리는 지금 상황 · ① 분야를 꼭
  //  ★6부 [대표님] 고3 · 재수생이 아닌 학생에게만 «무슨 시험인가» 를 묻습니다 (검사 45 ⑮)
  const asksExam = target === 'student' && asksSchoolExam(studentGrade)
  const examTypeOk = !asksExam || (!!schoolExam && (schoolExam !== 'etc' || !!schoolExamText.trim()))
  //  「아직 정해진 시험이 없어요」 면 날짜를 받지 않습니다
  const dateOk = schoolExam === 'none' ? true : !!examDate
  /*  ★2026-09-12 (7부) — 승진은 «다른 칸» 을 봅니다.
   *    진학·취업의 목표·날짜·시험종류는 승진에 없으므로 그 검사를 건너뜁니다. */
  const canGo = isPromo ? pOk : (gradeOk && targetOk && dateOk && examTypeOk)

  /** 모르는 손님을 위한 빠른 날짜 — 그 달의 대표 하루 */
  const quickDates = useMemo(() => {
    const y = new Date().getFullYear()
    const next = new Date() > new Date(y, 10, 15) ? y + 1 : y
    return [
      { label: '상반기 (6월경)', v: `${next}-06-15` },
      { label: '하반기 (11월경)', v: `${next}-11-15` },
      { label: '연말 (12월경)', v: `${next}-12-15` },
    ]
  }, [])

  const query = useMemo(() => {
    const p = new URLSearchParams()
    for (const k of ['year', 'month', 'day', 'gender', 'calType', 'leapMonth', 'hour', 'name']) {
      const v = sp.get(k)
      if (v) p.set(k, v)
    }
    p.set('kind', kind)
    p.set('target', target)
    // ★진학 탭이면 목표에서 자동으로 이어 줍니다. 손님이 두 번 고를 일이 없습니다.
    //  ★6부 — 일자리를 구해요는 두 단계 콤보: examKind='field:분야' · way=방식
    //     ⚠️ 고민 글(wish)은 주소에 싣지 않습니다 — [보기] 누를 때 writeWishHandoff 로 건넵니다.
    const autoKind = target === 'student' ? examKindFromTarget(examCategory)
      : (kind === 'job' ? (field ? `field:${field}` : '') : examKind)
    if (autoKind) p.set('examKind', autoKind)
    if (target !== 'student' && kind === 'job' && field) p.set('way', way)
    //  ★6부 — 고른 직업 (결과 화면이 교재 표로 다시 걸러 받습니다 · parsePicks)
    if (target !== 'student' && kind === 'job' && field && picks.length) p.set('jobs', picks.join('|'))
    //  ★6부 [대표님 알약] 지금 상황 · 거쳐야 할 관문 — 빈 관문도 «,» 없이 빈 값으로 실어 «옛 기록» 과 가립니다
    if (target !== 'student' && kind === 'job' && !isPromo) { if (situation) p.set('sit', situation); p.set('gates', gates.join(',')) }
    /*  ★2026-09-12 (7부) — 승진.  ⛔ 고민 글(pWish) · 직접 적은 직업·직급은 «주소에 싣지 않습니다»
     *    (방문 기록에 남습니다 — 6부 9장). 건네기는 [보기] 누를 때 따로 합니다. */
    if (isPromo) {
      p.set('sit', 'promote')
      p.set('gates', '')
      p.set('pJob', pJob)
      if (!pIsEtc && pCur >= 0) p.set('pCur', String(pCur))
      if (!pIsEtc && pNext >= -1) p.set('pNext', String(pNext))
      if (pAsksGate) p.set('pGate', pGate)
      p.set('pYears', pYears)
      p.set('pSeason', pSeason)
    }
    if (examDate) p.set('examDate', examDate)
    if (examDate && dateApprox) p.set('dateApprox', '1')   // ★6부 — 어림 시기 (그날 일진은 보지 않음)
    //  ★6부 — 고3 · 재수생이 아닌 학생이 고른 시험 종류 (직접 적기는 글자를 그대로)
    if (asksExam && schoolExam) p.set('schoolExam', schoolExam === 'etc' ? `etc:${schoolExamText.slice(0, 20)}` : schoolExam)
    // ★학생 목표 — 학생일 때만 싣는다
    if (target === 'student' && studentGrade) p.set('studentGrade', studentGrade)
    if (target === 'student' && needsLevel) {
      if (gradeLevel) p.set('gradeLevel', gradeLevel)
      if (track) p.set('track', track)
    }
    if (target === 'student' && examCategory) {
      p.set('examCategory', examCategory)
      if (targetType) p.set('targetType', targetType)
      if (targetType === 'custom' && targetCustomText.trim()) {
        p.set('targetCustomText', targetCustomText.trim())
      }
    }
    return p.toString()
  }, [sp, kind, target, isPromo, pJob, pCur, pNext, pAsksGate, pGate, pYears, pSeason, pIsEtc, examKind, examDate, dateApprox, studentGrade, needsLevel, gradeLevel, track, examCategory, targetType, targetCustomText, field, way, situation, gates, picks, asksExam, schoolExam, schoolExamText])


  /** [보기] 를 누르면 — ★값을 먼저 보여 드립니다 */
  const openPay = async () => {
    if (!canGo) return
    /*  ⚠️ 셋(합격운 · 취업운 · 승진운)이 ★각각 값을 가집니다.
     *    대표님이 그 값을 «아직 안 넣으셨으면» 기본값(examluck_ai)으로 떨어집니다. */
    const want = isPromo ? EXAM_PRICE_KEYS.promo
      : kind === 'job' ? EXAM_PRICE_KEYS.job
      : EXAM_PRICE_KEYS.exam
    setPriceItem(await examPriceKey(want))
    setPayOpen(true)
  }

  /** 시트에서 [보기] 를 누르시면 — 결과 화면으로 */
  const goResult = () => {
            if (!canGo) return
            // ★2026-07-30 — 학생과 성인을 «다른 화면» 으로 보냅니다.
            //   [왜] 갈래 이름과 개수 자체가 다릅니다. 학생에게 「수시:정시 비율」을,
            //     성인에게 「시험 준비:실무 경력 비율」을 묻습니다. 한 화면에 둘을 담으면
            //     어느 한쪽 손님에게는 늘 어긋난 제목이 보입니다.
            //   ⚠️ query 에 target 이 이미 실려 있습니다. 두 화면이 그 값으로
            //      «잘못 들어온 손님» 을 서로에게 되돌려 줍니다. (옛 링크 보호)
            const to = target === 'student'
              ? '/manseryeok/exam-luck-result'
              : isPromo ? '/manseryeok/promotion-luck-result'
              : '/manseryeok/job-luck-result'
            /*  ★6부 — 고민 · 직접 적은 방식 · 자격증은 주소 대신 여기로.
             *  ★7부 — 승진도 같습니다. 고민 글과 «직접 적은 직업·직급» 을 주소에 싣지 않습니다. */
            if (isPromo) {
              writeWishHandoff(
                pWish,
                [pIsEtc ? pJobText.trim() : '', pCurLabel, pNextLabel].filter(Boolean).join(' · '),
                '',
              )
            } else {
              writeWishHandoff(wish, way === 'custom' ? jobText : '', kind === 'job' ? certs : '')
            }
            router.push(`${to}?${query}`)
  }

  const Btn = ({ on, title, sub, onClick }: { on: boolean; title: string; sub: string; onClick: () => void }) => (
    <button onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', marginBottom: 10, padding: '15px 16px',
        background: on ? SOFT : CARD,
        border: on ? `1.5px solid ${ACCENT}` : `0.5px solid ${LINE}`,
        borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
      }}>
      <div style={{ fontSize: 14.5, fontWeight: 500, color: on ? ACCENT : '#3a2e28', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#5c3a1e', lineHeight: 1.6 }}>{sub}</div>
    </button>
  )

  return (
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${LINE}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>합격운 · 취업운 · 승진운</div>
      </div>

      <div style={{ padding: '22px 16px 0' }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: '#3a2e28', marginBottom: 6 }}>
          {name ? `${name}님, 무엇을 볼까요?` : '무엇을 볼까요?'}
        </div>
        <div style={{ fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.7, marginBottom: 18 }}>
          보는 것에 따라 짚는 자리가 달라요.
          {age !== null && <><br />생년월일로 보아 만 {age}세로 잡았습니다. 다르면 아래에서 바꿔 주세요.</>}
        </div>

        {/* ★진학 / 취업 두 탭 — 이 하나로 «누구인가»와 «무엇을 볼까»가 함께 정해집니다 */}
        <div style={{
          display: 'flex', gap: 6, padding: 4, marginBottom: 16,
          background: '#f6ebe3', borderRadius: 14,
        }}>
          {([
            { key: 'jinhak' as const, label: '진학', sub: '학생 · 입시' },
            { key: 'chwieop' as const, label: '취업', sub: '시험 · 일자리' },
            { key: 'seungjin' as const, label: '승진', sub: '직장 · 자리' },
          ]).map(t => {
            const on = tab === t.key
            return (
              <button key={t.key} onClick={() => {
                  setTab(t.key)
                  // ★탭을 바꾸면 반대쪽 값을 비웁니다.
                  //   안 비우면 진학에서 고른 «과학고» 가 취업 결과에 실려 갑니다.
                  setExamKind(''); setField(''); setWay('unknown'); setSituation(''); setGates([]); setPicks([]); setJobText(''); setCerts(''); setStudentGrade(''); setGradeLevel(''); setTrack('')
                  setExamCategory(''); setTargetType(''); setTargetCustomText('')
                }}
                style={{
                  flex: 1, padding: '11px 6px', borderRadius: 11, cursor: 'pointer',
                  background: on ? '#fff' : 'transparent',
                  border: on ? `1.5px solid ${ACCENT}` : '1.5px solid transparent',
                  boxShadow: on ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  fontFamily: 'inherit',
                }}>
                <span style={{
                  display: 'block', fontSize: 14.5, fontWeight: on ? 700 : 500,
                  color: on ? ACCENT : '#8a7063',
                }}>{t.label}</span>
                <span style={{ display: 'block', fontSize: 10.5, color: on ? '#a3707f' : '#a3907f', marginTop: 2 }}>
                  {t.sub}
                </span>
              </button>
            )
          })}
        </div>

        {/* 취업 탭 안의 갈래 — 시험 준비인가 일자리인가 */}
        {tab === 'chwieop' && (
          <>
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '2px 2px 9px' }}>어느 쪽인가요?</div>
            {([
              { key: 'exam' as Kind, title: '시험 준비 중이에요', sub: '공무원 · 자격증 · 임용 · 어학 시험' },
              { key: 'job' as Kind, title: '일자리를 구해요', sub: '취업 · 이직 · 면접' },
            ]).map(o => (
              <Btn key={o.key} on={jobMode === o.key} title={o.title} sub={o.sub}
                onClick={() => { setJobMode(o.key); setExamKind(''); setField(''); setWay('unknown'); setSituation(''); setGates([]) }} />
            ))}
          </>
        )}

        {/* ★2026-09-12 (7부) 승진 — 다섯 칸 + 고민 칸(꼭).
             ⛔ 직급 이름을 여기 적지 마십시오 — promotion.ts 에서 옵니다. */}
        {isPromo && (() => {
          const L = { fontSize: 12.5, color: '#8a7063', margin: '18px 2px 9px' } as const
          const SEL = {
            width: '100%', padding: '12px 13px', borderRadius: 12, background: CARD,
            border: `0.5px solid ${LINE}`, fontSize: 14, color: '#3a2e28', fontFamily: 'inherit',
          } as const
          const TX = (hi?: boolean) => ({ ...SEL, marginTop: 8, border: `0.5px solid ${hi ? ACCENT : '#d9b9a6'}`, color: hi ? ACCENT : '#3a2e28' })
          const Pill = (t: string, on: boolean, f: () => void) => (
            <button key={t} onClick={f} style={{
              padding: '9px 13px', borderRadius: 11, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              background: on ? SOFT : CARD, color: on ? ACCENT : '#6b5d53',
              border: on ? `1.5px solid ${ACCENT}` : `0.5px solid ${LINE}`,
            }}>{t}</button>
          )
          return (
            <>
              <div style={L}>어떤 일을 하십니까 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span></div>
              <select value={pJob} style={SEL} onChange={e => {
                setPJob(e.target.value); setPCur(0); setPNext(defaultNextIdx(e.target.value, 0))
                setPJobText(''); setPCurText(''); setPNextText('')
              }}>
                {PROMO_JOBS.map(j => <option key={j.key} value={j.key}>{j.label}</option>)}
              </select>
              {pIsEtc && (
                <input value={pJobText} maxLength={30} placeholder="예) 대학병원 간호사"
                  onChange={e => setPJobText(e.target.value)} style={TX()} />
              )}

              <div style={L}>지금 직급이 어떻게 되시나요 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span></div>
              {pIsEtc ? (
                <input value={pCurText} maxLength={30} placeholder="예) 책임간호사"
                  onChange={e => setPCurText(e.target.value)} style={SEL} />
              ) : (
                <>
                  <select value={pCur} style={SEL} onChange={e => {
                    const v = Number(e.target.value); setPCur(v)
                    setPNext(v === -2 ? -2 : defaultNextIdx(pJob, v))
                  }}>
                    {pRanks.map((t, i) => <option key={i} value={i}>{t}</option>)}
                    <option value={-2}>없어요 (직접 적기)</option>
                  </select>
                  {pCur === -2 && (
                    <input value={pCurText} maxLength={30} placeholder="예) 책임역 3년차"
                      onChange={e => setPCurText(e.target.value)} style={TX()} />
                  )}
                </>
              )}

              <div style={L}>다음 직급이 어떻게 되시나요 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span></div>
              <div style={{ fontSize: 11.5, color: '#b09a8b', margin: '-4px 2px 8px' }}>
                한 계단 위를 미리 골라 두었어요. 없으면 직접 적으셔도 됩니다.
              </div>
              {pIsEtc || pCur === -2 ? (
                <input value={pNextText} maxLength={30} placeholder="예) 파트장"
                  onChange={e => setPNextText(e.target.value)} style={{ ...SEL, border: `0.5px solid ${ACCENT}`, color: ACCENT }} />
              ) : (
                <>
                  <select value={pNext} style={{ ...SEL, border: `0.5px solid ${ACCENT}`, color: ACCENT }}
                    onChange={e => setPNext(Number(e.target.value))}>
                    {pRanks.map((t, i) => <option key={i} value={i}>{t}</option>)}
                    <option value={-2}>없어요 (직접 적기)</option>
                    <option value={-1}>아직 모르겠어요</option>
                  </select>
                  {pNext === -2 && (
                    <input value={pNextText} maxLength={30} placeholder="예) 수석역"
                      onChange={e => setPNextText(e.target.value)} style={TX(true)} />
                  )}
                </>
              )}

              {pAsksGate && (
                <>
                  <div style={L}>그 자리에 오르면 결재하거나 사람을 맡게 되시나요</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {([['yes', '네'], ['no', '아니요'], ['unknown', '잘 모르겠어요']] as const)
                      .map(([k, t]) => Pill(t, pGate === k, () => setPGate(k)))}
                  </div>
                </>
              )}

              <div style={L}>이번에 승진 대상연차이신가요 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {PROMO_YEARS.map(y => Pill(y.label, pYears === y.key, () => setPYears(y.key)))}
              </div>

              <div style={L}>인사 발표가 보통 언제인가요 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {PROMO_SEASONS.map(x => Pill(x.label, pSeason === x.key, () => setPSeason(x.key)))}
              </div>

              {/* 🔴 고민 칸 — 승진에서는 «꼭» 입니다 [대표님 2026-09-12] */}
              <div style={L}>궁금한 것이나 고민 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span></div>
              <textarea value={pWish} maxLength={PROMO_WISH_MAX} rows={3}
                placeholder="예) 이번에 안 되면 다음이 있을지 궁금합니다"
                onChange={e => setPWish(e.target.value)}
                style={{ ...SEL, resize: 'vertical', lineHeight: 1.7 }} />
              <div style={{ fontSize: 11.5, color: '#b09a8b', margin: '7px 2px 8px' }}>
                이런 것이 궁금하실 수 있어요 — 눌러서 고쳐 쓰셔도 됩니다
              </div>
              {PROMO_WISH_SAMPLES.map(x => (
                <button key={x.text} onClick={() => setPWish(x.text)} style={{
                  display: 'block', width: '100%', textAlign: 'left', marginBottom: 6,
                  padding: '10px 12px', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
                  background: CARD, border: `0.5px solid ${LINE}`, fontSize: 12.5, color: '#6b5d53',
                }}>{x.text}</button>
              ))}
              {pWish.trim().length > 0 && pWish.trim().length < PROMO_WISH_NUDGE_UNDER && (
                <div style={{ fontSize: 12, color: ACCENT, margin: '4px 2px 0' }}>
                  한 줄만 더 적어 주시면 그 이야기로 풀어 드릴 수 있어요.
                </div>
              )}
            </>
          )
        })()}

        {/* ★2026-07-29 — 학생 목표 2단 드롭다운. (대표님 지시)
             학생일 때만 뜹니다. 성인에게는 «자사고·수시» 가 뜻이 안 맞습니다. */}
        {target === 'student' && (
          <>
            {/* ★학년·신분 — 목표보다 «먼저» 묻습니다. 학년에 따라 목표의 결이 달라집니다. */}
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '18px 2px 9px' }}>
              학년 · 신분 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
            </div>
            <select value={studentGrade} onChange={e => setStudentGrade(e.target.value)}
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 4,
                background: CARD,
                border: studentGrade ? `0.5px solid ${LINE}` : `1.5px solid ${ACCENT}55`,
                color: '#3a2e28', fontSize: 14, fontFamily: 'inherit', appearance: 'none',
              }}>
              {STUDENT_GRADES.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, margin: '4px 2px 4px' }}>
              * 같은 학생이라도 학년에 따라 필요한 이야기가 달라집니다.
            </div>

            {/* ★고1 이상에게만 — 지금 성적대와 희망 계열 */}
            {needsLevel && (
              <>
                <div style={{ fontSize: 12.5, color: '#8a7063', margin: '16px 2px 9px' }}>
                  지금 성적대 <span style={{ color: '#a3907f' }}>(몰라도 됩니다)</span>
                </div>
                <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)}
                  style={{
                    width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 9,
                    background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
                    fontSize: 14, fontFamily: 'inherit', appearance: 'none',
                  }}>
                  {GRADE_LEVELS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                </select>

                <div style={{ fontSize: 12.5, color: '#8a7063', margin: '2px 2px 9px' }}>
                  희망 계열 <span style={{ color: '#a3907f' }}>(몰라도 됩니다)</span>
                </div>
                <select value={track} onChange={e => setTrack(e.target.value)}
                  style={{
                    width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 4,
                    background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
                    fontSize: 14, fontFamily: 'inherit', appearance: 'none',
                  }}>
                  {TRACKS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, margin: '4px 2px 4px' }}>
                  성적은 나무라려고 묻는 것이 아니라, 지금 자리에서 무엇을 하면 좋을지 짚어 드리려는 것입니다.
                </div>
              </>
            )}

            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '16px 2px 9px' }}>
              어디를 목표로 하나요? <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
            </div>
            <select
              value={examCategory}
              onChange={e => { setExamCategory(e.target.value); setTargetType(''); setTargetCustomText('') }}
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 9,
                background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
                fontSize: 14, fontFamily: 'inherit', appearance: 'none',
              }}>
              {EXAM_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>

            {/* 2차 — 1차를 골랐을 때만 */}
            {examCategory && (
              <select
                value={targetType}
                onChange={e => { setTargetType(e.target.value); if (e.target.value !== 'custom') setTargetCustomText('') }}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 9,
                  background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
                  fontSize: 14, fontFamily: 'inherit', appearance: 'none',
                }}>
                <option value="">목표 학교·계열을 고르세요</option>
                {(TARGETS[examCategory as keyof typeof TARGETS] ?? [])
                  .map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            )}

            <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, margin: '2px 2px 4px' }}>
              * 목표를 정해 주셔야 사주와 그 목표 사이를 짚어 드릴 수 있습니다.
            </div>

            {/* 직접 입력 */}
            {targetType === 'custom' && (
              <input
                type="text"
                value={targetCustomText}
                onChange={e => setTargetCustomText(e.target.value)}
                placeholder="예: 서울대 의예과, 상산고 등"
                maxLength={40}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 10,
                  background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
                  fontSize: 14, fontFamily: 'inherit',
                }}
              />
            )}
          </>
        )}

        {/* ★어떤 시험인지 — 고르면 그 시험에 힘을 싣는 십신이 드는 해를 짚어 준다 (교재 230쪽)
             ★★2026-07-29 — «취업 탭에서만» 뜹니다. (대표님 지적)
               [무엇이 이상했나] 탭으로 나눈 뒤에도 이 드롭다운이 진학 탭에 남아 있었습니다.
                 진학 탭에서 이미 「대입 수시 → 메디컬」로 목표를 골랐는데
                 바로 아래에 또 「어떤 시험인가요?」가 떠서 같은 것을 두 번 물었습니다.
                 게다가 목록이 성인용이라 중학생에게 «공무원 시험·로스쿨·영양사» 가 보였습니다.
               → 진학 탭은 위 «목표 2단 드롭다운» 이 이 역할을 이미 합니다. 여기서는 뺍니다. */}
        {/* ★2026-09-11 (6부) [대표님] 일자리를 구해요 — 두 단계 콤보 (검사 44)
             ① 분야(17) → 그 분야에 힘을 싣는 해를 봅니다 (교재 206~210쪽)
             ② 일하는 방식(8) → 사주 구조와 맞는지 봅니다 (202~204쪽)
             두 개를 고르면 교재에 나온 직업 가운데 딱지가 맞는 것만 보입니다. */}
        {/*  🔴 ★2026-09-12 (7부) — !isPromo 를 «반드시» 두십시오.
             안 두면 승진 손님에게 «지금 상황 · 관문 · 분야 · 방식 · 자격증» 이
             ★함께 보입니다. 무엇을 채워야 할지 모르게 됩니다. */}
        {target !== 'student' && kind === 'job' && !isPromo && (
          <>
            {/* ★2026-09-11 (6부) [대표님] 알약 두 줄 — 「면접만 보는 사람에게 시험 이야기가 나오지 않게」 (검사 46)
                 지금 상황은 하나만(신규 취업 / 이직) · 거쳐야 할 관문은 여러 개(시험 / 면접) */}
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '18px 2px 8px' }}>
              지금 상황 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {JOB_SITUATIONS.map(o => {
                const on = situation === o.key
                return (
                  <button key={o.key} type="button" onClick={() => setSituation(o.key)} aria-pressed={on}
                    style={{ fontSize: 13, borderRadius: 999, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${on ? ACCENT : '#e2cfc2'}`, background: on ? ACCENT : CARD,
                      color: on ? '#fff' : '#8a7063', fontWeight: on ? 600 : 400 }}>{o.label}</button>
                )
              })}
            </div>
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '14px 2px 8px' }}>
              거쳐야 할 관문 <span style={{ color: '#a3907f' }}>(여러 개 고를 수 있어요)</span>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {JOB_GATES.map(o => {
                const on = gates.includes(o.key)
                return (
                  <button key={o.key} type="button" onClick={() => toggleGate(o.key)} aria-pressed={on}
                    style={{ fontSize: 13, borderRadius: 999, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${on ? ACCENT : '#e2cfc2'}`, background: on ? ACCENT : CARD,
                      color: on ? '#fff' : '#8a7063', fontWeight: on ? 600 : 400 }}>{o.label}</button>
                )
              })}
            </div>
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '18px 2px 9px' }}>
              ① 어떤 분야인가요? <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
            </div>
            <select value={field} onChange={e => { setField(e.target.value); setPicks([]) }}
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 10,
                background: CARD, border: field ? `0.5px solid ${LINE}` : `1.5px solid ${ACCENT}55`,
                color: '#3a2e28', fontSize: 14, fontFamily: 'inherit', appearance: 'none',
              }}>
              <option value="">골라 주세요</option>
              {JOB_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '6px 2px 9px' }}>
              ② 어떤 방식으로 일하고 싶으세요? <span style={{ color: '#a3907f' }}>(몰라도 됩니다)</span>
            </div>
            <select value={way} onChange={e => {
                const w = e.target.value
                setWay(w)
                //  ⚠️ 방식이 바뀌면 좁혀진 목록에 없는 직업은 풀어 줍니다
                if (field) { const keep = new Set(itemsFor(field, w).items.map(i => i.name)); setPicks(p => p.filter(n => keep.has(n))) }
              }}
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 10,
                background: CARD, border: `0.5px solid ${LINE}`,
                color: '#3a2e28', fontSize: 14, fontFamily: 'inherit', appearance: 'none',
              }}>
              {JOB_WAYS.map(w => <option key={w.key} value={w.key}>{w.label}</option>)}
              {/* ★6부 [대표님] 딱 고르기 어려운 분(요리사 · 간호사 등) — 직접 적기 */}
              <option value="custom">직접 적기</option>
            </select>
            {way === 'custom' && (
              <input type="text" value={jobText} onChange={e => setJobText(e.target.value)} maxLength={JOB_TEXT_MAX}
                placeholder="예: 병원 소속 간호사인데 프리랜서도 생각 중"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, marginBottom: 10, boxSizing: 'border-box',
                  background: CARD, border: `1.5px solid ${ACCENT}55`, color: '#3a2e28', fontSize: 13.5, fontFamily: 'inherit' }} />
            )}
            {field && (() => {
              const { items, narrowed } = itemsFor(field, way)
              return (
                <div style={{ background: '#fff', border: `0.5px solid ${LINE}`, borderRadius: 12, padding: '10px 12px', marginBottom: 6 }}>
                  <div style={{ fontSize: 11.5, color: '#8a7063', marginBottom: 6 }}>
                    {narrowed ? '이런 일이 해당돼요' : '이 분야의 일'} — 원하는 일을 눌러 고르세요 <span style={{ color: '#a3907f' }}>(최대 {PICK_MAX}개 · 안 골라도 돼요)</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map(i => {
                      const picked = picks.includes(i.name)
                      const full = !picked && picks.length >= PICK_MAX
                      return (
                        <button key={i.name} type="button" onClick={() => togglePick(i.name)} aria-pressed={picked} disabled={full}
                          style={{ fontSize: 12, borderRadius: 999, padding: '5px 11px', fontFamily: 'inherit',
                            cursor: full ? 'not-allowed' : 'pointer', opacity: full ? 0.45 : 1,
                            border: `1px solid ${picked ? ACCENT : `${ACCENT}44`}`,
                            background: picked ? ACCENT : SOFT, color: picked ? '#fff' : '#8c4a63', fontWeight: picked ? 600 : 400 }}>
                          {picked ? '✓ ' : ''}{i.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
            {/* ★2026-09-11 (6부) [대표님 「취업 · 이직이면 소지한 자격증도 물어보면」] — 가진 자격증 (검사 47)
                 적으면 실전 전략이 «새로 따라» 대신 «가진 것을 어떻게 살릴지» 를 말합니다. */}
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '14px 2px 8px' }}>
              가지고 있는 자격증 <span style={{ color: '#a3907f' }}>(선택 · 없으면 비워 두세요)</span>
            </div>
            <input type="text" value={certs} onChange={e => setCerts(e.target.value)} maxLength={CERT_MAX}
              placeholder="예: 정보처리기사, 토익 850, 운전면허 1종"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, marginBottom: 6, boxSizing: 'border-box',
                background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28', fontSize: 13.5, fontFamily: 'inherit' }} />
          </>
        )}

        {target !== 'student' && kind !== 'job' && (
          <>
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '18px 2px 9px' }}>
              목표 시험·직종 <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
            </div>
            <select value={examKind} onChange={e => setExamKind(e.target.value)}
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12, marginBottom: 10,
                background: CARD,
                border: examKind ? `0.5px solid ${LINE}` : `1.5px solid ${ACCENT}55`,
                color: '#3a2e28', fontSize: 14, fontFamily: 'inherit', appearance: 'none',
              }}>
              <option value="">골라 주세요</option>
              {/* ★고른 갈래에 맞는 것만. «일자리를 구해요» 인데 「로스쿨」이 있으면 어수선합니다.
                   ⚠️ '그 밖의 시험'(etc)은 어느 쪽에든 남깁니다. 빠져나갈 길이 있어야 합니다. */}
              {EXAM_KINDS
                //  ★2026-09-11 (6부) — 성인 목록에서 «대입» 을 뺍니다 (이 칸은 성인에게만 그려짐 · 검사 ㉓-a)
                .filter(k => k.key !== 'daeip')
                .filter(k => k.key === 'etc' || k.purpose === kind)
                .map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </>
        )}

        {/* ★2026-09-12 (6부) [대표님] 고3 · 재수생이 아닌 학생 — «무슨 시험인가» (검사 45 ⑮)
             [겪음] 고2 학생에게 「2026년 12월 수시 발표 · 발표 당일 수칙」 이 나왔습니다. 고2는 수시 발표가 없습니다. */}
        {asksExam && (
          <>
            <div style={{ fontSize: 12.5, color: '#8a7063', margin: '18px 2px 8px' }}>
              어떤 시험인가요? <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {SCHOOL_EXAMS.map(o => {
                const on = schoolExam === o.key
                return (
                  <button key={o.key} type="button" onClick={() => { setSchoolExam(o.key); if (o.key === 'none') { setExamDate(''); setDateApprox(false) } }} aria-pressed={on}
                    style={{ fontSize: 12.5, borderRadius: 999, padding: '7px 13px', cursor: 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${on ? ACCENT : '#e2cfc2'}`, background: on ? ACCENT : CARD,
                      color: on ? '#fff' : '#8a7063', fontWeight: on ? 600 : 400 }}>{o.label}</button>
                )
              })}
            </div>
            {schoolExam === 'etc' && (
              <input type="text" value={schoolExamText} onChange={e => setSchoolExamText(e.target.value)} maxLength={20}
                placeholder="예: 한국사능력검정시험" 
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, marginTop: 8, boxSizing: 'border-box',
                  background: CARD, border: `1.5px solid ${ACCENT}55`, color: '#3a2e28', fontSize: 13.5, fontFamily: 'inherit' }} />
            )}
            {schoolExam === 'none' && (
              <div style={{ background: SOFT, border: `0.5px solid ${ACCENT}44`, borderRadius: 12, padding: '10px 12px', marginTop: 8, fontSize: 12.5, color: '#8c4a63', lineHeight: 1.7 }}>
                시험 날짜 없이, 공부하는 결과 방향을 중심으로 봐 드립니다. 진로를 더 깊이 보고 싶으시면 «진로적성» 서비스도 함께 보세요.
              </div>
            )}
          </>
        )}

        {/* ★시험 날짜 — 교재 195쪽 「세운 > 대운 > 월운 > 일진」·「시험일이 공망일이면」
             ★2026-07-29 «필수» 로 돌렸습니다. 대신 모를 때 고를 단추를 함께 둡니다. */}
        {!isPromo && schoolExam !== 'none' && (
        <div style={{ fontSize: 12.5, color: '#8a7063', margin: '14px 2px 9px' }}>
          {target !== 'student' && kind === 'job' ? dateLabelFor(gates)
            : asksExam && schoolExam && schoolExam !== 'etc' ? `${SCHOOL_EXAMS.find(e => e.key === schoolExam)?.label} 날짜`
            : '시험(또는 발표) 날짜'} <span style={{ color: ACCENT, fontWeight: 600 }}>*</span>
        </div>)}
        {!isPromo && schoolExam !== 'none' && (<>
        <input type="date" value={examDate} onChange={e => { setExamDate(e.target.value); setDateApprox(false) }}
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 12,
            background: CARD,
            border: examDate ? `0.5px solid ${LINE}` : `1.5px solid ${ACCENT}55`,
            color: '#3a2e28', fontSize: 14, fontFamily: 'inherit',
          }} />

        {/* 모르는 손님을 위한 빠른 선택 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {quickDates.map(q => (
            <button key={q.v} onClick={() => { setExamDate(q.v); setDateApprox(true) }}
              style={{
                flex: 1, padding: '9px 4px', borderRadius: 10, cursor: 'pointer',
                background: examDate === q.v ? '#fdeef4' : CARD,
                border: examDate === q.v ? `1.5px solid ${ACCENT}` : `0.5px solid ${LINE}`,
                color: examDate === q.v ? ACCENT : '#8a7063',
                fontSize: 11.5, fontFamily: 'inherit', fontWeight: examDate === q.v ? 600 : 400,
              }}>{q.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, margin: '8px 2px 0' }}>
          {dateApprox
            ? '* 어림으로 고르셨어요. 그날의 일진은 보지 않고, 그 무렵(그 달)의 흐름으로 봐 드립니다. 날짜가 정해지면 다시 보세요.'
            : '* 그날의 일진(日辰)과 월운을 짚어 드리려면 날짜가 필요합니다. 정확히 모르시면 위 단추로 어림잡아 고르셔도 됩니다.'}
        </div>

        </>)}

        {/* ★2026-09-11 (6부) [대표님 「희망사항을 자유롭게 기술하게」] — 궁금한 것이나 고민 (선택 · 검사 44)
             적으면 풀이에 「적어 주신 고민에 대한 답」 단락이 한 번 들어갑니다.
             ⚠️ 주소에 싣지 않습니다 (writeWishHandoff) · 결과 화면이 기록에만 저장합니다. */}
        {!isPromo && (<>
        <div style={{ fontSize: 12.5, color: '#8a7063', margin: '18px 2px 9px' }}>
          궁금한 것이나 고민을 적어 주세요 <span style={{ color: '#a3907f' }}>(선택)</span>
        </div>
        <textarea value={wish} onChange={e => setWish(e.target.value)} maxLength={WISH_MAX} rows={3}
          placeholder={target === 'student'
            ? '예: 수시와 정시 중 어디에 더 힘을 써야 할지 고민이에요'
            : '예: 회사를 그만두고 준비할지, 다니면서 준비할지 고민이에요'}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box',
            background: CARD, border: `0.5px solid ${LINE}`, color: '#3a2e28',
            fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical',
          }} />
        <div style={{ fontSize: 11, color: '#a3907f', textAlign: 'right', margin: '3px 2px 0' }}>
          {wish.length} / {WISH_MAX}
        </div>
        </>)}

        {/* ★못 넘어가는 까닭을 알려 준다. 단추만 흐리면 손님이 왜 안 되는지 모릅니다. */}
        {!canGo && (
          <div style={{
            marginTop: 13, padding: '11px 13px', borderRadius: 11,
            background: '#fdf4f7', border: `1px solid ${ACCENT}33`,
            fontSize: 11.5, color: '#8c4a63', lineHeight: 1.7,
          }}>
            {isPromo && <>
              {pIsEtc && !pJobText.trim() && <div>· 어떤 일을 하시는지 적어 주세요.</div>}
              {!pCurLabel && <div>· 지금 직급을 골라 주시거나 적어 주세요.</div>}
              {!pNextLabel && <div>· 다음 직급을 골라 주시거나 적어 주세요.</div>}
              {!pWish.trim() && <div>· 궁금한 것이나 고민을 한 줄 적어 주세요. 아래 보기를 눌러도 됩니다.</div>}
            </>}
            {!isPromo && !gradeOk && <div>· 학년·신분을 골라 주세요.</div>}
            {!isPromo && !examTypeOk && <div>· 어떤 시험인지 골라 주세요.</div>}
            {!isPromo && !targetOk && <div>· {target === 'student' ? '가고자 하는 목표' : (kind === 'job' ? (situation ? '① 분야' : '지금 상황(신규 취업 / 이직)') : '목표 시험·직종')}를 골라 주세요.</div>}
            {!isPromo && !dateOk && <div>· 시험(또는 발표) 날짜를 골라 주세요.</div>}
          </div>
        )}

        <button
          onClick={openPay}
          disabled={!canGo}
          style={{
            width: '100%', marginTop: 14, padding: 15, borderRadius: 12,
            background: canGo ? ACCENT : '#e5d5cd', border: 'none', color: '#fff',
            fontSize: 14.5, fontWeight: 500, fontFamily: 'inherit',
            cursor: canGo ? 'pointer' : 'not-allowed',
          }}>
          {isPromo ? '승진운 보기' : kind === 'job' ? '취업운 보기' : '합격운 보기'}
        </button>

        {/* ★공용 결제 시트 — ⛔ 여기에 팝업을 «따로 만들지» 마십시오.
            ⚠️ 셋이 ★각각 값을 가집니다 (examluck_pass · examluck_job · examluck_promo).
               값이 아직 없으면 ★기본값(examluck_ai)으로 떨어집니다. */}
        <WalletPaySheet
          open={payOpen}
          title={isPromo ? '승진운 분석' : kind === 'job' ? '취업운 분석' : '합격운 분석'}
          subtitle={isPromo
            ? '지금 자리에서 다음 자리로 가는 길을 사주로 짚어 드려요'
            : kind === 'job'
              ? '일자리와 이직의 흐름을 사주로 짚어 드려요'
              : '시험과 합격의 흐름을 사주로 짚어 드려요'}
          includes={isPromo
            ? ['타고난 그릇과 지금 자리', '다음 자리가 요구하는 것', '인사 시기에 맞춘 달별 수칙']
            : kind === 'job'
              ? ['타고난 일의 결과 강점', '올해와 내년의 흐름', '달별 준비 수칙']
              : ['타고난 공부의 결', '올해와 내년의 흐름', '시험 날 실전 수칙']}
          item={priceItem}
          actionLabel={isPromo ? '승진운 보기' : kind === 'job' ? '취업운 보기' : '합격운 보기'}
          onClose={() => setPayOpen(false)}
          onCharge={() => router.push('/wallet')}
          onConfirm={() => { setPayOpen(false); goResult() }}
        />

        {/* ★이직·직업 변동은 교재 190~191쪽 자료를 아직 못 받았다. (작업지시 5장)
              "곧 나옵니다" 같은 예고는 화면에 적지 않는다. (교훈 BL) */}

        <div style={{ fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, marginTop: 16, textAlign: 'center' }}>
          태어난 시(時)를 모르셔도 볼 수 있어요.<br />다만 시주를 비워 두고 보게 되니, 그만큼 조심해서 읽어 주세요.
        </div>
      </div>
    </main>
  )
}

export default function ExamLuckInputPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <ExamLuckInputInner />
    </Suspense>
  )
}
