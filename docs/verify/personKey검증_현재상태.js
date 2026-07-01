// ============================================================================
// 명연재 personKey 정합성 검증 — "현재 배포된 코드" 그대로 재현
// 목적: 각 화면이 실제로 계산하는 personKey가 서로 일치하는지 사례로 증명
// 각 함수는 붙여받은 실제 소스에서 그대로 옮긴 것 (로직 변경 없음)
// ============================================================================

// ── 실제 소스에서 떼어낸 personKey 함수들 ─────────────────────────────

// [diagnosis] info 객체 기반. hourIdx: number|null, null이면 'x'
function personKey_diagnosis(info) {
  if (!info) return ''
  return [info.calType, info.year, info.month, info.day, info.leapMonth, info.hourIdx ?? 'x', info.gender].join('|')
}

// [newborn] info 객체 기반. hourIdx == null이면 'x' (diagnosis와 동일 계열)
function personKey_newborn(info) {
  if (!info || !info.year) return ''
  const hourIdx = info.hourIdx == null ? 'x' : info.hourIdx
  return [info.calType, info.year, info.month, info.day, info.leapMonth, hourIdx, info.gender].join('|')
}

// [newname] myinfo(m) 기반. m.hour === '모름' || null 이면 'x'
function personKey_newname(m) {
  if (!m || !m.year) return ''
  const hourIdx = m.hour === '모름' || m.hour == null ? 'x' : m.hour
  return [m.calType || '양력', m.year, m.month, m.day, m.leapMonth || '0', hourIdx, m.gender || '남'].join('|')
}

// [newhanja] newname과 동일한 myinfo(m) 기반 함수
const personKey_newhanja = personKey_newname

// ── 각 화면이 "소스 데이터"로부터 info / myinfo 를 만드는 방식 재현 ──────

// [홈] AiManseryeokSection.handleStart 가 myinfo에 저장하는 형식
// 입력: 화면 상태(birthDate 'YYYY-MM-DD', birthHour 라벨/'모름', gender, calType)
function homeMakeMyInfo({ birthDate, birthHourLabel, gender, calType }) {
  const HOUR_INDEX = {
    '子시(23~01)':0,'丑시(01~03)':1,'寅시(03~05)':2,'卯시(05~07)':3,
    '辰시(07~09)':4,'巳시(09~11)':5,'午시(11~13)':6,'未시(13~15)':7,
    '申시(15~17)':8,'酉시(17~19)':9,'戌시(19~21)':10,'亥시(21~23)':11,
  }
  const d = birthDate.split('-')
  const yearStr = d[0] || ''
  const monthStr = d[1] ? String(parseInt(d[1])) : ''
  const dayStr = d[2] ? String(parseInt(d[2])) : ''
  const hourVal = birthHourLabel === '모름' ? '모름'
    : birthHourLabel ? String(HOUR_INDEX[birthHourLabel]) : '모름'
  // 홈은 hour='모름'이면 '-1'로 저장 (문제의 지점)
  return {
    gender, calType,
    year: yearStr, month: monthStr, day: dayStr,
    hour: hourVal === '모름' ? '-1' : hourVal,
    // leapMonth 는 저장하지 않음 (undefined)
  }
}

// [diagnosis] profiles(DB)에서 info를 만드는 방식 (URL 없을 때)
// birth_hour: '0'~'11' 문자열 또는 '모름'
function diagnosisMakeInfoFromProfile(p) {
  const bh = p.birth_hour
  const hourIdx = bh === '모름' || bh == null || bh === '' ? null : parseInt(bh)
  return {
    gender: p.gender ?? '남',
    calType: p.cal_type ?? '양력',
    year: Number(p.birth_year),
    month: Number(p.birth_month),
    day: Number(p.birth_day),
    leapMonth: '0',
    hourIdx,
  }
}

// [diagnosis] URL 파라미터에서 info를 만드는 방식
function diagnosisMakeInfoFromUrl(sp) {
  const urlYear = parseInt(sp.year || '0')
  const hourParam = sp.hour
  return {
    gender: sp.gender || '남',
    calType: sp.calType || '양력',
    year: urlYear,
    month: parseInt(sp.month || '0'),
    day: parseInt(sp.day || '0'),
    leapMonth: sp.leapMonth || '0',
    hourIdx: hourParam === '모름' || hourParam == null ? null : parseInt(hourParam),
  }
}

// [newhanja] profiles에서 info를 만든 뒤 myinfo(m) 형태로 재구성하는 방식
function newhanjaMakeMFromProfile(p) {
  const bh = p.birth_hour
  const hourIdx = bh === '모름' || bh == null || bh === '' ? null : parseInt(bh)
  return {
    gender: p.gender ?? '남',
    calType: p.cal_type ?? '양력',
    year: String(Number(p.birth_year)),
    month: String(Number(p.birth_month)),
    day: String(Number(p.birth_day)),
    leapMonth: '0',
    hour: hourIdx == null ? '모름' : String(hourIdx),
  }
}

