// lib/saju/SOURCE_INDEX.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  자료 색인 — 어느 교재 몇 쪽이 어느 파일에 들어 있는가              │
// │  2026-07-28 작성                                               │
// └───────────────────────────────────────────────────────────────┘
//
// ★왜 만들었나
//   자료 파일이 스물몇 개로 늘어, 어디에 무엇이 있는지 알려면 전부 열어 봐야 했습니다.
//   2026-07-28 에 실제로 **이미 저장소에 있는 것을 새로 만들려다** 일곱 번 되돌렸습니다.
//     · 剋 열(甲→편재적 성향)  →  cheonganTrait.tendency 에 이미 있었음
//     · 일간-관성 合/沖 합격운  →  examLuck/tables/rules.ts 에 이미 있었음
//     · 오행×육친 25칸 격자     →  career/tables/yukchin.ts 에 이미 있었음
//     · 육친별 문이과            →  career/tables/yukchin.YUKCHIN_GYEYEOL 에 이미 있었음
//     · 서울대 오행이 두 곳에서 다름 → career/tables/gwa.ts 머리말에 이미 적혀 있었음
//     · 土 문이과 비율 결정      →  career/gyeyeol.ts 가 이미 사례로 검증해 결론 냄
//     · 인문=육친 / 자연=오행    →  career/tables/gwa.PICK_BY 에 이미 구현
//   ★새 자료를 넣기 전에 이 파일부터 보십시오. (교훈 CB 의 도구)
//
// ★쪽 번호만으로 찾지 마십시오 — 책이 둘입니다 (아래 BOOKS 참고)

/** 교재 */
export type BookKey = 'A' | 'B'

export interface BookInfo {
  key: BookKey
  /** 지금까지 코드에 적혀 온 이름 */
  namedInCode: string
  /** 확인된 표시 */
  evidence: string
  /** ⚠️ 표지 확인이 필요한가 */
  confirmed: boolean
}

/**
 * ★★두 책이 있습니다 — 쪽 번호가 겹칩니다
 *
 *   [어떻게 알았나 — 2026-07-28 전수 조사]
 *     저장소의 출전 표기를 다 모아 두 묶음으로 갈라 보니,
 *     **각 묶음 안에서는 쪽이 안 겹치고 서로만 겹칩니다.**
 *     한 책이라면 있을 수 없는 모양입니다.
 *
 *       책 A 안에서 겹침  0건
 *       책 B 안에서 겹침  2건 (98~100/100~127, 129~133/132~139 — 경계가 맞닿은 것)
 *       A ↔ B 겹침       13건
 *
 *     보기) 94~97쪽이 A 에서는 「살」, B 에서는 「용신」입니다.
 *          106~131쪽이 A 에서는 「3장 六親論」, B 에서는 「일주」입니다.
 *
 *   [책 A] 3장 六親論 꼬리말이 찍힌 그 책. 스캔에 「명리적성 비법노트」로 인쇄됨.
 *   [책 B] career/tables/* 계열. 코드에는 A 와 같은 이름으로 적혀 있으나
 *          쪽 배치가 2026-07-28 에 받은 「진로적성 비밀노트」 스캔과 정확히 맞습니다.
 *            gwa.ts   "129쪽 짧은 대학 목록 / 136~139쪽 ⑥ 용신 오행에 맞는 대학교"
 *            스캔      129쪽에 짧은 목록 · 136~139쪽에 ⑥ 용신 오행에 맞는 대학교  ✅
 *            ilju.ts  "일주 100~127쪽"
 *            스캔      126쪽에서 계축·계해 일주가 끝나고 10번 항목이 시작  ✅
 *
 *   ⚠️⚠️ **대표님이 두 책 표지를 보고 확인해 주셔야 합니다.**
 *        확인되면 career/tables/* 아홉 파일의 머리말 책 이름을 고쳐야 합니다.
 *        그 전까지는 이 색인의 book 값을 믿고 쓰십시오.
 */
export const BOOKS: Record<BookKey, BookInfo> = {
  A: {
    key: 'A',
    namedInCode: '『명리적성 비법노트』(심산)',
    evidence: '스캔 꼬리말에 「명리적성 비법노트」와 「3장 六親論」이 찍혀 있음',
    confirmed: true,
  },
  B: {
    key: 'B',
    namedInCode: '『명리적성 비법노트』(심산)  ← ⚠️ 코드에 이렇게 적혀 있으나 의심스러움',
    evidence: '쪽 배치가 「진로적성 비밀노트」 스캔(126~139쪽)과 정확히 맞음. 표지 확인 필요',
    confirmed: false,
  },
}

