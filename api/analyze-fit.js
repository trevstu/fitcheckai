import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64Image, mimeType, frames, isVideo, category, stylePrompt, inspirationImage } = req.body
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const content = frames
      ? frames.map(f => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.replace(/^data:[^;]+;base64,/, '') } }))
      : [{ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image.replace(/^data:[^;]+;base64,/, '') } }]

    if (isVideo) content.push({ type: 'text', text: `(The ${frames.length} images above are evenly spaced frames from a short fit check video.)` })

    if (inspirationImage) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: inspirationImage.replace(/^data:[^;]+;base64,/, '') },
      })
      content.push({ type: 'text', text: '(Second image above is their style inspiration reference.)' })
    }

    const contextLines = []
    if (category) contextLines.push(`Style category: ${category}`)
    if (stylePrompt) contextLines.push(`What they're going for: "${stylePrompt}"`)
    const contextStr = contextLines.length ? `\n\nUser context:\n${contextLines.join('\n')}` : ''

    content.push({
      type: 'text',
      text: `You are a personal stylist — direct, warm, and sharp. Analyze the outfit in the first image.${contextStr}

Your job is not to rate. Your job is to style.

Keep all text SHORT and punchy — like texting a stylish friend. No long paragraphs.

Return ONLY a raw JSON object (no markdown, no extra text):
{
  "vibe": "<2-3 word vibe label e.g. 'Off-Duty Cool' or 'Almost There'>",
  "breakdown": {
    "fit": "<one punchy sentence>",
    "color": "<one punchy sentence>",
    "styling": "<one punchy sentence>",
    "vibe": "<one punchy sentence>"
  },
  "moves": [
    {"action": "add", "item": "<specific item>", "reason": "<one short sentence>"},
    {"action": "swap", "item": "<what to swap and for what>", "reason": "<one short sentence>"},
    {"action": "remove", "item": "<specific item>", "reason": "<one short sentence>"}
  ],
  "highlight": "<what is genuinely working, one sentence>",
  "question": "<one conversational follow-up question a stylist would ask, keep it casual>"
}`,
    })

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })

    const text = message.content[0].text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Could not parse response')
    res.status(200).json(JSON.parse(match[0]))
  } catch (err) {
    console.error('[analyze-fit]', err.message)
    res.status(500).json({ error: err.message })
  }
}
