import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { messages, profile, closetItems } = req.body
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const contextLines = []
    if (profile) {
      if (profile.name) contextLines.push(`Name: ${profile.name}`)
      if (profile.gender) contextLines.push(`Gender: ${profile.gender}`)
      if (profile.fit_preference) contextLines.push(`Fit preference: ${profile.fit_preference}`)
      if (profile.budget) contextLines.push(`Budget: ${profile.budget}`)
      if (profile.favorite_brands) contextLines.push(`Favorite brands: ${profile.favorite_brands}`)
      if (profile.climate) contextLines.push(`Climate: ${profile.climate}`)
    }
    if (closetItems && closetItems.length > 0) contextLines.push(`Their closet: ${closetItems.join(', ')}`)
    const contextStr = contextLines.length ? `\n\nClient context:\n${contextLines.join('\n')}` : ''

    const system = `You are a personal stylist — a direct, warm, and stylish best friend. Your client texts you photos of outfit options and asks for your honest take.${contextStr}

Keep ALL responses SHORT — 2-4 sentences max. Like texting a close friend. Be direct, opinionated, and specific. No bullet points or long paragraphs unless you're comparing multiple options.

When you mention a specific item they should buy or look for, format it as [item name](search query) — for example: [slim white Oxford shirt](slim fit white oxford shirt mens). Only do this when it genuinely adds value.`

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