export interface SourceEntry {
  book: BookKey
  /** 쪽 (from~to) */
  from: number
  to: number
  /** 무엇이 실려 있나 */
  what: string
  /** 어느 파일에 들어 있나 */
  files: string[]
  /** 남길 말 */
  note?: string
}

/**
 * ★교재 쪽 → 파일
 *   새 자료를 넣기 전에 여기서 먼저 찾으십시오.
 *   넣은 뒤에는 여기에 한 줄 더하십시오.
 */
export const SOURCE_INDEX: SourceEntry[] = [
  // ══════════════════════════════ 책 A
  { book: 'A', from: 20, to: 24, what: '오행 성격·단점·★다루는 법',
    files: ['lib/saju/ohaengNature.ts'] },
  { book: 'A', from: 25, to: 25, what: '오행 종합표 14줄(209항목) — 계절·색·맛·방향·학과·문이과',
    files: ['lib/saju/ohaengTable25.ts'],
    note: '★문이과 비율 다섯이 여기 다 있다(木7:3 火6:4 土5:5 金3:7 水4:6)' },
  { book: 'A', from: 26, to: 28, what: '오행 부족 / 발달·과다',
    files: ['lib/saju/ohaengTrait.ts'] },
  { book: 'A', from: 38, to: 40, what: '점수론·배점(100점)·발달과다 잣대·출생일자 3분할',
    files: ['lib/saju/simsanOhaeng.ts'],
    note: '⚠️ 39쪽 표는 110점이나 심산 원장이 100점으로 고쳐 가르치심. 고치지 말 것 (32-7장)' },
  { book: 'A', from: 41, to: 47, what: '천간 열 글자 — 물상·성품·핵심 특징·★십성 성향(剋)',
    files: ['lib/saju/cheonganTrait.ts'],
    note: '★tendency 칸이 「그 천간이 剋하는 대상 중 음양이 같은 십성」. 육친론 106~115쪽 표와 같은 말' },
  { book: 'A', from: 48, to: 73, what: '지지 12글자 — 종류·특징·띠·시각·절기·본기',
    files: ['lib/saju/jijiTrait.ts', 'lib/saju/jijiGrade.ts', 'lib/saju/coupleJijiText.ts'] },
  { book: 'A', from: 74, to: 77, what: '병존 — 천간 11 + 조합 4 + 지지 12',
    files: ['lib/saju/byeongjon.ts'] },
  { book: 'A', from: 78, to: 83, what: '합(合)',
    files: ['lib/saju/hapMeaning.ts'], note: '★성별을 뗌 (궁합에서 관계를 깨뜨리므로)' },
  { book: 'A', from: 84, to: 86, what: '충(沖)',
    files: ['lib/saju/chungMeaning.ts'],
    note: '⚠️ 자리별 沖 규칙은 121쪽. yukchinRule.CHUNG_POSITION 이 담고 있다' },
  { book: 'A', from: 87, to: 93, what: '형·파·해·원진',
    files: ['lib/saju/hyeongPaHae.ts'] },
  { book: 'A', from: 94, to: 97, what: '살 14종',
    files: ['lib/saju/sinsalTable.ts'],
    note: '⚠️ 같은 쪽이 책 B 에서는 「용신」이다. 헷갈리지 말 것' },
  { book: 'A', from: 106, to: 115, what: '3장 六親論 — 십성 열 개 (관계 대상·성향)',
    files: ['lib/saju/yukchinTable.ts'],
    note: '★「기본 성향」 열 = 그 육친이 剋하는 대상 중 음양이 같은 십성. 고치지 말 것' },
  { book: 'A', from: 116, to: 119, what: '많을 때 장단점 · 없거나 고립 · 특성과 보완점',
    files: ['lib/saju/yukchinGroup.ts'],
    note: '★119쪽 보완점 = 剋 두 방향 (내가 剋하는 것 + 나를 剋하는 것)' },
  { book: 'A', from: 120, to: 121, what: '20세 이전 분석법 · 月支가 중요한 이유 · ★자리별 沖',
    files: ['lib/saju/yukchinRule.ts'],
    note: '★자료가 아니라 배선 규칙. 그대로 재료에 넣지 말 것' },
  { book: 'A', from: 122, to: 131, what: '십성 편중·혼잡 사주 + 개운법',
    files: ['lib/saju/yukchinGroup.ts'],
    note: '🔴 127쪽 단명·자살 / 129쪽 성범죄 / 128쪽 실명 / 131쪽 임신출산은 담지 않음 (교훈 CA)' },
  { book: 'A', from: 190, to: 191, what: '이직·직업 변동 여섯 갈래',
    files: ['lib/saju/examLuck/tables/jobChange.ts'] },
  { book: 'A', from: 194, to: 195, what: '합격운 규칙·시험일·맺음말',
    files: ['lib/saju/examLuck/tables/rules.ts', 'lib/saju/examLuck/examDay.ts'] },
  { book: 'A', from: 230, to: 230, what: '십신별 시험 짝',
    files: ['lib/saju/examLuck/tables/rules.ts'], note: 'EXAM_KINDS — 뒤집어 목록으로 만듦' },

  // ══════════════════════════════ 책 B  ⚠️ 표지 확인 필요
  { book: 'B', from: 58, to: 61, what: '점수 계산법',
    files: ['lib/saju/career/careerScore.ts'] },
  { book: 'B', from: 62, to: 65, what: '격국 12격',
    files: ['lib/saju/career/gyeokguk.ts', 'lib/saju/career/tables/gyeokguk.ts'] },
  { book: 'B', from: 73, to: 78, what: '오행 기질과 진로적성 · 오행별 직업',
    files: ['lib/saju/career/tables/ohaeng.ts', 'lib/saju/career/tables/jobs.ts', 'lib/saju/career/ohaengGijil.ts'],
    note: '⚠️ 오행 자료는 넷이다. 합치지 말 것 (32-9장) — 여기 + A책 20~24·25·26~28' },
  { book: 'B', from: 79, to: 89, what: '육친 기질(짝 다섯) · 오행×육친 25칸 격자 · 육친별 문이과',
    files: ['lib/saju/career/tables/yukchin.ts', 'lib/saju/career/yukchin.ts'],
    note: '★YUKCHIN_GYEYEOL 이 육친별 문이과. A책 106~115쪽(십성 열 개)과 축이 다르다' },
  { book: 'B', from: 90, to: 93, what: '신살 (귀문관살 등)',
    files: ['lib/saju/career/tables/sinsal.ts', 'lib/saju/career/sinsal9.ts'],
    note: '⚠️ 양인살이 93쪽 셋 / A책 96쪽 다섯 / A책 107쪽 양인격으로 서로 다르다 — 연재쌤 확인 ㉓' },
  { book: 'B', from: 94, to: 97, what: '용신 (오행 용신 94~95 · 육친 용신 96~97)',
    files: ['lib/saju/career/tables/yongsin.ts', 'lib/saju/career/yongsin.ts'],
    note: '⚠️ 같은 쪽이 책 A 에서는 「살」이다' },
  { book: 'B', from: 98, to: 100, what: '직업 구조 (공무원·사업가·연구직)',
    files: ['lib/saju/career/tables/jobStructure.ts', 'lib/saju/career/jobStructure.ts'] },
  { book: 'B', from: 100, to: 127, what: '60일주별 기질·직업적성',
    files: ['lib/saju/career/tables/ilju.ts', 'lib/saju/career/ilju.ts'],
    note: '⚠️ 같은 쪽이 책 A 에서는 「3장 六親論」이다' },
  { book: 'B', from: 128, to: 128, what: '특수격 (월상일위·시상일위·이기성상·삼기성상·종격)',
    files: ['lib/saju/career/special.ts'] },
  { book: 'B', from: 129, to: 133, what: '계열(문·이과) 비율 · 강점지능 70 : 용신 30',
    files: ['lib/saju/career/gyeyeol.ts'],
    note: '★교재에 규칙이 둘인데 사례 넷으로 검증해 ⓑ(그룹 비교) 채택. 129쪽 표(ⓐ)는 土에서 무너진다' },
  { book: 'B', from: 132, to: 139, what: '학과(오행5 × 인문/자연) · 대학 135곳',
    files: ['lib/saju/career/tables/gwa.ts'],
    note: '⚠️ 서울대 오행이 129쪽(水金)과 136쪽(水)에서 다르다. 지금은 UNIV_136 만 쓴다' },
]

