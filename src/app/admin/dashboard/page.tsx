'use client'

import Link from 'next/link'

export default function AdminDashboardPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const metrics = [
    {
      icon: 'ti-users',
      iconBg: 'rgba(16,185,129,0.12)', iconColor: '#059669',
      badge: '+4 new', badgeBg: 'rgba(16,185,129,0.12)', badgeColor: '#059669',
      value: '47', label: 'Active clients',
    },
    {
      icon: 'ti-user',
      iconBg: 'rgba(245,158,11,0.13)', iconColor: '#d97706',
      badge: '+2', badgeBg: 'rgba(16,185,129,0.12)', badgeColor: '#059669',
      value: '18', label: 'DSP staff',
    },
    {
      icon: 'ti-clock',
      iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1',
      badge: '5 pending', badgeBg: 'rgba(239,68,68,0.1)', badgeColor: '#dc2626',
      value: '5', label: 'Timesheets to approve',
    },
    {
      icon: 'ti-edit',
      iconBg: 'rgba(168,85,247,0.12)', iconColor: '#a855f7',
      badge: '3 pending', badgeBg: 'rgba(239,68,68,0.1)', badgeColor: '#dc2626',
      value: '3', label: 'Case notes to review',
    },
  ]

  const quickActions = [
    { href: '/admin/clients/new', icon: 'ti-user-plus',       label: 'New client'          },
    { href: '/admin/timesheets',  icon: 'ti-clock',            label: 'Approve timesheets'  },
    { href: '/admin/case-notes',  icon: 'ti-notes',            label: 'Review case notes'   },
    { href: '/admin/assignments', icon: 'ti-arrows-exchange',  label: 'DSP assignment'      },
  ]

  const staffRows = [
    { initials: 'MS', avBg: 'rgba(16,185,129,0.12)', avColor: '#059669',  name: 'Maria Santos',   role: 'DSP', action: 'Submitted timesheet',  status: 'Done',    statusBg: 'rgba(16,185,129,0.12)', statusColor: '#059669' },
    { initials: 'KO', avBg: 'rgba(99,102,241,0.12)', avColor: '#6366f1',  name: "Kevin O'Brien",  role: 'DSP', action: 'Added case note',        status: 'Done',    statusBg: 'rgba(16,185,129,0.12)', statusColor: '#059669' },
    { initials: 'AO', avBg: 'rgba(245,158,11,0.13)', avColor: '#d97706',  name: 'Amara Okafor',   role: 'DSP', action: 'Pending onboarding',     status: 'Pending', statusBg: 'rgba(245,158,11,0.13)', statusColor: '#d97706' },
    { initials: 'RT', avBg: 'rgba(168,85,247,0.12)', avColor: '#a855f7',  name: 'Rachel Torres',  role: 'HR',  action: 'Approved timesheet',     status: 'Done',    statusBg: 'rgba(16,185,129,0.12)', statusColor: '#059669' },
    { initials: 'DM', avBg: 'rgba(16,185,129,0.12)', avColor: '#059669',  name: 'David Mills',    role: 'DSP', action: 'Docs under review',      status: 'Pending', statusBg: 'rgba(245,158,11,0.13)', statusColor: '#d97706' },
  ]

  const activityItems = [
    {
      iconBg: 'rgba(16,185,129,0.12)', iconColor: '#059669', icon: 'ti-check',
      text: <><strong>Maria Santos</strong> submitted her weekly timesheet.</>,
      time: '10 min ago',
    },
    {
      iconBg: 'rgba(245,158,11,0.13)', iconColor: '#d97706', icon: 'ti-notes',
      text: <>Case note added for <strong>Client #0043</strong>.</>,
      time: '42 min ago',
    },
    {
      iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1', icon: 'ti-user',
      text: <><strong>New client</strong> profile created: Johnson, M.</>,
      time: '2 hrs ago',
    },
    {
      iconBg: 'rgba(239,68,68,0.1)', iconColor: '#dc2626', icon: 'ti-alert-triangle',
      text: <><strong>Amara Okafor</strong> onboarding incomplete — action required.</>,
      time: '3 hrs ago',
    },
    {
      iconBg: 'rgba(16,185,129,0.12)', iconColor: '#059669', icon: 'ti-file-check',
      text: <>Timesheet approved for <strong>Kevin O&apos;Brien</strong>.</>,
      time: 'Yesterday',
    },
  ]

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Admin overview</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{today}</div>
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
          <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #fff' }} />
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}>
          <i className="ti ti-settings" />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, background: '#f9fafb', minHeight: 'calc(100% - 56px)' }}>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
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

          {/* Recent staff activity */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#111', flex: 1 }}>Recent Staff Activity</span>
              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 600 }}>Live</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                  {['Staff Member', 'Role', 'Action', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffRows.map((row, i) => (
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
                      <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, fontWeight: 500, background: row.statusBg, color: row.statusColor }}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent activity feed */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#111', flex: 1 }}>Recent Activity</span>
              <span style={{ fontSize: 12, color: '#008080', cursor: 'pointer', fontWeight: 500 }}>View all</span>
            </div>
            <div>
              {activityItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 18px', borderBottom: i < activityItems.length - 1 ? '0.5px solid #f3f4f6' : 'none', alignItems: 'flex-start' }}>
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
          </div>

        </div>
      </div>
    </>
  )
}
