import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { messages, context } = req.body
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const system = `You are a personal stylist — direct, warm, and fun. You already analyzed this person's outfit.

Context:
- Style category: ${context.category || 'not specified'}
- What they're going for: ${context.stylePrompt || 'not specified'}
- Your initial analysis: ${JSON.stringify(context.analysis)}

Keep ALL responses SHORT — 2-4 sentences max. Like texting a stylish friend. Be direct and specific. Ask follow-up questions to learn about their closet, lifestyle, and style goals. You're building a relationship as their personal stylist.

When you mention a specific product or item the user could shop for, format it like this: [item name](search query) — for example: [slim white Oxford shirt](slim fit white oxford shirt mens). Only do this when it genuinely helps, not for every item mentioned.`

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system,
      messages,
    })

    res.status(200).json({ reply: message.content[0].text })
  } catch (err) {
    console.error('[chat]', err.message)
    res.status(500).json({ error: err.message })
  }
}
