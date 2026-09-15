/**
 *  검사 56 — 일진내정법  (2026-09-15 · 9부 신설)
 *
 *  [지키는 것]
 *   ① 셈이 ★교재 예시와 맞는가 (교재 3쪽 · 9쪽 · 10쪽)
 *   ② ⛔ ★연재쌤만 볼 수 있는가 — «창구» 가 막혀 있는가
 *   ③ ⛔ ★교재에 «없는» 풀이를 지어내지 않았는가
 *   ④ ⛔ ★태어난 시를 모를 때 시지를 «지어내지» 않는가
 *   ⑤ ⚠️ ★손님 화면이 아님 — 순화표를 붙이지 않았는가
 */

import { readFileSync } from 'fs'
import {
  sinGungOf, sinGungTable, judgeWonguk, sinGungByMonth,
  SINGUNG, JIJI, isGoodSin, GOOD_SIN, BAD_SIN,
} from './lib/saju/naejeong/sinGung'
import { SINGUNG_TEXT, hasJariText } from './lib/saju/naejeong/tables/sinGungText'
import { TTI_TEXT, WOL_TEXT } from './lib/saju/naejeong/tables/dayYearText'
import {
  UNSI_SIPSUNG, GWAEGANG_PILLARS, BAEKHO_PILLARS, samhapOf,
} from './lib/saju/naejeong/tables/unsiText'
import { TTI_HOME, WOL_HOME } from './lib/saju/naejeong/tables/homeText'
import { solarToLunarKR } from './lib/saju/koreanLunarTable'
import { PURPOSES, SINSAL_DIR, findPurpose } from './lib/saju/naejeong/tables/purposes'
import { lookup, LOOKUP_ALL, LOOKUP_CASE } from './lib/saju/naejeong/tables/lookup'
import { CASE_TEXT, caseTextOf } from './lib/saju/naejeong/tables/caseText'
import { getSinsal } from './lib/saju/sinsal'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log(`  ✅ ${m}`) } else { fail++; console.log(`  ❌ ${m}`) } }
const head = (t: string) => console.log(`\n━━ ${t} ━━`)
const R = (p: string) => { try { return readFileSync(p, 'utf8') } catch { return '' } }

