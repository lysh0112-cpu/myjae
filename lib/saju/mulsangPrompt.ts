type Element = '목' | '화' | '토' | '금' | '수'

const STEM_ELEMENT: Record<string, Element> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

// 천간 10개 — 주인공(일간)이 될 때의 묘사 (위치는 구도 지시에서 따로 잡음)
const STEM_SUBJECT: Record<string, string> = {
  甲: 'a single large dignified tree (like an old pine or oak) as the clear main subject',
  乙: 'graceful flowers, vines and soft grass as the clear main subject',
  丙: 'a warm bright sun as the clear main subject of the scene',
  丁: 'a small warm glowing lamp light or candle-like gentle flame (and soft moonlight) as the main subject, not the sun',
  戊: 'a great solid mountain as the clear main subject',
  己: 'a gentle hill with a tended field or garden as the clear main subject',
  庚: 'a strong solid rock or boulder as the clear main subject',
  辛: 'a refined jewel-like stone or delicate frost gleaming as the clear main subject',
  壬: 'a wide deep river or sea as the clear main subject',
  癸: 'a gentle stream, dew or soft rain as the clear main subject',
}

// 각 천간이 배경/요소로 등장할 때의 묘사
const STEM_FEATURE: Record<string, string> = {
  甲: 'tall trees',
  乙: 'flowers and soft grass',
  丙: 'bright sunlight',
  丁: 'a soft warm glow (lamplight or moonlight)',
  戊: 'a large mountain',
  己: 'low hills and fields',
  庚: 'rocks and boulders',
  辛: 'small gleaming stones or frost',
  壬: 'a wide river or sea',
  癸: 'a small stream, dew or light rain',
}

// 계절 (월지) — 사실대로, 단 아름답고 희망적으로
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
  子: 'winter, serene and beautiful, with gentle warm light bringing hope to the calm scene',
  丑: 'late winter, still and peaceful, with the first warm hint of coming spring',
}

export const STYLE_CONFIGS: Record<string, { label: string; suffix: string }> = {
  ghibli: {
    label: '지브리풍',
    suffix:
      'Studio Ghibli style soft watercolor, warm gentle light, beautiful scenery, ' +
      'healing hopeful and peaceful atmosphere, anime background art, beautiful and uplifting, high quality. ' +
      'A complete landscape painting, not a diagram, no text or letters.',
  },
  oriental: {
    label: '수묵담채화',
    suffix:
      'Traditional Korean oriental ink wash painting (sumukhwa) with soft color tints, ' +
      'gentle ink gradients, warm hopeful and dignified atmosphere, beautiful and uplifting, high quality. ' +
      'A complete landscape painting, not a diagram, no text or letters.',
  },
}

function amountPhrase(count: number): string {
  if (count >= 3) return 'abundant and prominent, filling much of the scene'
  if (count === 2) return 'clearly present in a moderate amount'
  return 'present in a small, subtle amount'
}

export interface MulsangPromptInput {
  dayStem: string
  monthBranch: string
  stems: string[]
  elementScores: Record<string, number>
  yongsin: string
  style: string
}

export interface MulsangPromptResult {
  prompt: string
  dayElement: Element
  season: string
  styleLabel: string
}

export function buildMulsangPrompt(input: MulsangPromptInput): MulsangPromptResult {
  const { dayStem, monthBranch, stems, yongsin, style } = input
  const dayElement = (STEM_ELEMENT[dayStem] ?? '목') as Element
  const season = BRANCH_SEASON[monthBranch] ?? 'a beautiful clear day'
  const styleCfg = STYLE_CONFIGS[style] ?? STYLE_CONFIGS.oriental

  const subject = STEM_SUBJECT[dayStem] ?? STEM_SUBJECT['甲']

  const counts: Record<string, number> = {}
  for (const s of stems) {
    if (!STEM_FEATURE[s]) continue
    counts[s] = (counts[s] || 0) + 1
  }
  if (counts[dayStem]) counts[dayStem] -= 1

  const featureParts: string[] = []
  for (const [stem, count] of Object.entries(counts)) {
    if (count <= 0) continue
    featureParts.push(`${STEM_FEATURE[stem]} (${amountPhrase(count)})`)
  }
  const surroundings = featureParts.length > 0
    ? `The surrounding scenery includes: ${featureParts.join('; ')}.`
    : `The surrounding scenery is simple and calm, keeping focus on the main subject.`

  const yongElement = (['목', '화', '토', '금', '수'].includes(yongsin) ? yongsin : dayElement) as Element
  const YONG_LIGHT: Record<Element, string> = {
    목: 'fresh tender new growth bringing vivid hopeful life',
    화: 'a warm hopeful glow of gentle light',
    토: 'steady reassuring ground giving a sense of safety',
    금: 'a crisp clear refined gleam of light',
    수: 'a clear gentle stream or soft hopeful reflection',
  }

  const prompt = [
    `A serene and beautiful landscape painting set in ${season}.`,
    `The main subject of the painting: ${subject}.`,
    surroundings,
    `A key warm hopeful touch of ${YONG_LIGHT[yongElement]}.`,
    // ⬇️ 구도 지시: 정중앙 금지, 멋스러운 동양화 구도
    `Composition: do NOT place the main subject dead-center. Use an artistic, well-balanced layout — ` +
      `place the main subject slightly off to one side following the rule of thirds, ` +
      `use graceful empty space (the beauty of negative space in oriental painting), ` +
      `and let natural lines (a winding river, path, or shoreline) guide the eye through the scene. ` +
      `The main subject should still be clearly the focal point, beautifully framed.`,
    `Important: depict each element only in the amount described — do not exaggerate or add elements that are not mentioned.`,
    `The overall mood is hopeful, warm and uplifting, never desolate or lonely, while staying true to the season.`,
    `One single complete scenic view. No people, no text, no letters, no charts or diagrams.`,
    styleCfg.suffix,
  ].join(' ')

  return { prompt, dayElement, season, styleLabel: styleCfg.label }
}
