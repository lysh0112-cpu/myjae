import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildToneBlockFromDB } from '@/lib/ai/tonePrompt'
import { logAiError } from '@/lib/ai/errorLog'

export const runtime = 'nodejs'
export const maxDuration = 60

interface Body {
  prompt: string
  dayStem: string
  dayElement: string
  yongsin: string
  season: string
  seasonKo?: string
  hourKo?: string
  sceneDesc?: string
  styleLabel: string
  style: string
  sajuText: string
  saju: unknown
  elementScores: unknown
  consultationId?: string   // 예약된 상담 건과 연결 (있으면)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // 읽기/일반 저장용 (anon)
    const supabase = supabaseUrl && anonKey
      ? createClient(supabaseUrl, anonKey)
      : null
    // Storage 업로드용 (service role 우선, 없으면 anon)
    const storageClient = supabaseUrl && (serviceKey || anonKey)
      ? createClient(supabaseUrl, serviceKey || anonKey!)
      : null

    const toneBlock = await buildToneBlockFromDB()

    let mulsangGuide = ''
    if (supabase) {
      try {
        const { data } = await supabase
          .from('tone_settings')
          .select('mulsang_guide')
          .eq('id', 1)
          .maybeSingle()
        mulsangGuide = (data?.mulsang_guide || '').trim()
      } catch (e) {
        console.error('mulsang_guide load error:', e)
      }
    }

    // ---------- 1) Claude 해설 생성 ----------
    const commentaryPrompt = `${toneBlock}

${mulsangGuide}

당신은 따뜻하면서도 정직한 명리학 전문가입니다.
아래 사주를 "자연 풍경 그림"에 빗대어 해설합니다. 이 해설은 고객이 돈을 내고 받는 결과물입니다.

[반드시 지킬 기능 규칙]
- 아래 '그림에 그려진 풍경'과 반드시 일치하게 설명하세요. 그림에 없는 것을 지어내지 마세요.
- 시간과 계절을 혼동하지 마세요. 아래 명시된 계절과 시간대를 정확히 사용하세요.
- 마크다운 기호(##, **, ---)는 절대 쓰지 마세요.

[이 사람의 정보]
사주: ${body.sajuText}
일간(그림의 주인공): ${body.dayStem}
태어난 계절: ${body.seasonKo || body.season}
태어난 시간대: ${body.hourKo || '시간 정보 없음'}
용신(가장 필요한 기운): ${body.yongsin}

[그림에 실제로 그려진 풍경]
${body.sceneDesc || body.prompt}

위 '그림에 그려진 풍경'과 일치하도록, 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "이 풍경화의 제목 (그림 분위기와 맞게)",
  "subject": "주인공(일간) 해설 2~3문장 — 그림 속 주인공 대상이 곧 당신. 그림에 그려진 그대로 설명",
  "environment": "주변 풍경(다른 기운들) 해설 2~3문장 — 그림에 그려진 만큼만 설명. 사실대로, 강점 중심으로",
  "yongsin": "핵심 에너지(용신) 해설 2~3문장 — 그림 속 따뜻한 빛/물/땅의 의미와 그것이 주는 도움",
  "advice": "삶의 조언 2~3문장 — 팩트를 인정하되 희망적이고 실질적으로"
}`

