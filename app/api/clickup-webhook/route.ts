import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Recursively locate a list id anywhere in the ClickUp payload.
function findListId(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null
  if (obj.list_id) return String(obj.list_id)
  if (obj.list?.id) return String(obj.list.id)
  if (obj.parent_id) return String(obj.parent_id)
  for (const k in obj) {
    const found = findListId(obj[k])
    if (found) return found
  }
  return null
}

// ClickUp fires this when a task completes → log it as EXECUTED history,
// routed to the domain that owns the list.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const listId = findListId(body)
    const taskName = body.payload?.name ?? body.task?.name ?? 'Completed Task'

    const sb = createServerSupabase()
    let domain = 'general'
    if (listId) {
      const { data } = await sb.from('mc_domains').select('key').eq('clickup_list_id', listId).maybeSingle()
      if (data?.key) domain = data.key
    }
    await sb.from('mc_logs').insert({
      domain, message: `EXECUTED: ${taskName}`, source: 'ClickUp Automation',
      status: 'resolved', outcome: 'EXECUTED', gm_note: `Verified in ${domain.toUpperCase()}`,
      reviewed_at: new Date().toISOString(),
    })
    return new Response('OK')
  } catch (e: any) {
    return new Response(e.message ?? 'error', { status: 500 })
  }
}
