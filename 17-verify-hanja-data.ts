// 17-verify-hanja-data.ts
//
// 한자 DB 점검 — 획수와 자원오행이 교재·부수와 맞는가
//
// ★2026-07-31 신설.
//   명림상현(明臨尙昡) 실기기 확인에서 明 한 글자가 두 칸 다 틀린 것이 드러났습니다.
//
//     明   획수      DB 9   ↔  日4 + 月4 = 8   (교재 139~150쪽 «8획 성» 목록에 실려 있음)
//        자원오행   DB 목  ↔  부수 日 = 화
//
//   한 줄에서 두 칸이 함께 틀렸다는 것은 «그 줄 자체가 잘못 채워졌을» 수 있다는 뜻입니다.
//   明 하나뿐인지, 더 있는지 이 스크립트로 봅니다.
//
// 쓰는 법
//   npx tsx 17-verify-hanja-data.ts
//
// ⚠️ 고치지 않습니다. 어긋난 자리를 «내보이기만» 합니다.
//    고칠 SQL 은 사람이 눈으로 확인한 뒤 만드십시오.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !KEY) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.')
  process.exit(1)
}
const sb = createClient(URL, KEY)

// ══════════════════════════════════════════════════════════════════
//  ① 교재 134쪽 「한자 부수별 원획법과 필획법 구분」
//     — 부수가 이것이면 원획은 필획보다 이만큼 큽니다
// ══════════════════════════════════════════════════════════════════
interface RadicalRule {
  /** 쓰이는 모양 */ short: string
  /** 원 부수 */ full: string
  /** 필획 */ actual: number
  /** 원획 */ kangxi: number
  /** 부수의 자원오행 */ ohaeng: string
}
const RADICALS: RadicalRule[] = [
  { short: '忄', full: '心', actual: 3, kangxi: 4, ohaeng: '화' },
  { short: '氵', full: '水', actual: 3, kangxi: 4, ohaeng: '수' },
  { short: '扌', full: '手', actual: 3, kangxi: 4, ohaeng: '목' },
  { short: '犭', full: '犬', actual: 3, kangxi: 4, ohaeng: '토' },
  { short: '王', full: '玉', actual: 4, kangxi: 5, ohaeng: '금' },
  { short: '礻', full: '示', actual: 4, kangxi: 5, ohaeng: '목' },
  { short: '耂', full: '老', actual: 4, kangxi: 6, ohaeng: '토' },
  { short: '衤', full: '衣', actual: 5, kangxi: 6, ohaeng: '목' },
  { short: '艹', full: '艸', actual: 4, kangxi: 6, ohaeng: '목' },
  { short: '罒', full: '网', actual: 5, kangxi: 6, ohaeng: '목' },
  { short: '辶', full: '辵', actual: 4, kangxi: 7, ohaeng: '토' },
  { short: '⻏', full: '邑', actual: 3, kangxi: 7, ohaeng: '토' },
  { short: '⻖', full: '阜', actual: 3, kangxi: 8, ohaeng: '토' },
]
const RAD_DELTA = new Map(RADICALS.map(r => [r.full, r.kangxi - r.actual]))

