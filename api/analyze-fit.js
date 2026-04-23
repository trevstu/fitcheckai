import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { base64Image, mimeType } = req.body

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image.replace(/^data:[^;]+;base64,/, ''),
              },
            },
            {
              type: 'text',
              text: `You are a professional fashion stylist. Analyze the outfit in this image.
Be honest, sophisticated, and slightly editorial.

Scoring system — rate each category 1–10, then calculate the final score as a weighted average:
  fit      × 0.35  (garment fit on the body — the single most important factor)
  styling  × 0.25  (how pieces work together: layering, accessories, cohesion)
  color    × 0.25  (palette harmony, contrast, complementary combinations)
  vibe     × 0.15  (aesthetic coherence — does it tell a consistent story)

Round the final score to one decimal place (e.g. 7.4).

Return ONLY a raw JSON object with this exact structure (no markdown, no extra text):
{
  "score": <weighted average 1–10, one decimal>,
  "scores": { "fit": <1-10>, "styling": <1-10>, "color": <1-10>, "vibe": <1-10> },
  "verdict": "<2-4 word verdict>",
  "breakdown": {
    "fit": "...",
    "color": "...",
    "vibe": "...",
    "styling": "..."
  },
  "highlight": "<what is working well>",
  "fix": "<one specific actionable improvement>",
  "overall": "<2-3 sentence honest take>",
  "suggestion": {
    "item": "<specific product name, e.g. 'Slim-fit white Oxford shirt'>",
    "reason": "<1 sentence on why this piece would elevate or complement the outfit>",
    "search": "<concise Google Shopping search query for this exact product>"
  }
}`,
            },
          ],
        },
      ],
    })

    const content = message.content[0].text
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse AI response')
    const parsed = JSON.parse(jsonMatch[0])

    res.status(200).json(parsed)
  } catch (err) {
    console.error('[analyze-fit]', err.message)
    res.status(500).json({ error: err.message })
  }
}
