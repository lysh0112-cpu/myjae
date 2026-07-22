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
  未: 'late summer, rich and abundant with mellow light',
  申: 'early autumn, clear and serene',
  酉: 'autumn, clear and beautiful with gentle seasonal color',
  戌: 'late autumn, calm and serene with soft light',
  亥: 'early winter, quiet and elegant with soft warm light on the horizon',
  子: 'winter, serene and beautiful, with gentle warm light bringing hope to the calm scene',
  丑: 'late winter, still and peaceful, with the first warm hint of coming spring',
}

// 시지(時支) → 그림의 시간대·빛. ★2026-07-21: 그림 프롬프트에 태어난 시각이
//   빠져 있어 AI가 매번 노을·여명으로만 그리던 문제를 고치기 위한 표.
//   해설용 문구(toTongbyeonInput.HOUR_MOOD)는 한글이라 그대로 못 쓴다.
//   여기서는 gpt-image-1 에 보낼 영어로, "하늘·빛의 시간대"만 지시한다.
//   계절(BRANCH_SEASON)은 대기·초목의 느낌을, 이 표는 하루 중 빛을 정한다.
const BRANCH_HOUR: Record<string, string> = {
  子: 'deep night under a calm starlit sky, gentle moonlight',
  丑: 'the small hours before dawn, quiet dark sky with soft moonlight',
  寅: 'first light of dawn, the sky just beginning to brighten at the horizon',
  卯: 'early morning, the sun rising with soft fresh morning light',
  辰: 'mid-morning, the sun well up with clear bright daylight',
  巳: 'late morning, bright and luminous daylight approaching noon',
  午: 'high noon, the sun at its highest with full bright daylight',
  未: 'early afternoon, warm full daylight',
  申: 'late afternoon, the sun lowering with warm slanting light',
  酉: 'golden hour at sunset, warm amber and rose light across the sky',
  戌: 'dusk, the last glow fading into early evening blue',
  亥: 'night has settled, a calm evening sky with soft light',
}

// ★화면에 띄울 화풍 — 2026-07-21 확정. 순서가 곧 화면 순서다.
//   화풍을 늘리려면 STYLE_CONFIGS 에 한 칸 넣고 이 배열에 키를 추가하면 된다.
//   (일시적으로 감추려면 이 배열에서만 빼면 STYLE_CONFIGS 는 그대로 남는다)
export const ACTIVE_STYLES: string[] = ['ghibli', 'shinkai', 'citypop', 'oriental']

// 화풍별 이모지 — 화면 카드에 쓴다.
export const STYLE_EMOJI: Record<string, string> = {
  ghibli: '🌿', shinkai: '✨', citypop: '🌆', oriental: '🎋',
}

// 화풍별 한 줄 설명 — 이름만으로 감이 안 오므로 카드에 작게 곁들인다.
export const STYLE_DESC: Record<string, string> = {
  ghibli: '따뜻한 수채',
  shinkai: '빛과 노을',
  citypop: '80년대 감성',
  oriental: '전통 한국화',
}

