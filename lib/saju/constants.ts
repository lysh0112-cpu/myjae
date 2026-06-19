// lib/saju/constants.ts

export const CHEONGAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] as const
export const JIJI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const

export type Cheongan = typeof CHEONGAN[number]
export type Jiji = typeof JIJI[number]

export const GAN_COLOR: Record<string, string> = {
  '甲':'#5BA85C','乙':'#5BA85C',
  '丙':'#E85D4A','丁':'#E85D4A',
  '戊':'#A0845C','己':'#A0845C',
  '庚':'#C8A85C','辛':'#C8A85C',
  '壬':'#4A90D9','癸':'#4A90D9',
}

export const JI_COLOR: Record<string, string> = {
  '子':'#4A90D9','亥':'#4A90D9',
  '午':'#E85D4A','巳':'#E85D4A',
  '寅':'#5BA85C','卯':'#5BA85C',
  '申':'#C8A85C','酉':'#C8A85C',
  '辰':'#A0845C','戌':'#A0845C','丑':'#A0845C','未':'#A0845C',
}