function main() {
  /* ══ ① 🔴 교재 예시와 맞는가 ═══════════════════════════════════ */
  head('① 🔴 셈 — 교재 예시와 맞는가')
  {
    //  교재 3쪽 — 壬寅 일에 방문
    const want3 = '寅강일진 卯천록 辰상문 巳목적 午비부 未공망 申약일충 酉원진 戌해결 亥퇴식 子금조건 丑백병주'
    const got3 = sinGungTable('寅').map(x => `${x.ji}${x.sin}`).join(' ')
    ok(got3 === want3, `★교재 3쪽 壬寅일 열두 자리 ${got3 === want3 ? '' : got3}`)

    //  교재 3쪽 둘째 — 사주 지지가 丑寅巳子
    const h = judgeWonguk('寅', { yeon: '丑', wol: '寅', il: '巳', si: '子' })
    ok(h[0].sin === '백병주' && h[1].sin === '강일진' && h[2].sin === '목적' && h[3].sin === '금조건',
      '★교재 3쪽 둘째 예시 (丑 백병주 · 寅 강일진 · 巳 목적 · 子 금조건)')

    //  교재 9쪽 — 戊申 일 · 연주 乙未 인 손님 ⇒ 未는 백병주
    ok(sinGungOf('申', '未') === '백병주', '★교재 9쪽 (戊申일 · 未 → 백병주)')

    //  교재 10쪽 — 丙寅 일 신년 운세
    const m = sinGungByMonth('寅')
    ok(m[0].sin === '강일진' && m[1].sin === '천록' && m[2].sin === '상문'
      && m[5].sin === '공망' && m[8].sin === '해결' && m[11].sin === '백병주',
      '★교재 10쪽 신년 열두 달 (1월 강일진 … 12월 백병주)')

    //  ⛔ 못 읽는 글자는 지어내지 않습니다
    ok(sinGungOf('X', '子') === null && sinGungOf('子', 'X') === null,
      '⛔ ★모르는 글자는 «지어내지» 않고 null 입니다')
    ok(sinGungTable('X').length === 0, '⛔ ★모르는 일진이면 표가 «비어» 있습니다')
  }

  /* ══ ② 🔴 12신궁 차례와 좋고 나쁨 ═══════════════════════════════ */
  head('② 🔴 12신궁 — 차례와 좋고 나쁨 (교재 2~3쪽 · 7쪽)')
  {
    ok(SINGUNG.length === 12 && JIJI.length === 12, '★열둘씩입니다')
    ok(SINGUNG[0] === '강일진' && SINGUNG[11] === '백병주',
      '⛔ ★순행 차례가 강일진에서 시작해 백병주로 끝납니다')
    ok(GOOD_SIN.length + BAD_SIN.length === 12,
      '★좋은 신궁 다섯 · 나쁜 신궁 일곱 = 열둘 (교재 7쪽)')
    ok(isGoodSin('해결') && isGoodSin('천록') && isGoodSin('금조건') && !isGoodSin('상문') && !isGoodSin('공망'),
      '★교재 7쪽의 좋고 나쁨 그대로')
    //  ⚠️ 한 지지가 두 이름을 갖지 않습니다
    const set = new Set(sinGungTable('子').map(x => x.ji))
    ok(set.size === 12, '⛔ ★열두 지지가 «겹치지» 않습니다')
  }

  /* ══ ③ 🔴 교재에 «없는» 것을 지어내지 않았는가 ═══════════════════
   *  교재 4~7쪽 — 공망 · 원진 · 해결 · 퇴식 은 ★«자리별» 풀이가 없습니다.
   *  ⛔ 채워 넣고 싶은 마음이 들어도 ★지어내지 마십시오. 연재쌤이 채우실 자리입니다.
   * ══════════════════════════════════════════════════════════════ */
  head('③ 🔴 교재에 «없는» 자리별 풀이를 «지어내지» 않았는가')
  {
    const none = SINGUNG.filter(s => !hasJariText(s))
    ok(none.length === 4 && ['공망', '원진', '해결', '퇴식'].every(s => none.includes(s as never)),
      `⛔ ★자리별 풀이가 없는 넷을 «null» 로 두었습니다 — ${none.join(' · ')}`)
    const some = SINGUNG.filter(s => hasJariText(s))
    ok(some.length === 8, `★나머지 여덟은 교재에 네 자리가 다 있습니다 (${some.length})`)
    //  ⛔ 있는 것은 네 자리가 «다» 있어야 합니다 — 셋만 있으면 반쪽입니다
    const half = some.filter(s => {
      const j = SINGUNG_TEXT[s].jari!
      return !(j.연지 && j.월지 && j.일지 && j.시지)
    })
    ok(half.length === 0, `⛔ ★네 자리가 «다» 채워져 있습니다 ${half.join(' ')}`)
    //  ★열둘 모두 뜻은 있어야 합니다
    ok(SINGUNG.every(s => SINGUNG_TEXT[s].tteut.length > 10), '★열둘 모두 «뜻» 이 있습니다')
    //  ⚠️ 화면이 «없다» 는 것을 사실대로 말하는가
    ok(/교재에 이 신궁의 «자리별» 풀이는 없습니다/.test(R('app/naejeong/page.tsx')),
      '🔴 ⛔ ★화면이 «없으면 없다» 고 말합니다 (빈칸을 숨기지 않습니다)')
  }

  /* ══ ④ ⛔ 태어난 시를 모를 때 ═══════════════════════════════════ */
  head('④ ⛔ 태어난 시를 «모를 때» — 시지를 지어내지 않는가')
  {
    const h = judgeWonguk('寅', { yeon: '丑', wol: '寅', il: '巳', si: null })
    ok(h.length === 4 && h[3].jari === '시지' && h[3].ji === null && h[3].sin === null,
      '⛔ ★시지를 «비워» 둡니다 (지어내면 사업·자식 자리가 어긋납니다)')
    ok(/시를 몰라 시지를 보지 않았어요/.test(R('app/naejeong/page.tsx')),
      '★화면이 그 까닭을 말해 줍니다')
    ok(/모름 \(시지를 안 봅니다\)/.test(R('app/naejeong/page.tsx')),
      '★고르는 곳에도 «모름» 이 있습니다')
  }

  /* ══ ⑤ 🔴🔴 연재쌤만 볼 수 있는가 ═══════════════════════════════
   *  ⛔ 화면만 숨기는 것은 «막는 것이 아닙니다» — 주소를 치면 열립니다.
   *     ★창구(API)가 막혀 있어야 «진짜» 막힌 것입니다.
   * ══════════════════════════════════════════════════════════════ */
  head('⑤ 🔴🔴 연재쌤 전용 — «창구» 가 막혀 있는가')
  {
    const api = R('app/api/naejeong/route.ts')
    const page = R('app/naejeong/page.tsx')

    /*  🔴 ⛔ ★«주석» 을 세면 안 됩니다 —
     *     9부에 문지기를 «주석 처리» 해 보았더니 ★그물이 통과했습니다.
     *     ⇒ 주석 줄을 «걷어낸 뒤» 살아 있는 코드만 봅니다.
     *  ⛔ 이 거르기를 빼지 마십시오. 여기는 ★손님이 들어오는 것을 막는 자리입니다. */
    const live = api.split('\n')
      .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n')
    ok(/requireMaster\(\)/.test(live),
      '🔴 ⛔ ★셈 창구가 requireMaster 로 막혀 있습니다 (여기가 «진짜» 막는 곳입니다)')
    ok(/const g = await requireMaster\(\)[\s\S]{0,60}if \(!g\.ok\) return g\.res/.test(live),
      '🔴 ⛔ ★맨 앞에서 막고 «바로» 돌려보냅니다 (주석이 아니라 «살아 있는» 코드로)')
    const livePage = page.split('\n')
      .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
    ok(/useRoleGate\(ONLY\)/.test(livePage) && /const ONLY: AppRole\[\] = \['master'\]/.test(livePage),
      '★화면도 매니저만 들어옵니다 (두 겹)')
    ok(/gate\.state !== 'ok'/.test(livePage),
      "⛔ ★확인이 안 되면 «막는 쪽» 으로 처리합니다")

    //  ⛔ 손님 쪽에 길을 내지 않았는가
    const home = R('app/home-new/page.tsx') + R('app/home-new/components/ServiceSection.tsx')
    ok(!/naejeong/.test(home), '⛔ ★홈에 «길» 을 내지 않았습니다 (손님 화면이 아닙니다)')
    ok(/연재쌤 전용 화면이에요/.test(page),
      '★화면에도 «전용» 임을 밝혀 둡니다 (실수로 공유되는 것을 막습니다)')

    /*  🔴 ★들어가는 길 — 2026-09-15 [대표님]
     *     상담사 고르기 화면(매니저만 보는 곳)에 단추를 두었습니다.
     *  ⛔ 단추를 «숨기는 것» 은 막는 것이 아닙니다 — 위 창구 문지기가 «진짜» 입니다. */
    const pick = R('app/manseryeok/consultant/page.tsx')
    const livePick = pick.split('\n')
      .filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')
    ok(/router\.push\('\/naejeong'\)/.test(livePick),
      '🔴 ★상담사 고르기 화면에 «들어가는 단추» 가 있습니다 [대표님]')

    /*  🔴 ★마이페이지에도 «들어가는 길» — 2026-09-15 [대표님]
     *     「내 정보 화면에서 매니저인 경우만 … 들어가도록」
     *  ⚠️ 상담사 고르기 화면을 «거치지 않고» 바로 들어갑니다. */
    const my = R('app/mypage-new/page.tsx')
    const liveMy = my.split('\n')
      .filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')
    ok(/router\.push\('\/naejeong'\)/.test(liveMy),
      '🔴 ★마이페이지에 «바로 가는» 단추가 있습니다 [대표님]')
    /*  ⛔ ★«하나» 뿐이어야 합니다 — 2026-09-15
     *     제가 이미 있는 것을 «못 보고» 한 벌 더 만들어 ★둘로 보였습니다. */
    ok((liveMy.match(/router\.push\('\/naejeong'\)/g) ?? []).length === 1,
      `⛔ ★마이페이지의 들어가는 단추가 «하나» 뿐입니다 (${(liveMy.match(/router\.push\('\/naejeong'\)/g) ?? []).length}개)`)

    /*  🔴 ★되돌아가는 길 — [대표님] 「홈으로 되돌아가는 버튼」
     *  ⚠️ 이 화면은 홈 카드에 «없어서», 안 두면 브라우저 «뒤로» 밖에 길이 없습니다. */
    ok(/router\.push\('\/home-new'\)/.test(page),
      '🔴 ★홈으로 되돌아가는 단추가 있습니다 [대표님]')
    ok(/router\.push\('\/mypage-new'\)/.test(page),
      '★들어온 길(내 정보)로도 돌아갑니다')
    ok((page.match(/router\.push\('\/home-new'\)/g) ?? []).length === 2,
      '★위·아래 «둘 다» 있습니다 (글이 길어 아래까지 내려가면 위가 안 보입니다)')
    //  ⛔ 그 단추가 «매니저만» 보는 자리인가 — isMaster 안쪽이어야 합니다
    {
      const iBtn = my.indexOf("router.push('/naejeong')")
      const before = my.slice(0, iBtn)
      const iMaster = before.lastIndexOf('{isMaster')
      const iClose = before.lastIndexOf(')}')
      ok(iMaster > 0 && iMaster > iClose,
        '⛔ ★그 단추는 «매니저만» 보입니다 (상담사·손님에게는 안 보입니다)')
    }
    //  ⚠️ 셋이 «같은 모양» 인가 — 단추마다 색을 따로 적으면 어긋납니다
    ok(/const staffBtn/.test(my) && (liveMy.match(/style=\{staffBtn\}/g) ?? []).length === 3,
      '★단추 셋이 «같은 꼴»(staffBtn)을 씁니다 — 하나만 고치면 셋이 함께 바뀝니다')
    //  ⛔ 그 대목이 «매니저만» 보는 자리인지 — isMaster 안쪽이어야 합니다
    {
      const iIf = pick.indexOf('if (isMaster && !consultantId)')
      const iBtn = pick.indexOf("router.push('/naejeong')")
      ok(iIf > 0 && iBtn > iIf,
        '⛔ ★그 단추는 «매니저만» 보는 대목 안에 있습니다 (상담사에게는 안 보입니다)')
    }
  }

  /* ══ ⑥ ⚠️ 순화 — 여기는 «안» 합니다 [대표님] ═══════════════════ */
  head('⑥ ⚠️ 말 순화 — 연재쌤 전용이라 «안» 합니다 [대표님 2026-09-15]')
  {
    const api = R('app/api/naejeong/route.ts')
    ok(!/plainMap|plainWho|plainText/.test(api),
      '⛔ ★순화표를 붙이지 않았습니다 — 교재 그대로 나갑니다 [대표님]')
    //  ⚠️ 교재의 «센 말» 이 그대로 있는지 — 있어야 «맞습니다»
    ok(SINGUNG_TEXT['상문'].lead.includes('죽음'),
      '⚠️ ★상문의 「죽음 즉 종말」 이 그대로 있습니다 (연재쌤 전용이라 맞습니다)')
    const tbl = R('lib/saju/naejeong/tables/sinGungText.ts')
    ok(/손님용/.test(tbl) && /반드시 순화해야 합니다/.test(tbl),
      '🔴 ★손님용을 만들 때는 «순화해야 한다» 고 못 박아 두었습니다')
  }

  /* ══ ⑦ ⚠️ 바깥 호출 — «값으로» 적어 둡니다 ═════════════════════ */
  head('⑦ ⚠️ 바깥 창구 — 무엇을 부르는가')
  {
    const api = R('app/api/naejeong/route.ts')
    ok(!/anthropic|tongbyeon|ai_call/i.test(api), '⛔ ★AI 를 «한 번도» 안 부릅니다')
    ok(/KASI_API_KEY/.test(api),
      '⚠️ ★KASI 는 부릅니다 — 년·월 간지가 «절기» 를 봐야 하기 때문입니다')
    ok(/koreanLunarTable/.test(api),
      '★음력은 «오프라인 한국 표» 를 씁니다 (바깥 안 부름)')
    ok(/getDayGanji/.test(api), '★일진은 계산으로 냅니다 (바깥 안 부름)')
  }

  /* ══ ⑧ 🔴 띠로 보는 오늘 · 달로 보는 한 해 — 교재 9쪽 · 10~11쪽 ═══ */
  head('⑧ 🔴 띠로 보는 오늘 · 달로 보는 한 해 (교재 9쪽 · 10~11쪽)')
  {
    //  ★달 글은 열둘이 «다» 있어야 합니다 (교재 10~11쪽이 열두 달을 다 적었습니다)
    const wolNone = SINGUNG.filter(s2 => WOL_TEXT[s2] === null)
    ok(wolNone.length === 0, `★달 글이 열둘 «다» 있습니다 ${wolNone.join(' ')}`)

    //  ⛔ 띠 글은 교재에 ★«둘이 빠져» 있습니다 — 지어내지 않았습니다
    const ttiNone = SINGUNG.filter(s2 => TTI_TEXT[s2] === null)
    ok(ttiNone.length === 2 && ttiNone.includes('상문') && ttiNone.includes('공망'),
      `⛔ ★교재 9쪽에 «없는» 둘(상문·공망)을 null 로 두었습니다 — ${ttiNone.join(' · ')}`)

    //  ⚠️ 교재가 «묶어 적은» 짝은 ★같은 글이어야 합니다
    ok(TTI_TEXT['강일진'] === TTI_TEXT['천록'],
      '⚠️ ★교재 9쪽이 「강일진과 천록」 을 묶어 적어 같은 글입니다 (나눠 지어내지 않았습니다)')
    ok(TTI_TEXT['비부'] === TTI_TEXT['약일충'],
      '⚠️ ★교재 9쪽이 「비부나 약일충」 을 묶어 적어 같은 글입니다')

    //  ★창구가 글을 실어 보내는가
    const api = R('app/api/naejeong/route.ts')
    ok(/TTI_TEXT\[ttiSin\]/.test(api) && /WOL_TEXT\[m\.sin\]/.test(api),
      '★창구가 두 글을 실어 보냅니다')

    //  ★화면이 «언제 쓰는 것인지» 를 밝히는가 — 교재가 못 박은 두 가지
    const page = R('app/naejeong/page.tsx')
    ok(/문점일 그날에만 씁니다/.test(page),
      '🔴 ★「그날에만」 이라고 밝힙니다 (교재 9쪽 제목)')
    ok(/문점일을 기준으로 잡습니다/.test(page),
      '🔴 ★「문점일 기준」 이라고 밝힙니다 (교재 10쪽)')
    ok(/띠만으로 보는 법이에요/.test(page),
      '★사주를 몰라도 쓰는 자리임을 밝힙니다 (연지와 겹쳐 보이던 것)')
    ok(/교재 9쪽에 이 신궁의 줄은 없습니다/.test(page),
      '⛔ ★글이 없으면 «없다» 고 말합니다 (빈칸을 숨기지 않습니다)')
  }

  /* ══ ⑨ 🔴 운시(運始) — 교재 8쪽 ═══════════════════════════════ */
  head('⑨ 🔴 운시 — 첫 대운 (교재 8쪽)')
  {
    //  ★십성 열 가지가 «다» 있어야 합니다
    const TEN = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인']
    const miss = TEN.filter(t => !UNSI_SIPSUNG[t])
    ok(miss.length === 0, `★십성 열 가지 풀이가 «다» 있습니다 ${miss.join(' ')}`)
    ok(Object.keys(UNSI_SIPSUNG).length === 10,
      '⛔ ★열 가지뿐입니다 (교재에 없는 것을 더하지 않았습니다)')

    //  🔴 ⛔ 괴강·백호 목록이 ★기존 표와 «같은 값» 인가
    //     ⇒ 두 곳에 같은 목록이 생겼습니다. 어긋나면 화면이 거짓말을 합니다.
    {
      const a2 = R('lib/saju/career/tables/sinsal.ts')
      const b2 = R('lib/saju/sinsalTable.ts')
      const pull = (t: string, first: string) => {
        const m2 = t.match(new RegExp(`pillars: \\[('${first}'[^\\]]*)\\]`))
        return m2 ? m2[1].replace(/['\s]/g, '').split(',') : []
      }
      const gOld = pull(a2, '戊辰'), bOld = pull(b2, '甲辰')
      ok(gOld.length > 0 && gOld.join() === [...GWAEGANG_PILLARS].join(),
        `🔴 ⛔ ★괴강 목록이 기존 표와 같습니다 (${gOld.join(' ')})`)
      ok(bOld.length > 0 && bOld.join() === [...BAEKHO_PILLARS].join(),
        `🔴 ⛔ ★백호 목록이 기존 표와 같습니다 (${bOld.join(' ')})`)
    }

    //  ★삼합 — 교재 8쪽 예시 (丁未 → 亥卯未)
    ok(samhapOf('未').join('') === '亥卯未', '★삼합이 교재 예시와 맞습니다 (未 → 亥卯未)')
    ok(samhapOf('X').length === 0, '⛔ ★모르는 글자면 «지어내지» 않고 빈 채로 둡니다')

    //  🔴 성별이 없으면 ★운시를 «지어내지» 않는가
    const api = R('app/api/naejeong/route.ts')
    ok(/b\.gender === '남' \|\| b\.gender === '여'/.test(api),
      '★성별은 남·여만 받습니다')
    ok(/if \(gender\) \{/.test(api),
      '🔴 ⛔ ★성별이 없으면 운시를 «안» 셈합니다 (대운이 남녀로 갈립니다)')
    ok(/let unsi[\s\S]{0,200}\| null = null/.test(api),
      '⛔ ★기본값이 null 입니다 (지어내지 않습니다)')
    ok(/UNSI_SIPSUNG\[sip\] \?\? null/.test(api),
      '⛔ ★표에 없는 십성이면 글을 «지어내지» 않습니다')

    //  ★화면이 «언제 보이는지 · 왜 없는지» 를 말하는가
    const page = R('app/naejeong/page.tsx')
    ok(/문점일과 상관없이 평생 그대로입니다/.test(page),
      '🔴 ★「문점일과 무관 · 평생 고정」 을 밝힙니다 (교재 8쪽)')
    ok(/성별을 고르시면 운시를 보여 드려요/.test(page),
      '⛔ ★성별이 없으면 «까닭을 말하고» 안 보여 줍니다')
    ok(/filter\(\(\[on\]\) => on\)/.test(page),
      '⛔ ★해당될 때만 보여 줍니다 (아닌 것을 «있는 척» 하지 않습니다)')
  }

  /* ══ ⑩ 🔴🔴 홈 화면 — «순화한» 말로 나가는가 [대표님 2026-09-15] ══
   *  ⛔ /naejeong 은 «교재 원문» · 홈은 «순화한 말» — ★일부러 다릅니다.
   * ══════════════════════════════════════════════════════════════ */
  head('⑩ 🔴🔴 홈 — 순화한 말 · 하루 한 번 셈')
  {
    //  ★홈 말이 열둘 «다» 있는가 (달) · 교재에 없는 둘은 null (띠)
    const wolMiss = SINGUNG.filter(s2 => !WOL_HOME[s2])
    ok(wolMiss.length === 0, `★달 순화 글이 열둘 다 있습니다 ${wolMiss.join(' ')}`)
    const ttiNull = SINGUNG.filter(s2 => TTI_HOME[s2] === null)
    ok(ttiNull.length === 2 && ttiNull.includes('상문') && ttiNull.includes('공망'),
      `⛔ ★교재에 «없는» 둘은 홈에서도 null 입니다 — ${ttiNull.join(' · ')}`)

    //  🔴 ⛔ «순화» 가 실제로 됐는가 — 교재의 센 말이 홈 글에 «남아 있으면» 안 됩니다
    const BAD = ['만사가 귀찮', '모든 것이 바닥', '바람이 날 수도', '여자를 조심',
      '관재 구실', '정신이 혼미', '낭패를 보게']
    const leak: string[] = []
    for (const s2 of SINGUNG) {
      for (const t of [TTI_HOME[s2]?.body, WOL_HOME[s2]?.body]) {
        if (!t) continue
        for (const b of BAD) if (t.includes(b)) leak.push(`${s2}「${b}」`)
      }
    }
    ok(leak.length === 0, `🔴 ⛔ ★홈 글에 교재의 «센 말» 이 ${leak.length}건 남았습니다 ${leak.join(' ')}`)

    //  ⛔ 그런데 «교재 원문» 쪽은 ★그대로여야 합니다 (연재쌤 전용)
    ok(WOL_TEXT['상문']?.includes('바람이 날 수도') === true,
      '⛔ ★교재 원문(/naejeong)은 «그대로» 입니다 — 순화는 홈에만 합니다')

    //  🔴 하루 한 번만 셈하는가 [대표님]
    const api = R('app/api/tti-today/route.ts')
    ok(/let cache: \{ key: string; body: Payload \} \| null = null/.test(api),
      '🔴 ★하루치를 담아 둡니다 [대표님]')
    ok(/cache && cache\.key === key/.test(api),
      '🔴 ★오늘 것이 있으면 «다시 셈하지» 않습니다')
    ok(/const key = `\$\{now\.getFullYear\(\)\}-\$\{now\.getMonth\(\) \+ 1\}-\$\{now\.getDate\(\)\}`/.test(api),
      '⛔ ★담는 열쇠에 «날짜» 가 들어 있습니다 (다음 날 옛것이 안 나갑니다)')
    ok(!/KASI_API_KEY/.test(api) && !/anthropic/i.test(api),
      '✅ ★AI 도 KASI 도 «한 번도» 안 부릅니다')

    //  🔴 홈 카드 — 탭 셋 · 띠 자동 · 탭을 눌러야 부름
    const card = R('app/manseryeok/components/TodayFortuneCard.tsx')
    ok(/'day' \| 'month' \| 'tti'/.test(card), '🔴 ★탭이 셋입니다 [대표님]')
    ok(/띠로 보는 오늘/.test(card), '★셋째 탭 이름이 있습니다')
    ok(/if \(tab !== 'tti' \|\| ttiData\) return/.test(card),
      '🔴 ⛔ ★탭을 «눌러야» 부르고, 한 번 받으면 «다시 안» 부릅니다')
    /*  ⛔ ★띠를 «저절로» 채우지 않습니다 [대표님 2026-09-15]
     *     사주 연지는 ★입춘으로 갈려, 손님이 아시는 띠와 다를 수 있습니다.
     *     (음 1966.1.12 = 양 2/2 ⇒ 입춘 전이라 연주 乙巳 = 뱀띠 · 손님은 범띠로 아심)
     *  ⇒ 손님이 «직접» 고르시게 둡니다. */
    ok(!/const myTti/.test(card) && !/ttiJi \|\| myTti/.test(card),
      '⛔ ★띠를 «저절로» 채우지 않습니다 — 손님이 고르십니다 [대표님]')
    ok(/const shownTti = ttiJi$/m.test(card),
      '★고르신 띠만 씁니다')
    ok(/위에서 띠를 골라 보세요/.test(card),
      '★안 고르셨으면 «고르시라» 고 말합니다 (빈 화면을 안 둡니다)')
    ok(/ttiData\.note/.test(card),
      '⛔ ★순화했다는 것을 홈에서도 밝힙니다')
    ok(/이번 달 · 음력 /.test(card),
      '★이번 달 «하나만» 보여 드립니다 [대표님]')

    /*  🔴🔴 ★이번 달은 «음력» 입니다 — 2026-09-15 (9부)
     *  [9부에 겪은 일]  처음에 ★양력 달을 그대로 썼습니다.
     *     2026-09-15 은 음력 ★8월 인데 9월로 보아 ★다른 신궁이 나왔습니다.
     *     (戌 약일충 「흔들리기 쉬운 달」 ↔ 酉 공망 「쉬어 가는 달」)
     *  ⇒ 음력·양력은 «거의 늘» 한 달쯤 어긋나므로 ★거의 늘 틀렸습니다. */
    ok(/solarToLunarKR\(y, m, d\)/.test(api),
      '🔴 ⛔ ★이번 달을 «음력» 으로 구합니다 (양력 달을 그대로 쓰면 틀립니다)')
    ok(/lun\.lunarMonth - 1/.test(api),
      '★음력 달로 지지를 고릅니다 (1월=寅 … 12월=丑 · 교재 10쪽)')
    ok(/lun && wolSin && wolText/.test(api),
      '⛔ ★음력 달을 못 구하면 «지어내지» 않고 null 입니다')
    ok(/음력 \{ttiData\.month\.leap[\s\S]{0,40}\{ttiData\.month\.wol\}월/.test(card),
      '⛔ ★화면이 «음력» 이라고 밝힙니다 · 윤달이면 «윤» 도 붙습니다')
    ok(/달은 <b>음력<\/b> 기준이에요/.test(R('app/naejeong/page.tsx')),
      '★연재쌤 화면도 «음력» 기준임을 밝힙니다')

    //  🔴 값으로 — 오늘이 실제로 «음력 달» 로 나오는가
    {
      const now = new Date()
      const lun = solarToLunarKR(now.getFullYear(), now.getMonth() + 1, now.getDate())
      ok(!!lun, '★오늘의 음력 달을 구할 수 있습니다')
      ok(!!lun && lun.lunarMonth >= 1 && lun.lunarMonth <= 12,
        `★음력 달이 1~12 안입니다 (오늘 음력 ${lun?.lunarMonth}월)`)
    }
  }

  /* ══ ⑪ 🔴🔴 상담 목적 콤보 — 2026-09-15 (9부) [대표님] ═══════════ */
  head('⑪ 🔴🔴 상담 목적 고르기')
  {
    const all = PURPOSES.flatMap(g => g.items)
    ok(PURPOSES.length === 6 && all.length === 27,
      `★대분류 ${PURPOSES.length} · 질문 ${all.length}개 [대표님 확정]`)
    ok(new Set(all.map(i => i.id)).size === all.length, '⛔ ★열쇠(id)가 겹치지 않습니다')

    //  ★12신궁 질문은 «자리» 가 있어야 합니다
    const noJari = all.filter(i => i.kind === 'singung' && !i.jari?.length)
    ok(noJari.length === 0, `⛔ ★12신궁 질문은 «자리» 가 다 있습니다 ${noJari.map(i => i.id).join(' ')}`)
    //  ★신살 질문은 «자리» 가 없어야 합니다 (띠 기준이라 궁위와 무관)
    const badSinsal = all.filter(i => i.kind === 'sinsal' && i.jari?.length)
    ok(badSinsal.length === 0, '⛔ ★신살 질문에 궁위를 붙이지 않았습니다 (기준이 다릅니다)')
    //  ★신살 질문은 풀이가 있어야 합니다
    const noDir = all.filter(i => i.kind === 'sinsal' && !SINSAL_DIR[i.id]?.length)
    ok(noDir.length === 0, `⛔ ★신살 질문에 풀이가 다 있습니다 ${noDir.map(i => i.id).join(' ')}`)
    //  ★근거 쪽이 다 적혀 있는가
    ok(all.every(i => /교재/.test(i.page)), '★질문마다 «교재 쪽» 이 적혀 있습니다')

    /*  ⛔⛔ ★넣지 «않기로» 한 여섯이 되살아나면 안 됩니다 [대표님 2026-09-15]
     *     도주자·부적/주술·금액 단정·성씨로 사람 고르기·폭력 단정 */
    const txt = JSON.stringify(PURPOSES) + JSON.stringify(SINSAL_DIR)
    const BAN = ['도주', '숨어', '은닉', '삼겹살', '소주', '소금', '부적',
      '억을', '억 정도', '성씨', '때린다', '맞고 산다']
    const back = BAN.filter(b => txt.includes(b))
    ok(back.length === 0,
      `🔴 ⛔ ★빼기로 한 것이 «되살아나지» 않았습니다 ${back.join(' · ')}`)

    //  ⚠️ 12신궁 밖의 것은 «메모» 로만 — 답을 단정하지 않습니다
    const notes = all.filter(i => i.note)
    ok(notes.length >= 4 && notes.every(i => /교재/.test(i.note!)),
      `⚠️ ★12신궁 밖(시기 등)은 «메모» 로만 둡니다 — ${notes.length}개`)

    //  🔴 화면 — 고르면 «맨 위 + 강조»
    const page = R('app/naejeong/page.tsx')
    ok(/const \[purpose, setPurpose\]/.test(page), '★화면에 상담 목적 고르기가 있습니다')

    /*  🔴 ★두 걸음으로 고릅니다 [대표님 2026-09-15]
     *     ① 대분류를 누르면 ② 세부가 펼쳐집니다.
     *  ⛔ 옛 «드롭다운» 으로 되돌리지 마십시오 — 27개가 한꺼번에 떴습니다. */
    ok(/const \[group, setGroup\]/.test(page), '🔴 ★대분류를 «따로» 고릅니다 [대표님]')
    ok(!/<optgroup/.test(page), '⛔ ★옛 드롭다운(optgroup)으로 되돌아가지 않았습니다')
    ok(/\{group && \(/.test(page),
      '★세부 질문은 대분류를 «고르셨을 때만» 펼쳐집니다')
    ok(/setGroup\(on \? '' : g\.group\)/.test(page),
      '★같은 대분류를 다시 누르면 접힙니다')
    //  ⛔ 대분류를 바꾸면 세부를 «지워야» 합니다
    ok(/setPurpose\(''\)\s*\n\s*setGroup/.test(page),
      '🔴 ⛔ ★대분류를 바꾸면 «앞서 고른 질문» 을 지웁니다 (헷갈리지 않게)')
    ok(/flexDirection: 'column', gap: 6/.test(page),
      '★세부는 «한 줄에 하나» 입니다 [대표님] — 긴 질문이 안 잘립니다')
    ok(/지우기/.test(page), '★고른 것을 «지우는» 길이 있습니다')
    ok(/const sortedHits/.test(page) && /pickedJari\.indexOf/.test(page),
      '🔴 ★고른 자리가 «맨 위» 로 올라옵니다 [대표님]')
    ok(/pickedJari\.includes\(h\.jari\) \? `2px solid \$\{ACCENT\}`/.test(page),
      '🔴 ★고른 자리가 테두리로 «도드라집니다» [대표님]')
    ok(/이 질문의 자리/.test(page), '★어느 자리인지 «딱지» 로도 알려 줍니다')
    ok(/기준으로 봅니다. 위 네 자리\(문점일 기준\)와는 다른 셈이에요/.test(page),
      '⚠️ ★신살은 «띠 기준» 이라고 밝힙니다 (12신궁과 섞이지 않게)')
    ok(/pu\.note && /.test(page), '⛔ ★메모가 있는 질문은 그 메모를 보여 줍니다')

    //  🔴 값으로 — 신살이 교재 예시와 맞는가 (교재 27·45쪽)
    ok(getSinsal('亥', '辰') === '반안' && getSinsal('亥', '巳') === '역마'
      && getSinsal('亥', '卯') === '장성',
      '★신살이 교재 예시와 맞습니다 (亥卯未 기준 辰 반안 · 巳 역마 · 卯 장성)')
    ok(findPurpose('land')?.jari?.[0] === '연지'
      && findPurpose('house')?.jari?.[0] === '월지'
      && findPurpose('marry')?.jari?.[0] === '일지'
      && findPurpose('bizStart')?.jari?.[0] === '시지',
      '★자리 짝이 교재 4쪽대로입니다 (땅=연지 · 집=월지 · 결혼=일지 · 사업=시지)')
  }

  /* ══ ⑫ 🔴🔴 교재에서 찾기 (로컬) — 2026-09-15 [대표님] ══════════
   *  「외부 AI 를 거치지 않고 프로그램 자체의 데이터 검색으로」
   *  ⇒ 값 0 · 즉시 · 늘 같은 답 · ★지어낼 여지 없음
   * ══════════════════════════════════════════════════════════════ */
  head('⑫ 🔴🔴 교재에서 찾기 — 로컬 (AI 안 부름)')
  {
    ok(LOOKUP_ALL.length > 70, `★찾기 표 ${LOOKUP_ALL.length}줄 (콤보 + 교재 사례)`)
    ok(LOOKUP_CASE.length > 40, `★교재 사례 ${LOOKUP_CASE.length}건`)
    ok(new Set(LOOKUP_ALL.map(r => r.id)).size === LOOKUP_ALL.length, '⛔ ★열쇠가 겹치지 않습니다')
    ok(LOOKUP_ALL.every(r => r.must.length > 0),
      '⛔ ★모든 줄에 must 가 있습니다 (없으면 아무 말에나 걸립니다)')
    ok(LOOKUP_ALL.every(r => /교재/.test(r.page)), '★줄마다 교재 쪽이 있습니다')
    ok(LOOKUP_CASE.every(r => !!r.iljin), '★사례에는 문점일이 적혀 있습니다')

    //  🔴 값으로 — 자연스러운 말이 걸리는가
    const Q: [string, string][] = [
      ['아들이 유학 간다는데 형편이 안 돼요', 'study'],
      ['가게를 계속할까요 접을까요', 'bizEnd'],
      ['남편이 바람난 것 같아요', 'affair'],
      ['친구가 동업하자는데 괜찮을까요', 'partner'],
      ['며느리가 아들을 낳을 수 있을까요', 'birth'],
      ['사직서를 언제 내면 좋을까요', 'quit'],
    ]
    const miss = Q.filter(([q, want]) => !lookup(q, 5).some(h => h.row.purposeId === want))
    ok(miss.length === 0, `🔴 ★자연스러운 말이 «다» 걸립니다 ${miss.map(x => x[0]).join(' / ')}`)

    //  ⛔ 엉뚱한 말은 «안» 걸려야 합니다 [대표님 ㉮]
    ok(lookup('오늘 날씨가 어떤가요').length === 0,
      '⛔ ★엉뚱한 말에는 «못 찾았어요» — 억지로 안 내밉니다 [대표님]')
    ok(lookup('ㅁ').length === 0, '⛔ ★한 글자로는 안 찾습니다')

    //  🔴 ⛔ 곁가지 막기 — 「아들이 유학」 이 «출산» 에 걸리면 안 됩니다
    ok(!lookup('아들이 유학 간다는데', 9).some(h => h.row.purposeId === 'birth'),
      '🔴 ⛔ ★「아들」 하나로 «출산» 이 걸리지 않습니다 (must·not 이 막습니다)')
    ok(!lookup('아들 군대 보내는데', 9).some(h => h.row.purposeId === 'study'),
      '⛔ ★「군대」 가 «유학» 으로 안 걸립니다 (not)')

    //  ⛔ 빼기로 한 것이 «사례» 로 되살아나면 안 됩니다
    const txt = JSON.stringify(LOOKUP_ALL)
    const BAN = ['도주', '숨어', '은닉', '삼겹살', '소금', '부적', '억을', '성씨']
    const back = BAN.filter(b => txt.includes(b))
    ok(back.length === 0, `🔴 ⛔ ★빼기로 한 것이 «되살아나지» 않았습니다 ${back.join(' · ')}`)

    //  ⛔ 사례에 «풀이» 를 옮겨 적지 않았는가 — 지금은 «이정표» 입니다 [대표님 ㉮]
    ok(LOOKUP_CASE.every(r => (r.summary ?? '').length < 60),
      '⛔ ★사례는 «제목 한 줄» 뿐입니다 (풀이를 옮기면 두 벌이 됩니다)')

    //  🔴 화면 — AI 를 안 부르는가 · 손님 말을 안 싣는가
    const page = R('app/naejeong/page.tsx')
    ok(/lookup\(q\)/.test(page), '🔴 ★화면이 «로컬 찾기» 를 씁니다')
    ok(!/fetch\('\/api\/(tongbyeon|chat)/.test(page) && !/anthropic/i.test(page),
      '✅ ⛔ ★AI 를 «한 번도» 안 부릅니다 [대표님]')
    ok(!/router\.push\([^)]*\$\{q\}/.test(page) && !/searchParams[\s\S]{0,40}set\('q'/.test(page),
      '⛔ ★손님 말을 «주소에» 싣지 않습니다 (7부 교훈)')
    ok(/교재에서 못 찾았어요/.test(page),
      '⛔ ★못 찾으면 사실대로 말합니다 [대표님 ㉮]')
    ok(/풀이는 교재를 펴 보셔야 합니다/.test(page),
      '⚠️ ★사례는 «쪽수만» 이라는 것을 밝힙니다')
  }

  /* ══ ⑬ 🔴🔴 교재 사례 풀이 — ★교재가 «제 셈» 을 검증합니다 ═══════
   *  [대표님 ㉰ 2026-09-15] 「교재 안 사례들을 모두 정리해서 보여 주자」
   *
   *  🔴 [9부에 잡힌 것]  제가 사례를 옮겨 적으며 ★사주 «차례» 를 뒤집었습니다.
   *     교재는 ★«시 일 월 연» 으로 적는데 (오른쪽이 연주)
   *     제가 ★왼쪽부터 연주로 읽어 c13b 네 자리가 «통째로» 어긋났습니다.
   *     ⇒ ★이 그물이 «값으로» 잡았습니다. 눈으로는 못 봤습니다.
   * ══════════════════════════════════════════════════════════════ */
  head('⑬ 🔴🔴 교재 사례 — 교재 값과 «내 셈» 이 같은가')
  {
    ok(CASE_TEXT.length >= 56, `★사례 ${CASE_TEXT.length}건 — 교재 11~54쪽 «전부»`)

    /*  ⚠️ ★교재는 «같은 것» 을 두 이름으로 부릅니다 —
     *     「해결」=「해결신」 · 「천록」=「양인」
     *     ⇒ 표 이름으로 통일했습니다. 9부에 이것 때문에 ★여덟 자리가 어긋나 보였습니다.
     *  ✅ ⛔ 딴이름은 ★«타입» 이 막아 줍니다 (SinGung 열둘 밖이면 tsc 가 거부).
     *     ⇒ 그물로 또 세지 «않습니다». 타입이 더 확실합니다.
     *     ⚠️ 그래서 caseText.ts 에 «해결신» 이라 적으면 ★빌드가 «안» 됩니다. */
    ok(/「해결」 = ★「해결신」/.test(R('lib/saju/naejeong/tables/caseText.ts')),
      '⚠️ ★딴이름이 있다는 것을 파일에 적어 두었습니다 (다음 사람이 헷갈리지 않게)')

    //  ⛔ 찾기 표와 «양쪽» 이 맞물리는가
    const noText = LOOKUP_CASE.filter(r => !CASE_TEXT.some(c => c.id === r.id))
    ok(noText.length === 0,
      `⛔ ★찾기 줄마다 «풀이» 가 있습니다 ${noText.map(r => r.id).join(' ')}`)

    /*  ⛔⛔ ★교재가 «안 적은» 신궁을 지어내지 않았는가 — 2026-09-15
     *  [9부에 잡힌 것]  c29a(교재 29쪽)는 사주만 적혀 있고 ★신궁이 «없습니다».
     *     (풀이도 문점일이 아니라 ★«일지 기준 양인» 으로 다르게 풉니다)
     *     ⇒ 그런데 제가 ★신궁 넷을 «지어내» 적었습니다.
     *     ⇒ ★이 그물이 «값으로» 잡았습니다 — 교재 값과 «하나도» 안 맞았습니다.
     *  ⛔ 지어내면 ★교재와 어긋나므로 «반드시» 걸립니다. 그것이 이 그물의 힘입니다. */
    const noSin = CASE_TEXT.filter(c => c.saju && !c.saju.sin)
    ok(noSin.every(c => !!c.note),
      `⛔ ★교재가 신궁을 «안 적은» 사례는 그 까닭을 밝힙니다 (${noSin.map(c => c.id).join(' ')})`)

    //  🔴 ⛔ 사례마다 «네 자리» 를 교재와 대조합니다
    let good = 0
    const bad: string[] = []
    for (const c of CASE_TEXT) {
      //  ⛔ ★교재가 신궁을 «안 적은» 사례는 대조할 것이 없습니다 (지어내면 안 됩니다)
      if (!c.saju || !c.saju.sin) continue
      for (const k of ['yeon', 'wol', 'il', 'si'] as const) {
        const raw = c.saju.pillars[k]
        const ji = raw.length === 2 ? raw[1] : raw
        const got = sinGungOf(c.iljin[1], ji)
        if (got === c.saju.sin[k]) good++
        else bad.push(`${c.id} ${k} ${ji} 셈:${got}≠교재:${c.saju.sin[k]}`)
      }
    }
    ok(bad.length === 0,
      `🔴 ⛔ ★교재가 적은 신궁과 «내 셈» 이 ${good}자리 모두 같습니다 ${bad.slice(0, 3).join(' / ')}`)
    ok(good >= 70, `★대조한 자리 ${good}개`)

    //  ⛔ 사례 열쇠가 찾기 표와 «이어져» 있어야 합니다
    const orphan = CASE_TEXT.filter(c => !LOOKUP_CASE.some(r => r.id === c.id))
    ok(orphan.length === 0, `⛔ ★풀이가 찾기 표와 이어져 있습니다 ${orphan.map(c => c.id).join(' ')}`)

    //  ⛔ 도려낸 자리를 «숨기지» 않았는가
    const cuts = CASE_TEXT.filter(c => c.cut)
    ok(cuts.length >= 3, `⚠️ ★도려낸 대목을 «밝힌» 사례 ${cuts.length}건`)
    ok(cuts.every(c => /교재 \d+쪽/.test(c.cut!)),
      '⛔ ★도려낸 자리마다 «교재 몇 쪽» 인지 적어 두었습니다')

    //  ⛔ 빼기로 한 것이 «풀이 글» 로 새어 들지 않았는가
    const txt = CASE_TEXT.map(c => c.text).join(' ')
    const BAN = ['성씨', '도주', '숨어', '삼겹살', '소금을 뿌', '억은 벌', '억 정도']
    const leak = BAN.filter(b => txt.includes(b))
    ok(leak.length === 0, `🔴 ⛔ ★빼기로 한 것이 «풀이 글» 에 없습니다 ${leak.join(' · ')}`)

    ok(caseTextOf('c12') !== null && caseTextOf('없는것') === null,
      '⛔ ★없는 사례는 «지어내지» 않고 null 입니다')

    //  🔴 화면이 «펼쳐» 보여 주는가
    const page2 = R('app/naejeong/page.tsx')
    ok(/caseTextOf\(h\.row\.id\)/.test(page2), '🔴 ★찾기 결과에서 «교재 풀이» 를 펼칩니다')
    ok(/openCase === h\.row\.id/.test(page2), '★누른 것만 펼칩니다 (목록이 길어지지 않게)')
    ok(/c\.cut &&/.test(page2), '⛔ ★도려낸 대목을 «숨기지» 않고 보여 줍니다')
    ok(/아직 풀이를 안 옮겼어요/.test(page2),
      '⚠️ ★아직 안 옮긴 쪽은 «사실대로» 말합니다 (25~54쪽)')
    ok(/c\.saju &&/.test(page2), '★사례의 네 기둥과 신궁도 보여 줍니다')
  }

  console.log(`\n━━ 일진내정법 — 통과 ${pass} · 실패 ${fail} ━━\n`)
  if (fail > 0) process.exit(1)
}

main()
