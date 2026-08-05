'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { supabase } from '@/lib/supabase'
import type { DiagnoseResult, NameChar } from '@/lib/saju/naming'
// ★2026-07-30 (1단계) — 오행 정규화 단일 창구. 자원오행을 날것으로 쓰지 않습니다.
// ★2026-07-30 (3단계) — 오행·한자 정제는 hanjaRow 의 읽기 함수가 안에서 부릅니다
// ★2026-07-30 (3단계) — hanja 표 읽기 단일 창구. 2단계 DB 컬럼을 하위호환으로 읽습니다.
import {
  HANJA_SELECT, isAvoidChar as isAvoidCharShared,
  rowOhaeng, rowStrokes, rowHanja, type HanjaRow,
  fetchHanjaReadings,
} from '@/lib/saju/hanjaRow'
// ★2026-07-31 (40부 3차) 두음법칙 안내 — «판정은 바꾸지 않습니다» (교재는 표기음 그대로)
import { dueumPairIfReal, dueumNotice } from '@/lib/saju/sound/dueum'
// ══════════════════════════════════════════════════════════════════
//  🔴★2026-08-02 — 성씨 «전용 표» 를 이 화면에도 잇습니다 (대표님 지적)
//
//   [무엇이 있었나]  43부 23차에 「李가 안 보인다」를 잡고 표를 만들었는데,
//     그 표를 «작명 두 화면» 에만 이었습니다. 성씨 한자를 고르는 창구는 «셋» 인데
//     이 화면(내 이름 정밀분석)이 빠졌습니다.
//     → 「이도련」을 풀려고 '이' 를 누르면 李가 위 칸에 없고,
//       «이름에 잘 쓰지 않는 글자» 흐린 칸에 「오얏 이」로 밀려 있었습니다.
//     ⚠️ 성씨는 «고르는 것» 이 아니라 «타고나는 것» 입니다.
//        이름용 잣대로 흐리게 하면 집안의 글자를 화면이 나무라는 셈이 됩니다.
//
//   ★교훈 [다 세고 옮길 것] — 값을 쓰는 곳을 «모두» 세고 옮길 것.
//     28-verify 의 ㉑ 그물이 이제 «세 창구» 를 함께 셉니다.
// ══════════════════════════════════════════════════════════════════
import { surnameRank } from '@/lib/saju/surnameHanja'
// ★2026-08-01 (41부 Step 3 · UI) — 사주 요약 · 이름에 담을 기운 · 명리적성
import NamingSajuSummary from './components/NamingSajuSummary'
import NamingAptitude from './components/NamingAptitude'
import NameAnalysisResultView from '@/app/manseryeok/naming/components/NameAnalysisResultView'
import { calcCareerScore, gradeAll } from '@/lib/saju/career/careerScore'
import { calcNamingBridge } from '@/lib/saju/career/namingBridge'
import type { Ohaeng } from '@/lib/saju/ohaeng'
import ConsultButton from '@/app/components/common/ConsultButton'
import { fromProfile, fromUrl, personKey, type MyInfo } from '@/lib/saju/myInfo'
import {
  saveNamingRecord, getNamingRecord,
  storageBranchOfKind, storageBranchOfParam,
  NAMING_STORAGE_PATH, NAMING_STORAGE_LABEL,
  type NamingPerson, type NamingKind, type NamingStorageBranch,
} from '@/lib/saju/namingRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import PerspectiveAccordion from '@/app/manseryeok/components/PerspectiveAccordion'
// ★2026-07-30 (3단계-b) — 관점별 별점
import type { PerspectiveStar, StarResult } from '@/lib/saju/starRating'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'
// ★2026-08-01 (43부 26차) — 보관함에서도 A4 선명장을 뽑습니다
import NamingCertificateButton, {
  type CertChar, type CertGyeok,
} from '@/app/manseryeok/naming/components/NamingCertificate'
import { soundOhaengOf } from '@/lib/saju/sound/normalize'

const NAMING_RESULT_KEY = 'naming_last_result_v1'

// ★2026-07-30 (3단계) — HanjaRow 정의를 lib/saju/hanjaRow.ts 로 옮겼습니다.
//   세 화면에 세 벌이 있었고 select 문도 서로 달랐습니다. (교훈 CJ)

// 5관점 3단 해설(무엇을 보나/이 이름은/어떤 의미인가)
interface Perspective {
  intro: string    // 무엇을 보나 (원리)
  name: string     // 이 이름은 (사실)
  meaning: string  // 어떤 의미인가 (서술)
}
interface Commentary {
  title: string
  yinyang: Perspective   // ① 음양오행
  baleum: Perspective    // ② 발음오행
  suri: Perspective      // ③ 수리오행
  jawon: Perspective     // ④ 자원오행
  yongsin: Perspective   // ⑤ 사주와의 만남
  conclusion: string     // 맺음말
}

const EMPTY_PERSPECTIVE: Perspective = { intro: '', name: '', meaning: '' }

// 보관함 스냅샷의 commentary를 5관점 Commentary로 안전 변환.
//   - 새 데이터(yinyang 등 보유): 부족한 관점만 빈값 채워 그대로 사용.
//   - 옛 데이터(summary/good 등): 옛 내용을 맺음말에 모아 5관점 껍데기로 감싼다(화면 안 깨짐).
//   - null/형식불명: null 반환.
/**
 * ★2026-07-30 (3단계-b) — 저장본에서 별점을 꺼냅니다.
 *
 *   ⚠️ normalizeCommentary 는 «아는 키만» 골라 새 객체를 만듭니다.
 *      그래서 _stars 를 그대로 두면 되읽을 때 버려집니다. 따로 꺼냅니다.
 *   ⚠️ 옛 저장본에는 이 키가 없습니다 → null. 화면은 별을 안 그립니다.
 */
/**
 * ★2026-07-30 (3단계-d) — 실패를 손님 말로 옮깁니다.
 *
 *   ⚠️ 「어떻게 하면 되는지」 를 함께 적습니다. 「오류가 발생했습니다」만으로는
 *      손님이 무엇을 할지 모릅니다.
 */
function friendlyFail(status: number, raw: string): string {
  const r = raw || ''
  if (status === 504 || /TIMEOUT/i.test(r)) {
    return '풀이를 쓰는 데 시간이 오래 걸려 도중에 끊겼어요. 잠시 뒤 다시 시도해 주세요.'
  }
  if (status === 429 || /rate_limit/i.test(r)) {
    return '지금 이용이 많아 잠시 기다려야 해요. 1~2분 뒤에 다시 시도해 주세요.'
  }
  if (status === 401 || status === 403) {
    return '풀이 서비스에 연결하지 못했어요. 잠시 뒤 다시 시도해 주시고, 계속 안 되면 알려 주세요.'
  }
  if (status === 529 || status >= 500) {
    return '풀이 서비스가 잠시 붐비고 있어요. 잠시 뒤 다시 시도해 주세요.'
  }
  if (status === 400) {
    return '이름 정보를 다시 확인해 주세요. 글자를 다시 고른 뒤 시도해 주시면 좋겠습니다.'
  }
  return '풀이를 받지 못했어요. 잠시 뒤 다시 시도해 주세요.'
}

function extractStars(raw: unknown): { stars: PerspectiveStar[] | null; overall: StarResult | null } {
  if (!raw || typeof raw !== 'object') return { stars: null, overall: null }
  const o = raw as Record<string, unknown>
  const stars = Array.isArray(o._stars) ? (o._stars as PerspectiveStar[]) : null
  const overall = o._overallStar && typeof o._overallStar === 'object'
    ? (o._overallStar as StarResult) : null
  return { stars, overall }
}

