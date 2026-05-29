'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const supabase = createClient()

type StatusValue = 'Pending' | 'Approved' | 'Denied' | 'Claim in Process'
const STATUS_OPTIONS: StatusValue[] = ['Pending', 'Approved', 'Denied', 'Claim in Process']

type ClientBill = { clientId: string; clientName: string; total: number }
type StatusRow = { status: StatusValue; allowed: number | null; paid: number | null; paymentDate: string }
type WeekBill = { week: string; endDate: string; total: number; clientCount: number; clients: ClientBill[] }

function fmtIso(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n || 0)
}

function normalizeDateToIso(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = String(value).trim()
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]))
    if (d.getUTCFullYear() === +iso[1] && d.getUTCMonth() === +iso[2] - 1 && d.getUTCDate() === +iso[3]) return trimmed
    return null
  }
  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) {
    const month = +us[1], day = +us[2], year = +us[3]
    const d = new Date(Date.UTC(year, month - 1, day))
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day)
      return d.toISOString().slice(0, 10)
  }
  return null
}

function paymentDateForWeek(weekStartIso: string): string {
  const normalized = normalizeDateToIso(weekStartIso)
  if (!normalized) return weekStartIso
  const [year, month, day] = normalized.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + 17)
  return d.toISOString().slice(0, 10)
}

function generateYearlyWeeks(year: number): { start: string; end: string }[] {
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const firstSunday = new Date(jan1)
  firstSunday.setUTCDate(jan1.getUTCDate() - jan1.getUTCDay())
  const weeks: { start: string; end: string }[] = []
  for (let cursor = new Date(firstSunday); ; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const end = new Date(cursor)
    end.setUTCDate(cursor.getUTCDate() + 6)
    if (cursor.getUTCFullYear() > year && !(cursor.getUTCMonth() === 0 && cursor.getUTCDate() <= 7)) break
    weeks.push({ start: cursor.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) })
  }
  return weeks
}

