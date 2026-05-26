import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API not configured' }, { status: 500 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const mimeType = file.type || 'application/octet-stream'
  const isImage = SUPPORTED_IMAGE_TYPES.includes(mimeType)
  const isPdf = mimeType === 'application/pdf'

  if (!isImage && !isPdf) {
    return NextResponse.json({ date: null })
  }

  try {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const prompt =
      'Look at this document and find the expiration date (labeled EXP, EXPIRES, EXPIRATION DATE, or similar). ' +
      'Reply with ONLY the date in YYYY-MM-DD format (e.g. 2027-01-31). ' +
      'If the document shows month/year only (e.g. 01/27 or 01/2027), use the last day of that month. ' +
      'If there is no expiration date, reply with the single word: none'

    const contentBlock: Anthropic.MessageParam['content'][number] = isImage
      ? {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        }
      : {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        } as Anthropic.MessageParam['content'][number]

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [
        {
          role: 'user',
          content: [contentBlock, { type: 'text', text: prompt }],
        },
      ],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : 'none'
    const dateMatch = raw.match(/\d{4}-\d{2}-\d{2}/)
    const date = dateMatch ? dateMatch[0] : null
    return NextResponse.json({ date })
  } catch (err) {
    console.error('extract-expiry error:', err)
    return NextResponse.json({ date: null })
  }
}
