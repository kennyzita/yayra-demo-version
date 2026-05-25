'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AppRecord {
  staffId: string
  name: string
  email: string
  role: string
  submittedAt: string
  status: string
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

function avatarColor(name: string) {
  const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777']
  const idx = (name.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: 'rgba(217,119,6,0.12)',  color: '#92400e', label: 'Pending'  },
    approved: { bg: 'rgba(16,185,129,0.12)', color: '#065f46', label: 'Approved' },
    rejected: { bg: 'rgba(220,38,38,0.12)',  color: '#991b1b', label: 'Rejected' },
  }
  const s = map[status] ?? map['pending']
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

export default function HiringPage() {
  const supabase = createClient()
  const [records, setRecords] = useState<AppRecord[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function load() {
      const [usersRes, staffDataRes] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name, email, created_at, role:roles(name)'),
        supabase.from('billing_staff_data').select('staff_id, data'),
      ])

      const users = usersRes.data ?? []
      const staffRows = staffDataRes.data ?? []

      const submitted = staffRows.filter(row => (row.data as Record<string, string>)?.application_submitted === 'true')

      const built: AppRecord[] = submitted.map(row => {
        const data = row.data as Record<string, string>
        const user = users.find((u: { id: string }) => u.id === row.staff_id)
        const firstName = (user as { first_name?: string } | undefined)?.first_name ?? ''
        const lastName = (user as { last_name?: string } | undefined)?.last_name ?? ''
        const email = (user as { email?: string } | undefined)?.email ?? ''
        const roleObj = (user as { role?: unknown } | undefined)?.role
        const roleName = (roleObj as { name?: string } | null)?.name ?? 'DSP'
        return {
          staffId: row.staff_id,
          name: `${firstName} ${lastName}`.trim() || 'Unknown',
          email,
          role: roleName,
          submittedAt: data.application_submitted_at ?? '',
          status: data.application_status ?? 'pending',
        }
      })

      setRecords(built)
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(staffId: string, newStatus: string) {
    const { data: existing } = await supabase
      .from('billing_staff_data')
      .select('data')
      .eq('staff_id', staffId)
      .maybeSingle()

    const merged = {
      ...((existing?.data as Record<string, string>) ?? {}),
      application_status: newStatus,
    }

    const { error } = await supabase
      .from('billing_staff_data')
      .upsert({ staff_id: staffId, data: merged })

    if (error) {
      showToast('Error updating status. Please try again.')
    } else {
      setStatusMap(prev => ({ ...prev, [staffId]: newStatus }))
      showToast(`Application ${newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'updated'} successfully.`)
    }
  }

  const filtered = records.filter(r => {
    const effectiveStatus = statusMap[r.staffId] ?? r.status
    const matchFilter = filter === 'All' || effectiveStatus === filter.toLowerCase()
    const q = search.toLowerCase()
    const matchSearch = r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const counts = {
    total: records.length,
    pending:  records.filter(r => (statusMap[r.staffId] ?? r.status) === 'pending').length,
    approved: records.filter(r => (statusMap[r.staffId] ?? r.status) === 'approved').length,
    rejected: records.filter(r => (statusMap[r.staffId] ?? r.status) === 'rejected').length,
  }

  const summaryCards = [
    { label: 'Total applications', value: counts.total,    iconBg: 'rgba(79,70,229,0.1)',  iconColor: '#4f46e5', icon: 'ti-users'       },
    { label: 'Pending review',     value: counts.pending,  iconBg: 'rgba(217,119,6,0.1)',  iconColor: '#d97706', icon: 'ti-clock'       },
    { label: 'Approved',           value: counts.approved, iconBg: 'rgba(16,185,129,0.1)', iconColor: '#059669', icon: 'ti-circle-check' },
    { label: 'Rejected',           value: counts.rejected, iconBg: 'rgba(220,38,38,0.1)',  iconColor: '#dc2626', icon: 'ti-x'           },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#111', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Hiring</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>DSP application submissions</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f4f5f7' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {summaryCards.map(card => (
            <div key={card.label} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: card.iconColor, flexShrink: 0 }}>
                <i className={`ti ${card.icon}`} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111', lineHeight: 1.1 }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 15 }} />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111', background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', background: filter === f ? '#008080' : '#fff', color: filter === f ? '#fff' : '#374151', borderColor: filter === f ? '#008080' : '#e5e7eb' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table or states */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64, color: '#9ca3af', fontSize: 14 }}>
            Loading applications…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 64, color: '#9ca3af', gap: 12 }}>
            <i className="ti ti-inbox" style={{ fontSize: 40 }} />
            <span style={{ fontSize: 14 }}>No applications found.</span>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Name', 'Email', 'Role', 'Applied', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const effectiveStatus = statusMap[r.staffId] ?? r.status
                  return (
                    <tr key={r.staffId} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(r.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                            {initials(r.name)}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{r.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6b7280' }}>{r.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600, background: 'rgba(79,70,229,0.1)', color: '#4f46e5' }}>{r.role}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{formatDate(r.submittedAt)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusPill status={effectiveStatus} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {effectiveStatus === 'pending' && (
                            <>
                              <button onClick={() => updateStatus(r.staffId, 'approved')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #10b981', background: 'transparent', color: '#059669', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Approve</button>
                              <button onClick={() => updateStatus(r.staffId, 'rejected')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Reject</button>
                            </>
                          )}
                          {effectiveStatus === 'approved' && (
                            <button onClick={() => updateStatus(r.staffId, 'pending')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Revoke</button>
                          )}
                          {effectiveStatus === 'rejected' && (
                            <button onClick={() => updateStatus(r.staffId, 'approved')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #10b981', background: 'transparent', color: '#059669', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Approve</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