async function loadWeeklyBills(year: number): Promise<WeekBill[]> {
  const [billingRes, clientsRes] = await Promise.all([
    supabase.from('billing_client_data').select('client_id, data, archived'),
    supabase.from('clients').select('id, full_name'),
  ])
  if (billingRes.error) { console.error('[weekly bills]', billingRes.error); return [] }
  const nameById = new Map<string, string>()
  for (const c of clientsRes.data ?? []) nameById.set(c.id, c.full_name || '')

  type Entry = { end: string; total: number; byClient: Map<string, number> }
  const byWeek = new Map<string, Entry>()
  for (const w of generateYearlyWeeks(year)) {
    byWeek.set(w.start, { end: w.end, total: 0, byClient: new Map() })
  }

  for (const row of billingRes.data ?? []) {
    if (row.archived) continue
    const dataObj = (row.data ?? {}) as any
    const fallbackName = dataObj?.name || ''
    const services = (dataObj?.services ?? []) as any[]
    for (const pa of services) {
      const rate = parseFloat(pa?.rate) || 0
      for (const wk of pa?.weeks ?? []) {
        const rawStart = normalizeDateToIso(wk?.s)
        if (!wk?.billed || !rawStart) continue
        const [yy, mm, dd] = rawStart.split('-').map(Number)
        const d = new Date(Date.UTC(yy, mm - 1, dd))
        d.setUTCDate(d.getUTCDate() - d.getUTCDay())
        const weekStart = d.toISOString().slice(0, 10)
        if (!byWeek.has(weekStart)) continue
        const endD = new Date(d)
        endD.setUTCDate(d.getUTCDate() + 6)
        const weekEnd = endD.toISOString().slice(0, 10)
        const u = parseFloat(wk.u) || 0
        const amt = u * rate
        if (amt <= 0) continue
        const entry = byWeek.get(weekStart) ?? { end: weekEnd, total: 0, byClient: new Map<string, number>() }
        entry.end = weekEnd
        entry.total += amt
        entry.byClient.set(row.client_id, (entry.byClient.get(row.client_id) || 0) + amt)
        byWeek.set(weekStart, entry)
        if (!nameById.has(row.client_id) && fallbackName) nameById.set(row.client_id, fallbackName)
      }
    }
  }
  return [...byWeek.entries()]
    .map(([week, v]) => ({
      week, endDate: v.end, total: v.total,
      clientCount: v.byClient.size,
      clients: [...v.byClient.entries()]
        .map(([clientId, total]) => ({ clientId, clientName: nameById.get(clientId) || 'Unknown client', total }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => a.week > b.week ? 1 : -1)
}

export default function WeeklyBillPage() {
  const currentYear = new Date().getUTCFullYear()
  const [year, setYear] = useState(currentYear)
  const [bills, setBills] = useState<WeekBill[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedWeek, setSelectedWeek] = useState('all')
  const [statusMap, setStatusMap] = useState<Map<string, StatusRow>>(new Map())
  const statusMapRef = useRef<Map<string, StatusRow>>(new Map())
  const pendingSaveCountsRef = useRef<Map<string, number>>(new Map())
  const saveQueuesRef = useRef<Map<string, Promise<void>>>(new Map())

  const statusKey = (week: string, clientId: string) => `${week}::${clientId}`
  const hasPendingSave = (key: string) => (pendingSaveCountsRef.current.get(key) ?? 0) > 0
  const setStatusRows = (next: Map<string, StatusRow>) => {
    statusMapRef.current = next
    setStatusMap(next)
  }

  const loadStatuses = async () => {
    const { data, error } = await supabase
      .from('billing_week_status')
      .select('client_id, week_start, status, payment_date, amount_allowed, amount_paid')
    if (error) { console.error('[status load]', error); return }
    const m = new Map<string, StatusRow>()
    for (const r of data ?? []) {
      const weekStart = r.week_start as string
      const k = statusKey(weekStart, r.client_id as string)
      m.set(k, {
        status: (r.status as StatusValue) || 'Pending',
        allowed: (r as any).amount_allowed != null ? Number((r as any).amount_allowed) : null,
        paid: (r as any).amount_allowed != null ? Number((r as any).amount_allowed) : null,
        paymentDate: paymentDateForWeek(weekStart),
      })
    }
    for (const [k, v] of statusMapRef.current) {
      if (hasPendingSave(k)) m.set(k, v)
    }
    setStatusRows(m)
  }

  const upsertRow = async (week: string, clientId: string, patch: Partial<StatusRow>) => {
    const normalizedWeek = normalizeDateToIso(week)
    if (!normalizedWeek) return
    const k = statusKey(normalizedWeek, clientId)
    const prev = statusMapRef.current.get(k) ?? { status: 'Pending' as StatusValue, allowed: null, paid: null, paymentDate: paymentDateForWeek(normalizedWeek) }
    const nextAllowed = patch.allowed !== undefined ? patch.allowed : prev.allowed
    const optimistic: StatusRow = {
      status: patch.status ?? prev.status,
      allowed: nextAllowed, paid: nextAllowed,
      paymentDate: paymentDateForWeek(normalizedWeek),
    }
    setStatusRows(new Map(statusMapRef.current).set(k, optimistic))
    pendingSaveCountsRef.current.set(k, (pendingSaveCountsRef.current.get(k) ?? 0) + 1)

    const previousSave = saveQueuesRef.current.get(k) ?? Promise.resolve()
    const save = previousSave.catch(() => undefined).then(async () => {
      const latest = statusMapRef.current.get(k) ?? optimistic
      const { error } = await supabase.from('billing_week_status').upsert(
        {
          client_id: clientId, week_start: normalizedWeek,
          status: latest.status, payment_date: paymentDateForWeek(normalizedWeek),
          amount_allowed: latest.allowed, amount_paid: latest.paid,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,week_start' },
      )
      if (error) throw error
    }).catch((error) => {
      console.error('[status save]', error)
      void loadStatuses()
    }).finally(() => {
      const remaining = (pendingSaveCountsRef.current.get(k) ?? 1) - 1
      if (remaining > 0) pendingSaveCountsRef.current.set(k, remaining)
      else pendingSaveCountsRef.current.delete(k)
      if (saveQueuesRef.current.get(k) === save) saveQueuesRef.current.delete(k)
    })
    saveQueuesRef.current.set(k, save)
  }

  const refresh = async () => {
    setRefreshing(true)
    const [out] = await Promise.all([loadWeeklyBills(year), loadStatuses()])
    setBills(out)
    setLastUpdated(new Date())
    setRefreshing(false)
  }

  useEffect(() => {
    refresh()
    const channel = supabase
      .channel('weekly-bill-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_client_data' }, () => { refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_week_status' }, () => { loadStatuses() })
      .subscribe()
    const id = setInterval(refresh, 30_000)
    return () => { supabase.removeChannel(channel); clearInterval(id) }
  }, [year])

  const effectiveForClient = (weekIso: string, billed: number, clientId: string): number => {
    const row = statusMap.get(statusKey(weekIso, clientId))
    const status = row?.status ?? 'Pending'
    if (status === 'Denied' || status === 'Claim in Process') return 0
    if (status === 'Approved') return row?.paid ?? row?.allowed ?? billed
    return billed
  }
  const effectiveWeekTotal = (w: WeekBill) =>
    w.clients.reduce((a, c) => a + effectiveForClient(w.week, c.total, c.clientId), 0)

  const billsWithEffective = bills.map(w => ({ ...w, effective: effectiveWeekTotal(w) }))
  const grand = billsWithEffective.reduce((a, w) => a + w.effective, 0)
  const filtered = selectedWeek === 'all' ? billsWithEffective : billsWithEffective.filter(w => w.week === selectedWeek)
  const filteredTotal = filtered.reduce((a, w) => a + w.effective, 0)
  const selectedBill = selectedWeek === 'all' ? null : bills.find(w => w.week === selectedWeek)

  return (
    <div style={{ minHeight: '100%', background: '#f4f5f7', padding: '24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/admin/billing"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', padding: '6px 12px', fontSize: 13, fontWeight: 500, color: '#374151', textDecoration: 'none' }}
            >
              ← Back to Billing
            </Link>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>Weekly Total Bill — All Clients</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                Live billing totals grouped by week · auto-updates as data changes
                {lastUpdated && <> · last updated {lastUpdated.toLocaleTimeString()}</>}
              </div>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', padding: '6px 12px', fontSize: 12, fontWeight: 500, color: '#374151', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}
          >
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>↻</span>
            Refresh
          </button>
        </div>

        {/* Year + Week selector */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Year</label>
            <select
              value={year}
              onChange={e => { setYear(parseInt(e.target.value, 10)); setSelectedWeek('all') }}
              style={{ borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', padding: '6px 12px', fontSize: 13, fontWeight: 500, color: '#111' }}
            >
              {Array.from({ length: 7 }, (_, i) => currentYear - 3 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select week</label>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(e.target.value)}
              style={{ borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', padding: '6px 12px', fontSize: 13, fontWeight: 500, color: '#111', minWidth: 260 }}
            >
              <option value="all">All weeks ({bills.length})</option>
              {bills.map(w => (
                <option key={w.week} value={w.week}>{fmtIso(w.week)} – {fmtIso(w.endDate)}</option>
              ))}
            </select>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {selectedWeek === 'all' ? `Year to Date · ${year}` : 'Week total'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#065f46', fontVariantNumeric: 'tabular-nums' }}>
              {fmtUSD(filteredTotal)}
            </div>
            {selectedBill && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {selectedBill.clientCount} {selectedBill.clientCount === 1 ? 'client' : 'clients'}
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          <SummaryCard label="Weeks in year" value={String(bills.length)} />
          <SummaryCard label="Avg / week" value={fmtUSD(bills.length ? grand / bills.length : 0)} />
          <SummaryCard label={`Year to Date · ${year}`} value={fmtUSD(grand)} accent />
        </div>

        {/* Week-by-week table */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', background: 'linear-gradient(to right, rgba(16,185,129,.10), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
              {selectedWeek === 'all' ? 'Week-by-week breakdown' : 'Selected week'}
            </span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{filtered.length} {filtered.length === 1 ? 'week' : 'weeks'}</span>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              No billed weeks yet. Mark PA weeks as billed to see totals here.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {['Week start', 'Week end', 'Clients', 'Total bill'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(w => {
                    const isSelected = selectedWeek === w.week
                    return (
                      <tr
                        key={w.week}
                        onClick={() => setSelectedWeek(w.week)}
                        style={{ borderBottom: '1px solid #f9fafb', cursor: 'pointer', background: isSelected ? 'rgba(16,185,129,0.06)' : undefined }}
                      >
                        <td style={{ padding: '12px 20px', fontWeight: 500, color: isSelected ? '#047857' : '#111' }}>{fmtIso(w.week)}</td>
                        <td style={{ padding: '12px 20px', color: isSelected ? '#047857' : '#6b7280' }}>{fmtIso(w.endDate)}</td>
                        <td style={{ padding: '12px 20px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{w.clientCount}</td>
                        <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(w.effective)}</td>
                      </tr>
                    )
                  })}
                  <tr style={{ background: 'rgba(16,185,129,.08)' }}>
                    <td colSpan={3} style={{ padding: '12px 20px', fontWeight: 600 }}>
                      {selectedWeek === 'all' ? `Year to Date · ${year}` : 'Week total'}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: '#065f46', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(filteredTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Per-client breakdown for selected week */}
        {selectedBill && (
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', background: 'linear-gradient(to right, rgba(16,185,129,.10), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
                Per-client breakdown · {fmtIso(selectedBill.week)} – {fmtIso(selectedBill.endDate)}
              </span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{selectedBill.clients.length} {selectedBill.clients.length === 1 ? 'client' : 'clients'}</span>
            </div>
            {selectedBill.clients.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No client billed for this week.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {['Client', 'Amount Billed', 'Amount Allowed', 'Total Deduct', 'Amount Paid', 'Status', 'Payment Date'].map((h, i) => (
                        <th key={h} style={{ padding: '10px 20px', textAlign: i === 0 ? 'left' : i <= 4 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let billedTotalEff = 0, allowedTotal = 0, deductTotal = 0, paidTotalEff = 0
                      const rows = selectedBill.clients.map(c => {
                        const k = statusKey(selectedBill.week, c.clientId)
                        const row = statusMap.get(k)
                        const status: StatusValue = row?.status ?? 'Pending'
                        const allowed = row?.allowed ?? c.total
                        const pay = row?.paymentDate || paymentDateForWeek(selectedBill.week)
                        const deduct = c.total - allowed
                        const paid = allowed
                        const excluded = status === 'Denied' || status === 'Claim in Process'
                        if (!excluded) {
                          billedTotalEff += c.total
                          allowedTotal += allowed
                          deductTotal += deduct
                          paidTotalEff += status === 'Approved' ? paid : c.total
                        }
                        const statusColor =
                          status === 'Approved' ? '#047857' :
                          status === 'Denied' ? '#b91c1c' :
                          status === 'Claim in Process' ? '#b45309' : '#475569'
                        return (
                          <tr key={c.clientId} style={{ borderBottom: '1px solid #f9fafb' }}>
                            <td style={{ padding: '10px 20px', fontWeight: 500 }}>{c.clientName}</td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(c.total)}</td>
                            <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                              <input
                                type="number" step="0.01" min="0"
                                value={allowed}
                                placeholder="0.00"
                                onChange={e => {
                                  const v = e.target.value === '' ? null : parseFloat(e.target.value)
                                  const nextAllowed = Number.isFinite(v as number) ? (v as number) : null
                                  upsertRow(selectedBill.week, c.clientId, { allowed: nextAllowed, paid: nextAllowed })
                                }}
                                style={{ width: 100, borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', padding: '4px 8px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                              />
                            </td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', color: deduct > 0 ? '#b91c1c' : '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(deduct)}</td>
                            <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(paid)}</td>
                            <td style={{ padding: '10px 20px' }}>
                              <select
                                value={status}
                                onChange={e => upsertRow(selectedBill.week, c.clientId, { status: e.target.value as StatusValue })}
                                style={{ borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', padding: '4px 8px', fontSize: 12, fontWeight: 600, color: statusColor }}
                              >
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '10px 20px', color: '#6b7280', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtIso(pay)}</td>
                          </tr>
                        )
                      })
                      return (
                        <>
                          {rows}
                          <tr style={{ background: 'rgba(16,185,129,.08)' }}>
                            <td style={{ padding: '12px 20px', fontWeight: 600 }}>Week total</td>
                            <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: '#065f46', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(billedTotalEff)}</td>
                            <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: '#065f46', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(allowedTotal)}</td>
                            <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: deductTotal > 0 ? '#b91c1c' : '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(deductTotal)}</td>
                            <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: '#065f46', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(paidTotalEff)}</td>
                            <td style={{ padding: '12px 20px' }} /><td style={{ padding: '12px 20px' }} />
                          </tr>
                        </>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      borderRadius: 12,
      border: accent ? '1px solid rgba(16,185,129,.35)' : '0.5px solid #e5e7eb',
      background: accent ? 'linear-gradient(135deg, rgba(16,185,129,.12), rgba(20,184,166,.06))' : '#fff',
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: accent ? '#065f46' : '#111', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}
