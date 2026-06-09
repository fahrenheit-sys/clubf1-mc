import { redirect } from 'next/navigation'
import { getLiveSessionUser } from '@/lib/auth'
import { accessFor, TOOL } from '@/lib/access'
import { getDomains, getPendingCounts, type Domain } from '@/lib/mc'
import MissionControl from './mc-client'

export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
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
      setupNeeded = true
    }

    return <MissionControl domains={domains} counts={counts} setupNeeded={setupNeeded} userEmail={live.email} />
  } catch (e: any) {
    // Let Next redirects pass through; surface any real error for diagnosis.
    if (typeof e?.digest === 'string' && e.digest.startsWith('NEXT_REDIRECT')) throw e
    return (
      <pre style={{ padding: 24, whiteSpace: 'pre-wrap', fontSize: 12, fontFamily: 'monospace' }}>
        {'MC_DEBUG\n' + String(e?.stack || e?.message || e)}
      </pre>
    )
  }
}
