'use client'
import { useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import type { Domain, LogItem } from '@/lib/mc'
import { UI } from '@/lib/theme'
import { resolve, vault, removeLog, chat, commitChat, brief, loadPending, loadHistory } from './actions'

const ACCENT = '#C15A35'

function fmt(s: string | null) {
  if (!s) return ''
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type ModalType = 'review' | 'history' | 'vault' | 'chat' | 'brief'

export default function MissionControl({ domains, counts, setupNeeded, userEmail }: {
  domains: Domain[]
  counts: Record<string, number>
  setupNeeded: boolean
  userEmail: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [modal, setModal] = useState<{ type: ModalType; domain: Domain } | null>(null)
  const [items, setItems] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const open = (type: ModalType, domain: Domain) => {
    setModal({ type, domain }); setItems([]); setErr(null)
    if (type === 'review' || type === 'history') {
      setLoading(true)
      ;(type === 'review' ? loadPending(domain.key) : loadHistory(domain.key))
        .then(setItems).catch(e => setErr(e.message)).finally(() => setLoading(false))
    }
  }
  const close = () => setModal(null)
  const refresh = () => router.refresh()

  const card: CSSProperties = { background: UI.surface, border: `1px solid ${UI.border}`, borderRadius: UI.radius, boxShadow: UI.shadow }
  const btn = (variant: 'solid' | 'ghost' | 'danger' = 'ghost'): CSSProperties => ({
    padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: pending ? 'default' : 'pointer',
    border: `1px solid ${variant === 'danger' ? '#E5B4AD' : UI.borderStrong}`,
    background: variant === 'solid' ? ACCENT : UI.surface,
    color: variant === 'solid' ? '#fff' : variant === 'danger' ? '#8B3A2E' : UI.text,
  })
  const input: CSSProperties = { width: '100%', background: UI.surface, border: `1px solid ${UI.borderStrong}`, borderRadius: UI.radiusSm, padding: '10px 12px', color: UI.text, fontSize: 13, outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: UI.bg }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 32px', background: UI.surface, borderBottom: `1px solid ${UI.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fahrenheit-one-logo.png" alt="Fahrenheit One" style={{ height: 26, width: 'auto' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: UI.text }}>Mission Control</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="https://clubf1.tech/" style={{ fontSize: 13, color: UI.textMuted, textDecoration: 'none' }}>← Hub</a>
          <span style={{ fontSize: 13, color: UI.text }}>{userEmail}</span>
          <a href="https://clubf1.tech/logout" style={{ padding: '7px 12px', background: UI.surface, border: `1px solid ${UI.borderStrong}`, borderRadius: 9, color: UI.textMuted, fontSize: 12.5, textDecoration: 'none' }}>Sign out</a>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        {setupNeeded ? (
          <div style={{ ...card, padding: 32 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: UI.text, marginBottom: 8 }}>Setup required</div>
            <p style={{ fontSize: 14, color: UI.textMuted, lineHeight: 1.6 }}>
              No domains found. Run <code>supabase-schema-mc.sql</code> in your Supabase SQL Editor to create the
              <code> mc_domains</code> / <code>mc_logs</code> tables and seed the eight domains, then reload.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
            {domains.map(d => {
              const n = counts[d.key] ?? 0
              return (
                <div key={d.key} style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 3, width: 40, background: ACCENT, borderRadius: 2, marginBottom: 16 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {d.icon && <span style={{ fontSize: 16 }}>{d.icon}</span>}
                    <div style={{ fontSize: 17, fontWeight: 600, color: UI.text }}>{d.label}</div>
                  </div>
                  <p style={{ marginTop: 8, fontSize: 13, color: UI.textMuted, lineHeight: 1.5, flex: 1, minHeight: 38 }}>{d.mission}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                    <button onClick={() => open('review', d)} style={{ ...btn(n > 0 ? 'solid' : 'ghost'), flex: '1 1 auto' }}>
                      Review{n > 0 ? ` (${n})` : ''}
                    </button>
                    <button onClick={() => open('history', d)} style={btn()} title="History">History</button>
                    <button onClick={() => open('vault', d)} style={btn()} title="Vault">Vault</button>
                    <button onClick={() => open('chat', d)} style={btn()} title="AI advisor">Chat</button>
                    <button onClick={() => open('brief', d)} style={btn()} title="Strategic brief">Brief</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '48px 20px' }}>
          <div style={{ ...card, width: '100%', maxWidth: 720, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: UI.text }}>
                {modal.domain.label} · {modal.type === 'review' ? 'Review Queue' : modal.type === 'history' ? 'History' : modal.type === 'vault' ? 'Vault' : modal.type === 'chat' ? 'AI Advisor' : 'Strategic Brief'}
              </div>
              <button onClick={close} style={{ background: 'none', border: 'none', fontSize: 22, color: UI.textFaint, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {err && <div style={{ marginBottom: 14, padding: '10px 12px', background: '#FFF1EF', border: `1px solid ${ACCENT}`, borderRadius: UI.radiusSm, fontSize: 12.5, color: '#8B3A2E' }}>{err}</div>}

            {modal.type === 'review' && <ReviewBody domain={modal.domain} items={items} loading={loading} pending={pending} startTransition={startTransition} setErr={setErr} refresh={refresh} input={input} btn={btn} reload={() => open('review', modal.domain)} />}
            {modal.type === 'history' && <HistoryBody items={items} loading={loading} pending={pending} startTransition={startTransition} setErr={setErr} reload={() => open('history', modal.domain)} btn={btn} />}
            {modal.type === 'vault' && <VaultBody domain={modal.domain} pending={pending} startTransition={startTransition} setErr={setErr} close={close} refresh={refresh} input={input} btn={btn} />}
            {modal.type === 'chat' && <ChatBody domain={modal.domain} setErr={setErr} input={input} btn={btn} />}
            {modal.type === 'brief' && <BriefBody domain={modal.domain} setErr={setErr} input={input} btn={btn} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Review ────────────────────────────────────────────────
function ReviewBody({ domain, items, loading, pending, startTransition, setErr, refresh, input, btn, reload }: any) {
  if (loading) return <Muted>Loading…</Muted>
  if (!items.length) return <Muted>No pending items.</Muted>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {items.map((l: LogItem) => <ReviewItem key={l.id} l={l} domain={domain} pending={pending} startTransition={startTransition} setErr={setErr} refresh={refresh} reload={reload} input={input} btn={btn} />)}
    </div>
  )
}
function ReviewItem({ l, domain, pending, startTransition, setErr, refresh, reload, input, btn }: any) {
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState('Normal')
  const [sync, setSync] = useState(true)
  const act = (action: 'consider' | 'ignore') => {
    setErr(null)
    startTransition(async () => {
      const r = await resolve(l.id, action, note, priority, sync)
      if (!r.ok) { setErr(r.error); return }
      refresh(); reload()
    })
  }
  return (
    <div style={{ borderLeft: `3px solid ${ACCENT}`, padding: '4px 0 4px 16px' }}>
      <div style={{ fontSize: 11, color: UI.textFaint, marginBottom: 6 }}>{l.source} · {fmt(l.received_at)}</div>
      <div style={{ fontSize: 14, color: UI.text, marginBottom: 12 }}>{l.message}</div>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="GM directive…" style={{ ...input, minHeight: 60, marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...input, width: 'auto', padding: '6px 10px' }}>
          <option>Normal</option><option>Urgent</option><option>High</option><option>Low</option>
        </select>
        <label style={{ fontSize: 13, color: UI.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} /> Dispatch to ClickUp
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button disabled={pending} onClick={() => act('consider')} style={btn('solid')}>Consider &amp; Dispatch</button>
        <button disabled={pending} onClick={() => act('ignore')} style={btn()}>Ignore</button>
      </div>
    </div>
  )
}

// ── History ───────────────────────────────────────────────
function HistoryBody({ items, loading, pending, startTransition, setErr, reload, btn }: any) {
  if (loading) return <Muted>Loading…</Muted>
  if (!items.length) return <Muted>Memory empty.</Muted>
  const del = (id: string) => {
    if (!confirm('Delete this entry?')) return
    setErr(null)
    startTransition(async () => { const r = await removeLog(id); if (!r.ok) { setErr(r.error); return } reload() })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((h: LogItem) => (
        <div key={h.id} style={{ background: UI.surfaceAlt, borderRadius: UI.radiusSm, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', background: UI.text, color: '#fff', padding: '3px 7px', borderRadius: 4 }}>{h.outcome}</span>
            <span style={{ fontSize: 11, color: UI.textFaint }}>{h.source} · {fmt(h.received_at)}</span>
          </div>
          <div style={{ fontSize: 13.5, color: UI.text, whiteSpace: 'pre-wrap' }}>{h.message}</div>
          {h.gm_note && <div style={{ marginTop: 8, fontSize: 12.5, color: UI.textMuted }}><b>GM:</b> {h.gm_note}</div>}
          <button disabled={pending} onClick={() => del(h.id)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#8B3A2E', fontSize: 11, cursor: 'pointer' }}>Delete</button>
        </div>
      ))}
    </div>
  )
}

// ── Vault ─────────────────────────────────────────────────
function VaultBody({ domain, pending, startTransition, setErr, close, refresh, input, btn }: any) {
  const [text, setText] = useState('')
  const save = () => {
    setErr(null)
    startTransition(async () => { const r = await vault(domain.key, text); if (!r.ok) { setErr(r.error); return } refresh(); close() })
  }
  return (
    <div>
      <p style={{ fontSize: 13, color: UI.textMuted, marginBottom: 12 }}>Paste a document or note to inject into this domain&apos;s memory.</p>
      <textarea value={text} onChange={e => setText(e.target.value)} style={{ ...input, minHeight: 220, marginBottom: 16 }} />
      <button disabled={pending} onClick={save} style={btn('solid')}>{pending ? 'Saving…' : 'Upload to Vault'}</button>
    </div>
  )
}

// ── Chat ──────────────────────────────────────────────────
function ChatBody({ domain, setErr, input, btn }: any) {
  const [log, setLog] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [committed, setCommitted] = useState(false)

  const send = async () => {
    const text = msg.trim()
    if (!text || busy) return
    setErr(null); setBusy(true)
    const next = [...log, { role: 'user' as const, content: text }]
    setLog(next); setMsg('')
    const r = await chat(domain.key, log, text)
    setBusy(false)
    if (!r.ok) { setErr(r.error); return }
    setLog([...next, { role: 'assistant', content: r.reply }])
  }
  const commit = async () => {
    if (!log.length) return
    const transcript = log.map(m => `${m.role === 'user' ? 'GM' : 'Advisor'}: ${m.content}`).join('\n')
    const r = await commitChat(domain.key, transcript)
    if (!r.ok) { setErr(r.error); return }
    setCommitted(true)
  }
  return (
    <div>
      <div style={{ height: 320, overflowY: 'auto', background: UI.surfaceAlt, borderRadius: UI.radiusSm, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
        {!log.length && <Muted>Ask the {domain.label} advisor anything.</Muted>}
        {log.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 13px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
            background: m.role === 'user' ? UI.surface : ACCENT, color: m.role === 'user' ? UI.text : '#fff', border: m.role === 'user' ? `1px solid ${UI.border}` : 'none' }}>
            {m.content}
          </div>
        ))}
        {busy && <Muted>Advisor is thinking…</Muted>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder="Message…" style={{ ...input, flex: 1 }} />
        <button onClick={send} disabled={busy} style={btn('solid')}>Send</button>
      </div>
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <button onClick={commit} disabled={!log.length || committed} style={btn()}>{committed ? 'Committed ✓' : 'Commit to memory'}</button>
      </div>
    </div>
  )
}

// ── Brief ─────────────────────────────────────────────────
function BriefBody({ domain, setErr, input, btn }: any) {
  const now = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const [period, setPeriod] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const gen = async () => {
    setErr(null); setBusy(true); setText('')
    const r = await brief(domain.key, period || 'this period')
    setBusy(false)
    if (!r.ok) { setErr(r.error); return }
    setText(r.text)
  }
  return (
    <div>
      {!text && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <input value={period} onChange={e => setPeriod(e.target.value)} placeholder={`Period (e.g. ${now[new Date(2026, 0).getMonth()]} 2026)`} style={{ ...input, flex: 1 }} />
          <button onClick={gen} disabled={busy} style={btn('solid')}>{busy ? 'Generating…' : 'Generate brief'}</button>
        </div>
      )}
      {busy && <Muted>Claude is writing the brief…</Muted>}
      {text && (
        <div>
          <div style={{ background: UI.surfaceAlt, borderRadius: UI.radiusSm, padding: 20, fontSize: 14, lineHeight: 1.7, color: UI.text, whiteSpace: 'pre-wrap', maxHeight: '50vh', overflowY: 'auto' }}>{text}</div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()} style={btn('solid')}>Print</button>
            <button onClick={() => setText('')} style={btn()}>New brief</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: UI.textFaint, textAlign: 'center', padding: '20px 0' }}>{children}</div>
}
