'use client'

/**
 * 진로적성 결과
 * ─────────────────────────────────────────────
 * 진입: career-input > 이 화면   /  보관함 카드 > 이 화면(&recordId=)
 *
 * 흐름
 *   URL(생년월일시) → /api/lunar → 4기둥
 *                   → lib/saju/career 판정 6가지
 *                   → CareerJudgeCard 로 그리기
 *                   → saveRecord('career')   ★기록 남기기
 *
 * ★아직 없는 것 — AI 통변
 *   지금은 판정 문장을 그대로 늘어놓는다. 궁합처럼 통변을 얹으면
 *   card.reasons 를 프롬프트 재료로 넘겨 사람 말로 엮게 된다.
 *   그 자리를 아래 [통변 붙일 자리] 주석에 표시해 두었다.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  judgeOhaengGijil, judgeYukchin, judgeGyeokguk,
  judgeSinsal, judgeGyeyeol, judgeSpecial, judgeYongsin, judgeJobs,
  judgeIlju, judgeJobStructure, judgeJobFit, judgeRoleFit,
  type CareerCard, type CareerInput,
} from '@/lib/saju/career'
import { calcPerson, ageOf, type PersonCalc } from '@/lib/saju/career/calcPerson'
import { buildCareerPrompt, parseCareerTongbyeon, keyOfTitle } from '@/lib/saju/career'
import { saveRecord, updateRecordResult } from '@/lib/saju/sajuRecords'
import { calcSajuMbti, compareMbti } from '@/lib/saju/career/sajuMbti'
import { type CareerStatus, STATUS_LABEL } from '@/lib/saju/career/status'
import MbtiCard from './components/MbtiCard'
// ★2026-07-29 — 프리미엄 진로적성&MBTI 리포트 (모듈2)
import { buildCareerMbtiPrompt } from '@/lib/saju/premium/buildCareerMbtiPrompt'
import { isPremium } from '@/lib/saju/premium/config'
// ★44부 40차 — 프리미엄 리포트에만 있던 이야기 셋을 카드로
import { judgeStrength, judgeLeadWealth, judgeCareerLuck } from '@/lib/saju/career/strengthCards'
import { openCareerCertificate } from './components/CareerCertificate'
import CopyTextButton from '@/app/components/common/CopyTextButton'
import { elOfStem, elOfBranch } from '@/lib/saju/ohaengColor'
import { splitCardText } from '@/lib/saju/premium/splitCardText'
import { toPercentList } from '@/lib/saju/simsanOhaeng'
import { calcSipsungDist } from '@/lib/saju/sipsungDist'
import { calcSimsanOhaeng } from '@/lib/saju/simsanOhaeng'
import { calcYongsinNew } from '@/lib/saju/yongsinNew'
import { getGongmang } from '@/lib/saju/gongmang'
import SajuWonguk from '@/app/manseryeok/components/SajuWonguk'
import CareerJudgeCard from './components/CareerJudgeCard'
// ★2026-07-31 — 만세력 표를 «떼어다» 통변 사이에 끼웁니다 (대표님 지시)
import SajuTableSlot, { type SajuTableKind } from '@/app/manseryeok/components/SajuTableSlot'
import ConsultButton from '@/app/components/common/ConsultButton'

const ACCENT = '#785aaa'
const BG = '#FDF6F0'
const LINE = '#f0e0d5'

/**
 * ★2026-07-31 — 카드 «뒤» 에 끼울 만세력 표. (대표님 지시)
 *
 *   「만세력에 나와 있는 표들을 따로 떼어내서, 고객들이 보기 쉽게
 *     통변별로 잘게 가독성 있게 쪼개 놓으라」
 *
 *   ⚠️ 만세력 화면(result-new)은 «건드리지 않습니다». 그쪽은 표가 다 나와야 합니다.
 *   ⚠️ 카드가 없으면(lines 가 빈 카드) 표도 안 그립니다 — 아래 렌더에서 함께 걸러집니다.
 */
const TABLE_AFTER: Record<string, { kinds: SajuTableKind[]; caption: string }> = {
  // 오행 기질 이야기 바로 뒤 — 그 이야기의 «근거 표» 입니다
  ohaeng_gijil: { kinds: ['ohaeng', 'sipsung'], caption: '이 이야기의 바탕 — 오행과 십성의 세력' },
  // 육친 이야기 뒤 — 내 힘이 얼마나 받쳐지는가
  yukchin: { kinds: ['singang'], caption: '내 힘이 얼마나 받쳐지는가' },
  // 용신 이야기 뒤 — 조후·억부·격국 세 갈래
  yongsin: { kinds: ['yongsin'], caption: '어떤 기운이 나를 돕는가' },
}

/**
 * ⛔★진로적성에서 프리미엄 리포트를 낼 것인가 (44부 40차)
 *
 *  ★2026-08-03 대표님 지시 — 「프리미엄은 «궁합» 을 그렇게 만들라고 한 것.
 *    진로적성은 일단 ★숨겨 줘. ★삭제가 아니야」
 *
 *  ⚠️ false 이면 예전처럼 «판정 카드 + 카드별 통변» 만 나옵니다.
 *     ★되살리시려면 이 한 줄을 true 로 두십시오. 지운 것은 하나도 없습니다.
 *  ⚠️ lib/saju/premium/config.ts 를 끄면 ★궁합·사주까지 꺼집니다. 여기서만 가립니다.
 */
const CAREER_PREMIUM = false

/**
 * ★프리미엄 리포트인지 가리는 제목들 (44부 38차)
 *
 *  🔴 [까닭]  「다시보기」로 열면 isPremiumTong 이 «거짓으로 남아»
 *     저장된 프리미엄 글이 카드형으로 잘못 그려지고 A4 버튼도 안 떴습니다.
 *  ⚠️ 저장본에는 「프리미엄이었는지」가 «적혀 있지 않아» 제목으로 가립니다.
 *  ⚠️⚠️ buildCareerMbtiPrompt 의 섹션 제목과 «같아야» 합니다.
 *     ★그 파일의 제목을 고치시면 여기도 함께 고치십시오.
 *     (그 파일은 AI 재료라 ⛔ 함부로 손대지 않기로 했습니다 — 2026-08-03)
 */