// ══════════════════════════════════════════════════════════════════
//  ② 교재 139~150쪽 「성씨(姓氏) 획수별 좋은 수리 배열」 의 성씨 목록
//     — 각 절의 제목이 그 글자들의 «원획» 입니다. 교재가 직접 준 정답표입니다.
//
//  ⚠️ 제가 스캔에서 옮긴 것입니다. 흐린 자리는 아예 뺐습니다 (교훈 EJ).
//     그래도 오독이 섞였을 수 있으니, 어긋남이 나오면 «DB 가 틀렸다» 고 단정하지 마시고
//     교재 원본의 해당 쪽을 함께 펴 보십시오.
// ══════════════════════════════════════════════════════════════════
const BOOK_SURNAME_STROKES: Record<number, string> = {
  2:  '乃卜丁又入乂',
  3:  '干弓大凡山也于千',
  4:  '介孔公仇今文毛木方卞夫王元牛尹允午仁才天太巴片',
  5:  '甘功丘白氷史石申召玉田占左台平包皮弘玄',
  6:  '光曲圭吉老牟米百朴先西安伊印任在全朱',
  7:  '江君杜甫成宋辛呂李吳良余汝延位池廷佐初車判何孝',
  8:  '空季庚京具金奇奈孟明門房奉舍尙昔松昇承沈岳夜林長宗周知昌采卓和',
  9:  '竿姜紀祈南柰段柳律思削相宣星施信彦泳要姚禹韋兪点貞俊肖秋炭泰扁表河後咸香俠',
  10: '高骨宮俱桂起唐馬芳徐席孫乘柴袁殷曺晉眞晋倉夏洪花桓候',
  11: '康堅乾國麻梅班邦彬常卨梁魚御尉異張將章曹珠崔票畢海邢許胡扈',
  12: '强景邱童閔森象善邵淳舜荀順勝雁雲庾壹程曾智彭馮弼賀黃',
  13: '賈敬琴路頓廉睦新阿楊雍郁慈莊楚椿湯',
  14: '菊箕端裵鳳愼嘗碩實連榮溫趙齊菜華',
  15: '價葛慶郭廣歐魯樓德董滿萬墨部葉劉增標漢',
  16: '霍橋盧潭都陶道潘龍陸燕豫錢諸陣',
  17: '鞠獨謝遜鮮襄陽蓮蔿蔣鍾蔡燭鄒澤韓鄕',
  18: '簡瞿歸顔魏戴鎬',
  19: '關譚龐薛薀鄭遷',
  20: '羅釋嚴鐘',
  21: '顧藤隨鶴',
  22: '鑑權邊蘇襲蘊隱',
  24: '靈',
  31: '',
}

interface Row {
  hangul: string; hanja: string
  strokes: number
  strokes_kangxi?: number | null
  strokes_actual?: number | null
  radical?: string | null
  radical_ohaeng?: string | null
  resource_ohaeng?: string
  resource_ohaeng_primary?: string | null
  is_active?: boolean | null
}