// ============================================================================
// 사례 정의: 한 사람을 여러 입력 경로로 표현
// ============================================================================
const cases = [
  {
    label: '① 양력 1990-05-15 남 · 午시(11~13)',
    profile: { birth_year:1990, birth_month:5, birth_day:15, birth_hour:'6', cal_type:'양력', gender:'남', saju_saved:true },
    home:    { birthDate:'1990-05-15', birthHourLabel:'午시(11~13)', gender:'남', calType:'양력' },
    url:     { year:'1990', month:'5', day:'15', hour:'6', calType:'양력', gender:'남' },
  },
  {
    label: '② 양력 1990-05-15 남 · 시간 모름',
    profile: { birth_year:1990, birth_month:5, birth_day:15, birth_hour:'모름', cal_type:'양력', gender:'남', saju_saved:true },
    home:    { birthDate:'1990-05-15', birthHourLabel:'모름', gender:'남', calType:'양력' },
    url:     { year:'1990', month:'5', day:'15', hour:'모름', calType:'양력', gender:'남' },
  },
  {
    label: '③ 음력 1966-01-12 남 · 卯시(05~07) [인계서 검증 사례]',
    profile: { birth_year:1966, birth_month:1, birth_day:12, birth_hour:'3', cal_type:'음력', gender:'남', saju_saved:true },
    home:    { birthDate:'1966-01-12', birthHourLabel:'卯시(05~07)', gender:'남', calType:'음력' },
    url:     { year:'1966', month:'1', day:'12', hour:'3', calType:'음력', gender:'남' },
  },
  {
    label: '④ 양력 2000-01-01 여 · 子시(23~01)=index 0 [경계값]',
    profile: { birth_year:2000, birth_month:1, birth_day:1, birth_hour:'0', cal_type:'양력', gender:'여', saju_saved:true },
    home:    { birthDate:'2000-01-01', birthHourLabel:'子시(23~01)', gender:'여', calType:'양력' },
    url:     { year:'2000', month:'1', day:'1', hour:'0', calType:'양력', gender:'여' },
  },
  {
    label: '⑤ 음력 1988-11-30 여 · 시간 모름',
    profile: { birth_year:1988, birth_month:11, birth_day:30, birth_hour:'모름', cal_type:'음력', gender:'여', saju_saved:true },
    home:    { birthDate:'1988-11-30', birthHourLabel:'모름', gender:'여', calType:'음력' },
    url:     { year:'1988', month:'11', day:'30', hour:'모름', calType:'음력', gender:'여' },
  },
]

// ============================================================================
// 검증 실행
// ============================================================================
console.log('='.repeat(78))
console.log('명연재 personKey 정합성 검증 — 현재 배포 코드 기준')
console.log('='.repeat(78))

let failCount = 0

for (const c of cases) {
  console.log('\n' + '─'.repeat(78))
  console.log(c.label)
  console.log('─'.repeat(78))

  // diagnosis가 저장하는 "기준 personKey" (성씨를 my_names/localStorage에 넣을 때 쓰는 값)
  // 경로 A: URL로 들어온 경우
  const infoUrl = diagnosisMakeInfoFromUrl(c.url)
  const keyDiagUrl = personKey_diagnosis(infoUrl)
  // 경로 B: 로그인 후 profiles로 들어온 경우
  const infoProf = diagnosisMakeInfoFromProfile(c.profile)
  const keyDiagProf = personKey_diagnosis(infoProf)

  // newname/newhanja가 성씨를 "찾을 때" 만드는 personKey
  // 경로 1: 홈이 저장한 myinfo (본인 개명, 비로그인/폴백)
  const myinfoHome = homeMakeMyInfo(c.home)
  const keyNewnameHome = personKey_newname(myinfoHome)
  // 경로 2: newhanja가 profiles로 만든 m
  const mProf = newhanjaMakeMFromProfile(c.profile)
  const keyNewhanjaProf = personKey_newhanja(mProf)

  console.log('  diagnosis(URL)   저장키 :', keyDiagUrl)
  console.log('  diagnosis(DB)    저장키 :', keyDiagProf)
  console.log('  newname(홈myinfo) 조회키:', keyNewnameHome)
  console.log('  newhanja(DB)     조회키 :', keyNewhanjaProf)

  // 핵심 검증: 성씨를 저장한 키(diagnosis)와 조회하는 키(newname)가 같아야 함
  const checks = [
    ['diagnosis(DB)  == newhanja(DB)', keyDiagProf === keyNewhanjaProf],
    ['diagnosis(URL) == newname(홈myinfo) [비로그인 개명 경로]', keyDiagUrl === keyNewnameHome],
  ]
  for (const [name, ok] of checks) {
    console.log(`    ${ok ? '✅ 일치' : '❌ 불일치'} : ${name}`)
    if (!ok) failCount++
  }
}

console.log('\n' + '='.repeat(78))
console.log(failCount === 0 ? '모든 사례 일치' : `❌ 불일치 ${failCount}건 발견 — 아래 요약 참조`)
console.log('='.repeat(78))
