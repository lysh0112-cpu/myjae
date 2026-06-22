const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

export function calcSaju(year: number, month: number, day: number, hour: number) {
  const yIdx = (year - 4) % 60
  const yearStem = STEMS[((yIdx % 10) + 10) % 10]
  const yearBranch = BRANCHES[((yIdx % 12) + 12) % 12]

  const base = new Date(2000, 0, 1)
  const target = new Date(year, month - 1, day)
  const diff = Math.round((target.getTime() - base.getTime()) / 86400000)
  const dayIdx = ((diff % 60) + 60) % 60
  const dayStem = STEMS[dayIdx % 10]
  const dayBranch = BRANCHES[dayIdx % 12]

  const mIdx = ((year - 4) * 12 + (month - 1)) % 60
  const monthStem = STEMS[((mIdx % 10) + 10) % 10]
  const monthBranch = BRANCHES[((month + 1) % 12)]

  const hIdx = hour < 0 ? -1 : Math.floor((hour + 1) / 2) % 12
  const hourStem = hour < 0 ? '' : STEMS[((dayIdx % 5) * 2 + (hIdx % 10)) % 10]
  const hourBranch = hour < 0 ? '' : BRANCHES[((hIdx % 12) + 12) % 12]

  const saju = [
    { pillar: '년주', stem: yearStem, branch: yearBranch },
    { pillar: '월주', stem: monthStem, branch: monthBranch },
    { pillar: '일주', stem: dayStem, branch: dayBranch },
  ]
  if (hour >= 0 && hourBranch) {
    saju.push({ pillar: '시주', stem: hourStem, branch: hourBranch })
  }
  return saju
}

export function getSajuText(saju: any[]) {
  return saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(', ')
}
