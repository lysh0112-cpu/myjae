'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { splitSurname } from '@/lib/saju/surname'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { supabase } from '@/lib/supabase'
import { diagnoseName, type NameChar } from '@/lib/saju/naming'
import { fromMyInfo, fromProfile, personKey, type MyInfo } from '@/lib/saju/myInfo'
import { ohaengOrEmpty } from '@/lib/saju/ohaeng'
// ★2026-08-01 (43부) — 작명 «대상» 을 Step 2 에서 그대로 받습니다 (결함 ③④)
import {
  resolveNamingTarget, saveNamingTarget, namingTargetQuery, hasSaju,
  type NamingTarget,
} from '@/lib/saju/namingSession'
// ★2026-07-30 (3단계) — hanja 표 단일 창구 + 후보 정렬 이관
import {
  HANJA_SELECT, listPolicy, rowOhaeng, rowStrokes, rowHanja, fetchHanjaReadings,
  type HanjaRow as SharedHanjaRow,
} from '@/lib/saju/hanjaRow'
// ★2026-08-01 (43부) 두음법칙 안내 — «판정은 바꾸지 않습니다» (교재는 표기음 그대로)
import { dueumPairIfReal, dueumNotice } from '@/lib/saju/sound/dueum'
// ★2026-08-01 (43부 6차) — 「한 번에 이름 하나」 정책 (대표님 확정)
//   ⚠️ 부품은 두고 «배선만» 끊었습니다. lib/saju/namingPolicy.ts 의 값 하나로 되돌아옵니다.
import { clampTryLimit, isSingleName } from '@/lib/saju/namingPolicy'

import {
  buildSajuOhaengProfile, judgeResource, candidateScore, compareCandidates,
} from '@/lib/saju/resourceJudge'

const GOLD = '#c8783c'
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부 6차) — 배색 대비를 올렸습니다 (대표님 지시)
//
//   [무엇이 문제였나]  바탕(#FDF6F0)과 카드(#fffbf7)가 «거의 같은 색» 이라
//     카드가 어디서 시작하고 끝나는지 눈에 안 들어왔습니다.
//     테두리도 rgba(200,120,60,0.10) — 그 위에서는 «없는 것과 같았습니다».
//     ⚠️ 그래서 「고른 것/안 고른 것」이 구분되지 않았습니다.
//
//   ★[이제]  세 층을 또렷이 갈랐습니다.
//     바탕  #F4F2EF   ← ★7차: 베이지를 버린 «오프화이트». 흰 카드와 확실히 갈립니다
//     카드  #FFFFFF   ← 흰색. 바탕과 확실히 갈립니다
//     테두리 #DFD9D2  ← 실제로 «보이는» 선 (+ 카드에 옅은 그림자)
//     고름  GOLD 테두리 + 옅은 금빛 바탕
//
//   ⚠️ 글자색은 건드리지 않았습니다 — 바탕이 더 밝아졌으므로 대비는 «좋아지기만» 합니다.
//   ⚠️ 어두운 테마 화면(rename/hanja · rename/result)은 «손대지 않았습니다».
//      거기서는 흰 글씨가 «맞습니다». 같이 바꾸면 그 화면이 통째로 안 보입니다.
// ══════════════════════════════════════════════════════════════════
const CARD = '#FFFFFF'
/** ★보이는 테두리 — 이 파일에서 «선» 은 전부 이 값을 쓰십시오 */
const LINE = '#DFD9D2'
/** 바탕 — 카드가 떠 보이도록 한 단 낮춥니다 */
const BG = '#F4F2EF'
/** ★7차 — 안내 글자를 «짙게». #b4785a 는 흰 카드 위에서 흐렸습니다 */
const SUB = '#6B5B50'
/** 본문 글자 — 검정 대신 짙은 갈회색 */
const INK = '#2E2622'
/** 카드 그림자 — 테두리만으로 부족한 자리에 */
const SHADOW = '0 1px 3px rgba(46,38,34,0.06)'
const GREEN = '#81c784'

const TOP_N = 6
// ★한 번에 몇 개인지는 namingPolicy 가 정합니다 (아래 clampTryLimit)
const DEFAULT_TRY_LIMIT = clampTryLimit(3)

const MY_INFO_KEY = 'myinfo'
const NAMING_RESULT_KEY = 'naming_last_result_v1'
const NEWNAME_HISTORY_KEY = 'newname_history_v1'

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
  /**
   * ★훈(訓) — 「버들」 한 낱말 (2026-08-01 · 43부 14차)
   *
   * 🔴 [왜 더했나]  선명장에 「柳(버들, 류)」 처럼 훈음을 새겨야 하는데
   *    저장된 글자에 뜻이 «없어» 「(류)」만 찍혀 나갔습니다.
   *    ★한자를 고르는 «이 화면» 이 뜻을 알고 있습니다. 그때 함께 담습니다.
   * ⚠️ 없으면 «비웁니다». 그럴듯한 뜻을 붙이면 그것이 종이로 남습니다. (교훈 EJ)
   * ⚠️ 옛 기록에는 이 값이 없습니다 — 선택값이라 읽는 쪽이 견딥니다.
   */
  meaning?: string
}

/** 뜻에서 «첫 낱말» 만 — 「버들, 버드나무 류」 → 「버들」 */
function firstMeaning(row: HanjaRow | null | undefined): string {
  const m = (row?.meaning ?? '').trim()
  if (!m) return ''
  // ⚠️ 쉼표·가운뎃점으로 여러 뜻이 이어집니다. 선명장에는 한 낱말만 새깁니다.
  return m.split(/[,·]/)[0].trim().slice(0, 6)
}

// ★2026-07-30 (3단계) — 지역 정의를 걷어내고 lib/saju/hanjaRow.ts 를 씁니다. (교훈 CJ)
type HanjaRow = SharedHanjaRow

interface TryItem {
  name: string
  chars: SavedChar[]
}

// ★2026-07-30 (1단계) — 이 자리에 있던 ohaengChar 사본을 걷어냈습니다.
//   네 화면에 한 글자도 다르지 않은 사본이 넷 있었고, 정작 «내이름 감정»
//   (naming/diagnosis/page.tsx)에는 없었습니다. 창구를 하나로 모았습니다. (교훈 CJ)
//   ⚠️ 여기에 다시 사본을 만들지 마십시오. lib/saju/ohaeng.ts 를 부르십시오.

// ★2026-07-30 (3단계) — gradeNum 을 걷어냈습니다. candidateScore 가 대신합니다.

/** 등급 한 줄의 색 — ⚠️ 색표를 새로 만들지 않습니다. 이 화면 안 세 값뿐입니다 */
function gradeTone(g: string): string {
  if (g === '좋음') return '#4a9450'
  if (g === '아쉬움' || g.includes('미충족')) return '#c8783c'
  return '#5c3a1e'
}

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

function NewHanjaInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [info, setInfo] = useState<MyInfo | null>(null)

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부) 결함 ③④ — 이 화면이 «누구» 의 이름을 짓는지
  //
  //   [무엇이 있었나]
  //     ③ kind(개명·신생아)를 Step 2 가 URL 로 실어 보냈는데
  //        이 화면이 «읽지도 넘기지도» 않아 여기서 끊겼습니다.
  //     ④ 사주를 localStorage myinfo(내 것)에서만 읽었습니다.
  //        보관함에서 가족을 골라도 한자는 «내» 사주로 골라졌습니다.
  //
  //   [이제]  URL(정본) → 세션(부본) 순으로 대상을 받습니다.
  //   ⚠️ 둘 다 없으면 target 은 null 이고, 아래는 «옛 길»(myinfo)로 갑니다.
  //      ★기존 개명 손님의 화면은 한 글자도 달라지지 않습니다. (교훈 [폴백])
  // ══════════════════════════════════════════════════════════════
  const [target, setTarget] = useState<NamingTarget | null>(null)

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부) 두음법칙 안내 — 감정 화면에만 있던 것을 이리로도
  //
  //   [무엇이 빠져 있었나]  40부에 넣은 안내가 «이름 감정» 에만 있었습니다.
  //     그런데 두음이 갈리는 자리는 «성씨» 이고, 성씨 한자를 고르는 곳이 여기입니다.
  //     ⚠️ 신생아는 여기서 «처음» 성씨 한자를 고릅니다 — 안내가 가장 필요한 자리인데
  //        정작 없었습니다.
  //
  //   ⚠️⚠️ 판정을 «바꾸지 않습니다». 알려 주기만 합니다.
  //      柳吉諒 을 「류길량」으로 쓰면 ★5.0, 「유길량」이면 ★4.0 — «둘 다 맞습니다».
  //      교재는 표기음 그대로 봅니다(이재명 = 토·금·수).
  //   ★그 한자가 «정말 두 음으로 실려 있을 때만» 뜹니다 (hanja 표에 물어봅니다).
  // ══════════════════════════════════════════════════════════════
  const [dueumMsg, setDueumMsg] = useState<string | null>(null)

  // ★2026-07-31 복성 — 성이 두 글자일 수 있어 배열로 둡니다.
  //   예전에는 저장 레코드의 chars[0] 만 집어서 남궁민수의 «궁» 이 통째로 사라졌습니다.
  const [surnameChars, setSurnameChars] = useState<SavedChar[]>([])
  // ★2026-08-01 (43부) — 여기 있던 surname(= chars 첫 글자)을 걷어냈습니다.
  //   신생아는 그 값이 «없는 것이 정상» 이라, 화면이 그 값을 보면 다시 막힙니다.
  //   ⚠️ 대신 surnameNow(고른 것 포함)와 wantSurname(대상의 성씨)을 쓰십시오.
  const [uid, setUid] = useState<string>('')   // ★ 로그인 회원 user_id (tries 저장 열쇠)
  const [syllables, setSyllables] = useState<string[]>([])
  const [activeIdx, setActiveIdx] = useState<number>(0)
  const [restored, setRestored] = useState(false)

  const [chosen, setChosen] = useState<Record<number, HanjaRow>>({})

  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // ★ 최종 저장 확인 팝업
  const [confirmOpen, setConfirmOpen] = useState(false)

  // ★ 이름 짓기 조회 횟수 (관리자 설정값 · app_settings)
  const [TRY_LIMIT, setTryLimit] = useState(DEFAULT_TRY_LIMIT)
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'naming_try_limit').maybeSingle()
      // ⚠️ 관리자 설정 값도 «정책을 지나» 옵니다 — 한 군데만 빠뜨리면 어긋납니다
      .then(({ data }) => { if (data && typeof data.value === 'number') setTryLimit(clampTryLimit(data.value)) })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      // ★대상을 «먼저» 받습니다 — 이것이 있으면 myinfo 를 보지 않습니다
      const t = resolveNamingTarget((k) => sp.get(k))
      if (!cancelled) setTarget(t)

      // ── info 구성 ──
      //   ★① 대상의 사주 (보관함에서 고른 그 사람 — 결함 ④가 새던 자리)
      //     ② 없으면 localStorage myinfo
      //     ③ 그것도 없으면 profiles(DB)
      let stdInfo: MyInfo | null = null
      if (hasSaju(t)) {
        stdInfo = fromMyInfo({
          calType: t!.calType,
          year: String(t!.year), month: String(t!.month), day: String(t!.day),
          leapMonth: t!.leapMonth,
          hour: t!.hourIdx == null ? '모름' : String(t!.hourIdx),
          gender: t!.gender ?? '남',
        })
      }
      if (!stdInfo) {
        try {
          const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
          stdInfo = fromMyInfo(m)
        } catch {}
      }

      if (!stdInfo) {
        try {
          const { data: u } = await supabase.auth.getUser()
          if (u?.user) {
            const { data: p } = await supabase
              .from('profiles')
              .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
              .eq('id', u.user.id)
              .single()
            stdInfo = fromProfile(p)
          }
        } catch {}
      }

      if (!cancelled && stdInfo) {
        setInfo(stdInfo)
      }

      // ── 성씨 + user_id: 로그인 my_names 우선, 없으면 localStorage ──
      let surnameLoaded = false
      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          if (!cancelled) setUid(u.user.id)   // ★ user_id 저장
          const { data: rows } = await supabase
            .from('my_names')
            .select('chars')
            .eq('user_id', u.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
          if (!cancelled && rows && rows[0] && Array.isArray(rows[0].chars) && rows[0].chars[0]) {
            // ★복성이면 앞 두 글자가 성입니다. 가르는 것은 splitSurname 하나뿐입니다.
            setSurnameChars(splitSurname(rows[0].chars as SavedChar[]).surname)
            surnameLoaded = true
          }
        }
      } catch {}

      /** 불러온 성씨의 한글 — 첫 칸을 어디에 둘지 정하는 데 씁니다 */
      let loadedSurHangul = ''
      if (!surnameLoaded) {
        try {
          const r = JSON.parse(localStorage.getItem(NAMING_RESULT_KEY) || '{}')
          if (!cancelled && Array.isArray(r.chars) && r.chars[0]) {
            const sp2 = splitSurname(r.chars as SavedChar[]).surname
            setSurnameChars(sp2)
            // ⚠️ 여기서도 «불러왔다» 고 세워야 합니다 — 안 세우면 개명 손님이
            //    성씨 칸에 서게 되어 「왜 성을 고르라 하지」 가 됩니다.
            surnameLoaded = true
            loadedSurHangul = sp2.map(c => c.hangul).join('')
          }
        } catch {}
      }

      const nameParam = sp.get('name') || ''
      const arr = Array.from(nameParam.trim()).filter(isHangulSyllable)
      if (!cancelled) {
        setSyllables(arr)
        // ★첫 칸 — 성씨를 «골라야 하면» 성씨부터, 아니면 «이름» 부터.
        //   ⚠️ 개명 손님을 성씨 칸에 세우면 「왜 성을 고르라 하지」 가 됩니다.
        //      이미 정해진 성씨는 «확인하고 싶을 때만» 누르시면 됩니다.
        const surLen = Array.from(t?.surnameHangul || loadedSurHangul).length
        // ★성씨 한자를 «아무도 모를 때» 만 성씨 칸에서 시작합니다 (신생아)
        const needPick = !t?.surnameHanja && !surnameLoaded
        setActiveIdx(needPick ? 0 : surLen)
        setRestored(true)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [sp])

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부) — 성씨 한자를 «고를 수도» 있게 했습니다
  //
  //   [왜 필요한가]  신생아는 chars 가 없어 성씨 한자를 «아무도 모릅니다».
  //     ⚠️ 그런데 수리 4격은 성씨 획수에서 시작하고,
  //        자원오행 흐름은 성씨 오행에서 출발합니다.
  //        성씨 한자가 없으면 «판정을 할 수가 없습니다».
  //     ★그래서 신생아는 성씨 한자를 «첫 칸» 으로 두고 고르게 합니다.
  //       류(柳/劉), 정(鄭/丁), 강(姜/康) 처럼 집안마다 다릅니다 — 물어야 맞습니다.
  //
  //   [개명은 그대로입니다]  저장된 chars 의 성씨가 «대상의 성씨와 같으면»
  //     예전처럼 붙박이 칸으로 보여 줍니다. 화면이 달라지지 않습니다.
  // ══════════════════════════════════════════════════════════════
  const wantSurname = target?.surnameHangul
    || surnameChars.map((c) => c.hangul).join('')
  /** 불러온 성씨가 «이 대상의» 성씨인가 */
  const loadedSurnameFits =
    surnameChars.length > 0
    && surnameChars.map((c) => c.hangul).join('') === wantSurname
  /** ★성씨 한자를 «반드시» 골라야 하는가 (불러온 것이 없거나 다른 성씨) */
  const pickSurname = !loadedSurnameFits && wantSurname.length > 0

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부 5차) — 성씨도 «언제나 칸» 입니다 (대표님 지시)
  //
  //   [무엇이 문제였나]  개명에서는 성씨가 «회색 상자» 였습니다. 못 눌렀습니다.
  //     ⚠️ 그런데 같은 「류」라도 柳(9획)·劉(15획)로 획수가 다르고,
  //        「이」는 李(7획)·異(11획)로 갈립니다.
  //        불러온 한자가 «그 집안 것이 아닐» 수 있는데 고칠 길이 없었습니다.
  //        → 수리 4격이 통째로 어긋난 채 결과가 나갑니다.
  //     ★두음 성씨(류/유·리/이)는 오행까지 갈립니다. 더더욱 확인이 필요합니다.
  //
  //   ★[이제]  성씨도 칸으로 두고 «눌러서 바꿀 수» 있습니다.
  //
  //   ⚠️⚠️ 칸을 «있다 없다» 하게 만들지 마십시오.
  //      chosen 은 «칸 번호» 로 담깁니다. 성씨 칸이 나중에 생기면 번호가 밀려
  //      이미 고른 이름 한자가 «성씨 자리로» 옮겨 갑니다.
  //      ★그래서 성씨 칸은 처음부터 «언제나» 있습니다. 개명은 그 칸이 미리 채워질 뿐입니다.
  // ══════════════════════════════════════════════════════════════
  const slots = useMemo(() => [
    ...Array.from(wantSurname).map((h) => ({ hangul: h, role: '성' as const })),
    ...syllables.map((h) => ({ hangul: h, role: '이름' as const })),
  ], [wantSurname, syllables])

  const surnameSlotCount = Array.from(wantSurname).length

  /**
   * 지금의 성씨 글자들.
   *   ① 손님이 «고른» 것이 있으면 그것
   *   ② 없으면 불러온 것 (개명 — 예전 그대로)
   *   ③ 둘 다 없으면 «아직 안 고른» 칸 (신생아)
   */
  const pickedSurnameChars: SavedChar[] = useMemo(() => {
    const out: SavedChar[] = []
    for (let i = 0; i < surnameSlotCount; i++) {
      const row = chosen[i]
      if (row) {
        out.push({
          hangul: slots[i].hangul, hanja: rowHanja(row),
          strokes: rowStrokes(row), resourceOhaeng: rowOhaeng(row) ?? '',
          meaning: firstMeaning(row),
        })
      } else if (loadedSurnameFits && surnameChars[i]) {
        out.push(surnameChars[i])
      } else break
    }
    return out
  }, [surnameSlotCount, chosen, slots, loadedSurnameFits, surnameChars])

  /** 그 칸이 «채워졌는가» — 고른 것이든 불러온 것이든 */
  const slotFilled = (i: number) =>
    !!chosen[i] || (i < surnameSlotCount && !!pickedSurnameChars[i])

  /** ★화면·판정이 쓰는 «지금의» 성씨 첫 글자 */
  const surnameNow: SavedChar | null = pickedSurnameChars[0] ?? null

  /** ★결함 ③ — 개명인가 신생아인가. 여기서 «끊기던» 값입니다 */
  const isNewborn = (target?.kind ?? '개명') === '신생아'

  const infoYear = info ? parseInt(info.year) : 0
  const infoMonth = info ? parseInt(info.month) : 0
  const infoDay = info ? parseInt(info.day) : 0
  const infoHourIdx = info ? (info.hour === '모름' ? null : parseInt(info.hour)) : null

  /**
   * ★2026-08-01 (43부) — 결과 화면으로 넘길 «지금의» 대상.
   *
   *   · 앞에서 받은 대상이 있으면 그것을 쓰고,
   *   · 없으면(옛 길로 들어온 개명) 지금 화면이 아는 것으로 «만들어» 줍니다.
   *     ⚠️ 옛 길에서도 결과 화면이 myinfo 로 되돌아가지 않게 하려는 것입니다.
   *   · 성씨 한자는 여기서 «확정» 되므로 채워 넣습니다 (신생아가 방금 골랐습니다).
   */
  const targetNow: NamingTarget | null = useMemo(() => {
    if (!wantSurname) return null
    const base: NamingTarget = target ?? {
      kind: '개명',
      surnameHangul: wantSurname,
      surnameHanja: null,
      calType: info?.calType || '양력',
      year: infoYear, month: infoMonth, day: infoDay,
      leapMonth: info?.leapMonth || '0',
      hourIdx: infoHourIdx,
      gender: info?.gender ?? null,
      relation: null, personTitle: null,
      style: null, prefer: null, avoid: null,
    }
    const surHanja = pickedSurnameChars.map((c) => c.hanja).join('')
    return {
      ...base,
      surnameHangul: wantSurname,
      surnameHanja: surHanja || base.surnameHanja,
    }
  }, [target, wantSurname, info, infoYear, infoMonth, infoDay, infoHourIdx, pickedSurnameChars])

  const { saju, solar, dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    infoYear,
    infoMonth,
    infoDay,
    info?.leapMonth || '0',
    infoHourIdx,
  )

  const yong = useMemo(() => {
    if (!saju || !dayStem) return { yongsin: '', heeksin: '', gisin: '', gusin: '', hansin: '', isStrong: false, score: {} as Record<string, number> }
    try {
      // 심산 오행 점수로 계산 (월지 계절 치환 반영)
      const y = calcYongsinCompat(saju, dayStem, solar?.month, solar?.day,
        saju.find(p => p.pillar === '시주')?.branch ?? null)
      // ★2026-07-30 (3단계) — 버려지던 기신·구신·한신·isStrong 을 함께 받습니다.
      //   과다 억제·기신 회피 판정의 재료입니다.
      return {
        yongsin: ohaengOrEmpty(y.yongsin), heeksin: ohaengOrEmpty(y.heeksin),
        gisin: ohaengOrEmpty(y.gisin), gusin: ohaengOrEmpty(y.gusin),
        hansin: ohaengOrEmpty(y.hansin), isStrong: y.isStrong,
        score: y.score,
      }
    } catch {
      return { yongsin: '', heeksin: '', gisin: '', gusin: '', hansin: '', isStrong: false, score: {} as Record<string, number> }
    }
  }, [saju, dayStem, solar])
  const yongsin = yong.yongsin
  const yongsinReady = !converting && !!yongsin

  useEffect(() => {
    if (!restored || slots.length === 0) { setHanjaList([]); return }
    const hangul = slots[activeIdx]?.hangul
    if (!hangul) { setHanjaList([]); return }
    let cancelled = false
    setLoadingList(true)
    supabase
      .from('hanja')
      .select(HANJA_SELECT)   // ★'*' — 마이그레이션 전에도 안 깨집니다
      .eq('hangul', hangul)
      .order('strokes', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error(error); setHanjaList([]) }
        else {
          // ★2026-07-30 (3단계) — 전에는 avoid_hard «만» 보았습니다.
          //   그래서 不用(불용한자 947건)이 손님 목록에 그대로 나갔습니다.
          //   이제 diagnosis 와 «같은» 잣대를 씁니다 (avoid_hard · 不用 · 뜻 · 쉬는 줄).
          // ★2026-07-30 (3단계-b) — «거르기» 가 아니라 «표시하기» 입니다.
          //   不用 을 목록에서 빼면 50개 음(겁·괴·늠 …)이 후보 0개가 되어
          //   그 음을 이름에 가진 손님이 한자를 하나도 못 고르게 됩니다.
          //   → 막는 것은 avoid_hard·쉬는 줄뿐이고, 나머지는 흐리게 + 배지로 냅니다.
          const filtered = ((data as HanjaRow[]) ?? []).filter((row) => listPolicy(row).show)
          setHanjaList(filtered)
        }
        setLoadingList(false)
      })
    return () => { cancelled = true }
  }, [activeIdx, slots, restored])

  /**
   * ★2026-08-01 (43부) — 어느 칸을 고르는 중인지에 따라 «성/이름» 을 다시 엮습니다.
   *
   *   개명   : 성씨는 붙박이, 후보는 언제나 «이름» 칸에 들어갑니다 (예전 그대로)
   *   신생아 : 앞 칸이 성씨입니다. 성씨를 고르는 중이면 «후보가 성씨» 가 됩니다.
   *
   *   ⚠️ 아직 안 고른 칸은 빈 글자로 둡니다 — 예전과 같습니다.
   *      diagnoseName 이 빈 글자를 이미 견디도록 되어 있습니다.
   */
  const composeWith = useMemo(() => (row: HanjaRow | null) => {
    const asChar = (r: HanjaRow, hangul: string): SavedChar => ({
      hangul, hanja: rowHanja(r), strokes: rowStrokes(r), resourceOhaeng: rowOhaeng(r) ?? '',
      // ★훈(訓) 을 함께 담습니다 — 선명장에 「柳(버들, 류)」 로 새기기 위해
      meaning: firstMeaning(r),
    })
    const all: SavedChar[] = slots.map((slot, i) => {
      if (row && i === activeIdx) return asChar(row, slot.hangul)
      const pick = chosen[i]
      if (pick) return asChar(pick, slot.hangul)
      // ★성씨 칸은 «불러온 것» 이 받쳐 줍니다 (개명은 예전 그대로 돕니다)
      if (i < surnameSlotCount && pickedSurnameChars[i]) return pickedSurnameChars[i]
      return { hangul: slot.hangul, hanja: '', strokes: 0, resourceOhaeng: '' }
    })
    return { sur: all.slice(0, surnameSlotCount), giv: all.slice(surnameSlotCount) }
  }, [slots, activeIdx, chosen, surnameSlotCount, pickedSurnameChars])

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부 5차) — 「최종 확정」 완충 단계에 보여 줄 조화도
  //
  //  ⚠️⚠️ 이 자리에 두는 것이 «중요합니다».
  //     아래에 있던 것을 옮겼습니다 — 화면이 일찍 return 하는 자리(!restored 등)
  //     «뒤» 에 훅이 있으면 그릴 때마다 훅 개수가 달라져 React 가 깨집니다.
  //     ★훅은 «조기 반환보다 위» 에 모아 두십시오. (eslint react-hooks/rules-of-hooks)
  //
  //  ⚠️ 판정을 «다시 하지» 않습니다. 위 scored 와 같은 창구
  //     (diagnoseName · judgeResource)를 그대로 부릅니다. (교훈 CJ)
  //  ★한 번 더 보시고 넘어가시라는 자리입니다 — 다음 걸음은 결제 횟수를 씁니다.
  // ══════════════════════════════════════════════════════════════
  const previewChars = buildNameChars()
  /** ★의존 목록에 «식» 을 넣지 않으려고 열쇠를 미리 지어 둡니다 (eslint 규칙) */
  const previewKey = previewChars ? previewChars.map(c => c.hanja).join('') : ''

  const previewVerdict = useMemo(() => {
    if (!previewChars || !yongsinReady) return null
    try {
      const toNC = (c: SavedChar): NameChar => ({
        hangul: c.hangul, hanja: c.hanja, strokes: c.strokes,
        resourceOhaeng: ohaengOrEmpty(c.resourceOhaeng),
      })
      const sur = previewChars.slice(0, surnameSlotCount)
      const giv = previewChars.slice(surnameSlotCount)
      const r = diagnoseName({
        surname: toNC(sur[0]), surname2: sur[1] ? toNC(sur[1]) : null,
        given: giv.map(toNC),
        yongsin: yong.yongsin, heeksin: yong.heeksin, elementScore: yong.score,
      })
      const profile = buildSajuOhaengProfile({
        isStrong: yong.isStrong, yongsin: yong.yongsin, heeksin: yong.heeksin,
        gisin: yong.gisin, gusin: yong.gusin, hansin: yong.hansin, score: yong.score,
      }, saju)
      const verdict = judgeResource(
        sur.map(c => ({ hanja: c.hanja, hangul: c.hangul,
          primary: ohaengOrEmpty(c.resourceOhaeng) || null, secondary: null })),
        giv.map(c => ({ hanja: c.hanja, hangul: c.hangul,
          primary: ohaengOrEmpty(c.resourceOhaeng) || null, secondary: null })),
        profile,
      )
      return { r, verdict, total: candidateScore(verdict, r.suri.grade, r.soundFlow.score) }
    } catch { return null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, yongsinReady, yong, saju, surnameSlotCount])

  const scored = useMemo(() => {
    // ⚠️ 성씨를 «고르는 중» 이면 surnameNow 가 아직 없습니다. 그래도 재야 합니다 —
    //    후보 자체가 성씨이기 때문입니다. 그래서 surnameNow 를 조건에서 뺐습니다.
    if (!yongsinReady || hanjaList.length === 0 || slots.length === 0) return []

    // ★사주 프로필 — 후보마다 다시 만들지 않습니다
    const profile = buildSajuOhaengProfile({
      isStrong: yong.isStrong, yongsin: yong.yongsin, heeksin: yong.heeksin,
      gisin: yong.gisin, gusin: yong.gusin, hansin: yong.hansin, score: yong.score,
    }, saju)

    return hanjaList.map((row) => {
      const { sur, giv } = composeWith(row)
      const toNC = (c: SavedChar): NameChar => ({
        hangul: c.hangul, hanja: c.hanja, strokes: c.strokes,
        resourceOhaeng: ohaengOrEmpty(c.resourceOhaeng),
      })
      const given: NameChar[] = giv.map(toNC)
      const r = diagnoseName({
        surname: sur[0]
          ? toNC(sur[0])
          : { hangul: wantSurname[0] ?? '', hanja: '', strokes: 0, resourceOhaeng: '' },
        surname2: sur[1] ? toNC(sur[1]) : null,
        given,
        yongsin: yong.yongsin,
        heeksin: yong.heeksin,
        elementScore: yong.score,
      })
      // ★★2026-07-30 (3단계) — rename/hanja 와 «같은» 잣대로 갈아 끼웁니다.
      //   자원오행+사주보완 칸만 judgeResource 의 0~100 으로. 수리·발음 무게는 그대로.
      const verdict = judgeResource(
        // ★복성이면 성 두 글자를 배열로 — 둘째 글자가 이름 글자로 채점되지 않도록
        sur.map(c => ({ hanja: c.hanja, hangul: c.hangul,
          primary: ohaengOrEmpty(c.resourceOhaeng) || null, secondary: null })),
        given.map(g => ({ hanja: g.hanja, hangul: g.hangul,
          primary: ohaengOrEmpty(g.resourceOhaeng) || null, secondary: null })),
        profile,
      )
      // ★2026-07-31 (40부) — 발음은 «등급» 이 아니라 «정밀 점수» 를 넘깁니다.
      //   서버(/api/naming)도 같은 값을 씁니다. 한쪽만 등급으로 가면 갈립니다 (2-10장·교훈 ET)
      const weighted = candidateScore(verdict, r.suri.grade, r.soundFlow.score)
      const fitsYongsin = rowOhaeng(row) === yongsin
      return { row, weighted, fitsYongsin, verdict }
    })
  }, [yongsinReady, hanjaList, slots, wantSurname, composeWith, yong, saju, yongsin])

  const { recommend, others } = useMemo(() => {
    if (scored.length === 0) return { recommend: [] as { row: HanjaRow; rank: number }[], others: [] as HanjaRow[] }
    // ★2026-07-30 (3단계) — 공용 비교 함수 (교훈 CJ)
    const sorted = [...scored].sort((a, b) => compareCandidates(
      { fitsYongsin: a.fitsYongsin, avoidSoft: !!a.row.avoid_soft, score: a.weighted, strokes: rowStrokes(a.row), softPenalty: listPolicy(a.row).softPenalty },
      { fitsYongsin: b.fitsYongsin, avoidSoft: !!b.row.avoid_soft, score: b.weighted, strokes: rowStrokes(b.row), softPenalty: listPolicy(b.row).softPenalty },
    ))
    const fitSorted = sorted.filter((s) => s.fitsYongsin)
    const recSrc = (fitSorted.length > 0 ? fitSorted : sorted).slice(0, TOP_N)
    const rec = recSrc.map((s, i) => ({ row: s.row, rank: i + 1 }))
    const recSet = new Set(rec.map((r) => r.row.hanja + r.row.strokes))
    const oth = sorted.map((s) => s.row).filter((r) => !recSet.has(r.hanja + r.strokes))
    return { recommend: rec, others: oth }
  }, [scored])

  function pickHanja(row: HanjaRow) {
    setChosen((prev) => ({ ...prev, [activeIdx]: row }))

    // ★성씨 자리에서만 봅니다. 이름 가운데·끝 글자는 두음 자리가 아닙니다
    //   (諒은 이름 끝에서 «량» 이 맞습니다)
    const isSurnameSlot = slots[activeIdx]?.role === '성'
    if (!isSurnameSlot) { setDueumMsg(null); return }
    void (async () => {
      const readings = await fetchHanjaReadings(
        (h) => supabase.from('hanja').select('hangul').eq('hanja', h), rowHanja(row))
      const p = dueumPairIfReal(row.hangul, readings, rowHanja(row))
      setDueumMsg(p ? dueumNotice(p) : null)
    })()
  }

  // 현재 tries 목록 읽기 (user_id 열쇠)
  function readTries(): TryItem[] {
    try {
      const h = JSON.parse(localStorage.getItem(NEWNAME_HISTORY_KEY) || '{}')
      if (h.userId === uid && Array.isArray(h.tries)) return h.tries
    } catch {}
    return []
  }

  // 완성된 이름의 chars 배열
  //   ★2026-08-01 (43부) — 성씨 칸까지 아우릅니다 (신생아는 성씨도 «고른» 것입니다)
  function buildNameChars(): SavedChar[] | null {
    if (slots.length === 0) return null
    // 아직 모든 칸의 한자가 «차지» 않았으면 계산하지 않음 (undefined 방지)
    //   ★성씨 칸은 불러온 것으로도 찹니다 (개명)
    if (!slots.every((_, i) => slotFilled(i))) return null
    const { sur, giv } = composeWith(null)
    // ★2026-07-30 (1단계) — 보관함에 «표준 표기» 로 남깁니다.
    //   판정 경로(위 useMemo)는 이미 정규화했지만 이 줄은 저장용이라 날것이었습니다.
    //   날것으로 저장하면 다시보기 때 그 값이 다시 흘러 들어옵니다.
    return [...sur, ...giv]
  }

  // "이 이름으로 →" : 다음 글자로 넘어가거나, 다 골랐으면 확인 팝업 띄우기
  function proceed() {
    if (!chosen[activeIdx]) return
    const next = slots.findIndex((_, i) => !slotFilled(i) && i !== activeIdx)
    if (next !== -1) {
      setActiveIdx(next)
      return
    }
    setConfirmOpen(true)   // ★ 즉시 저장 대신 확인 팝업
  }

  // 팝업에서 "확정"을 눌렀을 때만 실제 저장 + 결과로 이동
  function confirmSave() {
    const nameChars = buildNameChars()
    if (!nameChars) return
    const hangulName = syllables.join('')
    const hanjaKey = nameChars.map((c) => c.hanja).join('')

    let tries = readTries()

    // ══════════════════════════════════════════════════════════
    //  🔴★2026-08-01 (43부 7차) — «방금 고른 이름이 안 나오던» 버그
    //
    //   [무엇이 있었나]  제가 6차에 한도를 «1» 로 내리면서,
    //     아래 「한도를 다 썼으면 막는다」 갈래가 «두 번째 이름부터 언제나» 걸렸습니다.
    //       ① 崔旼佼 를 확정해도 tries 에 «넣지 않고»
    //       ② 옛 목록(柳彊珉)을 그대로 둔 채 결과 화면으로 보냈습니다
    //       → 손님은 방금 고른 이름 대신 «지난번 이름» 의 풀이를 봤습니다.
    //       → 보관함에도 새 이름이 «저장되지 않았습니다».
    //     ⚠️ 「한 번에 하나」는 «하나만 저장한다» 는 뜻이지
    //        «두 번째를 막는다» 는 뜻이 아니었습니다. 제가 잘못 옮겼습니다.
    //
    //   ★[이제]  한 번에 하나면 «새로 고른 이름으로 갈아 끼웁니다».
    //     ⚠️ 옛 이름을 잃는 것이 아닙니다 — 보관함에 이미 저장돼 있습니다.
    //        (아래 결과 화면이 「전에 지으신 이름 N개는 보관함에 있어요」로 안내합니다)
    // ══════════════════════════════════════════════════════════
    if (isSingleName) {
      // ★언제나 «방금 고른 이름» 하나만 남깁니다. 막지 않습니다.
      tries = [{ name: hangulName, chars: nameChars }]
    } else {
      const existIdx = tries.findIndex((t) => t.chars.map((c) => c.hanja).join('') === hanjaKey)
      if (existIdx === -1) {
        if (tries.length >= TRY_LIMIT) {
          alert('총 ' + TRY_LIMIT + '회까지 이름을 지어볼 수 있어요.\n지금까지 본 이름 중에서 골라주세요.')
          setConfirmOpen(false)
          // ⚠️ 이 갈래도 «대상을 실어» 보냅니다 (28-verify 가 잡았던 자리)
          router.push(gotoResult())
          return
        }
        tries.push({ name: hangulName, chars: nameChars })
      } else {
        const item = tries.splice(existIdx, 1)[0]
        tries.push(item)
      }
    }

    try {
      // ★ user_id 열쇠로 저장 (personKey 안 씀 — 대규모에서도 안 겹침)
      localStorage.setItem(NEWNAME_HISTORY_KEY, JSON.stringify({ userId: uid, tries }))
    } catch {}

    setConfirmOpen(false)
    // ★대상 + «방금 고른 이름» 을 함께 넘깁니다 (43부 7차)
    router.push(gotoResult({ hangul: hangulName, hanja: hanjaKey }))
  }

  /**
   * ★결과 화면으로 가는 «단 하나» 의 문.
   *   여기서 성씨 한자가 «확정» 되므로 대상에 채워 넣어 다시 실어 보냅니다.
   */
  function gotoResult(picked?: { hangul: string; hanja: string }): string {
    const base = '/manseryeok/naming/rename/newresult'
    const q = new URLSearchParams()
    // ★2026-08-01 (43부 7차) — «방금 고른 이름» 을 URL 에도 또박또박 싣습니다.
    //   ⚠️ 전에는 결과 화면이 localStorage 의 tries «마지막 줄» 만 믿었습니다.
    //      그 줄이 갱신되지 않으면 «지난번 이름» 이 그대로 나옵니다 (7차 버그).
    //      → 결과 화면이 «URL 과 다른 이름» 을 그리면 스스로 알아채도록 실어 보냅니다.
    if (picked?.hanja) {
      q.set('pickedHanja', picked.hanja)
      q.set('pickedHangul', picked.hangul)
    }
    if (targetNow) {
      saveNamingTarget(targetNow)
      for (const [k, v] of new URLSearchParams(namingTargetQuery(targetNow))) q.set(k, v)
    }
    const qs = q.toString()
    return qs ? `${base}?${qs}` : base
  }

  // ★2026-08-01 (43부) — 「성씨가 없다」가 아니라 「성씨 «글자» 조차 없다」로 봅니다.
  //   신생아는 한자 성씨가 없는 것이 «정상» 입니다. 그건 아래에서 고릅니다.
  if (restored && (!wantSurname || syllables.length === 0)) {
    return (
      <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
        <Header router={router} />
        <div style={{ padding: '40px 8px', textAlign: 'center', color: SUB, lineHeight: 1.8 }}>
          {!wantSurname
            ? <>성씨를 알 수 없어요.<br />앞 화면에서 성씨부터 알려 주세요.</>
            : <>새 이름이 전달되지 않았어요.<br />다시 입력해 주세요.</>}
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/manseryeok/naming/rename/newname')}
              style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(200,120,60,0.12)', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 700, cursor: 'pointer' }}>
              새 이름 입력으로 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!restored) return <main style={{ minHeight: '100vh', background: BG }} />

  // ★2026-08-01 (43부) — 이름은 slotTarget 으로. 위 targetNow(작명 대상)와 헷갈리지 않게 합니다
  const slotTarget = slots[activeIdx]?.hangul ?? ''
  const allChosen = slots.length > 0 && slots.every((_, i) => slotFilled(i))

  // 팝업에 보여줄 정보 — ★previewChars·previewVerdict 는 위(훅 구역)로 옮겼습니다
  const previewHanja = previewChars ? previewChars.map((c) => c.hanja).join('') : ''
  const previewHangul = wantSurname && syllables.length ? wantSurname + syllables.join('') : ''
  const curTries = readTries()
  const previewHanjaKey = previewChars ? previewChars.map((c) => c.hanja).join('') : ''
  const alreadyTried = curTries.some((t) => t.chars.map((c) => c.hanja).join('') === previewHanjaKey)
  const usedCount = curTries.length
  const willUseCount = alreadyTried ? usedCount : usedCount + 1
  const leftAfter = TRY_LIMIT - willUseCount

  const cell = (x: HanjaRow, fit: boolean, rank?: number) => {
    const on = chosen[activeIdx]?.hanja === x.hanja
    const soft = !!x.avoid_soft
    // ★2026-07-30 (3단계-b) — 不用·무거운 뜻은 «막지 않고» 흐리게 + 배지로 알립니다.
    const pol = listPolicy(x)
    return (
      <button key={x.hanja + x.strokes} onClick={() => pickHanja(x)} className="active:scale-95"
        style={{ position: 'relative', padding: '10px 4px 8px', textAlign: 'center', borderRadius: 16,
          background: on ? 'rgba(200,120,60,0.12)' : CARD,
          border: '1px solid ' + (on ? GOLD : LINE),
          cursor: 'pointer', transition: 'transform 0.15s ease' }}>
        {rank !== undefined && (
          <span style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, fontWeight: 700, color: '#fff',
            background: GOLD, borderRadius: '50%', width: 16, height: 16, lineHeight: '16px', textAlign: 'center' }}>
            {rank}
          </span>
        )}
        {fit && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, color: GREEN }}>{'\u2713'}</span>}
        <div style={{ fontSize: 24, fontWeight: 600, color: on ? GOLD : '#1a1a1a', lineHeight: 1.1 }}>{x.hanja}</div>
        <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>{x.meaning}</div>
        <div style={{ fontSize: 9, color: SUB, marginTop: 1 }}>{rowOhaeng(x) ?? x.resource_ohaeng}·{rowStrokes(x)}획</div>
        {pol.badge && <div style={{ fontSize: 8, color: '#C87C6A', marginTop: 1 }}>{pol.badge}</div>}
        {/* ★2026-07-30 (3단계-e) — 특수 규칙 배지(숫자·간지·동자이음).
            不用 배지와 «다른 축» 이라 둘 다 붙을 수 있습니다. */}
        {pol.specialBadge && <div style={{ fontSize: 8, color: '#9A8FB0', marginTop: 1 }}>{pol.specialBadge}</div>}
        {!pol.badge && !pol.specialBadge && soft && <div style={{ fontSize: 8, color: '#E0A04A', marginTop: 1 }}>주의</div>}
      </button>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Header router={router} isNewborn={isNewborn} />

      <p style={{ fontSize: 12, color: SUB, margin: '0 0 14px', padding: '0 4px', lineHeight: 1.7 }}>
        {!yongsinReady
          ? '사주 불러오는 중…'
          : <>새 이름 <b style={{ color: '#8f3d0e' }}>{(surnameNow?.hanja || wantSurname)}{syllables.join('')}</b> · 사주에 필요한 기운은 <b style={{ color: GOLD }}>{yongsin}</b>입니다</>}
      </p>

      {/* ══════════════════════════════════════════════════════════
          ★2026-08-01 (43부) — 칸 줄
            개명   : 성씨는 붙박이 (예전 그대로)
            신생아 : 성씨도 «고르는 칸» 입니다 — 류(柳/劉)처럼 집안마다 다릅니다
          ══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {slots.map((slot, i) => {
          const on = activeIdx === i
          const isSur = slot.role === '성'
          const filled = slotFilled(i)
          /** 화면에 보일 한자 — 고른 것 → 불러온 것 → 아직 없으면 한글 */
          const shown = chosen[i]
            ? chosen[i].hanja
            : (isSur && pickedSurnameChars[i]?.hanja) || slot.hangul
          /** ★불러온 성씨를 «그대로 쓰는» 칸인가 — 흐리게 두어 개명 화면을 안 흔듭니다 */
          const asLoaded = isSur && !chosen[i] && !!pickedSurnameChars[i]
          return (
            <button key={i} onClick={() => setActiveIdx(i)} className="active:scale-95"
              /* ★성씨 칸도 «누를 수 있습니다» — 柳/劉 처럼 집안마다 다릅니다 */
              aria-pressed={on}
              style={{ flex: 1, padding: '12px 0', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                background: on ? 'rgba(200,120,60,0.12)' : filled && !asLoaded ? 'rgba(129,199,132,0.14)' : CARD,
                border: '1px solid ' + (on ? GOLD : filled && !asLoaded ? GREEN : 'rgba(200,120,60,0.10)') }}>
              <div style={{
                fontSize: 22, fontWeight: 700,
                color: on ? GOLD : asLoaded ? '#8a7063' : filled ? GREEN : '#1a1a1a',
              }}>{shown}</div>
              <div style={{ fontSize: 10, color: SUB, marginTop: 3 }}>
                {slot.hangul}{isSur ? ' · 성씨' : ''}{' '}
                {on ? '고르는 중' : asLoaded ? '바꾸기' : filled ? '✓' : ''}
              </div>
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════
          ★2026-08-01 (43부) 두음법칙 안내 — 개명·신생아 «둘 다» 에 뜹니다
            ⚠️ 판정을 바꾸는 것이 아닙니다. 「류/유」 어느 쪽으로 적느냐로
               발음오행 풀이가 달라지는 것을 «알려만» 줍니다. 둘 다 맞습니다.
            ★정말 두 음으로 실려 있는 한자에만 뜹니다 (hanja 표를 보고 판단)
          ══════════════════════════════════════════════════════════ */}
      {dueumMsg && (
        <div style={{
          fontSize: 11, lineHeight: 1.7, color: '#5c3a1e',
          background: 'rgba(200,120,60,0.07)', border: '1px solid rgba(200,120,60,0.25)',
          borderRadius: 10, padding: '10px 12px', marginBottom: 14,
        }}>
          <span style={{ color: GOLD, fontWeight: 600 }}>알려 드립니다 · </span>
          {dueumMsg}
        </div>
      )}

      {/* ★신생아 — 성씨 한자를 왜 묻는지 알려 줍니다 */}
      {pickSurname && activeIdx < surnameSlotCount && (
        <div style={{
          background: '#fff7f0', border: `1px solid ${GOLD}`, borderRadius: 12,
          padding: '11px 13px', marginBottom: 14, fontSize: 11.5, color: '#5c3a1e', lineHeight: 1.7,
        }}>
          <b>성씨 한자부터 골라 주세요.</b><br />
          같은 「{wantSurname}」 라도 집안마다 한자가 다릅니다.
          획수와 오행이 달라져 <b>이름 전체의 풀이가 바뀝니다</b>.
          <br />가족관계등록부에 적힌 한자를 골라 주세요.
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ★2026-08-01 (43부 · E-②) — 대법원 인명용 한자 안내
            ⚠️ 목록은 «자의품격(不用)» 기준으로 거른 것입니다.
               대법원 인명용 한자표와 «같다고 말하지 않습니다» — 지어내지 않습니다.
               → 출생신고 전에 한 번 더 확인하시라고 «알려만» 드립니다.
            🔴 PENDING — hanja 표에 «대법원 인명용» 표시 칸이 아직 없습니다.
               들어오면 이 안내를 «판정» 으로 올릴 수 있습니다.
          ══════════════════════════════════════════════════════════ */}
      {isNewborn && (
        <div style={{
          background: CARD, border: `1px solid ${LINE}`, borderRadius: 12,
          padding: '10px 13px', marginBottom: 14, fontSize: 11, color: '#8a7063', lineHeight: 1.7,
        }}>
          ⚠️ 출생신고에는 <b>대법원 인명용 한자</b>만 쓸 수 있습니다.
          여기 목록은 작명 기준으로 고른 것이라, 고르신 한자가 그 표에 있는지
          <b> 대법원 전자가족관계등록시스템</b>에서 한 번 더 확인해 주세요.
        </div>
      )}

      {(!yongsinReady || loadingList) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
          <span style={{ fontSize: 34, color: GOLD, display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span>
          <span style={{ fontSize: 13, color: SUB }}>한자를 불러오는 중…</span>
        </div>
      )}

      {yongsinReady && !loadingList && hanjaList.length === 0 && (
        <div style={{ textAlign: 'center', color: SUB, padding: 24, fontSize: 13 }}>
          &lsquo;{slotTarget}&rsquo; 음의 인명용 한자를 찾을 수 없어요
        </div>
      )}

      {yongsinReady && !loadingList && recommend.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: SUB }}>사주(용신 {yongsin})에 맞는 추천 · 좋은 순서 {recommend.length}개</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {recommend.map((r) => cell(r.row, true, r.rank))}
          </div>
        </>
      )}

      {yongsinReady && !loadingList && others.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: SUB, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: SUB }}>그 외 &lsquo;{slotTarget}&rsquo; 한자</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {others.map((x) => cell(x, false))}
          </div>
        </>
      )}

      {yongsinReady && !loadingList && hanjaList.length > 0 && (
        <div style={{ marginTop: 20, borderRadius: 16, padding: '13px 16px',
          background: chosen[activeIdx] ? 'rgba(200,120,60,0.12)' : CARD,
          border: '1px solid ' + (chosen[activeIdx] ? GOLD : 'rgba(200,120,60,0.10)'),
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: chosen[activeIdx] ? GOLD : SUB }}>
            {chosen[activeIdx] ? '선택 : ' + chosen[activeIdx].hanja : '한자를 선택하세요'}
          </span>
          <button disabled={!chosen[activeIdx]} onClick={proceed}
            style={{ fontSize: 13, fontWeight: 600, color: chosen[activeIdx] ? GOLD : '#555', background: 'none', border: 'none', cursor: chosen[activeIdx] ? 'pointer' : 'default' }}>
            {allChosen ? '이 이름으로 →' : '다음 글자 →'}
          </button>
        </div>
      )}

      {/* ★ 최종 저장 확인 팝업 */}
      {confirmOpen && (
        <div onClick={() => setConfirmOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, background: '#fffbf7', borderRadius: 18, padding: '24px 20px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            {/* ★2026-08-01 (43부 5차) — «최종 이름 확정» 완충 단계
                ⚠️ 여기를 지나면 결제 횟수가 한 번 줄어듭니다.
                   그러니 «무엇을 고르셨는지» 를 한눈에 보여 드리고 여쭙습니다. */}
            <div style={{ fontSize: 13, color: SUB, marginBottom: 10 }}>이 이름으로 확정할까요?</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: 4, marginBottom: 2 }}>{previewHanja}</div>
            <div style={{ fontSize: 13, color: INK, marginBottom: 16 }}>{previewHangul}</div>
            {/* ── 고르신 글자 낱낱이 — 한자·훈·획수·자원오행 ── */}
            {previewChars && (
              <div style={{
                background: CARD, borderRadius: 12, padding: '10px 12px', marginBottom: 10,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {previewChars.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 11.5, color: '#5c3a1e',
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: '#8f3d0e', width: 24 }}>{c.hanja}</span>
                    <span style={{ width: 22, color: SUB }}>{c.hangul}</span>
                    <span style={{ color: SUB }}>
                      {i < surnameSlotCount ? '성씨' : '이름'}
                    </span>
                    <span style={{ marginLeft: 'auto', color: SUB }}>
                      {c.resourceOhaeng || '?'} · {c.strokes}획
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── ★사주와 어울리는가 — 네 관점을 한 줄씩 ── */}
            {previewVerdict && (
              <div style={{
                background: '#fff', border: `1px solid rgba(200,120,60,0.18)`,
                borderRadius: 12, padding: '11px 12px', marginBottom: 10, textAlign: 'left',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 11.5, color: SUB }}>사주와의 어울림</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>
                    {Math.round(previewVerdict.total)}점
                  </span>
                </div>
                {[
                  ['발음오행', previewVerdict.r.soundFlow.grade],
                  ['수리 4격', previewVerdict.r.suri.grade],
                  ['자원오행', previewVerdict.verdict.grade],
                  ['사주 보완', previewVerdict.verdict.facts.hasYongsin
                    ? `${yong.yongsin} 담김` : '용신 미충족'],
                ].map(([k, v]) => (
                  <div key={k} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 11.5, color: '#5c3a1e', padding: '2px 0',
                  }}>
                    <span style={{ color: SUB }}>{k}</span>
                    <span style={{ fontWeight: 600, color: gradeTone(String(v)) }}>{v}</span>
                  </div>
                ))}
                {/* ⚠️ 살펴볼 자리가 있으면 «가리지 않고» 먼저 알려 드립니다 */}
                {previewVerdict.verdict.warnings.length > 0 && (
                  <div style={{
                    marginTop: 8, paddingTop: 8, borderTop: `1px solid ${LINE}`,
                    fontSize: 10.5, color: '#96502e', lineHeight: 1.6,
                  }}>
                    ⚠️ {previewVerdict.verdict.warnings[0]}
                    {previewVerdict.verdict.warnings.length > 1
                      && ` 외 ${previewVerdict.verdict.warnings.length - 1}가지`}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#a8927e', marginTop: 7, lineHeight: 1.6 }}>
                  자세한 풀이는 다음 화면에서 보여 드립니다.
                </div>
              </div>
            )}

            <div style={{ background: CARD, borderRadius: 12, padding: '12px 14px', marginBottom: 18, fontSize: 12, color: SUB, lineHeight: 1.7 }}>
              {/* ★2026-08-01 (43부 6차) — 「한 번에 하나」라 회차를 세지 않습니다.
                  ⚠️ 그래도 «되돌릴 수 있게» 옛 문구를 지우지 않고 갈래로 둡니다. */}
              {alreadyTried && !isSingleName
                ? '이미 지어본 이름이에요. 다시 열어봐도 횟수는 줄지 않아요.'
                : isSingleName
                  ? <>이 이름으로 <b style={{ color: GOLD }}>풀이를 받습니다</b>.<br />다른 이름은 새로 조회하시면 돼요.</>
                  : <>저장하면 남은 횟수가 <b style={{ color: GOLD }}>{leftAfter}회</b>가 돼요.<br />(총 {TRY_LIMIT}회까지 지어볼 수 있어요)</>}
            </div>
            <button onClick={confirmSave}
              style={{ width: '100%', padding: 14, borderRadius: 12, background: '#c8783c', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
              이 이름으로 확정하기
            </button>
            <button onClick={() => setConfirmOpen(false)}
              style={{ width: '100%', padding: 12, borderRadius: 12, background: 'transparent', border: `1px solid ${LINE}`, color: SUB, fontSize: 13, cursor: 'pointer' }}>
              더 골라 볼게요
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function Header({ router, isNewborn }: {
  router: ReturnType<typeof useRouter>
  isNewborn?: boolean
}) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
      background: 'rgba(244,242,239,0.96)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${LINE}`,
    }}>
      <button onClick={() => router.push('/manseryeok/naming/rename/newname')} aria-label="뒤로" style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer', padding: 0 }}>{'\u2039'}</button>
      <span style={{ fontSize: 15, fontWeight: 500, color: INK }}>
        {isNewborn ? '내 아이 명품작명 · 한자 고르기' : '새 이름 한자 고르기'}
      </span>
    </div>
  )
}

export default function NewHanjaPage() {
  return (
    <Suspense fallback={<div style={{ background: BG, minHeight: '100vh' }} />}>
      <NewHanjaInner />
    </Suspense>
  )
}