const PREMIUM_TITLES = [
  '사주로본성향', '사주성향vs실제성향', '사주추정성향의핵심',
  '강점지능과행동패턴', '직무&커리어전략', '리더십과재물운용', '커리어발복대운과개운',
]

/**
 * 화면 묶음 — 통변 순서와 1:1 로 맞춘다. (교훈 AS)
 *
 *  ★2026-08-03 (44부 40차) — 대표님 「사주명리 진로적성 통합 순서도」에 맞춰
 *    ★다섯 묶음으로 전면 개편했습니다.
 *  ⚠️ buildCareerPrompt.ts 의 ORDER 와 «같은 차례» 라야 합니다.
 *     한쪽만 고치면 통변이 엉뚱한 카드에 붙습니다. ★검사 그물이 둘을 맞대어 봅니다.
 */
const GROUPS: Array<{ label: string; keys: string[] }> = [
  { label: '핵심 에너지와 성향', keys: ['ohaeng_gijil', 'yukchin', 'ilju'] },
  // ★44부 40차 신설 — 프리미엄 리포트에만 있던 이야기를 카드로 옮겼습니다
  { label: '강점과 행동 패턴', keys: ['strength', 'leadwealth'] },
  // ★성인은 rolefit·jobfit 이, 학생은 gyeyeol 이 나옵니다.
  //   해당 없는 카드는 빈 카드로 와서 아래 렌더에서 걸러집니다.
  { label: '진로와 커리어 전략', keys: ['rolefit', 'jobfit', 'gyeyeol'] },
  { label: '운세와 개운', keys: ['yongsin', 'careerluck'] },
  // ⚠️ 「한 번 더 볼 점」은 ★맨 아래입니다 — 경고부터 보여 드리지 않습니다
  { label: '종합과 한 번 더 볼 점', keys: ['gyeokguk', 'sinsal', 'jobstruct', 'jobs', 'special'] },
]

function CareerResultInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const person = useMemo(() => ({
    name: sp.get('name') || '',
    gender: sp.get('gender') || '남',
    calType: sp.get('calType') || '양력',
    year: sp.get('year') || '',
    month: sp.get('month') || '',
    day: sp.get('day') || '',
    leapMonth: sp.get('leapMonth') || '0',
    hour: sp.get('hour') || '모름',
  }), [sp])
  const target = (sp.get('target') === 'student' ? 'student' : 'adult') as 'student' | 'adult'
  // ★2026-07-29 — 신분·직업과 실제 MBTI. (대표님 지시)
  //   status 가 없으면 target 으로 미뤄 잡습니다. 예전 링크가 깨지지 않게.
  const status = (sp.get('status') as CareerStatus | null)
    ?? (target === 'student' ? 'middle_high' : 'worker')
  const realMbti = (sp.get('mbti') || '').toUpperCase()
  /** 입력 화면으로 되돌아갈 때 쓸 쿼리 — 사람 정보는 그대로 들고 간다 */
  const backQuery = useMemo(() => {
    const p = new URLSearchParams()
    for (const k of ['year', 'month', 'day', 'gender', 'calType', 'leapMonth', 'hour', 'name']) {
      const v = sp.get(k); if (v) p.set(k, v)
    }
    return p.toString()
  }, [sp])
  const recordId = sp.get('recordId') || ''

  const [calc, setCalc] = useState<PersonCalc | null>(null)
  const [err, setErr] = useState('')
  const savedRef = useRef(false)     // 두 번 저장되지 않게 (교훈 AQ)
  const savedIdRef = useRef<string>('')  // ★async 가 길어 state 대신 ref 로 읽는다 (교훈 K)
  const [tong, setTong] = useState('')
  const [tongState, setTongState] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle')
  // ★2026-07-29 — 프리미엄 리포트로 받았는가.
  //   프리미엄은 «카드에 붙이는 주석»이 아니라 «여섯 장짜리 통짜 리포트»라
  //   렌더링을 갈라야 합니다. 섹션 이름이 판정 카드와 아예 다릅니다.
  const [isPremiumTong, setIsPremiumTong] = useState(false)
  const tongStartedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    if (!person.year) { setErr('생년월일이 없어요. 보관함에서 다시 들어와 주세요.'); return }
    calcPerson(person).then(r => {
      if (cancelled) return
      if (!r) { setErr('사주를 계산하지 못했어요. 잠시 후 다시 시도해 주세요.'); return }
      setCalc(r)
    })
    return () => { cancelled = true }
  }, [person])

  // 명식 부품(SajuWonguk)이 요구하는 값들
  const dayStem = calc?.saju.find(p => p.pillar === '일주')?.stem ?? ''
  const iljji = calc?.saju.find(p => p.pillar === '일주')?.branch ?? ''
  const yeonjji = calc?.saju.find(p => p.pillar === '년주')?.branch ?? ''
  const [gm1, gm2] = (dayStem && iljji && dayStem !== '?' && iljji !== '?')
    ? getGongmang(dayStem, iljji) : ['', '']

  const cards: CareerCard[] = useMemo(() => {
    if (!calc) return []
    const input: CareerInput = {
      saju: calc.saju, solarMonth: calc.solarMonth,
      solarDay: calc.solarDay, hourBranch: calc.hourBranch, target,
    }
    return [
      judgeSpecial(input),
      judgeOhaengGijil(input),
      judgeYukchin(input),
      judgeIlju(input),
      judgeGyeokguk(input),
      judgeSinsal(input),
      judgeYongsin(input),
      judgeJobStructure(input),
      // ★학생이면 「계열과 학과」, 성인이면 「잘 맞는 직무 & 조직 성향」.
      //   둘 중 하나만 lines 를 채우고 나머지는 빈 카드를 돌려줍니다.
      //   빈 카드는 아래 GROUPS 렌더에서 걸러집니다.
      judgeGyeyeol(input),
      judgeJobFit(input),
      // ★2026-07-29 — 성인에게는 「어울리는 직업」 대신 「핵심 직무 & 전문 분야」.
      //   교재 직업 목록에 유흥업·목욕탕·사채업 같은 옛 어휘가 있어
      //   직장인 리포트에 그대로 나가면 리포트 전체를 못 믿게 됩니다.
      //   ⚠️ 교재 표는 안 고쳤습니다. 성인 출력만 바꾼 것입니다. (roleFit 머리말)
      judgeRoleFit(input),
      judgeJobs(input),
      // ★2026-08-03 (44부 40차) — 프리미엄 리포트에만 있던 이야기 셋을 카드로.
      //   ⚠️ 값을 «새로 계산하지 않습니다» — deepJudge 의 것을 부르기만 합니다 (교훈 CJ)
      //   ⚠️⚠️ 대운 목록은 «여기서 안 만듭니다» —
      //      calcDayunList 가 비동기(절기 조회)라 useMemo 안에서 부를 수 없습니다.
      //      ★프리미엄 리포트도 대운을 안 넘기고 있었습니다(같은 까닭).
      //      ⇒ 「발복 대운과 개운」은 «개운» 쪽만 나옵니다. ★없는 대운을 지어내지 않습니다.
      //      대운까지 담으려면 화면이 먼저 대운을 불러 두어야 합니다 — 다음 차수 일입니다.
      ...(dayStem && dayStem !== '?' ? (() => {
        const score = calcSimsanOhaeng(calc.saju, calc.solarMonth, calc.solarDay, calc.hourBranch)
        const ys = calcYongsinNew(calc.saju, dayStem, score)
        const sIn = {
          saju: calc.saju, dayStem, score,
          age: ageOf(person.year) ?? 30, target,
          yongsin: ys?.eokbu ?? null,
        }
        return [judgeStrength(sIn), judgeLeadWealth(sIn), judgeCareerLuck(sIn)]
      })() : []),
    ].filter(Boolean) as CareerCard[]
  }, [calc, target, dayStem, person.year])

  // ★사주 추정 MBTI — 카드 판정과 별개로 한 번만 잰다
  const sajuMbti = useMemo(
    () => (calc ? calcSajuMbti(calc.saju, calc.solarMonth, calc.solarDay, calc.hourBranch) : null),
    [calc],
  )
  const mbtiCmp = useMemo(
    () => (sajuMbti && realMbti ? compareMbti(sajuMbti, realMbti) : null),
    [sajuMbti, realMbti],
  )

  // 기록 남기기 — 다시보기로 들어온 경우(recordId)에는 저장하지 않는다
  useEffect(() => {
    if (!calc || recordId || savedRef.current) return
    savedRef.current = true
    saveRecord({
      serviceType: 'career',
      title: person.name || '이름 없음',
      inputData: {
        gender: person.gender, calType: person.calType,
        year: person.year, month: person.month, day: person.day,
        leapMonth: person.leapMonth, hour: person.hour,
      },
    }).then(r => { if (r.ok && r.id) savedIdRef.current = r.id })
      .catch(e => console.error('진로적성 기록 저장 실패', e))
  }, [calc, recordId, person])


  // ── 통변 ────────────────────────────────────────────────────
  //   ★다시보기(recordId)로 들어오면 새로 돌리지 않는다. 돈이 든다.
  //     저장해 둔 풀이를 그대로 보여 준다.
  useEffect(() => {
    if (!calc || !cards.length || tongStartedRef.current) return
    if (recordId) return           // 다시보기 — 아래 effect 가 저장본을 불러온다
    tongStartedRef.current = true
    let cancelled = false

    ;(async () => {
      setTongState('loading')
      // ★2026-07-29 — 프리미엄이면 모듈2(6섹션), 아니면 예전 카드형 프롬프트.
      //   ⚠️ 결제 관문이 붙기 전까지 isPremium() 이 true 를 돌려줍니다.
      //      결제가 붙으면 lib/saju/premium/config.ts 한 곳만 고치면 됩니다.
      const age = ageOf(person.year) ?? 30
      const score = calcSimsanOhaeng(calc.saju, calc.solarMonth, calc.solarDay, calc.hourBranch)
      const dayStem = calc.saju.find(p => p.pillar === '일주')?.stem ?? ''
      // ══════════════════════════════════════════════════════════
      //  ⛔★2026-08-03 (44부 40차) — 진로적성에서 프리미엄 리포트를 «껐습니다».
      //     대표님 지시 — 「프리미엄은 «궁합» 을 그렇게 만들라고 한 것이다.
      //                   일단은 ★숨겨 줘. 삭제가 아니야」
      //
      //   [무엇이 문제였나]  프리미엄 리포트 여섯 대목과 판정 카드 열둘이
      //     ★«같은 이야기를 두 번» 했습니다 —
      //       리포트 「직무 & 커리어 전략」 ↔ 카드 「잘 맞는 직무」·「어울리는 직업」
      //       리포트 「강점 지능과 행동 패턴」 ↔ 카드 「타고난 오행의 결」·「육친이 …」
      //     2026-07-29 에 리포트를 «얹으면서» 판정 카드를 그대로 두어 생긴 일입니다.
      //
      //  ⚠️⚠️ ★«지운» 것이 아니라 «감춘» 것입니다 —
      //     buildCareerMbtiPrompt · premiumSections · PREMIUM_TITLES 모두 «그대로» 있습니다.
      //     ★되살리려면 아래 CAREER_PREMIUM 을 true 로 두기만 하면 됩니다.
      //  ⚠️ lib/saju/premium/config.ts 는 «건드리지 않았습니다» —
      //     그것을 끄면 ★궁합·사주까지 함께 꺼집니다. 진로적성만 여기서 가립니다.
      // ══════════════════════════════════════════════════════════
      const prem = CAREER_PREMIUM && isPremium() && !!dayStem && dayStem !== '?'
        ? buildCareerMbtiPrompt({
            name: person.name, gender: person.gender, age,
            saju: calc.saju, dayStem, score,
            yongsin: calcYongsinNew(calc.saju, dayStem, score),
            solarMonth: calc.solarMonth, solarDay: calc.solarDay,
            hourBranch: calc.hourBranch,
            status, realMbti, hourUnknown: calc.hourUnknown,
          })
        : null
      setIsPremiumTong(!!prem)

      const systemPrompt = prem?.system ?? buildCareerPrompt({
        name: person.name, gender: person.gender, age: ageOf(person.year),
        target, saju: calc.saju, hourUnknown: calc.hourUnknown, cards,
        status,
        sajuMbti: sajuMbti?.code,
        realMbti: realMbti || undefined,
      })
      let acc = ''
      try {
        const res = await fetch('/api/tongbyeon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt, userPrompt: prem?.user, premium: true }),
        })
        if (!res.ok || !res.body) {
          console.error('진로적성 통변 실패', res.status)
          setTongState('failed'); return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        // ★청크가 줄 중간에 잘릴 수 있다. buf 로 완성된 줄만 처리한다. (교훈 AG)
        let buf = ''
        const take = (line: string) => {
          if (!line.startsWith('data: ')) return
          const d = line.slice(6)
          if (d === '[DONE]') return
          try {
            const parsed = JSON.parse(d)
            if (parsed.text) { acc += parsed.text; if (!cancelled) setTong(acc) }
          } catch (e) { console.error('tongbyeon parse', e) }
        }
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const ls = buf.split('\n')
          buf = ls.pop() ?? ''
          for (const line of ls) take(line)
        }
        // ★2026-07-27 — 마지막 줄에 개행이 없으면 여기 남는다. 버리면 끝 문장이 잘린다.
        buf += decoder.decode()
        if (buf.trim()) take(buf.trim())
        if (cancelled) return
        setTongState('done')

        // ★풀이를 보관함에 남긴다. insert 가 아니라 update 다. (교훈 AQ)
        //   판정 저장이 먼저 일어나므로, 그 행을 덮어써야 한다.
        //   id 는 state 가 아니라 ref 로 읽는다. async 가 길어 클로저가 낡는다.
        for (let i = 0; i < 10 && !savedIdRef.current; i++) {
          await new Promise(r => setTimeout(r, 500))
        }
        if (savedIdRef.current) {
          const ok = await updateRecordResult(savedIdRef.current, { tong: acc })
          if (!ok) console.error('진로적성 풀이 저장 실패 (update)')
        } else {
          console.error('진로적성 풀이 저장 실패 — 저장된 기록 id 를 찾지 못했습니다')
        }
      } catch (e) {
        console.error('진로적성 통변 오류', e)
        if (!cancelled) setTongState('failed')
      }
    })()
    return () => { cancelled = true }
  }, [calc, cards, recordId, person, target, status, sajuMbti?.code, realMbti])

  // 다시보기 — 저장해 둔 풀이 불러오기
  useEffect(() => {
    if (!recordId) return
    let cancelled = false
    import('@/lib/saju/sajuRecords').then(({ getRecord }) =>
      getRecord(recordId).then(r => {
        if (cancelled || !r) return
        const t = (r.resultData as { tong?: string } | undefined)?.tong
        if (t) {
          setTong(t); setTongState('done')
          // 🔴★2026-08-03 (44부 38차) — 「다시보기」로 열면 isPremiumTong 이
          //   ★«거짓으로 남아» 프리미엄 리포트가 카드형으로 잘못 그려지고,
          //   A4·해설복사 버튼도 뜨지 않았습니다.
          //   ⇒ 저장된 글이 «프리미엄 꼴» 인지 보고 정합니다.
          //   ⚠️ 저장본에는 「프리미엄이었는지」가 안 적혀 있어 «글의 모양» 으로 가립니다 —
          //      ★대목 «제목» 으로 가립니다 — 제목은 buildCareerMbtiPrompt 가 정합니다.
          // ⛔ 진로적성 프리미엄을 껐으므로(44부 40차) 저장된 옛 프리미엄 글도
          //    «카드형» 으로 그립니다. ★되살리면 이 줄이 함께 살아납니다.
          setIsPremiumTong(CAREER_PREMIUM
            && PREMIUM_TITLES.some(x => t.replace(/\s/g, '').includes(x)))
        }
      }),
    ).catch(e => console.error('저장된 풀이 불러오기 실패', e))
    return () => { cancelled = true }
  }, [recordId])

  // 대목별로 갈라 카드에 넣는다
  /** ★프리미엄 리포트 — ■ 제목별로 통째로 뽑는다 (판정 카드와 별개) */
  const premiumSections = useMemo(() => {
    if (!isPremiumTong || !tong) return []
    const { byTitle } = parseCareerTongbyeon(tong)
    return Object.entries(byTitle).map(([title, body]) => ({ title, body }))
  }, [isPremiumTong, tong])

  // ══════════════════════════════════════════════════════════════
  //  ★A4 진로적성 (2026-08-03 · 대표님 지시 · 44부 36차)
  //
  //  ⚠️⚠️ 값을 «다시 계산하지 않습니다» — 화면이 쓰는 것을 그대로 넘깁니다. (교훈 CJ)
  //     두 벌로 세면 «종이와 화면이 다른 말» 을 하는 날이 옵니다.
  //  ⚠️ 팝업이 막히면 «조용히 넘어가지 않고» 알려 드립니다. (교훈 U)
  // ══════════════════════════════════════════════════════════════
  /**
   * ★종이에 넣을 표 값 (44부 37차)
   *  ⚠️ 화면 SajuTableSlot 과 «같은 함수» 를 부릅니다. 셈을 두 벌로 두지 않습니다.
   */
  const certTables = useMemo(() => {
    if (!calc || !dayStem || dayStem === '?') return undefined
    const score = calcSimsanOhaeng(calc.saju, calc.solarMonth, calc.solarDay, calc.hourBranch)
    const ys = calcYongsinNew(calc.saju, dayStem)
    return {
      ohaeng: toPercentList(score).map(o => ({ el: o.el as string, pct: o.pct })),
      sipsung: calcSipsungDist(calc.saju, dayStem).map(x => ({ ss: x.ss, pct: x.pct })),
      yongsin: {
        strength: ys?.status ?? '',
        eokbu: ys?.eokbu?.yongsin ?? '',
        johu: ys?.johu?.element ?? '',
        gyeokguk: ys?.gyeokguk?.element ?? '',
      },
    }
  }, [calc, dayStem])

  /**
   * ★통변이 «다 왔는가» (44부 42차)
   *
   *  ⚠️ tongState 만 믿을 수 없습니다 — 스트리밍 중 effect 가 정리되면
   *     cancelled 가 true 가 되어 ★setTongState('done') 에 «닿지 못합니다».
   *     tongStartedRef 때문에 다시 시작하지도 않아, 글은 있는데 상태만 'loading' 으로 남습니다.
   *  ★그래서 «글 자체» 를 봅니다. 대목이 셋 이상이면 반쪽이 아닙니다.
   *  ⚠️ 저장본 다시보기는 tongState 가 'done' 이므로 그것으로도 참입니다.
   */
  const tongDone = useMemo(() => {
    if (!tong) return false
    if (tongState === 'done') return true
    return (tong.match(/^\s*■/gm) ?? []).length >= 3
  }, [tong, tongState])

  function onPrintCert() {
    if (!calc) return
    const r = openCareerCertificate({
      name: person.name || '',
      birth: person.year ? `${person.year}.${person.month}.${person.day}` : '',
      // 🔴 2026-08-03 (44부 37차) — status 를 «그대로» 넣어 「worker · 성인」이 나갔습니다.
      //   ★화면과 «같은 이름표»(STATUS_LABEL)를 씁니다. 두 벌로 적지 마십시오.
      badge: [status ? STATUS_LABEL[status] : '', target === 'student' ? '학생' : '성인']
        .filter(Boolean).join(' · '),
      // ★화면(SajuWonguk)과 «같은 차례» — 시·일·월·년
      pillars: ['시주', '일주', '월주', '년주'].map(k => {
        const q = calc.saju.find(x => x.pillar === k)
        return {
          label: k[0],
          stem: q?.stem ?? '', branch: q?.branch ?? '',
          stemEl: elOfStem(q?.stem ?? '') ?? '토',
          branchEl: elOfBranch(q?.branch ?? '') ?? '토',
        }
      }),
      // ⚠️ 2026-08-03 (44부 41차) — 프리미엄이 꺼지면 premiumSections 가 «빕니다».
      //    ★그러면 «빈 종이» 가 나갑니다. 카드별 통변을 담습니다.
      //    ⚠️ 값을 «다시 계산하지 않습니다» — 화면이 쓰는 것을 그대로 씁니다 (교훈 CJ)
      sections: premiumSections.length
        ? premiumSections
        : cards
            .filter(c => c.lines.length > 0 && tongByKey[c.key])
            .map(c => ({ title: c.title, body: tongByKey[c.key] })),
      // ══════════════════════════════════════════════════════════
      //  ⛔⛔★판정 근거는 «절대» 손님께 보이지 않습니다 (44부 48차)
      //
      //  ★2026-08-03 대표님 지시 — 「판정 근거는 보여 주면 안 되지.
      //    ★이것은 «절대» 보여 주면 안 된다고 적어 놔」
      //
      //  [까닭]  card.lines 는 ★교재 원문 그대로의 판정 문장입니다.
      //    ⚠️ 명리 술어가 날것으로 — 식상 · 격국용신 · 활인업 · 현침살
      //    🔴 그보다 무거운 것은 ★«단정하는 험한 말» 입니다 —
      //       「독선적이고 융통성이 부족하며 자존심과 집착이 강해요」
      //       「남을 배려하는 마음이 부족하고 … 대인 관계가 매끄럽지 못한 편입니다」
      //       「변덕이 있고 비밀을 발설하며 … 구설수가 따릅니다」
      //    ★13세 손님과 부모님이 «함께» 읽습니다.
      //    AI 풀이가 같은 내용을 이미 «다듬어» 전합니다.
      //
      //  ⚠️⚠️ 44부 46차에 «화면» 에서 감췄는데 ★종이는 안 껐습니다.
      //     그래서 A4 에 그대로 실려 나갔습니다.
      //     ★44부 3-3장 교훈 — 「한 곳만 끄면 «새어 나갑니다»」. 또 겪었습니다.
      //
      //  ⛔ 되살리지 «마십시오». 되살리려면 반드시 대표님께 여쭈십시오.
      //  ⚠️ 지운 것이 아니라 «안 넘기는» 것입니다 — cards 는 화면이 그대로 씁니다.
      // ══════════════════════════════════════════════════════════
      cards: [],
      // ★화면 카드 사이의 «표» 를 종이에도 (44부 37차 · 대표님 「표가 모두 사라졌다」)
      //   ⚠️ 값을 «다시 계산하지 않습니다» — 화면 부품이 쓰는 함수를 그대로 부릅니다 (교훈 CJ)
      tables: certTables,
    })
    if (!r.ok && r.message) alert(r.message)
  }

  const { tongIntro, tongByKey, tongOutro } = useMemo(() => {
    if (!tong || isPremiumTong) return { tongIntro: '', tongByKey: {} as Record<string, string>, tongOutro: '' }
    const { intro, byTitle, outro } = parseCareerTongbyeon(tong)
    const map: Record<string, string> = {}
    // ★2026-07-27 — 짝을 못 찾은 대목을 버리지 않는다.
    //   전에는 keyOfTitle 이 null 이면 그 글이 화면 어디에도 안 나오고 사라졌다.
    //   자리가 조금 어긋나더라도 보이는 편이 낫다. 맺는말 앞에 이어 붙인다.
    const leftover: string[] = []
    for (const title of Object.keys(byTitle)) {
      const k = keyOfTitle(title)
      if (k) map[k] = byTitle[title]
      else if (byTitle[title]) leftover.push(byTitle[title])
    }
    const outroAll = [...leftover, outro].filter(Boolean).join('\n\n')
    return { tongIntro: intro, tongByKey: map, tongOutro: outroAll }
  }, [tong, isPremiumTong])

  const byKey = (k: string) => cards.find(c => c.key === k)

  return (
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', paddingBottom: 48 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${LINE}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/manseryeok/career')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>
          {person.name ? `${person.name}님의 진로적성` : '진로적성'}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: ACCENT, background: '#efeaf7', padding: '2px 9px', borderRadius: 8 }}>
          {target === 'student' ? '학생' : '성인'}
        </span>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {err && (
          <div style={{ textAlign: 'center', padding: '46px 20px', color: '#5c3a1e', fontSize: 13, lineHeight: 1.7 }}>{err}</div>
        )}

        {!err && !calc && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#5c3a1e', fontSize: 13 }}>
            사주를 세우는 중…
          </div>
        )}

        {calc && (
          <>
            {/* 명식 — 사주보기·출산택일과 같은 공용 부품을 그대로 쓴다.
                십성·12운성·신살·귀인까지 한 표에 담기고, 용어를 누르면 설명이 뜬다.
                손으로 다시 그리면 세 화면의 명식이 서로 달라진다. */}
            <div style={{ marginBottom: 14 }}>
              <SajuWonguk
                saju={calc.saju}
                dayStem={dayStem}
                yeonjji={yeonjji}
                iljji={iljji}
                gm1={gm1}
                gm2={gm2}
              />
              {calc.hourUnknown && (
                <div style={{ fontSize: 11, color: '#8a7063', marginTop: 8, textAlign: 'center' }}>
                  태어난 시(時)를 몰라 시주를 비워 두고 보았어요
                </div>
              )}
            </div>

            {/* 여는말 */}
            {tongState === 'loading' && !tongIntro && (
              <div style={{ textAlign: 'center', padding: '18px 0', color: '#8a7063', fontSize: 12.5 }}>
                풀이를 쓰고 있어요…
              </div>
            )}
            {tongIntro && (
              <div style={{
                background: '#f7f3fb', border: `0.5px solid #e5dcf0`, borderRadius: 14,
                padding: '15px 16px', marginBottom: 14,
                fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85, whiteSpace: 'pre-wrap',
              }}>{tongIntro}</div>
            )}

            {/* ★2026-07-29 — 어느 신분으로 본 리포트인지 밝힙니다.
                손님이 잘못 골랐을 때 바로 알아채고 되돌아갈 수 있어야 합니다. */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap',
              margin: '2px 2px 10px',
            }}>
              <span style={{
                fontSize: 11, color: '#4a3b60', background: '#f3eefa',
                border: '1px solid #785aaa26', padding: '4px 10px', borderRadius: 20, fontWeight: 600,
              }}>{STATUS_LABEL[status]} 기준</span>
              {realMbti && (
                <span style={{
                  fontSize: 11, color: '#64748b', background: '#f8fafc',
                  border: '1px solid rgba(120,53,15,0.11)', padding: '4px 10px', borderRadius: 20,
                }}>MBTI {realMbti}</span>
              )}
              <button
                onClick={() => router.push(`/manseryeok/career-input?${backQuery}`)}
                style={{
                  fontSize: 11, color: '#94a3b8', background: 'none', border: 'none',
                  cursor: 'pointer', textDecoration: 'underline', padding: '4px 2px',
                }}
              >바꾸기</button>
            </div>

            {/* ★2026-07-29 — 프리미엄 리포트 (모듈2 · 여섯 섹션).
                판정 카드와 별개로 통짜 리포트를 먼저 보여 줍니다.
                ⚠️ 판정 카드는 그대로 남깁니다. 근거를 눈으로 볼 수 있어야 하기 때문입니다. */}
            {premiumSections.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                {premiumSections.map((sec, i) => (
                  <div key={i} style={{
                    background: '#fff', border: '1px solid rgba(120,53,15,0.15)',
                    borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    padding: '16px 15px', marginBottom: 10,
                  }}>
                    <div style={{
                      fontSize: 14.5, fontWeight: 700, color: '#1e293b',
                      marginBottom: 9, letterSpacing: '-0.2px',
                    }}>{sec.title}</div>

                    {/* ══════════════════════════════════════════════════
                        🔴★2026-08-03 (44부 30차) — [한줄]·[태그]·[실천] 을 갈라 그립니다.

                        [무엇이 있었나]  본문을 whiteSpace:'pre-wrap' 으로 «통째로» 찍어
                          ★「[한줄] 상황에 따라 달리 쓰는…」·「[태그] …」·「[실천] …」이
                            손님 화면에 «글자 그대로» 나갔습니다. (대표님 사진 2026-08-03)
                        [까닭]  프롬프트는 그 표시를 «일부러» 붙이게 합니다 —
                          "화면이 그것으로 갈라 그립니다" 라고 적혀 있는데,
                          ★사주풀이·합격운만 갈라 그리고 진로적성은 «안 했습니다».
                        ⚠️ 파서는 lib/saju/premium/splitCardText.ts «한 곳» 입니다.
                           여기서 다시 적지 마십시오. 그렇게 해서 두 벌이 되었습니다.
                        ⚠️ 표시가 없는 옛 통변은 예전처럼 통짜로 그려집니다. 안 깨집니다.
                        ══════════════════════════════════════════════════ */}
                    {(() => {
                      const p = splitCardText(sec.body)
                      return (
                        <>
                          {/* ★한줄 — 카드에서 가장 하고 싶은 말 */}
                          {p.summary && (
                            <p style={{
                              fontSize: 13, color: '#785aaa', lineHeight: 1.6, fontWeight: 600,
                              margin: '0 0 9px',
                            }}>{p.summary}</p>
                          )}

                          {/* ★태그 — 알약으로 */}
                          {p.tags && p.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '0 0 10px' }}>
                              {p.tags.map((t, k) => (
                                <span key={k} style={{
                                  fontSize: 10.5, color: '#5b4580', background: '#f3eefb',
                                  border: '1px solid #e4daf5', padding: '3px 9px',
                                  borderRadius: 20, fontWeight: 600,
                                }}>{t}</span>
                              ))}
                            </div>
                          )}

                          {/* 본문 — 빈 줄로 문단을 나눠 그립니다 */}
                          {p.body.split(/\n\s*\n/).filter(x => x.trim()).map((para, k) => (
                            <p key={k} style={{
                              fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85,
                              margin: '0 0 10px', whiteSpace: 'pre-wrap',
                            }}>{para.trim()}</p>
                          ))}

                          {/* ★실천 — 강조 상자로 따로 */}
                          {p.action && (
                            <div style={{
                              marginTop: 2, padding: '11px 12px', borderRadius: 11,
                              background: '#fdf6ee', border: '1px solid rgba(200,120,60,0.26)',
                              display: 'flex', gap: 8, alignItems: 'flex-start',
                            }}>
                              <span style={{ fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>✅</span>
                              <span style={{ fontSize: 12.5, lineHeight: 1.75, color: '#6b4a2e' }}>
                                {p.action}
                              </span>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: '4px 0 2px' }}>
                  아래는 위 풀이의 근거가 된 판정입니다
                </div>
              </div>
            )}

            {GROUPS.map(g => {
              // ★2026-07-29 — lines 가 빈 카드는 안 그립니다.
              //   「계열과 학과」(학생)와 「직무 & 조직」(성인)이 서로 자리를 바꾸는데,
              //   해당 없는 쪽은 빈 카드를 돌려주기 때문입니다.
              const list = g.keys.map(byKey)
                .filter((c): c is CareerCard => !!c && c.lines.length > 0)
              if (!list.length) return null
              return (
                <div key={g.label || 'top'}>
                  {g.label && (
                    <div style={{
                      fontSize: 12, color: '#8a7063', fontWeight: 500,
                      margin: '18px 2px 8px', letterSpacing: '.02em',
                    }}>{g.label}</div>
                  )}
                  {list.map(c => {
                    const slot = TABLE_AFTER[c.key]
                    return (
                      <div key={c.key}>
                        <CareerJudgeCard card={c} tong={tongByKey[c.key]} />
                        {/* ★그 카드의 이야기에 딸린 표를 «바로 뒤» 에 붙입니다 */}
                        {slot && calc && (
                          <SajuTableSlot
                            saju={calc.saju}
                            solarMonth={calc.solarMonth}
                            solarDay={calc.solarDay}
                            hourBranch={calc.hourBranch}
                            dayStem={dayStem}
                            kinds={slot.kinds}
                            caption={slot.caption}
                          />
                        )}
                      </div>
                    )
                  })}
                  {/* ★사주 MBTI — 「타고난 결」 묶음 끝에 붙입니다.
                      성향 이야기라 오행·육친·일주 바로 뒤가 결이 맞습니다. */}
                  {/* ══════════════════════════════════════════════════════
                      🔴★2026-08-03 (44부 35차) — 「사주로 본 성향」은
                         ★MBTI 를 «넣으신 분만» 보는 대목입니다. (대표님 지시)

                      [까닭]  이 카드의 알맹이는 «타고난 결 ↔ 지금의 결» 을 견주는 것입니다.
                        넣지 않으시면 견줄 것이 없어 반쪽만 남고,
                        그 반쪽을 보시고 나면 오히려 «이게 뭔가» 가 됩니다.
                      ★대신 «입력 화면» 에서 한 번 정중히 여쭙습니다 (MbtiAskDialog).
                      ⚠️⚠️ 통변 «재료» 에서도 1·2번 대목을 함께 뺐습니다 —
                         화면만 숨기면 ★AI 글에 「ESFP 이신 분은…」이 그대로 나옵니다.
                         (44부 1-3 교훈 — 연표가 자식운 카드에 들어갔던 자리)
                      ⚠️ 되살리려면 realMbti 조건만 떼면 됩니다. 카드는 그대로 있습니다.
                      ══════════════════════════════════════════════════════ */}
                  {/* ⚠️ 2026-08-03 (44부 40차) — 묶음 이름이 「타고난 결」에서
                      「핵심 에너지와 성향」으로 바뀌었습니다. ★여기도 함께 고쳐야
                      카드가 붙습니다. 한쪽만 고치면 «어디에도 안 붙습니다». */}
                  {g.label === '핵심 에너지와 성향' && sajuMbti && realMbti && mbtiCmp && (
                    <MbtiCard
                      result={sajuMbti}
                      realMbti={realMbti}
                      compare={mbtiCmp}
                      /* ★2026-08-03 (44부 32차) — 「◯◯님은 사주명리에 비춰 볼 때…」 */
                      name={person.name}
                      onWantInput={() => router.push(`/manseryeok/career-input?${backQuery}`)}
                    />
                  )}
                </div>
              )
            })}

            {/* 맺는말 */}
            {tongOutro && (
              <div style={{
                background: '#f7f3fb', border: `0.5px solid #e5dcf0`, borderRadius: 14,
                padding: '15px 16px', margin: '4px 0 14px',
                fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85, whiteSpace: 'pre-wrap',
              }}>{tongOutro}</div>
            )}
            {tongState === 'failed' && (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#8a7063', fontSize: 12 }}>
                풀이를 불러오지 못했어요. 판정은 그대로 보실 수 있습니다.
              </div>
            )}

            {/* ★2026-07-27 — "곧 더해질 대목" 상자를 뺐다. (대표님 지시)
                  준비 중이라는 안내는 만드는 쪽 사정이지 읽는 분께 드릴 말이 아니다.
                  학과도 이제 나오므로 "학과와 대학"이라는 예고 자체가 어긋나 있었다.
                  학업운·합격운은 홈의 '합격운/취업운'(🐍)에서 따로 들어간다. */}

            {/* ══════════════════════════════════════════════════════
                ★2026-08-03 (44부 36차) — A4 인쇄 · 해설 복사 (대표님 지시)

                ⚠️ 진로적성에는 셋 다 «없었습니다» — 궁합·사주·작명에는 있었습니다.
                ★틀은 app/components/common/A4Print.tsx «한 곳» 입니다.
                   여기서 window.open 이나 @page 를 다시 적지 마십시오.
                ⚠️ 통변이 «다 나온 뒤» 에만 보입니다 — ★반쪽 인쇄물을 내지 않습니다.
                   (44부 23차 궁합서와 같은 결)
                ⚠️ 공용 부품(CopyTextButton)을 «고치지 않고» 감싼 자리에서 너비를 맞춥니다.
                ══════════════════════════════════════════════════════ */}
            {/* 🔴⚠️ 2026-08-03 (44부 37차) — ★tongState === 'done' 을 «빠뜨렸습니다».
                [무엇이 있었나]  premiumSections.length > 0 만 걸어 두어,
                  ★AI 가 «첫 대목을 쓰기 시작하자마자» 버튼이 떴습니다.
                  그때 누르시면 «쓰다 만 글» 이 종이에 박힙니다 —
                  대표님이 뽑으신 PDF 가 「회의·발표·현장처럼 사」에서 끊겼습니다.
                ⚠️ 44부 23차 궁합서는 이 조건을 «제대로» 걸고 있었는데,
                   제가 옮기며 빠뜨렸습니다. 검사 그물에도 「다 나온 뒤」라 적어 놓고서요. */}
            {/* 🔴⚠️ 2026-08-03 (44부 41차) — 버튼이 ★premiumSections 에 매여 있었습니다.
                40차에 프리미엄을 끄자 그 배열이 «언제나 빈» 것이 되어
                ★A4·해설복사 버튼이 «영영 안 떴습니다». 36차에 만든 것을 40차가 죽인 셈입니다.
                ⇒ 「★통변이 다 나왔는가」로 답니다. 프리미엄과 무관합니다. */}
            {/* 🔴⚠️ 2026-08-03 (44부 42차) — ★tongState 에서 «뗐습니다».
                스트리밍 중 effect 가 정리되면 'done' 에 닿지 못해,
                ★글은 있는데 버튼만 «영영 안 뜨는» 일이 있었습니다. (대표님 화면)
                ⇒ 위 tongDone 이 «글» 을 보고 답니다. */}
            {tongDone && (
              <>
                <div style={{
                  display: 'flex', flexDirection: 'row', gap: 8,
                  alignItems: 'stretch', marginTop: 18,
                }}>
                  <button
                    onClick={onPrintCert}
                    /* ★2026-08-05 (47부 11차) — 「해설 복사」와 높이·간격을 맞췄습니다.
                         minHeight 44 · 글자 13 · marginTop 0 (줄 간격은 «감싸는 쪽» 이 정합니다)
                         ⛔ 짝(CopyTextButton)만 바꾸면 또 어긋납니다. 둘을 «함께» 보십시오. */
                    style={{
                      flex: 1, marginTop: 0, padding: '13px 10px', borderRadius: 12,
                      minHeight: 44, boxSizing: 'border-box',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#785aaa', border: 'none', color: '#fff',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>A4 PDF저장/인쇄</button>
                  <div style={{ flex: 1 }} className="copy-half">
                    <CopyTextButton
                      text={tong}
                      label="진로적성 풀이"
                      name={person.name}
                      inRow
                    />
                  </div>
                </div>
                <style>{`.copy-half > button { width: 100% }`}</style>
                <div style={{ fontSize: 10.5, color: '#a8927e', textAlign: 'center', marginTop: 6 }}>
                  새 창에서 인쇄 또는 PDF로 저장
                </div>
              </>
            )}


            <div style={{ fontSize: 11, color: '#a08d7d', textAlign: 'center', marginTop: 18, lineHeight: 1.7 }}>
              사주는 참고입니다. 길은 본인의 노력과 의지로 얼마든지 바꿀 수 있어요.
            </div>

            {/* ★2026-08-05 (47부 9차) — 상담 카드를 «화면 맨 끝» 으로 내렸습니다. [대표님 지시]
                「다시그리기 보다 더 아래…맨 끝으로 옮겨줘」
                ⚠️ 그래서 맺음말·안내글이 상담 카드 «위» 로 올라갔습니다. 뜻한 대로입니다.
                ⛔ 다시 위로 올리지 마십시오. */}
            {/* ★2026-08-05 (47부 6차) — 전문가 상담 [대표님 지시]
                「진로적성과 타로는 넣어줘」
                ⚠️ priceKey='career' — ★consult_prices 표에 이 줄이 «있어야» 보입니다.
                   줄이 없으면 active=false 로 떨어져 버튼이 통째로 숨습니다 (안전한 쪽).
                   SQL 은 _SQL_consult_prices_47bu.sql 에 담아 두었습니다.
                ⚠️ 진로적성 통변(tong)을 상담사에게 넘깁니다.
                   ⛔ 판정 근거(cards)는 «넘기지 않습니다» — 44부 확정으로 «절대» 안 보입니다. */}
            <div>
              <ConsultButton
                priceKey="career"
                mode="career"
                payload={() => ({ aiAnalysis: tong || undefined })}
              />
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function CareerResultPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <CareerResultInner />
    </Suspense>
  )
}
