import { redirect } from 'next/navigation'
import { getLiveSessionUser } from '@/lib/auth'
import { accessFor, TOOL } from '@/lib/access'
import { getDomains, getPendingCounts, type Domain } from '@/lib/mc'
import MissionControl from './mc-client'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const live = await getLiveSessionUser()
  if (!live) redirect('https://clubf1.tech/login?next=https://mc.clubf1.tech/')
  if (!accessFor(live, TOOL)) redirect('https://clubf1.tech/') // no MC grant → back to hub

  let domains: Domain[] = []
  let counts: Record<string, number> = {}
  let setupNeeded = false
  try {
    domains = await getDomains()
    counts = await getPendingCounts()
    if (domains.length === 0) setupNeeded = true
  } catch {
    setupNeeded = true // mc_domains table not created yet
  }

  return <MissionControl domains={domains} counts={counts} setupNeeded={setupNeeded} userEmail={live.email} />
}
