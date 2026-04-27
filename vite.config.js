import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch (e) { reject(e) } })
  })
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    server: { host: true },
    plugins: [
      react(),
      {
        name: 'fitcheck-api',
        configureServer(server) {

          // analyze-fit
          server.middlewares.use('/api/analyze-fit', async (req, res) => {
            if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
            try {
              const { base64Image, mimeType, category, stylePrompt, inspirationImage } = await readBody(req)
              const { default: Anthropic } = await import('@anthropic-ai/sdk')
              const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

              const content = [
                { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image.replace(/^data:[^;]+;base64,/, '') } }
              ]

              if (inspirationImage) {
                content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: inspirationImage.replace(/^data:[^;]+;base64,/, '') } })
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
}`
              })

              const message = await client.messages.create({
                model: 'claude-opus-4-6',
                max_tokens: 1024,
                messages: [{ role: 'user', content }],
              })

              const text = message.content[0].text
              const match = text.match(/\{[\s\S]*\}/)
              if (!match) throw new Error('Could not parse response')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(JSON.parse(match[0])))
            } catch (err) {
              console.error('[analyze-fit]', err.message)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
          })

          // chat
          server.middlewares.use('/api/chat', async (req, res) => {
            if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
            try {
              const { messages, context } = await readBody(req)
              const { default: Anthropic } = await import('@anthropic-ai/sdk')
              const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

              const system = `You are a personal stylist — direct, warm, and fun. You already analyzed this person's outfit.

Context:
- Style category: ${context.category || 'not specified'}
- What they're going for: ${context.stylePrompt || 'not specified'}
- Your initial analysis: ${JSON.stringify(context.analysis)}

Keep ALL responses SHORT — 2-4 sentences max. Like texting a stylish friend. Be direct and specific. Ask follow-up questions to learn about their closet, lifestyle, and style goals.`

              const message = await client.messages.create({
                model: 'claude-opus-4-6',
                max_tokens: 512,
                system,
                messages,
              })

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ reply: message.content[0].text }))
            } catch (err) {
              console.error('[chat]', err.message)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
          })

        },
      },
    ],
  }
})
