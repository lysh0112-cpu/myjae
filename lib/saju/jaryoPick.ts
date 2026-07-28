// lib/saju/jaryoPick.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  교재 자료를 "물어본 것에 맞게" 골라 내는 공용 잔손                   │
// └───────────────────────────────────────────────────────────────┘
//
// ★2026-07-28 — 서비스가 여섯이라 같은 고르개를 여섯 번 적을 수 없다.
//   toTongbyeonInput 에서 쓰던 것을 여기로 올려 다 같이 쓴다. (교훈 BQ)
//
// ★자료는 일곱 파일에 다 들어 있다(합치면 33,000자).
//   그것을 다 내보내는 것이 아니라, 물어본 것에 맞는 것만 꺼내 쓴다.
//   재료가 부풀면 통변이 흐려진다. (교훈 BS · 31부 §6)

import type { Ohaeng } from './simsanOhaeng'
import { grade as ohaengGrade } from './simsanOhaeng'
import { CHEONGAN_TRAIT } from './cheonganTrait'
import { OHAENG_TRAIT } from './ohaengTrait'
import { OHAENG_NATURE } from './ohaengNature'
import { OHAENG_25 } from './ohaengTable25'
import { findChungByChars } from './chungMeaning'
import { findHap } from './hapMeaning'
import { SAL_TABLE } from './sinsalTable'

export type Pill = { pillar: string; stem: string; branch: string }
export type Target = 'student' | 'adult'

/** 판정 조건을 적은 줄은 재료에서 뺀다. AI 에게 줄 것은 뜻이지 잣대가 아니다. */
export const isRuleLine = (t: string) =>
  /개 이상|포함해|되풀이|섞여 있어도|차례로 작용력|일 때 봅니다|해당하며/.test(t)

/** 일간 몇 줄 — cap 으로 길이를 조절한다 */
export function cheonganBrief(dayStem: string, cap = 4, gender?: string): string[] {
  const r = CHEONGAN_TRAIT[dayStem]
  if (!r) return []
  const out = [`${dayStem}(${r.ko}) ${r.image} — ${r.tendency}, ${r.keyword}. ${r.nature41}`]
  out.push(...r.traits.slice(0, cap))
  // ★성별 줄은 넘겨줄 때만 나간다. 궁합처럼 상대를 말하는 자리에서는 넘기지 말 것.
  if (gender === '남' || gender === '여') out.push(...(r.sayByGender?.[gender] ?? []))
  return out
}

/** 일간 물상 한 줄 — 물상도에 쓴다 */
export function cheonganImage(dayStem: string): string {
  const r = CHEONGAN_TRAIT[dayStem]
  return r ? `${dayStem}(${r.ko})는 ${r.image}입니다. ${r.nature41}` : ''
}

/** 오행 과다·결핍 — what 으로 무엇을 담을지 고른다 */
export function ohaengBrief(
  score: Record<Ohaeng, number>, target: Target,
  what: { 결?: boolean; 건강?: boolean; 개운?: boolean; 다루는법?: boolean } = { 결: true },
): string[] {
  const out: string[] = []
  for (const el of ['목', '화', '토', '금', '수'] as Ohaeng[]) {
    const g = ohaengGrade(score[el] ?? 0)
    if (g !== '과다' && g !== '결핍') continue
    const t = OHAENG_TRAIT[el]; const n = OHAENG_NATURE[el]
    if (!t) continue
    const parts: string[] = []
    if (g === '과다') {
      if (what.결) parts.push(...t.excess.slice(0, 2))
      if (what.건강 && target === 'adult') parts.push(...(t.excessAdult ?? []).slice(0, 2))
      if (target === 'student') parts.push(...(t.excessStudent ?? []).slice(0, 1))
      out.push(`${el}(${t.hanja}) 과다 ${score[el]}점 — ${parts.join(' ')}`)
      if (what.다루는법 && n?.handling?.length) out.push(`  · 곁의 사람이 대할 때: ${n.handling.slice(0, 2).join(' ')}`)
    } else {
      if (what.결) parts.push(...t.lack.slice(0, 2))
      if (what.건강 && target === 'adult') parts.push(...(t.lackAdult ?? []).slice(0, 2))
      if (target === 'student') parts.push(...(t.lackStudent ?? []).slice(0, 1))
      out.push(`${el}(${t.hanja}) 결핍 — ${parts.join(' ')}`)
      if (what.개운 && t.gaeun?.length) out.push(`  · 개운법: ${t.gaeun.slice(0, 3).join(' ')}`)
    }
  }
  return out
}