function normalizeCommentary(raw: unknown): Commentary | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const asPersp = (v: unknown): Perspective => {
    if (v && typeof v === 'object') {
      const p = v as Record<string, unknown>
      return {
        intro: typeof p.intro === 'string' ? p.intro : '',
        name: typeof p.name === 'string' ? p.name : '',
        meaning: typeof p.meaning === 'string' ? p.meaning : '',
      }
    }
    return { ...EMPTY_PERSPECTIVE }
  }
  const hasNew = 'yinyang' in o || 'baleum' in o || 'jawon' in o || 'conclusion' in o
  if (hasNew) {
    return {
      title: typeof o.title === 'string' ? o.title : '',
      yinyang: asPersp(o.yinyang),
      baleum: asPersp(o.baleum),
      suri: asPersp(o.suri),
      jawon: asPersp(o.jawon),
      yongsin: asPersp(o.yongsin),
      conclusion: typeof o.conclusion === 'string' ? o.conclusion : '',
    }
  }
  // 옛 데이터 호환: summary/good/improve/advice → 맺음말로 합쳐 표시
  const legacy = [o.summary, o.good, o.improve, o.advice]
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .join('\n\n')
  return {
    title: typeof o.title === 'string' ? o.title : '',
    yinyang: { ...EMPTY_PERSPECTIVE },
    baleum: { ...EMPTY_PERSPECTIVE },
    suri: { ...EMPTY_PERSPECTIVE },
    jawon: { ...EMPTY_PERSPECTIVE },
    yongsin: { ...EMPTY_PERSPECTIVE },
    conclusion: legacy,
  }
}

// ── 신버전 피치톤 팔레트 (result-new / 타로 신버전과 동일) ──
const PAGE_BG = '#FDF6F0'      // 페이지 배경
const cardBg = '#fffbf7'       // 카드 표면
const gold = '#c8783c'         // 강조(구 금색 대체) — 변수명은 유지해 하위 코드 그대로 사용
const ink = '#1a1a1a'          // 본문 진한 텍스트
const sub = '#b4785a'          // 보조 텍스트
const subWarm = '#96502e'      // 따뜻한 강조 텍스트
const rose = '#c8506e'         // 삭제·경고 포인트
const border = '0.5px solid #9c7a58'

// ★isAvoidChar 는 lib/saju/hanjaRow.ts 의 것을 씁니다 (AVOID_KEYWORDS 도 함께 옮겼습니다)
function isAvoidChar(row: HanjaRow): boolean { return isAvoidCharShared(row) }

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

// ── 신버전 자체 피치 sticky 헤더 (공용 다크 PageHeader 대체) ──
//   result-new / 타로 신버전과 동일 구조: 반투명 피치 + blur + 하단 보더.
function PitchHeader({ title, onBack, onHome }: { title: string; onBack: () => void; onHome?: () => void }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px', background: 'rgba(250,250,248,0.96)',
      backdropFilter: 'blur(10px)', borderBottom: '0.5px solid #9c7a58',
    }}>
      <button onClick={onBack} aria-label="뒤로"
        style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
      <span style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a' }}>{title}</span>
      {onHome
        ? <button onClick={onHome} aria-label="홈" style={{ background: 'none', border: 'none', fontSize: '17px', cursor: 'pointer', padding: 0 }}>🏠</button>
        : <span style={{ width: 20 }} />}
    </div>
  )
}

function DiagnosisInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const pathname = usePathname()

  const [info, setInfo] = useState<MyInfo | null>(null)

  // ── 진단 대상 구분 (내 이름 / 남 이름) ──
  //   URL에 name·relation 이 있으면 "남(가족·지인)"을 진단하는 중.
  //   보관함 저장 시 relation('self' 또는 관계)으로 구분해 넣는다.
  const urlName = sp.get('name') || ''
  const urlRelation = sp.get('relation') || ''
  const targetRelation = urlRelation || (urlName ? '지인' : 'self')

  // 사람 선택 모달 (다른 사람 진단하기)
  const [pickerOpen, setPickerOpen] = useState(false)

  // 보관함 다시보기(recordId)로 진입했는지 + saju_records 저장 id
  const recordId = sp.get('recordId')
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
  // ★2026-07-21 2차: 자동 저장이 실패하면 고객이 알 수 있게 표시한다.
  const [saveFailed, setSaveFailed] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)

  // 가격 (이름 풀이 / 한자 바꾸기)
  const [readPrice, setReadPrice] = useState(5000)
  const [hanjaPrice, setHanjaPrice] = useState(20000)

  useEffect(() => {
    supabase
      .from('analysis_prices')
      .select('price_key, price')
      .in('price_key', ['naming_read', 'naming_hanja'])
      .then(({ data }) => {
        if (data) {
          const read = data.find(d => d.price_key === 'naming_read')
          const hanja = data.find(d => d.price_key === 'naming_hanja')
          if (read) setReadPrice(read.price)
          if (hanja) setHanjaPrice(hanja.price)
        }
      })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadInfo() {
      const urlInfo = fromUrl(sp)
      if (urlInfo) {
        if (!cancelled) setInfo(urlInfo)
        return
      }

      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
            .eq('id', u.user.id)
            .single()
          const profInfo = fromProfile(p)
          if (profInfo) {
            if (!cancelled) setInfo(profInfo)
            return
          }
        }
      } catch (e) {
        console.error(e)
      }

      if (!cancelled) setInfo(null)
    }

    loadInfo()
    return () => { cancelled = true }
  }, [sp])

  const infoYear = info ? parseInt(info.year) : 0
  const infoMonth = info ? parseInt(info.month) : 0
  const infoDay = info ? parseInt(info.day) : 0
  const infoHourIdx = info ? (info.hour === '모름' ? null : parseInt(info.hour)) : null

  const { saju, solar, dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    infoYear,
    infoMonth,
    infoDay,
    info?.leapMonth || '0',
    infoHourIdx,
  )

  const [nameInput, setNameInput] = useState('')
  const [syllables, setSyllables] = useState<string[]>([])
  const [chars, setChars] = useState<(NameChar | null)[]>([])
  /**
   * ★2026-08-01 (43부 26차) — 보관함에서 열었을 때 «작명 기록인가» (대표님 지적)
   *
   *  🔴 [무엇이 있었나]  선명장은 결과 화면에서만 뽑을 수 있었습니다.
   *    보관함에서 다시 열면 «버튼이 없어» 매번 새로 지어야 했습니다.
   *    ⚠️ 저장이 «안 된 것이 아닙니다» — 필요한 값(글자·풀이·4격)은 전부 기록에
   *       들어 있었는데, 그것으로 종이를 뽑는 «길» 이 없었습니다.
   *  ★그래서 보관함 다시보기에도 선명장 버튼을 답니다. 다시 짓지 않습니다.
   */
  const [recKind, setRecKind] = useState<string | null>(null)
  const [recRelation, setRecRelation] = useState<string | null>(null)

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-02 — 이 화면은 «어느 보관함» 의 것인가 (대표님 지시 ①)
  //
  //  🔴 [무엇이 있었나]  하단 보관함 버튼이 «언제나» 정밀분석 보관함으로
  //    갔습니다. 명품작명으로 들어오신 분이 남의 보관함에 떨어졌습니다.
  //
  //  ★[이제]  차례로 봅니다 — «정본이 앞» 입니다.
  //    ① 기록의 kind      보관함에서 연 것이면 이것이 «정본» 입니다
  //    ② URL 의 ?from=    기록이 아직 안 왔을 때 받쳐 줍니다
  //    ③ 없으면 정밀분석  이 화면의 원래 뜻입니다
  //
  //  ⚠️ ②를 둔 까닭 — 기록은 «불러온 뒤» 라야 kind 를 압니다. 그 사이에
  //     버튼이 엉뚱한 곳을 가리키면 손님이 그때 눌러 버립니다.
  //  ⚠️ from=mypage 는 «갈래가 아닙니다». storageBranchOfParam 이 null 을
  //     돌려주므로 아래 ③으로 내려갑니다 — 마이페이지 길은 따로 있습니다.
  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-02 — 주소가 «가장 먼저» 입니다.
  //    /manseryeok/naming/naming-record 로 들어오셨으면 그것이 정본입니다 —
  //    기록을 불러오기 «전» 부터 화면이 「내 아이 명품작명」으로 서 있어야 합니다.
  //    ⚠️ 옛 주소(diagnosis?from=naming)도 그대로 듣습니다.
  const branchByPath: NamingStorageBranch | null =
    pathname?.includes('/naming-record') ? 'naming' : null
  const storageBranch: NamingStorageBranch =
    branchByPath
    ?? (recKind ? storageBranchOfKind(recKind as NamingKind) : null)
    ?? storageBranchOfParam(sp.get('from'))
    ?? 'diagnosis'
  const storagePath = NAMING_STORAGE_PATH[storageBranch]
  const storageLabel = NAMING_STORAGE_LABEL[storageBranch]
  /** ★2026-07-31 (40부 3차) 두음법칙 안내 — 판정은 «바꾸지 않습니다». 알려 주기만 합니다 */
  const [dueumMsg, setDueumMsg] = useState<string | null>(null)

  const [pickerIdx, setPickerIdx] = useState<number | null>(null)
  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [searching, setSearching] = useState(false)

  const [step, setStep] = useState<'input' | 'preview' | 'pay' | 'result'>('input')
  const [result, setResult] = useState<DiagnoseResult | null>(null)
  const [commentary, setCommentary] = useState<Commentary | null>(null)

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (41부 Step 3 · UI) — 새 두 자리에 넘길 값
  // ══════════════════════════════════════════════════════════════
  //
  //  ⚠️ 판정을 «여기서 다시 하지 않습니다». 이미 있는 계산을 가져다 씁니다.
  //     용신은 calcYongsinCompat (아래 handleFullResult 가 쓰는 것과 같은 것),
  //     오행 등급은 career/careerScore, 담을 기운은 namingBridge 가 냅니다.

  /** 용신·희신·기신 — 「이름에 담을 기운」과 명리적성이 함께 씁니다 */
  const aptYongsin = useMemo(() => {
    if (saju.length === 0 || !dayStem || dayStem === '?') {
      return { yongsin: null as Ohaeng | null, heeksin: null as Ohaeng | null, gisin: null as Ohaeng | null }
    }
    try {
      const y = calcYongsinCompat(
        saju, dayStem, solar?.month ?? 1, solar?.day ?? 1,
        saju.find(p => p.pillar === '시주')?.branch ?? null,
      )
      return {
        yongsin: (y?.yongsin ?? null) as Ohaeng | null,
        heeksin: (y?.heeksin ?? null) as Ohaeng | null,
        gisin: (y?.gisin ?? null) as Ohaeng | null,
      }
    } catch {
      return { yongsin: null as Ohaeng | null, heeksin: null as Ohaeng | null, gisin: null as Ohaeng | null }
    }
  }, [saju, dayStem, solar])

  /** 상단 칩에 보일 «이름에 담을 기운» — namingBridge 가 낸 것 */
  const namingFill = useMemo(() => {
    if (saju.length === 0 || !dayStem || dayStem === '?' || !solar) return undefined
    try {
      const sc = calcCareerScore(saju, solar.month, solar.day,
        saju.find(p => p.pillar === '시주')?.branch ?? null)
      const r = calcNamingBridge({
        grades: gradeAll(sc),
        yongsin: aptYongsin.yongsin, heeksin: aptYongsin.heeksin, gisin: aptYongsin.gisin,
      })
      return r.fill.slice(0, 2)
    } catch {
      return undefined
    }
  }, [saju, dayStem, solar, aptYongsin])

  /** 「상세 진로·적성 분석 보러가기」 — 진로적성 화면으로 그대로 넘깁니다 */
  const careerHref = useMemo(() => {
    if (!info) return '/manseryeok/career-input'
    const q = new URLSearchParams({
      name: '', gender: info.gender, calType: info.calType,
      year: info.year, month: info.month, day: info.day,
      leapMonth: info.leapMonth, hour: info.hour,
    })
    return `/manseryeok/career-result?${q.toString()}`
  }, [info])
  // ★2026-07-30 (3단계) — 실패 이유. 없으면 null. 빈 화면 대신 이것을 보여 줍니다.
  const [failWhy, setFailWhy] = useState<string | null>(null)
  // ★2026-07-30 (3단계-b) — 관점별 별점. 옛 저장본에는 없으므로 null 로 둡니다.
  const [stars, setStars] = useState<PerspectiveStar[] | null>(null)
  const [overallStar, setOverallStar] = useState<StarResult | null>(null)
  const [loading, setLoading] = useState(false)


  // ★ 마이페이지에서 특정 이름풀이 id를 눌러 들어온 경우 (?nameId=xxx)
  // 저장된 그 1건만 불러와 바로 결과 화면으로. (회원·기록이 많아져도 누른 1건만 조회)
  const nameId = sp.get('nameId')
  const [loadingSaved, setLoadingSaved] = useState(false)

  useEffect(() => {
    if (!nameId) return
    let cancelled = false
    async function loadOneById() {
      setLoadingSaved(true)
      try {
        const { data: u } = await supabase.auth.getUser()
        if (!u?.user) { setLoadingSaved(false); return }
        const { data: row } = await supabase
          .from('my_names')
          .select('hangul_name, hanja_name, chars, result, commentary')
          .eq('id', nameId)
          .eq('user_id', u.user.id)   // 본인 것만 (남의 id로 조회 방지)
          .maybeSingle()
        if (cancelled) return
        if (row && row.result && row.commentary && Array.isArray(row.chars)) {
          setResult(row.result as DiagnoseResult)
          setCommentary(normalizeCommentary(row.commentary))
          { const e = extractStars(row.commentary); setStars(e.stars); setOverallStar(e.overall) }
          setChars(row.chars as (NameChar | null)[])
          setSyllables((row.chars as (NameChar | null)[]).filter(Boolean).map((c) => c!.hangul))
          setStep('result')
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoadingSaved(false)
      }
    }
    loadOneById()
    return () => { cancelled = true }
  }, [nameId])

  // ★ 남(가족·지인) 진단으로 들어온 경우: URL의 이름(name)을 입력칸에 자동으로 채운다.
  //   보관함 > "새 이름 풀이하기" > 사람 선택(오연희 등) 시 그 사람 이름이 실려 온다.
  //   → 사용자가 다시 타이핑하지 않고 바로 한자 고르기로 넘어갈 수 있다.
  useEffect(() => {
    if (nameId || recordId) return    // 저장건 다시보기는 제외
    if (urlName) setNameInput(urlName)
  }, [urlName, nameId, recordId])

  // ── 보관함(saju_records) 다시보기: recordId 있으면 스냅샷 로드 → 바로 결과 ──
  //   재계산·AI 재호출 없이 저장된 풀이를 그대로 보여준다 (viewOnly).
  useEffect(() => {
    if (!recordId) return
    let cancelled = false
    async function loadByRecordId() {
      setLoadingSaved(true)
      try {
        const rec = await getNamingRecord(recordId!)
        if (cancelled || !rec) return
        const snap = rec.snapshot
        if (snap?.result) {
          setResult(snap.result)
          setCommentary(normalizeCommentary(snap.commentary))
          { const e = extractStars(snap.commentary); setStars(e.stars); setOverallStar(e.overall) }
          setChars(rec.chars)
          setSyllables(rec.chars.filter(Boolean).map((c) => c!.hangul))
          setSavedRecordId(rec.id)
          // ★작명 기록이면 선명장을 뽑을 수 있습니다 (풀이 기록에는 안 답니다)
          setRecKind(rec.kind ?? null)
          setRecRelation(rec.relation ?? null)
          setViewOnly(true)
          setStep('result')
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoadingSaved(false)
      }
    }
    loadByRecordId()
    return () => { cancelled = true }
  }, [recordId])

  function applyName() {
    const cleaned = nameInput.trim().replace(/\s/g, '')
    const arr = Array.from(cleaned).filter(isHangulSyllable)
    if (arr.length < 2) return
    setSyllables(arr)
    setChars(arr.map(() => null))
    setDueumMsg(null)          // ★이름이 바뀌면 안내도 지웁니다
  }

  async function openPicker(idx: number) {
    setPickerIdx(idx)
    const hangul = syllables[idx]
    if (!hangul) { setHanjaList([]); return }
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('hanja')
        .select(HANJA_SELECT)   // ★'*' — 마이그레이션 전에도 안 깨집니다
        .eq('hangul', hangul)
        .order('strokes', { ascending: true })
      if (error) { console.error(error); setHanjaList([]) }
      else setHanjaList((data as HanjaRow[]) ?? [])
    } catch (e) {
      console.error(e)
      setHanjaList([])
    } finally {
      setSearching(false)
    }
  }

  function pickHanja(row: HanjaRow) {
    if (pickerIdx === null) return
    const next = [...chars]
    next[pickerIdx] = {
      hangul: row.hangul,
      // ★2026-07-30 (1단계) — 원자료에 ' 熺' 처럼 앞에 공백이 붙은 한자가 있습니다.
      hanja: rowHanja(row),
      // ★2026-07-30 (3단계) — 원획법. strokes_kangxi 가 있으면 그것을 씁니다.
      strokes: rowStrokes(row),
      // ★★2026-07-30 (1단계) — 여기가 「내이름 감정」이 틀리던 자리입니다.
      //   [무엇이 문제였나] DB 의 자원오행은 «한자»(木火土金水)로 들어 있는데
      //     이 줄이 날것으로 넘겼습니다. naming.ts 의 상생표(GENERATES)는 «한글» 키라
      //     GENERATES['木'] 이 undefined 가 되어 —
      //         · 자원오행 상생 판정이 언제나 0건  → grade 언제나 '아쉬움'
      //         · 용신('목')과 대조도 언제나 false → 사주보완 언제나 '아쉬움'
      //     이 되었습니다. 등급은 화면에 안 나오는 것이 방침이라 눈에 안 띄었고,
      //     대신 AI 에게 「상생 0건·용신 없음」이라는 «틀린 사실» 이 나갔습니다.
      //   ⚠️ 개명 화면 넷은 각자 ohaengChar() 사본으로 이미 막고 있었습니다.
      //      다섯 창구 가운데 이 한 곳만 빠져 있었습니다. (교훈 CZ·DA 의 세 번째 거울)
      resourceOhaeng: rowOhaeng(row) ?? '',
    }
    setChars(next)
    // ★성씨 자리(첫 글자)만 봅니다. 이름 가운데·끝 글자는 두음 자리가 아닙니다
    if (pickerIdx === 0) {
      const written = row.hangul
      void (async () => {
        const readings = await fetchHanjaReadings(
          (h) => supabase.from('hanja').select('hangul').eq('hanja', h), rowHanja(row))
        const p = dueumPairIfReal(written, readings, rowHanja(row))
        setDueumMsg(p ? dueumNotice(p) : null)
      })()
    }
    setPickerIdx(null)
    setHanjaList([])
  }

  const surname = chars[0] ?? null
  const given = chars.slice(1).filter((c): c is NameChar => c !== null)
  const allPicked = syllables.length >= 2 && chars.length === syllables.length && chars.every((c) => c !== null)
  const canSubmit = allPicked

  function handlePreview() {
    if (!canSubmit) return
    setStep('preview')
  }

  // ★ 이름풀이 해설(commentary)을 상담사 화면 표시용 텍스트로 변환 (물상도 방식과 동일)
  function buildNamingAnalysisText(hanjaName: string, hangulName: string, c: Commentary | null): string {
    if (!c) return ''
    const persp = (label: string, p: { intro: string; name: string; meaning: string }) =>
      `· ${label}\n${[p?.intro, p?.name, p?.meaning].filter(Boolean).join('\n')}`
    return [
      `[이름풀이 · ${hangulName} (${hanjaName})]`,
      c.title ? `"${c.title}"` : '',
      persp('음양오행', c.yinyang),
      persp('발음오행', c.baleum),
      persp('수리오행', c.suri),
      persp('자원오행', c.jawon),
      persp('사주와의 만남', c.yongsin),
      c.conclusion ? `· 맺음\n${c.conclusion}` : '',
    ].filter(Boolean).join('\n\n').trim()
  }

  // ★ 결과가 표시되면(새로 풀든, 저장결과 불러오든) 상담사 전달용 세션을 저장.
  //   ConsultButton이 consultant-select로 이동만 하면, 그쪽이 이 세션을 읽어
  //   namings 저장 + consultations.ai_analysis 표시에 사용.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (step !== 'result' || !result) return
    try {
      const hangulName = chars.filter(Boolean).map((c) => c!.hangul).join('')
      const hanjaName = chars.filter(Boolean).map((c) => c!.hanja).join('')
      sessionStorage.setItem('naming_full', JSON.stringify({
        kind: 'self',
        hangul_name: hangulName,
        hanja_name: hanjaName,
        chars,
        result: result ?? null,
        commentary: commentary ?? null,
        target_birth: null,
      }))
      const text = buildNamingAnalysisText(hanjaName, hangulName, commentary)
      if (text) sessionStorage.setItem('ai_analysis', text)
    } catch {}
  }, [step, result, commentary, chars])

  async function handleFullResult() {
    if (!canSubmit || !surname || !saju || !dayStem) return
    setStep('result')
    setLoading(true)
    setFailWhy(null)
    setStars(null); setOverallStar(null)
    try {
      // 심산 오행 점수로 계산 (월지 계절 치환 반영). 시지는 명식의 시주에서 꺼낸다.
      const yongsinResult = calcYongsinCompat(
        saju, dayStem,
        solar?.month, solar?.day,
        saju.find(p => p.pillar === '시주')?.branch ?? null,
      )
      const sajuText = saju.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(', ')
      const res = await fetch('/api/naming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surname,
          given,
          yongsin: yongsinResult.yongsin,
          heeksin: yongsinResult.heeksin,
          // ★2026-07-30 (2단계) — 지금까지 «버리던» 값을 함께 보냅니다.
          //   calcYongsinCompat 이 이미 계산해 주고 있었는데
          //   naming 은 yongsin·heeksin·score 셋만 받아 쓰고 넷을 버렸습니다.
          //   → 과다 억제·기신 회피 판정을 할 재료가 손안에 있는데 안 쓰던 자리입니다.
          gisin: yongsinResult.gisin,
          gusin: yongsinResult.gusin,
          hansin: yongsinResult.hansin,
          isStrong: yongsinResult.isStrong,
          elementScore: yongsinResult.score,
          dayStem,
          sajuText,
          birthData: info,
          saju,
        }),
      })
      // ★★2026-07-30 (3단계) — res.ok 를 «봅니다».
      //   [무엇이 문제였나] 전에는 곧바로 .json() 을 해서, 라우트가 500 을 줘도
      //     그냥 통과했습니다. 그러면 result 가 null 이 되고 화면의
      //     `{!loading && result && (…)}` 가 false 라 **손님이 빈 화면을 봤습니다.**
      //     실패 문구도 [다시 시도] 단추도 없었습니다.
      if (!res.ok) {
        // ★2026-07-30 (3단계-d) — Vercel 의 영문 오류를 손님에게 그대로 보여 주지 않습니다.
        //   전에는 「An error occurred with your deployment FUNCTION_INVOCATION_TIMEOUT
        //   icn1::t5sd2-…」 가 그대로 화면에 나왔습니다. 손님이 읽을 말이 아닙니다.
        //   ⚠️ 원문은 버리지 않고 console 에 남깁니다 — 우리가 볼 것은 남아야 합니다.
        let raw = ''
        try { raw = (await res.text()).slice(0, 300) } catch { /* status 만이라도 남긴다 */ }
        console.error('naming 실패:', res.status, raw)
        setFailWhy(friendlyFail(res.status, raw))
        setResult(null)
        return
      }
      const data = await res.json()
      setResult(data.result ?? null)
      setCommentary(normalizeCommentary(data.commentary))
      setStars(Array.isArray(data.stars) ? data.stars : null)
      setOverallStar(data.overallStar ?? null)
      // ★AI 가 실패했으면 «왜» 인지 알려 줍니다. 빈 통변을 조용히 보여 주지 않습니다.
      if (data.aiOk === false) {
        setFailWhy(data.aiFailHint
          ? `${data.aiFailHint} (풀이 문장을 받지 못했어요)`
          : '풀이 문장을 받지 못했어요. 잠시 뒤 다시 시도해 주세요')
      } else {
        setFailWhy(null)
      }
      const pkey = personKey(info)
      try {
        localStorage.setItem(NAMING_RESULT_KEY, JSON.stringify({
          result: data.result ?? null,
          commentary: data.commentary ?? null,
          stars: data.stars ?? null,
          overallStar: data.overallStar ?? null,
          chars,
          personKey: pkey,
        }))
        // ★ 예약 시 상담사 화면으로 넘길 개명 결과 (궁합·물상도와 동일 방식)
        const hangulName = chars.filter(Boolean).map((c) => c!.hangul).join('')
        const hanjaName = chars.filter(Boolean).map((c) => c!.hanja).join('')
        sessionStorage.setItem('naming_full', JSON.stringify({
          kind: 'self',
          hangul_name: hangulName,
          hanja_name: hanjaName,
          chars,
          result: data.result ?? null,
          commentary: data.commentary ?? null,
          stars: data.stars ?? null,
          overallStar: data.overallStar ?? null,
          target_birth: null,
        }))
        // ★ 상담사 화면에 뜰 해설 텍스트도 함께 저장 (물상도 방식과 동일)
        const analysisText = buildNamingAnalysisText(hanjaName, hangulName, data.commentary ?? null)
        if (analysisText) sessionStorage.setItem('ai_analysis', analysisText)

        localStorage.removeItem('rename_picks_v1')
        localStorage.removeItem('rename_locked_slot')
      } catch {}

      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          const hangulName = chars.filter(Boolean).map((c) => c!.hangul).join('')
          const hanjaName = chars.filter(Boolean).map((c) => c!.hanja).join('')
          const { error: nameErr } = await supabase.from('my_names').insert({
            user_id: u.user.id,
            hangul_name: hangulName,
            hanja_name: hanjaName,
            chars,
            result: data.result ?? null,
            commentary: data.commentary ?? null,
            stars: data.stars ?? null,
            overallStar: data.overallStar ?? null,
            // 남(가족·지인) 진단이면 'other', 내 이름이면 'self'
            kind: targetRelation === 'self' ? 'self' : 'other',
            person_key: pkey,
          })
          if (nameErr) console.error('이름 저장 실패:', nameErr.message)
        }
      } catch {}

      // ── 신규: saju_records 보관함에도 병행 저장 (service_type='naming') ──
      //   대량 운영·관계별 트렌드·기기 무관 조회를 위해. (my_names·세션 저장은 위에서 유지)
      try {
        const person: NamingPerson | null = info ? {
          gender: info.gender, calType: info.calType,
          year: info.year, month: info.month, day: info.day,
          leapMonth: info.leapMonth, hour: info.hour,
        } : null
        const saved = await saveNamingRecord({
          chars,
          // ★2026-08-01 — 보관함 필터용. 기본값과 같지만 «적어 둡니다» —
          //   나중에 기본값이 바뀌어도 이 화면의 뜻이 안 흔들립니다
          kind: '풀이',
          relation: targetRelation,
          person,
          result: data.result as DiagnoseResult,
          // ★2026-07-30 (3단계-b) — 별점을 commentary 안에 함께 담습니다.
          //   [왜]  saveNamingRecord 의 타입을 넓히면 lib/saju/namingRecords.ts 와
          //         그것을 읽는 다른 화면(보관함·상담사)까지 손대야 합니다.
          //         commentary 는 Record<string, unknown> 이라 그대로 들어갑니다.
          //   ⚠️ 되읽을 때 normalizeCommentary 가 모르는 키를 버리지 않는지 확인하십시오.
          commentary: data.commentary
            ? { ...data.commentary, _stars: data.stars ?? null, _overallStar: data.overallStar ?? null }
            : null,
        })
        if (saved.ok && saved.id) setSavedRecordId(saved.id)
        else setSaveFailed(true)
      } catch (e) { console.error(e); setSaveFailed(true) }
    } catch (e) {
      console.error(e)
      // ★2026-07-30 (3단계) — 망 오류·예외도 «빈 화면» 이 아니라 이유로 알립니다.
      setFailWhy('풀이를 받는 중 문제가 있었어요. 잠시 뒤 다시 시도해 주세요')
    } finally {
      setLoading(false)
    }
  }

  function resetAll() {
    setNameInput(''); setSyllables([]); setChars([]); setDueumMsg(null)
    setResult(null); setCommentary(null); setStep('input')
    try {
      localStorage.removeItem(NAMING_RESULT_KEY)
      localStorage.removeItem('rename_picks_v1')
      localStorage.removeItem('rename_locked_slot')
    } catch {}
  }

  // ★ id로 저장 결과 불러오는 중 로딩 화면
  if (nameId && loadingSaved && step !== 'result') {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto' }}>
        <PitchHeader title="내 이름 정밀분석" onBack={() => router.push('/mypage-new')} onHome={() => router.push('/home-new')} />
        <div style={{ padding: '60px 20px', textAlign: 'center', color: gold, fontSize: '14px' }}>
          저장된 이름 풀이를 불러오는 중…
        </div>
      </main>
    )
  }

  if (!info && !nameId) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto' }}>
        <PitchHeader title="내 이름 정밀분석" onBack={() => router.push('/home-new')} onHome={() => router.push('/home-new')} />
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5c3a1e' }}>
          <p style={{ marginBottom: '12px', fontSize: '15px', color: '#1a1a1a' }}>먼저 사주 정보를 입력해주세요.</p>
          <p style={{ marginBottom: '24px', fontSize: '13px', lineHeight: 1.7 }}>
            홈 화면에서 생년월일 · 음양력 · 태어난 시(시주)를<br />입력하시면 이름 풀이를 시작할 수 있어요.
          </p>
          <button onClick={() => router.push('/')}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#c8783c', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            홈에서 사주 입력하기 →
          </button>
        </div>
      </main>
    )
  }

  const sajuLine = converting ? '사주 불러오는 중...' :
    (dayStem && info
      ? `일간 ${dayStem} · ${info.calType} ${info.year}.${info.month}.${info.day}${info.calType === '음력' && info.leapMonth === '1' ? ' (윤달)' : ''}`
      : '저장된 이름 풀이')

  const slotLabel = (i: number) => i === 0 ? '성(姓)' : `이름 ${i}글자`

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-02 — 성씨 칸은 «거르지 않습니다» (대표님 지시 ①②)
  //
  //   ⚠️ 성씨 칸(첫 글자)에서는 「이름에 잘 쓰지 않는 글자」 잣대를 걸지 않습니다.
  //      그 잣대는 «이름을 고를 때» 의 것입니다. 성씨는 타고나는 것이라
  //      고르고 말고가 없습니다. 작명 화면(newhanja)과 «같은 규칙» 입니다.
  //   ★그리고 성씨 전용 표의 «흔한 차례» 로 앞에 세웁니다 —
  //      「이」면 李 → 異 → 伊, 「김」이면 金, 「박」이면 朴 이 맨 앞입니다.
  //   ⚠️ 표에 없는 한자를 «빼지 않습니다» — 뒤로 보낼 뿐입니다.
  //      드문 집안 글자가 이 표에 없을 수 있습니다. 막으면 그 집안이 못 씁니다.
  //   ⚠️ 획수 차례는 «그 다음» 입니다 — 성씨가 아닌 것끼리는 예전 그대로입니다.
  // ══════════════════════════════════════════════════════════════
  const isSurnameSlot = pickerIdx === 0
  const surnameSorted = (() => {
    if (!isSurnameSlot) return hanjaList
    const syl = syllables[0] ?? ''
    return [...hanjaList].sort((a, b) => {
      const ra = surnameRank(syl, rowHanja(a))
      const rb = surnameRank(syl, rowHanja(b))
      if (ra !== rb) return ra - rb
      return rowStrokes(a) - rowStrokes(b)
    })
  })()

  const normalList = isSurnameSlot ? surnameSorted : hanjaList.filter((r) => !isAvoidChar(r))
  const avoidList = isSurnameSlot ? [] : hanjaList.filter((r) => isAvoidChar(r))

  const hanjaCard = (row: HanjaRow, i: number, dim: boolean) => (
    <div key={i}
      onClick={() => pickHanja(row)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
        borderRadius: '12px', background: '#fffbf7', cursor: 'pointer',
        border: '0.5px solid #9c7a58', opacity: dim ? 0.45 : 1,
      }}>
      <span style={{ fontSize: '26px', fontWeight: 'bold', color: gold, minWidth: '32px', textAlign: 'center' }}>
        {row.hanja}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.meaning}</div>
        <div style={{ fontSize: '11px', color: '#5c3a1e', marginTop: '2px' }}>
          {/* ★2026-07-30 (1단계) — 목록도 같은 창구를 씁니다.
              전에는 DB 날것을 그려서 손님이 «木» 을, 판정은 «목» 을 보는 어긋남이 있었습니다.
              ⚠️ 못 읽은 값이면 빈칸이 되므로 원값을 그대로 보여 줍니다(정보를 숨기지 않습니다). */}
          {rowOhaeng(row) ?? row.resource_ohaeng}·{rowStrokes(row)}획
        </div>
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* ★2026-08-02 — 뒤로가기도 «온 길» 로 돌아갑니다.
          ⚠️ 하단 버튼만 고치면 «머리글로 나간 손님» 이 또 남의 보관함에 떨어집니다.
             나가는 문이 둘이니 둘 다 같은 곳을 가리켜야 합니다. */}
      <PitchHeader
        title={storageBranch === 'naming' ? '내 아이 명품작명' : '내 이름 정밀분석'}
        onBack={() => router.push((sp.get('from') === 'mypage' || nameId) ? '/mypage-new' : storagePath)}
        onHome={() => router.push('/home-new')} />

      <div style={{ padding: '16px' }}>
        <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#5c3a1e', marginBottom: '6px' }}>내 사주</div>
          <div style={{ fontSize: '14px', color: '#1a1a1a' }}>{sajuLine}</div>
        </div>

        {step === 'input' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#5c3a1e' }}>
                {targetRelation === 'self' ? '본인' : (urlName || '이 분')} 이름을 한글로 입력하세요
              </span>
              <button onClick={() => setPickerOpen(true)}
                style={{ background: 'rgba(200,120,60,0.10)', color: '#96502e', fontSize: '11px', fontWeight: 500, padding: '5px 11px', borderRadius: '16px', border: 'none', cursor: 'pointer' }}>
                ＋ 다른 사람 진단
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: syllables.length > 0 ? '26px' : '20px' }}>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyName() }}
                placeholder="예: 홍길동"
                maxLength={5}
                style={{
                  flex: 1, padding: '13px', borderRadius: '12px', background: '#FDF6F0',
                  border: '0.5px solid #9c7a58', color: '#1a1a1a', fontSize: '16px',
                }} />
              <button onClick={applyName}
                style={{ padding: '13px 20px', borderRadius: '12px', background: gold, border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                확인
              </button>
            </div>

            {syllables.length >= 2 && (
              <>
                <div style={{ fontSize: '13px', color: '#5c3a1e', marginBottom: '16px' }}>
                  각 글자의 한자를 골라주세요
                </div>
                <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {syllables.map((syl, i) => {
                    const c = chars[i]
                    // ══════════════════════════════════════════════════
                    //  ★2026-08-02 — 성씨를 고르기 «전» 에는 이름 칸을 잠급니다
                    //    (대표님 지시 ③ · 가) 방식)
                    //
                    //   [까닭]  성씨 획수에서 수리 4격이 시작하고,
                    //     성씨 오행에서 자원오행 흐름이 출발합니다.
                    //     성씨가 비면 뒤의 글자를 아무리 골라도 «판정이 서지 않습니다».
                    //     ★그러니 «순서» 를 화면이 지켜 드려야 합니다.
                    //
                    //   ⚠️⚠️ 이미 고른 이름 글자를 «지우지 않습니다» (대표님 확정).
                    //      잠그기만 합니다. 성씨를 다시 고르면 그대로 돌아옵니다.
                    //      ★세 글자를 다 고른 뒤 성씨를 눌렀다가 닫으셨다고 해서
                    //        두 글자가 날아가면 안 됩니다.
                    //   ⚠️ 성씨 칸(i===0) 자신은 «언제나» 열려 있습니다 —
                    //      잠그면 열 길이 없어집니다.
                    // ══════════════════════════════════════════════════
                    const locked = i > 0 && !chars[0]
                    return (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => { if (!locked) openPicker(i) }}
                          disabled={locked}
                          aria-disabled={locked}
                          title={locked ? '먼저 성씨 한자를 골라주세요' : undefined}
                          className={locked ? undefined : 'active:scale-95'}
                          style={{
                            width: '78px', height: '78px', borderRadius: '50%',
                            background: c ? 'rgba(200,120,60,0.10)' : cardBg,
                            border: c ? `2px solid ${gold}` : '1px dashed #9c7a58',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: locked ? 'not-allowed' : 'pointer', transition: 'transform 0.15s ease',
                            opacity: locked ? 0.4 : 1,
                          }}>
                          {c ? (
                            <>
                              <span style={{ fontSize: '30px', fontWeight: 'bold', color: gold, lineHeight: 1 }}>{c.hanja}</span>
                              <span style={{ fontSize: '10px', color: '#5c3a1e', marginTop: '3px' }}>{c.hangul}</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#1a1a1a', lineHeight: 1 }}>{syl}</span>
                              <span style={{ fontSize: '9px', color: gold, marginTop: '4px' }}>한자 고르기</span>
                            </>
                          )}
                        </button>
                        <div style={{ fontSize: '9px', color: '#5c3a1e', marginTop: '5px' }}>
                          {c ? `${c.resourceOhaeng}·${c.strokes}획` : slotLabel(i)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* ★2026-08-02 — 잠긴 까닭을 «말해 줍니다».
                    ⚠️ 흐리게만 해 두면 「왜 안 눌리지」가 됩니다. 잠근 것과 까닭은 한 쌍입니다. */}
                {!chars[0] && syllables.length >= 2 && (
                  <div style={{
                    fontSize: '12px', lineHeight: 1.7, color: '#96502e',
                    background: 'rgba(200,120,60,0.07)', border: '1px solid rgba(200,120,60,0.25)',
                    borderRadius: '10px', padding: '10px 12px', marginBottom: '16px', textAlign: 'center',
                  }}>
                    먼저 <b>성씨 한자</b>를 골라주세요<br />
                    <span style={{ fontSize: '11px', color: '#5c3a1e' }}>
                      성씨의 획수와 오행에서 수리 4격·자원오행이 시작돼요
                    </span>
                  </div>
                )}

                <div style={{ fontSize: '11px', color: '#5c3a1e', marginBottom: '20px', lineHeight: 1.6 }}>
                  · 원을 누르면 그 글자의 한자가 자동으로 나와요<br />
                  · 이름을 바꾸려면 위에 다시 입력하고 확인을 누르세요
                </div>

                {/* ★2026-07-31 (40부 3차) 두음법칙 안내
                    ⚠️ «판정을 바꾸는 것이 아닙니다» — 교재는 표기음 그대로 봅니다(이재명=토,금,수).
                       손님이 「류/유」 어느 쪽으로 적느냐로 발음오행이 달라지는 것을 «알려만» 줍니다.
                    ★정말 두 음으로 실려 있는 한자에만 뜹니다 (hanja 표를 보고 판단) */}
                {dueumMsg && (
                  <div style={{
                    fontSize: '11px', lineHeight: 1.7, color: '#5c3a1e',
                    background: 'rgba(200,120,60,0.07)', border: '1px solid rgba(200,120,60,0.25)',
                    borderRadius: '10px', padding: '10px 12px', marginBottom: '20px',
                  }}>
                    <span style={{ color: gold, fontWeight: 600 }}>알려 드립니다 · </span>
                    {dueumMsg}
                  </div>
                )}

                <button onClick={handlePreview} disabled={!canSubmit}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: canSubmit ? '#c8783c' : '#e8ddd0',
                    border: 'none', color: canSubmit ? '#fff' : '#b4785a',
                    fontSize: '15px', fontWeight: 'bold', cursor: canSubmit ? 'pointer' : 'default',
                  }}>
                  {canSubmit ? '이름 풀이 보기 →' : '모든 글자의 한자를 골라주세요'}
                </button>
              </>
            )}
          </>
        )}

        {step === 'preview' && surname && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: gold, letterSpacing: '4px' }}>
                {chars.filter(Boolean).map(c => c!.hanja).join('')}
              </div>
              <div style={{ fontSize: '14px', color: '#1a1a1a', marginTop: '4px' }}>
                {chars.filter(Boolean).map(c => c!.hangul).join('')}
              </div>
            </div>

            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: gold, marginBottom: '12px', fontWeight: 'bold' }}>
                ✨ 미리보기
              </div>
              <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: 1.9 }}>
                이름의 한자 획수와 발음을 분석했어요.<br />
                이 이름이 <b style={{ color: gold }}>사주에 필요한 기운(용신)</b>을 얼마나 채워주는지,
                전체적으로 잘 맞는 이름인지는 전체 풀이에서 확인하실 수 있어요.
              </div>
            </div>

            <button onClick={() => setStep('pay')}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: '#c8783c',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 'bold',
                cursor: 'pointer', marginBottom: '10px',
              }}>
              전체 풀이 받기 ({readPrice.toLocaleString()}원) →
            </button>
            <button onClick={() => setStep('input')}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border, color: '#5c3a1e', fontSize: '13px', cursor: 'pointer' }}>
              ← 이름 다시 고르기
            </button>
          </>
        )}

        {step === 'pay' && (
          <>
            <div style={{
              border: '2px dashed #9c7a58', borderRadius: '16px',
              padding: '30px 20px', textAlign: 'center', marginBottom: '20px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>💳</div>
              <div style={{ fontSize: '13px', color: '#5c3a1e', marginBottom: '6px' }}>결제 금액</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: gold }}>{readPrice.toLocaleString()}원</div>
            </div>

            <button onClick={handleFullResult}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: '#c8783c',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 'bold',
                cursor: 'pointer', marginBottom: '10px',
              }}>
              💳 {readPrice.toLocaleString()}원 결제하고 결과 보기 →
            </button>
            <button onClick={() => setStep('preview')}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border, color: '#5c3a1e', fontSize: '13px', cursor: 'pointer' }}>
              ← 뒤로
            </button>
          </>
        )}

        {step === 'result' && (
          <>
            {loading && (
              <div style={{ background: cardBg, border, borderRadius: '14px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '40px', display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span>
                <div style={{ textAlign: 'center', color: gold, fontSize: '13px', lineHeight: 1.7 }}>
                  이름을 정성껏 풀이하고 있어요<br />
                  <span style={{ color: '#5c3a1e', fontSize: '12px' }}>잠시만 기다려 주세요</span>
                </div>
              </div>
            )}

            {/* ★2026-07-30 (3단계) — 실패했을 때 «빈 화면» 대신 이유와 [다시 시도] 를 냅니다 */}
            {!loading && failWhy && (
              <div style={{
                background: cardBg, border: '1px solid #dc8888', borderRadius: '14px',
                padding: '22px 18px', textAlign: 'center', marginBottom: '16px',
              }}>
                <div style={{ fontSize: '26px', marginBottom: '8px' }}>🌧️</div>
                <div style={{ fontSize: '13px', color: rose, lineHeight: 1.8, marginBottom: '14px' }}>
                  {failWhy}
                </div>
                <button onClick={handleFullResult}
                  style={{
                    padding: '11px 22px', borderRadius: '12px', background: gold,
                    border: 'none', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                  }}>
                  다시 시도
                </button>
              </div>
            )}

            {!loading && result && (
              <>
                {/* ★2026-08-01 (Phase 1-C) — 결과 프레임을 «공용 부품» 으로 바꿨습니다.
                    [왜]  감정과 작명이 각자 그리다가 작명 쪽이 «옛 통변 구조» 에 멈춰
                          손님이 통변을 못 보고 있었습니다. 한 벌로 모읍니다. (교훈 ET) */}
                <NameAnalysisResultView
                  hanjaName={chars.filter(Boolean).map(c => c!.hanja).join('')}
                  hangulName={chars.filter(Boolean).map(c => c!.hangul).join('')}
                  saju={saju}
                  solarYear={solar?.year ?? 0}
                  solarMonth={solar?.month ?? 1}
                  solarDay={solar?.day ?? 1}
                  dayStem={dayStem ?? ''}
                  commentary={commentary}
                  stars={stars}
                  overallStar={overallStar}
                  yongsin={aptYongsin.yongsin}
                  heeksin={aptYongsin.heeksin}
                  gisin={aptYongsin.gisin}
                  fillElements={namingFill}
                  careerHref={careerHref}
                />

                {/* ══════════════════════════════════════════════════════
                    ★2026-08-01 (43부 26차) — 보관함에서도 A4 선명장 (대표님 지적)

                     🔴 전에는 결과 화면에서만 뽑을 수 있었습니다.
                        보관함에서 다시 열면 버튼이 없어 «매번 새로 지어야» 했습니다.
                     ★기록에 든 값 그대로 뽑습니다 — AI 를 다시 부르지 «않습니다».
                     ⚠️ 「풀이」 기록에는 달지 않습니다 — 그건 작명이 아닙니다.
                    ══════════════════════════════════════════════════════ */}
                {result && recKind && recKind !== '풀이' && chars.filter(Boolean).length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <NamingCertificateButton
                      // ★관계까지 배지에 담습니다 — 결과 화면과 «같은 규칙» 입니다
                      //   ⚠️ 「나 작명」이 되지 않게 self·본인·나는 뺍니다
                      kind={recKind === '신생아'
                        && recRelation && !['self', '본인', '나'].includes(recRelation)
                        ? (recRelation as '신생아')
                        : recKind === '신생아' ? '신생아' : '개명'}
                      hangulName={chars.filter(Boolean).map(c => c!.hangul).join('')}
                      hanjaName={chars.filter(Boolean).map(c => c!.hanja).join('')}
                      chars={chars.filter(Boolean).map((c, i, arr): CertChar => ({
                        hangul: c!.hangul, hanja: c!.hanja,
                        strokes: c!.strokes,
                        resourceOhaeng: String(c!.resourceOhaeng ?? ''),
                        soundOhaeng: soundOhaengOf(c!.hangul) || '',
                        meaning: (c as unknown as { meaning?: string })?.meaning || '',
                        role: i < arr.length - (arr.length >= 3 ? 2 : 1) ? '성' : '이름',
                      }))}
                      gyeok={(result.suri.gyeok ?? []).map((g): CertGyeok => ({
                        mark: g.key, label: g.label, sum: g.sum, name: g.name, un: g.un,
                      }))}
                      saju={saju.map(x => ({ pillar: x.pillar, stem: x.stem, branch: x.branch }))}
                      birthText={info ? `${info.calType} ${infoYear}년 ${infoMonth}월 ${infoDay}일` : ''}
                      birthHanja={info
                        ? `${info.calType === '음력' ? '陰' : '陽'} ${infoYear}年 `
                          + `${String(infoMonth).padStart(2, '0')}月 ${String(infoDay).padStart(2, '0')}日`
                        : ''}
                      gender={info?.gender === '여' ? '坤命' : info?.gender === '남' ? '乾命' : ''}
                      yongsin={aptYongsin.yongsin ?? ''}
                      lines={[
                        // ★2026-08-02 — 화면 아코디언과 «같은 차례» (三 자원 · 四 수리)
                        //   ⚠️ 종이와 화면의 차례가 갈리면 손님이 대조하다 헷갈리십니다.
                        ['음양', result.yinYang.grade],
                        ['발음오행', result.soundFlow.grade],
                        ['자원오행', result.resourceFlow.grade],
                        ['수리 4격', result.suri.grade],
                        ['사주와의 만남', result.yongsinBohwan.grade],
                      ]}
                      chongpyeong={(commentary as { chongpyeong?: string })?.chongpyeong || ''}
                      yongsinLine={commentary?.yongsin?.name || ''}
                      yongsinMeaning={commentary?.yongsin?.meaning || ''}
                      conclusion={commentary?.conclusion || ''}
                      issuedAt={(() => {
                        const d = new Date()
                        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
                      })()}
                    />
                  </div>
                )}

                {/* ★2026-07-21 2차: 저장 표시를 상담 버튼 바로 위로 옮겼다.
                    사주·궁합·택일과 위치를 통일하기 위함. 저장은 원래부터 자동이었다. */}
                {saveFailed && (
                  <div style={{
                    textAlign: 'center', fontSize: '13px',
                    color: '#8f3d0e', background: '#fdeee2',
                    borderRadius: '12px', padding: '13px', marginBottom: '12px',
                  }}>
                    보관함에 저장하지 못했어요. 이 화면을 닫으면 다시 볼 수 없어요
                  </div>
                )}
                {/* ══════════════════════════════════════════════════════
                    ★2026-08-02 — 「📁 …불러왔다」 는 초록 띠를 «걷어냅니다» (대표님 지시 ②)
                     ⚠️ 옛 문구를 여기 «그대로» 적지 마십시오 — 검사가 주석까지 읽어
                        「아직 남아 있다」고 봅니다 (JSX 주석은 codeOf 가 못 걷습니다).

                     [까닭]  보관함에서 눌러서 들어오신 분은 «그것을 이미 아십니다».
                       아는 것을 큰 초록 띠로 다시 말하니 화면만 어지러웠습니다.

                     ⚠️ 「✓ 보관함에 저장됐어요」는 «남겨 둡니다» —
                        그것은 아는 사실이 아니라 «방금 일어난 일» 을 알리는 말입니다.
                        저장이 됐는지 모르면 손님이 화면을 못 닫으십니다.
                        ★그 대신 띠를 걷고 «얌전한 한 줄» 로 낮췄습니다
                          (작명 결과 화면과 같은 결 — 43부 28차).
                     ⚠️ 저장 «실패» 띠는 위에 그대로 있습니다. 그때는 눈에 띄어야 합니다.
                    ══════════════════════════════════════════════════════ */}
                {savedRecordId && !viewOnly && (
                  <div style={{
                    textAlign: 'center', fontSize: '11.5px', color: '#6f8a5f',
                    padding: '2px 0 12px', lineHeight: 1.6,
                  }}>
                    ✓ 보관함에 안전하게 자동 저장되었습니다
                  </div>
                )}


                <div style={{ background: '#fdeee2', border: `1px solid ${gold}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#c8506e', fontStyle: 'italic', marginBottom: '14px', lineHeight: 1.5, textAlign: 'center' }}>
                    이름의 결을 더 살펴보고 싶다면, 다른 가능성도 열어둘 수 있습니다
                  </div>

                  <button onClick={() => router.push('/manseryeok/naming/rename/newname')}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(200,120,60,0.12)', border: `1px solid ${gold}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: gold }}>발음은 그대로, 한자 바꾸기</div>
                      <div style={{ fontSize: '11px', color: '#96502e', marginTop: '2px' }}>부르는 이름은 두고, 사주에 맞는 한자로</div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: gold, whiteSpace: 'nowrap', marginLeft: '10px' }}>{hanjaPrice.toLocaleString()}원</span>
                  </button>
                </div>

                {/* ══════════════════════════════════════════════════════
                    ★2026-08-02 — 맨 아래 두 버튼을 «한 줄 두 칸» 으로 (대표님 지시 ④)

                     [까닭]  같은 폭·같은 무게의 버튼이 세로로 쌓여
                       세로 공간만 먹고 «무엇이 무엇인지» 눈에 안 들어왔습니다.
                       ★나란히 두면 「하나 더 볼까 / 나갈까」 라는 «갈림길» 로 읽힙니다.

                     ⚠️ 오른쪽 버튼은 «들어온 갈래» 를 따릅니다 (지시 ①).
                        명품작명으로 왔으면 명품작명 보관함, 풀이면 정밀분석 보관함.
                     ⚠️ 왼쪽도 갈래를 따릅니다 —
                        작명 기록을 보고 계신 분께 「다른 이름 풀어보기」를 내밀면
                        «이름 풀이 입력 화면» 으로 떨어집니다. 그것도 같은 종류의 어긋남입니다.
                     ⚠️ 마이페이지에서 오신 분(nameId)은 «온 길로» 돌아가야 하므로
                        그 자리는 예전 그대로 둡니다.
                     ⚠️ 430px 화면에서 두 칸입니다 — 글자를 짧게 두십시오.
                        길어지면 줄바꿈되어 높이가 서로 달라집니다.
                    ══════════════════════════════════════════════════════ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (nameId) { router.push('/mypage-new'); return }
                      if (storageBranch === 'naming') {
                        router.push('/manseryeok/naming/rename/newname?kind=신생아')
                        return
                      }
                      resetAll()
                    }}
                    style={{
                      padding: '13px 6px', borderRadius: '12px', background: 'transparent',
                      border, color: '#5c3a1e', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    }}>
                    {nameId
                      ? '← 마이페이지로'
                      : storageBranch === 'naming' ? '새 이름 지어보기' : '다른 이름 풀어보기'}
                  </button>

                  <button onClick={() => router.push(storagePath)}
                    style={{
                      padding: '13px 6px', borderRadius: '12px',
                      background: 'rgba(200,120,60,0.10)', border: '0.5px solid #9c7a58',
                      color: subWarm, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    }}>
                    📜 {storageLabel}
                  </button>
                </div>

                {/* ★2026-08-05 (47부 9차) — 상담 카드를 «화면 맨 끝» 으로. [대표님 지시]
                    ⚠️ 그래서 「한자 바꾸기」·보관함 버튼이 상담 카드 «위» 로 올라갔습니다.
                    ⛔ 다시 위로 올리지 마십시오. */}
                {/* ★ 전문가 상담 연결 — 저장 표시 아래.
                    관리자 > 가격 관리에서 '노출'을 끄면 이 영역이 통째로 사라진다. */}
                <div style={{ marginBottom: '12px' }}>
                  <ConsultButton priceKey="naming" mode="naming" />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {pickerIdx !== null && (
        <div
          onClick={() => { setPickerIdx(null); setHanjaList([]) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(40,28,22,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '400px', background: '#fffbf7',
              borderRadius: '18px', padding: '20px 16px', boxShadow: '0 16px 40px rgba(90,50,30,0.2)',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: gold, marginBottom: '4px' }}>
              &lsquo;{syllables[pickerIdx]}&rsquo; {isSurnameSlot ? '성씨 한자 고르기' : '한자 고르기'}
            </div>
            {/* ★2026-08-02 — 성씨 칸에서는 «거르지 않았다» 는 것을 밝혀 둡니다.
                ⚠️ 낯선 글자가 함께 보이는 것이 «잘못» 이 아니라는 것을 알려야
                   손님이 「왜 이런 게 나오지」 하고 헤매지 않으십니다. */}
            <div style={{ fontSize: '11px', color: '#5c3a1e', marginBottom: '14px', lineHeight: 1.6 }}>
              {isSurnameSlot
                ? '집안에서 쓰시는 한자를 골라주세요. 흔한 성씨 한자가 위에 있어요'
                : '\u00a0'}
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {searching && <div style={{ textAlign: 'center', color: '#5c3a1e', padding: '20px' }}>찾는 중...</div>}
              {!searching && hanjaList.length === 0 && (
                <div style={{ textAlign: 'center', color: '#5c3a1e', padding: '20px', fontSize: '13px' }}>
                  &lsquo;{syllables[pickerIdx]}&rsquo; 음의 인명용 한자를 찾을 수 없어요
                </div>
              )}

              {normalList.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {normalList.map((row, i) => hanjaCard(row, i, false))}
                </div>
              )}

              {avoidList.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', color: '#5c3a1e', margin: '18px 0 8px', lineHeight: 1.6 }}>
                    아래 글자들은 일반적으로 이름에 잘 쓰지 않아요.<br />
                    본인 이름에 쓰는 글자라면 골라주세요.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {avoidList.map((row, i) => hanjaCard(row, i + 10000, true))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 다른 사람(가족·지인) 진단 — 사주보기와 동일한 사람 선택 모달 재사용.
          고른 사람의 생년월일을 URL로 실어 이 화면을 다시 열면(fromUrl 우선),
          그 사람 사주로 이름풀이를 진행한다. name·relation 도 함께 실어
          보관함 저장 시 관계로 구분되게 한다. */}
      <PersonPickerModal
        open={pickerOpen}
        serviceLabel="이름풀이"
        headline="누구의 이름을 볼까요?"
        serviceType="naming"
        submitLabel="저장하고 이름 보기"
        onClose={() => setPickerOpen(false)}
        onPick={(person: SavedPerson) => {
          setPickerOpen(false)
          const q = toResultQuery(person)
          const rel = person.relation ? `&relation=${encodeURIComponent(person.relation)}` : ''
          router.push(`/manseryeok/naming/diagnosis?${q}${rel}`)
        }}
      />
    </main>
  )
}

export default function DiagnosisPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF6F0' }}>
        <div style={{ color: '#8f3d0e' }}>로딩 중...</div>
      </div>
    }>
      <DiagnosisInner />
    </Suspense>
  )
}
