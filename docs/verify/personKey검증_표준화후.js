// ============================================================================
// 명연재 personKey 표준화 검증 — "수정 후" 로직으로 재검증
// ----------------------------------------------------------------------------
// 표준 규격(제안):
//  1) "시간 모름"의 내부 표현을 '모름'(문자열)으로 단일화.
//     - welcome/DB(birth_hour), 홈 myinfo(hour), newborn 모두 '모름' 사용.
//     - 홈의 hour==='모름'?'-1' 을 → '모름' 으로 바꾼다. (오염원 제거)
//  2) leapMonth(윤달)를 정식 필드로 승격. 값은 '0'(평달)/'1'(윤달) 문자열.
//     - welcome/DB, 홈, newborn, URL 모두 leapMonth를 저장·전달.
//     - profiles에 leap_month 컬럼 추가(기본 '0').
//  3) personKey 규칙을 단 하나의 표준 함수로 통일:
//        [calType, year, month, day, leapMonth, hourToken, gender]
//     - hourToken: '모름'|null|'' → 'x', 그 외 숫자문자열 그대로
//     - 모든 필드는 문자열로 정규화(숫자/문자 혼용 금지)
//  4) 공통 헬퍼 toStdInfo(raw) 하나가 profiles/URL/myinfo/직접입력을
//     동일한 표준 info로 변환. personKey는 이 표준 info만 받는다.
// ============================================================================

// ── 표준 personKey (유일한 규칙) ─────────────────────────────────────────
function stdPersonKey(info) {
  if (!info || !info.year) return ''
  const h = info.hour
  const hourToken = (h === '모름' || h == null || h === '') ? 'x' : String(h)
  return [
    String(info.calType || '양력'),
    String(info.year),
    String(info.month),
    String(info.day),
    String(info.leapMonth || '0'),
    hourToken,
    String(info.gender || '남'),
  ].join('|')
}

// ── 공통 헬퍼: 어떤 소스든 표준 info로 변환 ──────────────────────────────
// 표준 info 형태: { calType, year, month, day, leapMonth, hour, gender }
//   - year/month/day: 문자열 (예 '1990','5','15')
//   - hour: '0'~'11' 문자열 또는 '모름'
//   - leapMonth: '0' 또는 '1'
//   - hourIdx(숫자|null)가 필요한 계산부는 hourToIdx()로 파생

// (A) profiles(DB) row → 표준 info
function stdFromProfile(p) {
  const bh = p.birth_hour
  const hour = (bh === '모름' || bh == null || bh === '') ? '모름' : String(bh)
  return {
    gender: p.gender ?? '남',
    calType: p.cal_type ?? '양력',
    year: String(p.birth_year),
    month: String(p.birth_month),
    day: String(p.birth_day),
    leapMonth: p.leap_month != null ? String(p.leap_month) : '0', // 신규 컬럼
    hour,
  }
}

// (B) URL 파라미터 → 표준 info
function stdFromUrl(sp) {
  const h = sp.hour
  const hour = (h === '모름' || h == null || h === '') ? '모름' : String(h)
  return {
    gender: sp.gender || '남',
    calType: sp.calType || '양력',
    year: String(parseInt(sp.year || '0')),
    month: String(parseInt(sp.month || '0')),
    day: String(parseInt(sp.day || '0')),
    leapMonth: sp.leapMonth || '0',
    hour,
  }
}

// (C) 홈 화면 상태 → 표준 info (그리고 이게 myinfo에 그대로 저장됨)
function stdFromHome({ birthDate, birthHourLabel, gender, calType, leap }) {
  const HOUR_INDEX = {
    '子시(23~01)':0,'丑시(01~03)':1,'寅시(03~05)':2,'卯시(05~07)':3,
    '辰시(07~09)':4,'巳시(09~11)':5,'午시(11~13)':6,'未시(13~15)':7,
    '申시(15~17)':8,'酉시(17~19)':9,'戌시(19~21)':10,'亥시(21~23)':11,
  }
  const d = birthDate.split('-')
  const year = d[0] || ''
  const month = d[1] ? String(parseInt(d[1])) : ''
  const day = d[2] ? String(parseInt(d[2])) : ''
  // ★ 수정 핵심: '모름'을 '-1'이 아니라 '모름' 그대로 (표준)
  const hour = (birthHourLabel === '모름' || !birthHourLabel)
    ? '모름' : String(HOUR_INDEX[birthHourLabel])
  return {
    gender, calType, year, month, day,
    leapMonth: leap ? '1' : '0',   // ★ 윤달 정식 포함
    hour,
  }
}

// (D) 직접입력(newborn 아기 정보) → 표준 info
function stdFromDirect({ gender, calType, year, month, day, birthHourLabel, leap }) {
  const HOUR_INDEX = {
    '子시(23~01)':0,'丑시(01~03)':1,'寅시(03~05)':2,'卯시(05~07)':3,
    '辰시(07~09)':4,'巳시(09~11)':5,'午시(11~13)':6,'未시(13~15)':7,
    '申시(15~17)':8,'酉시(17~19)':9,'戌시(19~21)':10,'亥시(21~23)':11,
  }
  const hour = (birthHourLabel === '모름' || !birthHourLabel)
    ? '모름' : String(HOUR_INDEX[birthHourLabel])
  return {
    gender, calType,
    year: String(year), month: String(month), day: String(day),
    leapMonth: leap ? '1' : '0',
    hour,
  }
}

// 계산부가 쓰는 hourIdx (number|null) 파생 — useResultSaju에 넘길 값
function hourToIdx(info) {
  const h = info.hour
  return (h === '모름' || h == null || h === '') ? null : parseInt(h)
}

