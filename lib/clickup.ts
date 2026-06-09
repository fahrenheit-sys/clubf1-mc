// ClickUp API — create a task in a domain's list when the GM dispatches an
// insight. Server-only.
const PRIORITY_MAP: Record<string, number> = { Urgent: 1, High: 2, Normal: 3, Low: 4 }

export async function createClickUpTask(opts: {
  listId: string
  name: string
  description: string
  priority?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.CLICKUP_API_KEY
  if (!key) return { ok: false, error: 'CLICKUP_API_KEY is not set' }

  const body: Record<string, unknown> = {
    name: opts.name,
    description: opts.description,
    status: 'to do',
    priority: PRIORITY_MAP[opts.priority ?? 'Normal'] ?? 3,
  }
  // Optional default assignee (the GM), overridable via env.
  const assignee = process.env.CLICKUP_ASSIGNEE_ID
  if (assignee) body.assignees = [Number(assignee)]

  const res = await fetch(`https://api.clickup.com/api/v2/list/${opts.listId}/task`, {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    return { ok: false, error: `ClickUp ${res.status}: ${t.slice(0, 200)}` }
  }
  return { ok: true }
}
