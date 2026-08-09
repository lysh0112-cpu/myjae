// 37-export-hanja-sheet.ts
//
// 성명용 한자 «자료 내보내기» — 한자 / 뜻 / 부수 / 획수 / 자원오행
//
// ★2026-08-09 신설. 대표님 지시 —
//   「이름 분석하기에 들어가는 성명용 한자어를 점검하고 싶다.
//     한자/뜻/부수/획수/자원오행 순으로 자료를 만들어 달라」
//
// ══════════════════════════════════════════════════════════════════
//  ⚠️⚠️ 먼저 아셔야 할 것 — 한자 자료는 «저장소에 없습니다».
//     Supabase `hanja` 표에 있습니다 (덕암 자료 5,111행 기준).
//     그래서 이 스크립트가 «표에 물어보고» 파일로 떨굽니다.
//
//  ⚠️ 값을 «고치지 않습니다». 있는 그대로 내보내고, 어긋난 자리를 세기만 합니다.
//     고칠 SQL 은 사람이 눈으로 보고 만드십시오. (17-verify-hanja-data.ts 와 같은 결)
//
//  ⚠️⚠️ 획수·자원오행·인명용 판정을 ★여기서 다시 짜지 않았습니다.
//     lib/saju/hanjaRow.ts 의 읽기 함수를 «그대로» 부릅니다.
//     ⇒ 화면이 쓰는 값과 이 파일의 값이 «언제나 같습니다».
//     ⛔ 여기에 rowStrokes 같은 것을 다시 적지 마십시오. 두 벌이 되면 갈립니다.
// ══════════════════════════════════════════════════════════════════
//
// 쓰는 법
//   npx tsx 37-export-hanja-sheet.ts
//
// 나오는 것 (저장소 뿌리)
//   성명용한자_전체.csv       — 표에 있는 것 전부
//   성명용한자_쓸수있는것.csv  — 인명용(不用 제외) · 활성만
//   성명용한자_점검요약.txt    — 빈 칸·어긋남을 «세어» 적은 글
//
// ⚠️ CSV 는 UTF-8 BOM 으로 씁니다 — 그래야 엑셀에서 한자가 안 깨집니다.

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import {
  HANJA_SELECT,
  rowOhaeng,
  rowOhaengSecondary,
  rowStrokes,
  rowNameUse,
  rowActive,
  rowHanja,
  type HanjaRow,
} from './lib/saju/hanjaRow'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !KEY) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.')
  console.error('  .env.local 에 있으면  npx tsx --env-file=.env.local 37-export-hanja-sheet.ts')
  process.exit(1)
}
const sb = createClient(URL, KEY)

