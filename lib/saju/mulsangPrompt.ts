type Element = '목' | '화' | '토' | '금' | '수'

const STEM_ELEMENT: Record<string, Element> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

const SUBJECT: Record<Element, string> = {
  목: 'a single dignified tree standing at the center',
  화: 'a warm glowing fire (or the sun) at the center',
  토: 'fertile earth and a gentle hill at the center',
  금: 'a refined rock or metal forms at the center',
  수: 'clear flowing water at the center',
}

const ENVIRONMENT: Record<Element, string> = {
  목: 'a lush forest and green fields all around',
  화: 'a sky lit with warm sunset light',
  토: 'wide rolling plains and mountains',
  금: 'rugged rocky cliffs and autumn air',
  수: 'a wide river, lake or sea spreading out',
}

const YONGSIN_ACCENT: Record<Element, string> = {
  목: 'fresh new sprouts and vines bringing life',
  화: 'warm sunlight and a gentle campfire glow',
  토: 'solid steady ground giving a sense of safety',
  금: 'crisp clear light and refined stillness',
  수: 'a clear stream or moonlit water bringing calm',
}

const BRANCH_SEASON: Record<string, string> = {
  寅: 'early spring', 卯: 'spring', 辰: 'late spring',
  巳: 'early summer', 午: 'summer', 未: 'late summer',
  申: 'early autumn', 酉: 'autumn', 戌: 'late autumn',
  亥: 'early winter', 子: 'winter', 丑: 'late winter',
}

export const STYLE_CONFIGS: Record<string, { label: string; suffix: string }> = {
  oriental: {
    label: '수묵담채화',
    suffix:
      'Traditional Korean oriental ink wash painting (sumukhwa), soft ink gradients, ' +
      'elegant empty space, calm and philosophical mood, high quality.',
  },
  ghibli: {
    label: '지브리풍',
    suffix:
      'Studio Ghibli style soft watercolor, lush greenery, warm gentle light, ' +
      'healing and peaceful atmosphere, anime background art, high quality.',
  },
}

function strengthModifier(value: number, total: number): string {
  if (total <= 0) return 'gently present'
  const ratio = value / total
  if (ratio >= 0.4) return 'dominant and vast, filling most of the scene'
  if (ratio >= 0.28) return 'expansive and wide-reaching'
  return 'clearly visible but balanced'
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

  const season = BRANCH_SEASON[monthBranch] ?? 'a clear day'
  const yongElement = (['목', '화', '토', '금', '수'].includes(yongsin)
    ? yongsin
    : dayElement) as Element

  const styleCfg = STYLE_CONFIGS[style] ?? STYLE_CONFIGS.oriental
  const envMod = strengthModifier(sorted[0]?.[1] ?? 0, total)

  const prompt = [
    `A serene landscape painting set in ${season}.`,
    `At the heart of the scene: ${SUBJECT[dayElement]}.`,
    `Surrounding it: ${ENVIRONMENT[strongElement]}, ${envMod}.`,
    `A key warm touch of ${YONGSIN_ACCENT[yongElement]}.`,
    `No people, no text, no letters.`,
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