const norm = (o: string | null | undefined): string => {
  if (!o) return ''
  const m: Record<string, string> = { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' }
  return m[o] ?? o
}
const kangxiOf = (r: Row): number => {
  const k = r.strokes_kangxi
  if (typeof k === 'number' && k > 0) return k
  return Number(r.strokes) || 0
}

/**
 * ★대조표 자기점검 — DB 를 보기 «전» 에 제 표부터 봅니다.
 *   한 글자가 두 획수 절에 들어가 있으면 제가 스캔을 잘못 옮긴 것입니다.
 *   (실제로 만들 때 柴·嘗·鑑·霍 네 자가 이렇게 걸렸습니다.)
 */
function selfCheck(): boolean {
  const seen = new Map<string, number>()
  const dup: string[] = []
  for (const [stroke, chars] of Object.entries(BOOK_SURNAME_STROKES)) {
    for (const ch of chars) {
      const prev = seen.get(ch)
      if (prev !== undefined) dup.push(`${ch}: ${prev}획 · ${stroke}획`)
      seen.set(ch, Number(stroke))
    }
  }
  if (dup.length) {
    console.log('🔴 대조표가 스스로 어긋납니다 — 전사 오류입니다. DB 를 보기 전에 고치십시오.')
    dup.forEach(d => console.log('   ' + d))
    return false
  }
  console.log(`대조표 ${seen.size}자 — 겹침 없음 ✅`)
  return true
}

async function main() {
  console.log('한자 DB 점검 — 획수·자원오행\n' + '═'.repeat(60))
  if (!selfCheck()) process.exit(1)

  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('hanja').select('*').range(from, from + 999)
    if (error) { console.error('읽기 실패:', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }
  console.log(`한자 ${rows.length.toLocaleString()}자를 읽었습니다.\n`)

  const byHanja = new Map<string, Row[]>()
  for (const r of rows) {
    const a = byHanja.get(r.hanja)
    if (a) a.push(r); else byHanja.set(r.hanja, [r])
  }

  // ── 검사 ① 교재 성씨 목록과 원획이 맞는가 ────────────────────────
  console.log('① 교재 139~150쪽 성씨 원획 대조')
  let checked = 0, missing = 0
  const bad1: string[] = []
  for (const [stroke, chars] of Object.entries(BOOK_SURNAME_STROKES)) {
    for (const ch of chars) {
      const found = byHanja.get(ch)
      if (!found) { missing++; continue }
      checked++
      for (const r of found) {
        const k = kangxiOf(r)
        if (k !== Number(stroke)) {
          bad1.push(`   ${ch}(${r.hangul})  DB ${k}획  ↔  교재 ${stroke}획`)
          break
        }
      }
    }
  }
  console.log(`   대조 ${checked}자 · DB 에 없음 ${missing}자`)
  if (bad1.length === 0) console.log('   ✅ 어긋남 없음\n')
  else { console.log(`   🔴 어긋남 ${bad1.length}자`); bad1.forEach(x => console.log(x)); console.log('') }

  // ── 검사 ② 부수 원획 보정이 되어 있는가 (교재 134쪽) ─────────────
  console.log('② 부수 원획 보정 (교재 134쪽 13종)')
  const bad2: string[] = []
  for (const r of rows) {
    const delta = r.radical ? RAD_DELTA.get(r.radical) : undefined
    if (delta === undefined) continue
    const a = r.strokes_actual
    if (typeof a !== 'number' || a <= 0) continue
    const k = kangxiOf(r)
    if (k !== a + delta) {
      bad2.push(`   ${r.hanja}(${r.hangul})  부수 ${r.radical}  필획 ${a} + ${delta} = ${a + delta}  ↔  DB 원획 ${k}`)
    }
  }
  if (bad2.length === 0) console.log('   ✅ 어긋남 없음 (또는 대상 글자 없음)\n')
  else { console.log(`   🔴 어긋남 ${bad2.length}자`); bad2.slice(0, 40).forEach(x => console.log(x))
         if (bad2.length > 40) console.log(`   … 그 밖 ${bad2.length - 40}자`); console.log('') }

  // ── 검사 ③ 부수 오행과 자원오행이 서로 어긋나는가 ────────────────
  console.log('③ 부수 오행 ↔ 자원오행 (부수가 있는 글자만)')
  const RAD_OHAENG = new Map(RADICALS.map(r => [r.full, r.ohaeng]))
  const bad3: string[] = []
  for (const r of rows) {
    const ro = r.radical ? RAD_OHAENG.get(r.radical) : undefined
    if (!ro) continue
    const cur = norm(r.resource_ohaeng_primary ?? r.resource_ohaeng)
    if (cur && cur !== ro) {
      bad3.push(`   ${r.hanja}(${r.hangul})  부수 ${r.radical} = ${ro}  ↔  자원오행 ${cur}`)
    }
  }
  if (bad3.length === 0) console.log('   ✅ 어긋남 없음\n')
  else {
    console.log(`   ⚠️ 어긋남 ${bad3.length}자 — 유파 차이일 수 있으니 «틀렸다» 고 단정하지 마십시오`)
    bad3.slice(0, 30).forEach(x => console.log(x))
    if (bad3.length > 30) console.log(`   … 그 밖 ${bad3.length - 30}자`)
    console.log('')
  }

  // ── 검사 ④ 값이 비었거나 이상한 자리 ────────────────────────────
  console.log('④ 값이 비었거나 이상한 자리')
  const noK = rows.filter(r => r.strokes_kangxi === null || r.strokes_kangxi === undefined)
  const zeroK = rows.filter(r => typeof r.strokes_kangxi === 'number' && r.strokes_kangxi <= 0)
  const noO = rows.filter(r => !norm(r.resource_ohaeng_primary ?? r.resource_ohaeng))
  const noRad = rows.filter(r => !r.radical)
  console.log(`   strokes_kangxi 없음  ${noK.length.toLocaleString()}자   ← strokes 로 돌아갑니다`)
  console.log(`   strokes_kangxi ≤ 0   ${zeroK.length.toLocaleString()}자   🔴 사격이 깨집니다`)
  console.log(`   자원오행 없음        ${noO.length.toLocaleString()}자`)
  console.log(`   부수 없음            ${noRad.length.toLocaleString()}자   ← ②③ 을 못 겁니다`)
  if (zeroK.length) console.log('   ' + zeroK.slice(0, 20).map(r => r.hanja).join(' '))

  // ── ★明 한 글자 ────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60))
  console.log('★明 — 이번에 드러난 글자')
  const myeong = byHanja.get('明') ?? []
  if (myeong.length === 0) console.log('   DB 에 없습니다.')
  for (const r of myeong) {
    console.log(`   획수 원획 ${kangxiOf(r)} (필획 ${r.strokes_actual ?? '—'}) · 부수 ${r.radical ?? '—'}`
      + ` · 자원오행 ${norm(r.resource_ohaeng_primary ?? r.resource_ohaeng) || '—'}`)
    console.log(`   교재·부수 기준 →  원획 8 (日4 + 月4) · 부수 日 · 자원오행 화`)
  }
  console.log('═'.repeat(60))
}

main().catch(e => { console.error(e); process.exit(1) })