    let commentary: Record<string, string> = {
      title: '당신의 사주 풍경', subject: '', environment: '', yongsin: '', advice: '',
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    async function runCommentary() {
      if (!anthropicKey) return
      try {
        const cRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            messages: [{ role: 'user', content: commentaryPrompt }],
          }),
        })
        const cData = await cRes.json()
        const rawText = cData.content?.find((c: { type: string }) => c.type === 'text')?.text || '{}'
        const clean = rawText.replace(/```json|```/g, '').trim()
        try { commentary = JSON.parse(clean) } catch { commentary.subject = clean.slice(0, 200) }
      } catch (e) {
        console.error('claude error:', e)
      }
    }

    // ---------- 2) gpt-image-1 그림 생성 ----------
    let imageB64: string | null = null
    let imageNote = ''
    const openaiKey = process.env.OPENAI_API_KEY
    // ★2026-07-21: 그림 자체 시간 제한. Vercel 함수 상한(maxDuration=60초)에
    //   그냥 걸리면 오류 처리조차 못 하고 "그림이 아직 없어요"로 빠지던 사고가 있었다.
    //   그 전에 우리가 55초에 끊어 원인을 imageNote/로그로 남긴다.
    const IMAGE_TIMEOUT_MS = 55000
    async function runImage() {
      if (!openaiKey) { imageNote = 'no_openai_key'; return }
      const startedAt = Date.now()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS)
      try {
        const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: body.prompt,
            n: 1,
            size: '1024x1024',
          }),
          signal: controller.signal,
        })
        const imgData = await imgRes.json()
        imageB64 = imgData.data?.[0]?.b64_json ?? null
        // ★소요 시간 로그: Vercel Logs에서 실제 걸린 시간을 확인하기 위한 것.
        //   (화질 개선/제한시간 조정 판단의 근거. 2026-07-21 C안 미확인 항목)
        const elapsed = Date.now() - startedAt
        console.log(`[mulsang-image] elapsed=${elapsed}ms ok=${!!imageB64} style=${body.style ?? '-'}`)
        if (!imageB64) {
          // OpenAI가 준 실제 사유를 화면까지 전달 (크레딧·인증·정책 등 구분용)
          const apiMsg = imgData?.error?.message || imgData?.error?.code || imgData?.error?.type
          imageNote = apiMsg ? `image_failed: ${String(apiMsg).slice(0, 200)}` : 'image_failed'
          console.error('gpt-image response:', JSON.stringify(imgData).slice(0, 500))
          // 관리자 화면에서도 원인을 볼 수 있게 남긴다(2026-07-20 그림 멈춤 사고).
          await logAiError('mulsang-image', imgRes.status, imgData?.error || imgData)
        }
      } catch (e) {
        const elapsed = Date.now() - startedAt
        // AbortError = 우리가 55초에 끊은 것. 그 외는 네트워크·기타 오류.
        const aborted = e instanceof Error && e.name === 'AbortError'
        if (aborted) {
          imageNote = 'image_timeout'
          console.error(`[mulsang-image] TIMEOUT at ${elapsed}ms (limit ${IMAGE_TIMEOUT_MS}ms)`)
          await logAiError('mulsang-image', 408, { reason: 'self_timeout', elapsed })
        } else {
          console.error('gpt-image error:', e)
          imageNote = 'image_error: ' + (e instanceof Error ? e.message.slice(0, 150) : 'unknown')
        }
      } finally {
        clearTimeout(timer)
      }
    }

    // ★2026-07-21: 4칸 해설(runCommentary)은 화면 어디에도 표시되지 않아 호출을 껐다.
    //   해설은 /api/tongbyeon 의 "그림 전체 해설" 하나로 통일했다. (장당 약 89원 절약)
    //   되살리려면 아래 상수를 true 로 — 함수와 프롬프트는 그대로 보존해 뒀다.
    const RUN_4CARD_COMMENTARY = false
    await Promise.all([
      RUN_4CARD_COMMENTARY ? runCommentary() : Promise.resolve(),
      runImage(),
    ])

    // ---------- 3) 이미지를 Storage(mulsang 버킷)에 실제 업로드 → 진짜 URL ----------
    let imageUrl: string | null = null
    if (imageB64 && storageClient) {
      try {
        const bytes = Buffer.from(imageB64, 'base64')
        const fileName = `mulsang_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`
        const { error: upErr } = await storageClient
          .storage
          .from('mulsang')
          .upload(fileName, bytes, { contentType: 'image/png', upsert: false })
        if (upErr) {
          console.error('storage upload error:', upErr)
          imageNote = 'upload_failed'
        } else {
          const { data: pub } = storageClient.storage.from('mulsang').getPublicUrl(fileName)
          imageUrl = pub?.publicUrl ?? null
        }
      } catch (e) {
        console.error('storage exception:', e)
        imageNote = 'upload_exception'
      }
    }

    // ---------- 4) Supabase DB 저장 (진짜 image_url + consultation_id) ----------
    let savedId: string | null = null
    let saveError: string | null = null
    if (supabase) {
      const { data, error: insErr } = await supabase
        .from('mulsang_images')
        .insert({
          consultation_id: body.consultationId ?? null,
          saju: body.saju,
          element_scores: body.elementScores,
          day_master: body.dayStem,
          yongsin: body.yongsin,
          style: body.style,
          prompt: body.prompt,
          image_url: imageUrl,
          commentary,
        })
        .select('id')
        .single()
      if (insErr) {
        saveError = insErr.message
        console.error('supabase insert error:', insErr)
      } else {
        savedId = data?.id ?? null
      }
    }

    // 화면 표시는 즉시 base64로도 가능하게 함께 반환 (Storage URL이 우선)
    const displayUrl = imageUrl || (imageB64 ? `data:image/png;base64,${imageB64}` : null)

    return NextResponse.json({
      commentary,
      imageUrl: displayUrl,
      storedUrl: imageUrl,
      imageNote,
      savedId,
      saveError,
      prompt: body.prompt,
    })
  } catch (e) {
    console.error('mulsang route error:', e)
    return NextResponse.json({ error: 'mulsang_failed' }, { status: 500 })
  }
}
