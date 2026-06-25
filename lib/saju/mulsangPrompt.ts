type Element = '목' | '화' | '토' | '금' | '수'

const STEM_ELEMENT: Record<string, Element> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

// 주인공(일간) — 품위 있고 또렷하게
const SUBJECT: Record<Element, string> = {
  목: 'a single dignified tree standing gracefully at the center',
  화: 'a warm radiant light (the sun or a gentle flame) at the center',
  토: 'fertile earth and a graceful gentle hill at the center',
  금: 'an elegant polished rock or refined metal form at the center',
  수: 'clear serene flowing water at the center',
}

// 환경(강한 오행) — 사실은 유지하되 아름답고 품위 있게 (황량함 제거)
const ENVIRONMENT: Record<Element, string> = {
  목: 'a lush verdant forest and green fields all around',
  화: 'a sky glowing with warm golden light',
  토: 'wide gently rolling plains and graceful mountains',
  금: 'beautiful elegant rock formations under clear luminous air',
  수: 'a wide tranquil river, lake or sea spreading out beautifully',
}

// 용신(핵심 에너지) — 항상 따뜻하고 희망적인 빛
const YONGSIN_ACCENT: Record<Element, string> = {
  목: 'fresh new sprouts and tender vines bringing vivid life',
  화: 'warm hopeful sunlight and a gentle glowing warmth',
  토: 'solid steady ground giving a reassuring sense of safety',
  금: 'crisp clear radiant light and refined elegant stillness',
  수: 'a clear gentle stream or soft moonlit water bringing calm hope',
}

// 계절 — 사실대로 유지하되, 처량함 대신 그 계절의 아름다움을 강조
const BRANCH_SEASON: Record<string, string> = {
  寅: 'early spring, with the quiet hope of new beginnings',
  卯: 'spring, fresh and full of gentle life',
  辰: 'late spring, lush and abundant',
  巳: 'early summer, bright and vivid',
  午: 'summer, radiant and full of warmth',
  未: 'late summer, rich and golden',
  申: 'early autumn, clear and serene',
  酉: 'autumn, with beautiful warm golden tones',
  戌: 'late autumn, calm with warm amber light',
  亥: 'early winter, quiet and elegant with soft warm light on the horizon',
  子: 'winter, serene and beautiful, with gentle warm light (sunrise or sunset glow) bringing hope to the calm snow',
  丑: 'late winter, still and peaceful, with the first warm hint of coming spring',
}

export const STYLE_CONFIGS: Record<string, { label: string; suffix: string }> = {
  oriental: {
    label: '수묵담채화',
    suffix:
      'Traditional Korean oriental ink wash painting (sumukhwa) with soft color tints, ' +
      'gentle ink gradients, elegant composition, a single harmonious balanced scene, ' +
      'warm hopeful atmosphere, refined and dignified, beautiful and uplifting, high quality. ' +
      'A complete landscape painting, not a diagram.',
  },
  ghibli: {
    label: '지브리풍',
    suffix:
      'Studio Ghibli style soft watercolor, warm gentle light, lush beautiful scenery, ' +
      'a single harmonious balanced composition, healing hopeful and peaceful atmosphere, ' +
      'anime background art, beautiful and uplifting, high quality. ' +
      'A complete landscape painting, not a diagram.',
  },
}

function strengthModifier(value: number, total: number): string {
  if (total <= 0) return 'gently present'
  const ratio = value / total
  if (ratio >= 0.4) return 'prominent and beautifully filling much of the scene'
  if (ratio >= 0.28) return 'expansive and gracefully wide-reaching'
  return 'clearly present and beautifully balanced'
}

export interface MulsangPromptInput {
  dayStem: string
  monthBranch: string
  elementScores: Record<string, number>
  yongsin: string
  style: string
}

export interface MulsangPromptResult {
  prompt: string
  dayElement: Element
  strongElement: Element
  season: string
  styleLabel: string
}

export function buildMulsangPrompt(input: MulsangPromptInput): MulsangPromptResult {
  const { dayStem, monthBranch, elementScores, yongsin, style } = input
  const dayElement = (STEM_ELEMENT[dayStem] ?? '목') as Element
  const entries = Object.entries(elementScores) as [Element, number][]
  const total = entries.reduce((a, [, v]) => a + (v || 0), 0)
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const strongElement = (sorted[0]?.[0] ?? dayElement) as Element
  const season = BRANCH_SEASON[monthBranch] ?? 'a clear beautiful day'
  const yongElement = (['목', '화', '토', '금', '수'].includes(yongsin)
    ? yongsin
    : dayElement) as Element
  const styleCfg = STYLE_CONFIGS[style] ?? STYLE_CONFIGS.oriental
  const envMod = strengthModifier(sorted[0]?.[1] ?? 0, total)

  const prompt = [
    `A serene and beautiful landscape painting set in ${season}.`,
    `At the heart of the scene: ${SUBJECT[dayElement]}.`,
    `Surrounding it: ${ENVIRONMENT[strongElement]}, ${envMod}.`,
    `A key warm touch of ${YONGSIN_ACCENT[yongElement]}.`,
    `The overall mood is hopeful, warm, and uplifting, never desolate or lonely, while staying true to the season.`,
    `Balanced harmonious composition, a single complete scenic view. No people, no text, no letters, no charts or diagrams.`,
    styleCfg.suffix,
  ].join(' ')

  return {
    prompt,
    dayElement,
    strongElement,
    season,
    styleLabel: styleCfg.label,
  }
}