// ⚠️ 화풍 이름(label)과 아래 suffix 에는 실존 회사·작가 이름을 쓰지 않는다.
//    상품 화면에 상표를 쓰면 오인 소지가 있고, 프롬프트 쪽도 회색지대라
//    특징 묘사만으로 같은 결과를 내도록 했다. (2026-07-21 대표님 지시)
export const STYLE_CONFIGS: Record<string, { label: string; suffix: string }> = {
  ghibli: {
    label: '포근한 동화',
    suffix:
      'Hand-painted anime background art in soft watercolor, warm gentle light, ' +
      'lush nostalgic scenery, healing hopeful and peaceful atmosphere, ' +
      'nostalgic storybook feeling, beautiful and uplifting, high quality. ' +
      'A complete landscape painting, not a diagram, no text or letters.',
  },
  shinkai: {
    label: '빛나는 하늘',
    suffix:
      'Cinematic anime background art with a luminous sky, soft volumetric light rays, ' +
      'vivid clear colors, gentle lens flare and a few floating light particles, ' +
      'soft detailed clouds, deep perspective, sharp focus, emotional and beautiful, high quality. ' +
      'A complete landscape painting, not a diagram, no text or letters.',
  },
  citypop: {
    label: '레트로 시티팝',
    suffix:
      '1980s retro album cover illustration style (city pop / AOR aesthetic): ' +
      'clean bold linework, flat cel shading with subtle film grain, soft airbrush gradients, ' +
      'a nostalgic pastel palette with clear separation between sky, water and land — ' +
      'let each part keep its own natural color (blue water, green land, sky matching the time of day), ' +
      'not a single overall color wash. Breezy, refreshing, nostalgic mood, high quality. ' +
      'A complete landscape painting, not a diagram, no text or letters.',
  },
  oriental: {
    label: '수묵담채화',
    suffix:
      'Traditional Korean ink wash painting (sumukhwa / sansuhwa) on white hanji paper: ' +
      'black ink tones from deep charcoal to pale grey, with restrained light color tints ' +
      '(soft celadon green, pale blue, gentle earth tones) applied sparingly like watercolor. ' +
      'Plenty of white paper space, delicate brushwork, calm and dignified. ' +
      'Natural balanced color — NOT sepia, NOT monochrome yellow, NOT an overall amber or golden tint. ' +
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
  hourBranch?: string | null   // ★시지(時支). 시간 모름이면 생략 → 시간 지시를 아예 안 넣는다.
}

export interface MulsangPromptResult {
  prompt: string
  dayElement: Element
  season: string
  styleLabel: string
}

export function buildMulsangPrompt(input: MulsangPromptInput): MulsangPromptResult {
  const { dayStem, monthBranch, stems, yongsin, style, hourBranch } = input
  const dayElement = (STEM_ELEMENT[dayStem] ?? '목') as Element
  const season = BRANCH_SEASON[monthBranch] ?? 'a beautiful clear day'
  const styleCfg = STYLE_CONFIGS[style] ?? STYLE_CONFIGS.oriental
  // 시간대 지시: 시지가 있고 표에 있을 때만. 모르면 빈 문자열 → 프롬프트에서 빠짐.
  const timeOfDay = hourBranch && BRANCH_HOUR[hourBranch] ? BRANCH_HOUR[hourBranch] : ''

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
  // ⚠️ 여기 문구는 "빛의 의미"지 "색"이 아니다. 이미지 AI가 'warm'을 색온도(노랑)로
  //    읽어 화면이 세피아로 쏠리던 문제가 있었다(2026-07-22). 색을 미는 말(warm/golden)은
  //    빼고, 밝기·희망의 느낌만 남긴다. 실제 색은 화풍 suffix에서 통제한다.
  const YONG_LIGHT: Record<Element, string> = {
    목: 'fresh tender new growth bringing vivid hopeful life',
    화: 'a gentle hopeful glow of soft light',
    토: 'steady reassuring ground giving a sense of safety',
    금: 'a crisp clear refined gleam of light',
    수: 'a clear gentle stream or soft hopeful reflection',
  }

  const prompt = [
    `A serene and beautiful landscape painting set in ${season}.`,
    // ★태어난 시각의 하늘·빛. 시간 모름이면 이 줄이 통째로 빠져 AI가 알아서 정한다.
    timeOfDay ? `Time of day: ${timeOfDay}. The lighting of the whole scene must match this time of day.` : '',
    `The main subject of the painting: ${subject}.`,
    surroundings,
    `A key hopeful touch of ${YONG_LIGHT[yongElement]}.`,
    // ⬇️ 구도 지시: 정중앙 금지, 멋스러운 동양화 구도
    `Composition: do NOT place the main subject dead-center. Use an artistic, well-balanced layout — ` +
      `place the main subject slightly off to one side following the rule of thirds, ` +
      `use graceful empty space (the beauty of negative space in oriental painting), ` +
      `and let natural lines (a winding river, path, or shoreline) guide the eye through the scene. ` +
      `The main subject should still be clearly the focal point, beautifully framed.`,
    `Important: depict each element only in the amount described — do not exaggerate or add elements that are not mentioned.`,
    // "warm"은 색온도(노랑)로 읽히므로 뺀다. 감정 톤은 hopeful/uplifting으로 충분.
    `The overall mood is hopeful and uplifting, never desolate or lonely, while staying true to the season.`,
    `One single complete scenic view. No people, no text, no letters, no charts or diagrams.`,
    styleCfg.suffix,
  ].filter(Boolean).join(' ')

  return { prompt, dayElement, season, styleLabel: styleCfg.label }
}
