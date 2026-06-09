import { NextResponse } from 'next/server'
import { getDomain, insertInsight } from '@/lib/mc'

export const dynamic = 'force-dynamic'

// Capture an insight from Siri / Telegram / the advisory bridge.
// Secured with the MC_INTAKE_SECRET header (the old worker endpoint was open).
export async function POST(req: Request) {
  const secret = req.headers.get('x-mc-secret')
  if (!process.env.MC_INTAKE_SECRET || secret !== process.env.MC_INTAKE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({} as any))
    let content = body.insight ?? body.text ?? body.message?.text ?? body.message ?? ''
    if (typeof content === 'object') content = JSON.stringify(content)
    content = String(content).trim()
    if (!content) return NextResponse.json({ error: 'No content' }, { status: 400 })

    let domain = String(body.domain ?? 'general').toLowerCase()
    if (!(await getDomain(domain))) domain = 'general' // unknown domain → general
    const source = body.message?.from?.first_name ?? body.sender ?? body.source ?? 'System'

    await insertInsight(domain, content, String(source))
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active', endpoint: 'Mission Control — intake' })
}