// ============================================================================
// 사례 (윤달 사례 추가)
// ============================================================================
const cases = [
  { label:'① 양력 1990-05-15 남 · 午시', leap:false,
    profile:{birth_year:1990,birth_month:5,birth_day:15,birth_hour:'6',cal_type:'양력',gender:'남',leap_month:'0'},
    home:{birthDate:'1990-05-15',birthHourLabel:'午시(11~13)',gender:'남',calType:'양력',leap:false},
    url:{year:'1990',month:'5',day:'15',hour:'6',calType:'양력',gender:'남',leapMonth:'0'} },

  { label:'② 양력 1990-05-15 남 · 시간 모름', leap:false,
    profile:{birth_year:1990,birth_month:5,birth_day:15,birth_hour:'모름',cal_type:'양력',gender:'남',leap_month:'0'},
    home:{birthDate:'1990-05-15',birthHourLabel:'모름',gender:'남',calType:'양력',leap:false},
    url:{year:'1990',month:'5',day:'15',hour:'모름',calType:'양력',gender:'남',leapMonth:'0'} },

  { label:'③ 음력 1966-01-12 남 · 卯시 [인계서 사례]', leap:false,
    profile:{birth_year:1966,birth_month:1,birth_day:12,birth_hour:'3',cal_type:'음력',gender:'남',leap_month:'0'},
    home:{birthDate:'1966-01-12',birthHourLabel:'卯시(05~07)',gender:'남',calType:'음력',leap:false},
    url:{year:'1966',month:'1',day:'12',hour:'3',calType:'음력',gender:'남',leapMonth:'0'} },

  { label:'④ 양력 2000-01-01 여 · 子시=0 [경계값]', leap:false,
    profile:{birth_year:2000,birth_month:1,birth_day:1,birth_hour:'0',cal_type:'양력',gender:'여',leap_month:'0'},
    home:{birthDate:'2000-01-01',birthHourLabel:'子시(23~01)',gender:'여',calType:'양력',leap:false},
    url:{year:'2000',month:'1',day:'1',hour:'0',calType:'양력',gender:'여',leapMonth:'0'} },

  { label:'⑤ 음력 1988-11-30 여 · 시간 모름', leap:false,
    profile:{birth_year:1988,birth_month:11,birth_day:30,birth_hour:'모름',cal_type:'음력',gender:'여',leap_month:'0'},
    home:{birthDate:'1988-11-30',birthHourLabel:'모름',gender:'여',calType:'음력',leap:false},
    url:{year:'1988',month:'11',day:'30',hour:'모름',calType:'음력',gender:'여',leapMonth:'0'} },

  { label:'⑥ 음력 윤5월 1985-05-20 남 · 巳시 [윤달]', leap:true,
    profile:{birth_year:1985,birth_month:5,birth_day:20,birth_hour:'5',cal_type:'음력',gender:'남',leap_month:'1'},
    home:{birthDate:'1985-05-20',birthHourLabel:'巳시(09~11)',gender:'남',calType:'음력',leap:true},
    url:{year:'1985',month:'5',day:'20',hour:'5',calType:'음력',gender:'남',leapMonth:'1'} },

  { label:'⑦ 음력 평5월 1985-05-20 남 · 巳시 [같은날 평달 — ⑥과 달라야]', leap:false,
    profile:{birth_year:1985,birth_month:5,birth_day:20,birth_hour:'5',cal_type:'음력',gender:'남',leap_month:'0'},
    home:{birthDate:'1985-05-20',birthHourLabel:'巳시(09~11)',gender:'남',calType:'음력',leap:false},
    url:{year:'1985',month:'5',day:'20',hour:'5',calType:'음력',gender:'남',leapMonth:'0'} },
]

console.log('='.repeat(78))
console.log('명연재 personKey 표준화 검증 — 수정 후 로직')
console.log('='.repeat(78))

let fail = 0
const leapKeys = {}

for (const c of cases) {
  const kProfile = stdPersonKey(stdFromProfile(c.profile))
  const kUrl     = stdPersonKey(stdFromUrl(c.url))
  const kHome    = stdPersonKey(stdFromHome(c.home))

  console.log('\n' + '─'.repeat(78))
  console.log(c.label)
  console.log('  profiles(DB) :', kProfile)
  console.log('  URL          :', kUrl)
  console.log('  홈 myinfo    :', kHome)

  const allSame = (kProfile === kUrl) && (kUrl === kHome)
  console.log(`  ${allSame ? '✅ 세 경로 personKey 완전 일치' : '❌ 불일치'}`)
  if (!allSame) fail++

  leapKeys[c.label] = kProfile
}

// 윤달 ⑥ vs 평달 ⑦ 은 반드시 달라야 한다 (같으면 윤달 구분 실패)
console.log('\n' + '─'.repeat(78))
const k6 = leapKeys['⑥ 음력 윤5월 1985-05-20 남 · 巳시 [윤달]']
const k7 = leapKeys['⑦ 음력 평5월 1985-05-20 남 · 巳시 [같은날 평달 — ⑥과 달라야]']
const leapOk = k6 !== k7
console.log('윤달/평달 구분 검사:')
console.log('  윤5월 key :', k6)
console.log('  평5월 key :', k7)
console.log(`  ${leapOk ? '✅ 윤달과 평달이 서로 다른 personKey (정상 구분)' : '❌ 윤달 구분 실패'}`)
if (!leapOk) fail++

console.log('\n' + '='.repeat(78))
console.log(fail === 0 ? '✅ 전체 통과 — 모든 경로 일치 + 윤달 구분 정상' : `❌ 실패 ${fail}건`)
console.log('='.repeat(78))
