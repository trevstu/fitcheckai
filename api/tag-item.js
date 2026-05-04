import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { base64Image, mimeType } = req.body
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image.replace(/^data:[^;]+;base64,/, '') } },
          { type: 'text', text: 'Identify this clothing item. Return ONLY a raw JSON object (no markdown): {"label": "<concise descriptive name e.g. Black slim Levi\'s 501 jeans>", "item_type": "<one of: tops, bottoms, shoes, outerwear, accessories, other>"}' }
        ]
      }]
    })

    const text = message.content[0].text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Could not parse response')
    res.status(200).json(JSON.parse(match[0]))
  } catch (err) {
    console.error('[tag-item]', err.message)
    res.status(500).json({ error: err.message })
  }
}