/** 쪽으로 찾기 — 두 책 다 돌려준다 */
export function findByPage(page: number): SourceEntry[] {
  return SOURCE_INDEX.filter(e => e.from <= page && page <= e.to)
}

/** 파일로 찾기 */
export function findByFile(file: string): SourceEntry[] {
  return SOURCE_INDEX.filter(e => e.files.some(f => f.includes(file)))
}

/** 낱말로 찾기 */
export function findByWord(word: string): SourceEntry[] {
  return SOURCE_INDEX.filter(e => e.what.includes(word) || (e.note ?? '').includes(word))
}

/**
 * ★색인이 실제 파일과 맞는지 확인.
 *   파일을 옮기거나 지웠는데 색인을 안 고치면 여기서 걸린다.
 *   @param exists 파일이 있는지 알려 주는 함수 (Node 쪽에서 fs.existsSync 를 넘긴다)
 */
export function verifyIndex(exists: (p: string) => boolean): string[] {
  const bad: string[] = []
  for (const e of SOURCE_INDEX) {
    for (const f of e.files) if (!exists(f)) bad.push(`${e.book} ${e.from}~${e.to} → ${f} 없음`)
  }
  return bad
}

/**
 * ★두 책 사이에 겹치는 쪽을 뽑는다.
 *   "○○쪽" 만 적고 책 이름을 안 적으면 여기 걸리는 구간에서 반드시 헷갈린다.
 */