// ══════════════════════════════════════════════════════════════════
//  ① 표를 통째로 읽습니다 — 1,000행씩
//     ⚠️ Supabase 는 한 번에 1,000행까지만 줍니다. range 로 이어 받습니다.
// ══════════════════════════════════════════════════════════════════
async function readAll(): Promise<HanjaRow[]> {
  const out: HanjaRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('hanja')
      .select(HANJA_SELECT)          // ★'*' — 컬럼 이름을 나열하지 않습니다 (hanjaRow.ts 주석)
      .order('hangul', { ascending: true })
      .range(from, from + 999)
    if (error) { console.error('읽기 실패:', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    out.push(...(data as unknown as HanjaRow[]))
    process.stdout.write(`\r  읽는 중… ${out.length}행`)
    if (data.length < 1000) break
  }
  process.stdout.write('\n')
  return out
}

// ══════════════════════════════════════════════════════════════════
//  ② CSV 한 칸 — 쉼표·따옴표·줄바꿈이 섞여도 안 깨지게
// ══════════════════════════════════════════════════════════════════
function cell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function toCsv(head: string[], rows: unknown[][]): string {
  return '\uFEFF' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

// ══════════════════════════════════════════════════════════════════
//  ③ 한 줄을 «대표님이 말씀하신 차례» 로 폅니다
//
//     한자 · 뜻 · 부수 · 획수 · 자원오행   ← ★앞 다섯이 이 차례입니다
//     그 뒤는 «점검에 필요해서» 곁들인 것입니다. 지우셔도 됩니다.
// ══════════════════════════════════════════════════════════════════
const HEAD = [
  '한자', '뜻', '부수', '획수', '자원오행',
  // ── 아래는 곁들인 것 ──
  '한글음', '원획(강희)', '실획', '부자원오행', '부수오행',
  '자의품격', '인명용', '활성', '원본자원오행표기',
]

function line(row: HanjaRow): unknown[] {
  return [
    rowHanja(row),                       // 한자    ★이체자 정리를 거친 값
    row.meaning ?? '',                   // 뜻
    row.radical ?? '',                   // 부수    ⚠️ 지금 «비어 있을» 수 있습니다 (아래 점검 참조)
    rowStrokes(row),                     // 획수    ★원획이 있으면 원획, 없으면 strokes
    rowOhaeng(row) ?? '',                // 자원오행 ★한글 표준 표기(목화토금수)
    row.hangul ?? '',
    row.strokes_kangxi ?? '',
    row.strokes_actual ?? '',
    rowOhaengSecondary(row) ?? '',
    row.radical_ohaeng ?? '',
    row.grade ?? '',
    rowNameUse(row) ? 'O' : 'X',
    rowActive(row) ? 'O' : 'X',
    row.resource_ohaeng ?? '',           // ★원본 표기(木火土金水) — 대조용. 지우지 마십시오
  ]
}

// ══════════════════════════════════════════════════════════════════
//  ④ 점검 — «세기만» 합니다. 고치지 않습니다.
// ══════════════════════════════════════════════════════════════════
function inspect(rows: HanjaRow[]): string {
  const L: string[] = []
  const say = (s: string) => L.push(s)

  say('═══ 성명용 한자 점검 요약 ═══')
  say(`잰 때   ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`)
  say(`전체    ${rows.length}행`)
  say('')

  // ─ 다섯 칸이 각각 얼마나 차 있나 ─
  const empty = (f: (r: HanjaRow) => unknown) => rows.filter(r => {
    const v = f(r); return v === null || v === undefined || v === '' 
  }).length
  say('── 다섯 칸이 «차 있는가» ──')
  say(`  한자     빈 칸 ${empty(r => rowHanja(r))}`)
  say(`  뜻       빈 칸 ${empty(r => r.meaning)}`)
  say(`  부수     빈 칸 ${empty(r => r.radical)}   ← ★여기가 크면 덕암 엑셀에서 옮겨야 합니다`)
  say(`  획수     빈 칸 ${rows.filter(r => !rowStrokes(r)).length}`)
  say(`  자원오행 빈 칸 ${empty(r => rowOhaeng(r))}`)
  say('')

  // ─ 획수 두 칸이 갈리는가 ─
  const strokeGap = rows.filter(r =>
    r.strokes_kangxi != null && r.strokes != null && r.strokes_kangxi !== r.strokes)
  say('── 획수 ──')
  say(`  strokes_kangxi 없음        ${rows.filter(r => r.strokes_kangxi == null).length}`)
  say(`  strokes 와 원획이 «다름»   ${strokeGap.length}`)
  if (strokeGap.length) {
    say('   ' + strokeGap.slice(0, 20)
      .map(r => `${rowHanja(r)}(${r.strokes}→${r.strokes_kangxi})`).join(' '))
    if (strokeGap.length > 20) say(`   … 그 밖 ${strokeGap.length - 20}자`)
  }
  say('')

  // ─ 자원오행 원본 ↔ 표준이 맞물리는가 ─
  const MAP: Record<string, string> = { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' }
  const ohGap = rows.filter(r => {
    const src = MAP[(r.resource_ohaeng ?? '').trim()]
    const std = rowOhaeng(r)
    return src && std && src !== std
  })
  const dist: Record<string, number> = {}
  rows.forEach(r => { const k = rowOhaeng(r) ?? '(없음)'; dist[k] = (dist[k] ?? 0) + 1 })
  say('── 자원오행 ──')
  say('  분포   ' + Object.entries(dist).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`).join(' · '))
  say(`  원본(木火土金水) 과 표준(목화토금수) 이 «다름»   ${ohGap.length}`)
  if (ohGap.length) {
    say('   ' + ohGap.slice(0, 20)
      .map(r => `${rowHanja(r)}(${r.resource_ohaeng}→${rowOhaeng(r)})`).join(' '))
  }
  say('')

  // ─ 🔴 不用 인데 쓸 수 있게 되어 있는가 (2단계 SQL STEP 5 의 그 자리) ─
  const bad = rows.filter(r => (r.grade ?? '').trim() === '不用' && rowNameUse(r))
  say('── 🔴 인명용 ──')
  const g: Record<string, number> = {}
  rows.forEach(r => { const k = (r.grade ?? '(없음)').trim(); g[k] = (g[k] ?? 0) + 1 })
  say('  자의품격 분포   ' + Object.entries(g).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`).join(' · '))
  say(`  «不用» 인데 인명용으로 열려 있음   ${bad.length}`)
  if (bad.length) {
    say('   ⚠️⚠️ 이것이 0 이 아니면 손님에게 «못 쓰는 글자» 를 추천하고 있습니다.')
    say('   ' + bad.slice(0, 30).map(r => rowHanja(r)).join(' '))
  }
  say('')

  // ─ 같은 한자가 두 줄인가 ─
  const seen = new Map<string, number>()
  rows.forEach(r => { const h = rowHanja(r); seen.set(h, (seen.get(h) ?? 0) + 1) })
  const dup = [...seen.entries()].filter(([, n]) => n > 1)
  say('── 겹침 ──')
  say(`  같은 한자가 두 줄 이상   ${dup.length}가지`)
  if (dup.length) say('   ' + dup.slice(0, 30).map(([h, n]) => `${h}×${n}`).join(' '))
  say('')

  say('⚠️ 이 글은 «세기만» 한 것입니다. 어느 쪽이 맞는지는 덕암 원본과 교재를 펴 보셔야 합니다.')
  say('⚠️ 획수·자원오행이 «한 줄에서 함께» 틀린 자리는 17-verify-hanja-data.ts 가 더 깊이 봅니다.')
  return L.join('\n')
}

// ══════════════════════════════════════════════════════════════════
//  ⑤ 내보내기
// ══════════════════════════════════════════════════════════════════
async function main() {
  const rows = await readAll()
  if (rows.length === 0) { console.error('표가 비어 있습니다.'); process.exit(1) }

  const all = rows.map(line)
  writeFileSync('성명용한자_전체.csv', toCsv(HEAD, all))

  const usable = rows.filter(r => rowNameUse(r) && rowActive(r)).map(line)
  writeFileSync('성명용한자_쓸수있는것.csv', toCsv(HEAD, usable))

  const report = inspect(rows)
  writeFileSync('성명용한자_점검요약.txt', report + '\n')

  console.log('')
  console.log(report)
  console.log('')
  console.log(`✅ 성명용한자_전체.csv          ${all.length}행`)
  console.log(`✅ 성명용한자_쓸수있는것.csv     ${usable.length}행`)
  console.log('✅ 성명용한자_점검요약.txt')
}

main()
