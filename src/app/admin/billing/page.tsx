'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BillingManager from '@/components/billing/BillingManager'
import Link from 'next/link'

type WeekBill = { week: string; total: number }

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
}

function WeeklyBillSidebarLink({ bills }: { bills: WeekBill[] }) {
  const grand = bills.reduce((a, w) => a + w.total, 0)
  return (
    <Link
      href="/admin/billing/weekly"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '9px 10px',
        borderRadius: 8,
        border: '1px solid rgba(16,185,129,.35)',
        background: 'rgba(16,185,129,.12)',
        color: '#fff',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>💵</span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>Weekly Bill — All Clients</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)' }}>
          {bills.length} week{bills.length !== 1 ? 's' : ''} · {fmtUSD(grand)}
        </span>
      </div>
      <span style={{ fontSize: 11, color: '#86efac' }}>›</span>
    </Link>
  )
}

export default function BillingPage() {
  const supabase = createClient()
  const [weeklyBills, setWeeklyBills] = useState<WeekBill[]>([])

  const refresh = async () => {
    const { data, error } = await supabase
      .from('billing_client_data')
      .select('data, archived')
    if (error) { console.error('[weekly bills]', error); return }
    const byWeek = new Map<string, number>()
    for (const row of data ?? []) {
      if (row.archived) continue
      const services = ((row.data as any)?.services ?? []) as any[]
      for (const pa of services) {
        const rate = parseFloat(pa?.rate) || 0
        for (const wk of pa?.weeks ?? []) {
          if (!wk?.billed || !wk?.s) continue
          const amt = (parseFloat(wk.u) || 0) * rate
          if (amt <= 0) continue
          byWeek.set(wk.s, (byWeek.get(wk.s) ?? 0) + amt)
        }
      }
    }
    setWeeklyBills([...byWeek.entries()].map(([week, total]) => ({ week, total })))
  }

  useEffect(() => {
    refresh()
    const channel = supabase
      .channel('billing-sidebar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_client_data' }, () => { refresh() })
      .subscribe()
    const id = setInterval(refresh, 30_000)
    return () => { supabase.removeChannel(channel); clearInterval(id) }
  }, [])

  return <BillingManager sidebarExtra={<WeeklyBillSidebarLink bills={weeklyBills} />} />
}
