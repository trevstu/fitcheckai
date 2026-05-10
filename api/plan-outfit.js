import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { eventPrompt, profile, closetItems } = req.body
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const contextLines = []
    if (profile) {
      if (profile.name) contextLines.push(`Name: ${profile.name}`)
      if (profile.gender) contextLines.push(`Gender: ${profile.gender}`)
      if (profile.fit_preference) contextLines.push(`Fit preference: ${profile.fit_preference}`)
      if (profile.budget) contextLines.push(`Budget per item: ${profile.budget}`)
      if (profile.favorite_brands) contextLines.push(`Favorite brands: ${profile.favorite_brands}`)
      if (profile.climate) contextLines.push(`Climate: ${profile.climate}`)
    }
    if (closetItems && closetItems.length > 0) contextLines.push(`Items in their closet: ${closetItems.join(', ')}`)
    const contextStr = contextLines.length ? `\n\nUser context:\n${contextLines.join('\n')}` : ''

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a personal stylist — direct, warm, and sharp. Your client needs help planning an outfit.

Event: "${eventPrompt}"${contextStr}

Build them a complete outfit for this event. Keep all text SHORT and punchy — like texting a stylish friend.

If they have closet items, reference those first using action "wear". For pieces they need to buy or add, use action "add". Aim for 3-5 moves total.

Return ONLY a raw JSON object (no markdown, no extra text):
{
  "vibe": "<2-3 word vibe label for this look e.g. 'Brooklyn Day Party' or 'Rooftop Ready'>",
  "breakdown": {
    "fit": "<silhouette direction>",
    "color": "<color palette>",
    "styling": "<one key styling note>",
    "vibe": "<the energy>"
  },
  "moves": [
    {"action": "wear", "item": "<specific item from their closet>", "reason": "<why it works>", "imageQuery": "<3-5 word image search to style this item>"},
    {"action": "add", "item": "<specific piece to get>", "reason": "<why it works>", "imageQuery": "<3-5 word shopping image search for this item>"}
  ],
  "highlight": "<the most important piece or styling decision for this look, one sentence>",
  "question": "<one casual follow-up question about the event or their style>"
}`
      }]
    })

    const text = message.content[0].text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Could not parse response')
    res.status(200).json(JSON.parse(match[0]))
  } catch (err) {
    console.error('[plan-outfit]', err.message)
    res.status(500).json({ error: err.message })
  }
}
