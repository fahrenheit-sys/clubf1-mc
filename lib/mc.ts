import { createServerSupabase } from './supabase-server'

export type Domain = {
  key: string
  label: string
  mission: string | null
  context: string | null
  clickup_list_id: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
}

export type LogItem = {
  id: string
  domain: string
  status: 'pending' | 'resolved'
  message: string
  source: string | null
  outcome: string | null
  gm_note: string | null
  priority: string | null
  received_at: string
  reviewed_at: string | null
}

const COLS = 'id, domain, status, message, source, outcome, gm_note, priority, received_at, reviewed_at'

export async function getDomains(): Promise<Domain[]> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('mc_domains')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`Failed to load domains: ${error.message}`)
  return (data ?? []) as Domain[]
}

export async function getDomain(key: string): Promise<Domain | null> {
  const supabase = createServerSupabase()
  const { data } = await supabase.from('mc_domains').select('*').eq('key', key).maybeSingle()
  return (data as Domain) ?? null
}

// Pending counts per domain, for the dashboard badges.
export async function getPendingCounts(): Promise<Record<string, number>> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.from('mc_logs').select('domain').eq('status', 'pending')
  if (error) throw new Error(`Failed to load counts: ${error.message}`)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) counts[(row as { domain: string }).domain] = (counts[(row as { domain: string }).domain] ?? 0) + 1
  return counts
}

export async function getPending(domain: string): Promise<LogItem[]> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('mc_logs').select(COLS)
    .eq('domain', domain).eq('status', 'pending')
    .order('received_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as LogItem[]
}

export async function getHistory(domain: string, limit = 100): Promise<LogItem[]> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('mc_logs').select(COLS)
    .eq('domain', domain).eq('status', 'resolved')
    .order('received_at', { ascending: false }).limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as LogItem[]
}

export async function insertInsight(domain: string, message: string, source: string): Promise<void> {
  const supabase = createServerSupabase()
  const { error } = await supabase.from('mc_logs').insert({ domain, message, source, status: 'pending' })
  if (error) throw new Error(error.message)
}

export async function resolveInsight(id: string, outcome: string, gmNote: string, priority: string): Promise<void> {
  const supabase = createServerSupabase()
  const { error } = await supabase.from('mc_logs')
    .update({ status: 'resolved', outcome, gm_note: gmNote, priority, reviewed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function vaultDoc(domain: string, content: string): Promise<void> {
  const supabase = createServerSupabase()
  const { error } = await supabase.from('mc_logs').insert({
    domain, message: content, source: 'Vault', status: 'resolved', outcome: 'VAULTED',
    gm_note: 'Document injected into memory', reviewed_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function logChat(domain: string, transcript: string): Promise<void> {
  const supabase = createServerSupabase()
  const { error } = await supabase.from('mc_logs').insert({
    domain, message: transcript, source: 'Advisor Chat', status: 'resolved', outcome: 'CHAT',
    gm_note: 'Committed from advisor chat', reviewed_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function deleteLog(id: string): Promise<void> {
  const supabase = createServerSupabase()
  const { error } = await supabase.from('mc_logs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
