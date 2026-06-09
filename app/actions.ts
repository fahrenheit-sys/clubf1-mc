'use server'

import { revalidatePath } from 'next/cache'
import { requireMcAccess } from '@/lib/auth'
import { resolveInsight, vaultDoc, logChat, deleteLog, getDomain, getHistory, getPending, type LogItem } from '@/lib/mc'
import { createServerSupabase } from '@/lib/supabase-server'
import { createClickUpTask } from '@/lib/clickup'
import { askClaude, MODELS } from '@/lib/anthropic'

export type Result = { ok: true } | { ok: false; error: string }
export type ChatResult = { ok: true; reply: string } | { ok: false; error: string }
export type BriefResult = { ok: true; text: string } | { ok: false; error: string }

function advisorSystemPrompt(label: string, mission: string | null, context: string | null) {
  return [
    `You are the ${label} advisor for Fahrenheit One @ Hakoah White City, a premium health & wellness club.`,
    mission ? `Domain mission: ${mission}` : '',
    context ? `Domain context & knowledge:\n${context}` : '',
    `Be concise, strategic and practical. Give the GM clear, actionable guidance for this domain.`,
  ].filter(Boolean).join('\n\n')
}

export async function resolve(id: string, action: 'consider' | 'ignore', gmNote: string, priority: string, syncClickUp: boolean): Promise<Result> {
  await requireMcAccess()
  const sb = createServerSupabase()
  const { data: log } = await sb.from('mc_logs').select('domain, message').eq('id', id).maybeSingle()
  if (!log) return { ok: false, error: 'Insight not found' }

  if (action === 'consider' && syncClickUp) {
    const dom = await getDomain(log.domain as string)
    if (dom?.clickup_list_id) {
      const r = await createClickUpTask({
        listId: dom.clickup_list_id,
        name: `[F1: ${String(log.domain).toUpperCase()}] ${String(log.message).slice(0, 50)}`,
        description: `INSIGHT: ${log.message}\n\nGM DIRECTIVE: ${gmNote || '—'}`,
        priority,
      })
      if (!r.ok) return r
    }
  }
  await resolveInsight(id, action === 'consider' ? 'CONSIDERED' : 'IGNORED', gmNote, priority)
  revalidatePath('/')
  return { ok: true }
}

export async function loadPending(domain: string): Promise<LogItem[]> {
  await requireMcAccess()
  return getPending(domain)
}

export async function loadHistory(domain: string): Promise<LogItem[]> {
  await requireMcAccess()
  return getHistory(domain)
}

export async function vault(domain: string, content: string): Promise<Result> {
  await requireMcAccess()
  if (!content.trim()) return { ok: false, error: 'Nothing to vault' }
  await vaultDoc(domain, content)
  revalidatePath('/')
  return { ok: true }
}

export async function removeLog(id: string): Promise<Result> {
  await requireMcAccess()
  await deleteLog(id)
  revalidatePath('/')
  return { ok: true }
}

export async function chat(domain: string, history: { role: 'user' | 'assistant'; content: string }[], message: string): Promise<ChatResult> {
  await requireMcAccess()
  if (!message.trim()) return { ok: false, error: 'Empty message' }
  const dom = await getDomain(domain)
  if (!dom) return { ok: false, error: 'Unknown domain' }
  try {
    const reply = await askClaude({
      system: advisorSystemPrompt(dom.label, dom.mission, dom.context),
      messages: [...history.slice(-10), { role: 'user', content: message }],
      model: MODELS.chat,
    })
    return { ok: true, reply }
  } catch (e: any) {
    return { ok: false, error: e.message ?? 'Advisor unavailable' }
  }
}

export async function commitChat(domain: string, transcript: string): Promise<Result> {
  await requireMcAccess()
  if (!transcript.trim()) return { ok: false, error: 'Nothing to commit' }
  await logChat(domain, transcript)
  revalidatePath('/')
  return { ok: true }
}

export async function brief(domain: string, period: string): Promise<BriefResult> {
  await requireMcAccess()
  const dom = await getDomain(domain)
  if (!dom) return { ok: false, error: 'Unknown domain' }
  const history = await getHistory(domain, 100)
  const log = history.map(h => `[${h.outcome ?? '—'}] ${h.message}${h.gm_note ? ` | GM: ${h.gm_note}` : ''}`).join('\n---\n')
  try {
    const text = await askClaude({
      system: advisorSystemPrompt(dom.label, dom.mission, dom.context) + '\n\nWrite a clear executive strategic brief.',
      messages: [{ role: 'user', content: `Produce the ${dom.label} executive brief for ${period}.\n\nActivity log:\n${log || '(no activity recorded)'}` }],
      model: MODELS.brief,
      maxTokens: 2000,
    })
    return { ok: true, text }
  } catch (e: any) {
    return { ok: false, error: e.message ?? 'Brief generation failed' }
  }
}
