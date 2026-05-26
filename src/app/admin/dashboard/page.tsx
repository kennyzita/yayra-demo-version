'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const AVATAR_PALETTE = [
  { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
  { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
  { bg: 'rgba(245,158,11,0.13)', color: '#d97706' },
  { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
  { bg: 'rgba(20,184,166,0.12)', color: '#0d9488' },
]

function avatarFor(id: string) {
  const n = (id.charCodeAt(0) || 0) + (id.charCodeAt(1) || 0)
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length]
}

function mkInitials(fullName: string) {
  const parts = fullName.trim().split(' ').filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last  = parts[parts.length - 1]?.[0] ?? ''
  return (first + (parts.length > 1 ? last : '')).toUpperCase()
}

function relTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

interface FeedItem {
  key: string
  iconBg: string; iconColor: string; icon: string
  text: React.ReactNode
  time: string
  sortMs: number
}

interface StaffRow {
  initials: string; avBg: string; avColor: string
  name: string; role: string; action: string
  status: 'Done' | 'Pending' | 'Rejected'
  sortMs: number
}

const STATUS_STYLE = {
  Done:     { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  Pending:  { bg: 'rgba(245,158,11,0.13)', color: '#d97706' },
  Rejected: { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
}

export default function AdminDashboardPage() {
  const supabase = createClient()
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const [loading,         setLoading]         = useState(true)
  const [clientCount,     setClientCount]     = useState(0)
  const [newClients,      setNewClients]      = useState(0)
  const [dspStaffCount,   setDspStaffCount]   = useState(0)
  const [newDspStaff,     setNewDspStaff]     = useState(0)
  const [dspOnlyCount,    setDspOnlyCount]    = useState(0)
  const [newDspOnly,      setNewDspOnly]      = useState(0)
  const [pendingTs,       setPendingTs]       = useState(0)
  const [pendingCn,       setPendingCn]       = useState(0)
  const [feedItems,       setFeedItems]       = useState<FeedItem[]>([])
  const [staffRows,       setStaffRows]       = useState<StaffRow[]>([])

  useEffect(() => {
    async function load() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [
        { data: userRows },
        { data: clientRows },
        { count: tsCount },
        { count: cnCount },
        { data: recentTs },
        { data: recentCn },
      ] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name, created_at, role:roles(name)'),
        supabase.from('clients').select('id, full_name, created_at'),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('case_notes').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('timesheets').select('id, dsp_id, status, submitted_at').order('submitted_at', { ascending: false }).limit(20),
        supabase.from('case_notes').select('id, dsp_id, client_id, status, submitted_at').order('submitted_at', { ascending: false }).limit(20),
      ])

      const users   = userRows   ?? []
      const clients = clientRows ?? []

      // Metrics
      setClientCount(clients.length)
      setNewClients(clients.filter(c => c.created_at >= sevenDaysAgo).length)

      const roleName = (u: typeof users[0]) => (u.role as unknown as { name: string } | null)?.name ?? ''
      const dspStaffUsers = users.filter(u => roleName(u) === 'DSP Staff')
      const dspOnlyUsers  = users.filter(u => roleName(u) === 'DSP')
      setDspStaffCount(dspStaffUsers.length)
      setNewDspStaff(dspStaffUsers.filter(u => (u.created_at ?? '') >= sevenDaysAgo).length)
      setDspOnlyCount(dspOnlyUsers.length)
      setNewDspOnly(dspOnlyUsers.filter(u => (u.created_at ?? '') >= sevenDaysAgo).length)
      setPendingTs(tsCount ?? 0)
      setPendingCn(cnCount ?? 0)

      // Lookup maps
      const userMap   = new Map(users.map(u => [u.id, u]))
      const clientMap = new Map(clients.map(c => [c.id, c]))

      // ── Staff Activity table ──────────────────────────────────────────────
      const tsTableRows: StaffRow[] = (recentTs ?? []).map(t => {
        const u    = userMap.get(t.dsp_id)
        const name = u ? `${u.first_name} ${u.last_name}` : 'Unknown'
        const role = (u?.role as unknown as { name: string } | null)?.name ?? 'Staff'
        const av   = avatarFor(t.dsp_id)
        const s: 'Done' | 'Pending' | 'Rejected' =
          t.status === 'approved' ? 'Done' : t.status === 'rejected' ? 'Rejected' : 'Pending'
        return {
          initials: mkInitials(name), avBg: av.bg, avColor: av.color,
          name, role,
          action: t.status === 'approved' ? 'Timesheet approved' : t.status === 'rejected' ? 'Timesheet rejected' : 'Submitted timesheet',
          status: s,
          sortMs: t.submitted_at ? new Date(t.submitted_at).getTime() : 0,
        }
      })

      const cnTableRows: StaffRow[] = (recentCn ?? []).map(n => {
        const u    = userMap.get(n.dsp_id)
        const name = u ? `${u.first_name} ${u.last_name}` : 'Unknown'
        const role = (u?.role as unknown as { name: string } | null)?.name ?? 'Staff'
        const av   = avatarFor(n.dsp_id)
        const s: 'Done' | 'Pending' | 'Rejected' =
          n.status === 'approved' ? 'Done' : n.status === 'rejected' ? 'Rejected' : 'Pending'
        return {
          initials: mkInitials(name), avBg: av.bg, avColor: av.color,
          name, role,
          action: n.status === 'approved' ? 'Case note approved' : 'Added case note',
          status: s,
          sortMs: n.submitted_at ? new Date(n.submitted_at).getTime() : 0,
        }
      })

      setStaffRows(
        [...tsTableRows, ...cnTableRows]
          .sort((a, b) => b.sortMs - a.sortMs)
          .slice(0, 6)
      )

      // ── Activity Feed ─────────────────────────────────────────────────────
      const feed: FeedItem[] = []

      ;(recentTs ?? []).forEach(t => {
        const u    = userMap.get(t.dsp_id)
        const name = u ? `${u.first_name} ${u.last_name}` : 'Unknown staff'
        const ms   = t.submitted_at ? new Date(t.submitted_at).getTime() : 0
        if (t.status === 'approved') {
          feed.push({
            key: `ts-ap-${t.id}`,
            iconBg: 'rgba(16,185,129,0.12)', iconColor: '#059669', icon: 'ti-file-check',
            text: <>Timesheet approved for <strong>{name}</strong>.</>,
            time: relTime(t.submitted_at), sortMs: ms,
          })
        } else {
          feed.push({
            key: `ts-${t.id}`,
            iconBg: 'rgba(16,185,129,0.12)', iconColor: '#059669', icon: 'ti-check',
            text: <><strong>{name}</strong> submitted a timesheet.</>,
            time: relTime(t.submitted_at), sortMs: ms,
          })
        }
      })

      ;(recentCn ?? []).forEach(n => {
        const cl   = clientMap.get(n.client_id)
        const name = cl?.full_name ?? 'a client'
        const ms   = n.submitted_at ? new Date(n.submitted_at).getTime() : 0
        feed.push({
          key: `cn-${n.id}`,
          iconBg: 'rgba(245,158,11,0.13)', iconColor: '#d97706', icon: 'ti-notes',
          text: <>Case note added for <strong>{name}</strong>.</>,
          time: relTime(n.submitted_at), sortMs: ms,
        })
      })

      clients
        .filter(c => c.created_at >= sevenDaysAgo)
        .forEach(c => {
          feed.push({
            key: `cl-${c.id}`,
            iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1', icon: 'ti-user',
            text: <><strong>New client</strong> profile created: {c.full_name}.</>,
            time: relTime(c.created_at), sortMs: new Date(c.created_at).getTime(),
          })
        })

      setFeedItems(feed.sort((a, b) => b.sortMs - a.sortMs).slice(0, 7))
      setLoading(false)
    }
    load()
  }, [])

  const metrics = [
    {
      icon: 'ti-users',
      iconBg: 'rgba(16,185,129,0.12)', iconColor: '#059669',
      badge: newClients > 0 ? `+${newClients} new` : 'Total',
      badgeBg: 'rgba(16,185,129,0.12)', badgeColor: '#059669',
      value: loading ? '—' : String(clientCount), label: 'Active clients',
    },
    {
      icon: 'ti-user',
      iconBg: 'rgba(245,158,11,0.13)', iconColor: '#d97706',
      badge: newDspStaff > 0 ? `+${newDspStaff} new` : 'Total',
      badgeBg: 'rgba(16,185,129,0.12)', badgeColor: '#059669',
      value: loading ? '—' : String(dspStaffCount), label: 'DSP Staff',
    },
    {
      icon: 'ti-user-check',
      iconBg: 'rgba(20,184,166,0.12)', iconColor: '#0d9488',
      badge: newDspOnly > 0 ? `+${newDspOnly} new` : 'Total',
      badgeBg: 'rgba(16,185,129,0.12)', badgeColor: '#059669',
      value: loading ? '—' : String(dspOnlyCount), label: 'DSP',
    },
    {
      icon: 'ti-clock',
      iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1',
      badge: loading ? '…' : `${pendingTs} pending`,
      badgeBg: pendingTs > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.12)',
      badgeColor: pendingTs > 0 ? '#dc2626' : '#059669',
      value: loading ? '—' : String(pendingTs), label: 'Timesheets to approve',
    },
    {
      icon: 'ti-edit',
      iconBg: 'rgba(168,85,247,0.12)', iconColor: '#a855f7',
      badge: loading ? '…' : `${pendingCn} pending`,
      badgeBg: pendingCn > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.12)',
      badgeColor: pendingCn > 0 ? '#dc2626' : '#059669',
      value: loading ? '—' : String(pendingCn), label: 'Case notes to review',
    },
  ]

  const quickActions = [
    { href: '/admin/clients/new', icon: 'ti-user-plus',       label: 'New client'         },
    { href: '/admin/timesheets',  icon: 'ti-clock',            label: 'Approve timesheets' },
    { href: '/admin/case-notes',  icon: 'ti-notes',            label: 'Review case notes'  },
    { href: '/admin/assignments', icon: 'ti-arrows-exchange',  label: 'DSP assignment'     },
  ]

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Admin overview</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{todayLabel}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '0.5px solid #d1d5db', borderRadius: 8, padding: '0 12px', height: 32, width: 200 }}>
          <i className="ti ti-search" style={{ fontSize: 15, color: '#6b7280' }} />
          <input type="text" placeholder="Search staff, clients…" style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#111', outline: 'none', width: '100%' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}>
            <i className="ti ti-bell" />
          </div>
          {pendingTs + pendingCn > 0 && (
            <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #fff' }} />
          )}
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}>
          <i className="ti ti-settings" />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, background: '#f9fafb', minHeight: 'calc(100% - 56px)' }}>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 14 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 14, padding: '20px 20px 18px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: m.iconColor }}>
                  <i className={`ti ${m.icon}`} />
                </div>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 500, background: m.badgeBg, color: m.badgeColor }}>{m.badge}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: '#111', letterSpacing: -0.5, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
            {quickActions.map(qa => (
              <Link key={qa.label} href={qa.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 14, padding: '24px 12px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.09)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(0,128,128,0.1)', color: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    <i className={`ti ${qa.icon}`} />
                  </div>
                  <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{qa.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Two-col: staff table + activity feed */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

          {/* Recent Staff Activity */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#111', flex: 1 }}>Recent Staff Activity</span>
              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 600 }}>Live</span>
            </div>
            {loading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
            ) : staffRows.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No recent activity.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                    {['Staff Member', 'Role', 'Action', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((row, i) => {
                    const ss = STATUS_STYLE[row.status]
                    return (
                      <tr key={i} style={{ borderBottom: i < staffRows.length - 1 ? '0.5px solid #f9fafb' : 'none' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: row.avBg, color: row.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{row.initials}</div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{row.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{row.role}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{row.action}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, fontWeight: 500, background: ss.bg, color: ss.color }}>{row.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Activity feed */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#111', flex: 1 }}>Recent Activity</span>
              <span style={{ fontSize: 12, color: '#008080', cursor: 'pointer', fontWeight: 500 }}>View all</span>
            </div>
            {loading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
            ) : feedItems.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No recent activity.</div>
            ) : (
              <div>
                {feedItems.map((item, i) => (
                  <div key={item.key} style={{ display: 'flex', gap: 12, padding: '14px 18px', borderBottom: i < feedItems.length - 1 ? '0.5px solid #f3f4f6' : 'none', alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: item.iconBg, color: item.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      <i className={`ti ${item.icon}`} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#111', lineHeight: 1.5 }}>{item.text}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
