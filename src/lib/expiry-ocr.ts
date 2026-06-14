import Anthropic from '@anthropic-ai/sdk'

export const EXPIRY_DOC_TYPES: readonly string[] = [
  'CPR Certificate',
  "Driver's License / Identification - Front",
  "Driver's License / Identification - Back",
  "Driver's License - Front",
  "Driver's License - Back",
  "Driver's License",
  'EAD / Green card - Front',
  'EAD / Green card - Back',
  'EAD / Green card',
  'CARI Clearance',
  'Background Check',
  'IdentoGO',
]

const OCR_PROMPT =
  'Look at this document and find the expiration date (labeled EXP, EXPIRES, EXPIRATION DATE, or similar). ' +
  'Reply with ONLY the date in YYYY-MM-DD format (e.g. 2027-01-31). ' +
  'If the document shows month/year only (e.g. 01/27 or 01/2027), use the last day of that month. ' +
  'If there is no expiration date, reply with the single word: none'

export function mimeFromName(name: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return null
}

export async function extractExpiryFromBuffer(
  buf: Buffer,
  mimeType: string,
  anthropic: Anthropic,
): Promise<string | null> {
  const isImage = mimeType.startsWith('image/')
  const isPdf = mimeType === 'application/pdf'
  if (!isImage && !isPdf) return null

  const base64 = buf.toString('base64')

  const contentBlock: Anthropic.MessageParam['content'][number] = isImage
    ? {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64,
        },
      }
    : ({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      } as Anthropic.MessageParam['content'][number])

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 32,
    messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: OCR_PROMPT }] }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : 'none'
  const match = raw.match(/\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}