export function collisions(): Array<{ page: string; a: string; b: string }> {
  const A = SOURCE_INDEX.filter(e => e.book === 'A')
  const B = SOURCE_INDEX.filter(e => e.book === 'B')
  const out: Array<{ page: string; a: string; b: string }> = []
  for (const a of A) for (const b of B) {
    if (a.from <= b.to && b.from <= a.to) {
      out.push({
        page: `${Math.max(a.from, b.from)}~${Math.min(a.to, b.to)}`,
        a: `A ${a.from}~${a.to} ${a.what}`,
        b: `B ${b.from}~${b.to} ${b.what}`,
      })
    }
  }
  return out
}

/**
 * ★아직 저장소에 안 들어온 곳
 *   스캔을 받으면 여기서 지우고 SOURCE_INDEX 에 옮기십시오.
 */
export const NOT_YET: Array<{ book: BookKey; pages: string; what: string; note?: string }> = [
  { book: 'A', pages: '1~19', what: '앞부분 — 확인 안 함' },
  { book: 'A', pages: '29~37', what: '오행과 배점 사이 — 확인 안 함' },
  { book: 'A', pages: '98~105', what: '2장 끝~3장 앞 — 확인 안 함',
    note: '3장 六親論이 106쪽부터라 그 앞 여덟 쪽이 비어 있다' },
  { book: 'A', pages: '132~189', what: '3장 뒤 ~ 이직 앞 — 확인 안 함' },
  { book: 'A', pages: '196~229', what: '합격운 뒤 ~ 십신별 시험 앞 — 확인 안 함' },
  { book: 'A', pages: '231~', what: '끝부분 — 확인 안 함' },
  { book: 'B', pages: '1~57', what: '앞부분 — 확인 안 함' },
  { book: 'B', pages: '66~72', what: '격국 뒤 ~ 오행 앞 — 확인 안 함' },
  { book: 'B', pages: '140~', what: '학과·대학 뒤 — 확인 안 함' },
]

/** 연재쌤 확인 대기 — 색인과 맞물린 것만 */
export const CHECK = [
  '㉓ 양인살 조건이 세 곳에서 다르다 — B책 93쪽(셋) / A책 96쪽(다섯) / A책 107쪽(양인격)',
  '㉟ 서울대 오행이 B책 129쪽(水金)과 136쪽(水)에서 다르다',
  '★★책 B 의 이름 — 표지를 보고 확인해 주십시오 (대표님)',
  '   확인되면 career/tables/* 아홉 파일과 career/*.ts 여섯 파일의 머리말을 고쳐야 합니다',
]