/** 원국에 실제로 선 합·충만 */
export function hapChungBrief(saju: Pill[], target: Target, opt: { 합?: boolean; 충?: boolean; 건강?: boolean } = { 합: true, 충: true }): string[] {
  const branches = saju.map(p => p.branch).filter(Boolean)
  const stems = saju.map(p => p.stem).filter(Boolean)
  const out: string[] = []; const seen = new Set<string>()
  if (opt.충) {
    for (let i = 0; i < branches.length; i++) for (let j = i + 1; j < branches.length; j++) {
      const r = findChungByChars(branches[i], branches[j])
      if (!r || seen.has(r.key)) continue
      seen.add(r.key)
      const say = r.say.filter(t => !isRuleLine(t)).slice(0, 2)
      const extra = opt.건강 && target === 'adult' ? (r.sayAdult ?? []).slice(0, 2) : []
      out.push(`${r.key}${r.alias ? `(${r.alias})` : ''} — ${[...say, ...extra].join(' ')}`)
    }
  }
  if (opt.합) {
    const P: [string, string, string][] = [['甲','己','甲己合'],['乙','庚','乙庚合'],['丙','辛','丙辛合'],['丁','壬','丁壬合'],['戊','癸','戊癸合']]
    for (const [a, b, key] of P) {
      if (!stems.includes(a) || !stems.includes(b) || seen.has(key)) continue
      const r = findHap(key); if (!r) continue
      seen.add(key)
      const say = r.say.filter(t => !isRuleLine(t)).slice(0, 2)
      const extra = target === 'adult' ? (r.sayAdult ?? []).slice(0, 1) : []
      out.push(`${r.key}${r.name ? `(${r.name})` : ''} — ${[...say, ...extra].join(' ')}`)
    }
  }
  return out
}

/**
 * 걸린 살만.
 *   ★교재가 개수·자리 조건을 적어 둔 살만 잰다.
 *     역마·화개·천문성·천라·지망은 조건이 없어 거의 모두에게 걸린다. (교훈 BO)
 *   ⚠️ 양인살은 96쪽(다섯, 일간 기준 월지)으로 잰다. 93쪽(셋)과 다르다 — 연재쌤 확인.
 */
export function salHits(saju: Pill[]): string[] {
  const at = (n: string) => saju.find(p => p.pillar === n)
  const branches = saju.map(p => p.branch).filter(Boolean)
  const stems = saju.map(p => p.stem).filter(Boolean)
  const pillars = saju.map(p => `${p.stem}${p.branch}`)
  const monthB = at('월주')?.branch ?? ''; const dayB = at('일주')?.branch ?? ''
  const dayStem = at('일주')?.stem ?? ''
  const hits: string[] = []
  const DOHWA = ['子', '午', '卯', '酉']
  if (branches.filter(b => DOHWA.includes(b)).length >= 2 && (DOHWA.includes(monthB) || DOHWA.includes(dayB))) hits.push('dohwa')
  const HC = ['甲', '午', '未', '申', '辛']
  if ([...stems, ...branches].filter(c => HC.includes(c)).length >= 3 || (HC.includes(dayStem) && HC.includes(dayB))) hits.push('hyeonchim')
  if (['甲辰','乙未','丙戌','丁丑','戊辰','壬戌','癸丑'].some(x => pillars.includes(x))) hits.push('baekho')
  if (['庚辰','庚戌','壬辰','壬戌','戊辰','戊戌'].some(x => pillars.includes(x))) hits.push('goegang')
  const Y: Record<string, string> = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' }
  if (dayStem && Y[dayStem] && monthB === Y[dayStem]) hits.push('yangin')
  for (const key of ['cheoneulgwiin', 'munchang']) {
    const r = SAL_TABLE.find(x => x.key === key)
    if ((r?.byDayStem?.[dayStem] ?? []).some(b => branches.includes(b))) hits.push(key)
  }
  return hits
}

/** 걸린 살을 문장으로. keys 를 주면 그중에서만 고른다 */
export function salBrief(saju: Pill[], target: Target, withJobs = false, keys?: string[]): string[] {
  return salHits(saju)
    .filter(k => !keys || keys.includes(k))
    .map(k => {
      const r = SAL_TABLE.find(x => x.key === k); if (!r) return ''
      const mean = r.say.filter(t => !isRuleLine(t))
      const say = [...mean.slice(0, 2), ...(target === 'adult' ? (r.sayAdult ?? []).slice(0, 1) : [])]
      const jobs = withJobs && r.jobs?.length ? ` (교재가 든 일: ${r.jobs.slice(0, 5).join('·')})` : ''
      return `${r.name} — ${say.join(' ')}${jobs}`
    })
    .filter(Boolean)
}

/** 문과:이과 비율 — 교재 25쪽 */
export function munYiBrief(score: Record<Ohaeng, number>): string {
  const top = (['목','화','토','금','수'] as Ohaeng[]).slice().sort((a,b)=>(score[b]??0)-(score[a]??0))[0]
  const r = OHAENG_25[top]
  return r ? `가장 센 기운은 ${top}(${r.hanja})이고, 교재 25쪽은 이 기운의 문과:이과 비율을 ${r.munYi} 로 봅니다.` : ''
}

/** 오행의 계절·하루·인생 — 교재 25쪽 */
export function stage25(el: Ohaeng): string {
  const r = OHAENG_25[el]
  return r ? `${el}(${r.hanja}) — 계절은 ${r.season}, 하루로는 ${r.timeOfDay}, 인생으로는 ${r.lifeStage}, 색은 ${r.color}, 맛은 ${r.taste}입니다.` : ''
}
