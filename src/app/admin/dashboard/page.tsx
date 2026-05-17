'use client'

export default function AdminDashboardPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const staffRows = [
    { initials: 'MS', avBg: 'rgba(0,128,128,0.12)', avColor: '#008080', name: 'Maria Santos', role: 'DSP', roleBg: 'rgba(0,128,128,0.1)', roleColor: '#008080', action: 'Submitted timesheet', status: 'Awaiting approval', statusBg: 'rgba(186,117,23,0.1)', statusColor: '#BA7517' },
    { initials: 'KO', avBg: 'rgba(55,138,221,0.1)', avColor: '#378ADD', name: "Kevin O'Brien", role: 'DSP', roleBg: 'rgba(0,128,128,0.1)', roleColor: '#008080', action: 'Submitted case note', status: 'Awaiting review', statusBg: 'rgba(186,117,23,0.1)', statusColor: '#BA7517' },
    { initials: 'AO', avBg: 'rgba(186,117,23,0.1)', avColor: '#BA7517', name: 'Amara Okafor', role: 'DSP', roleBg: 'rgba(0,128,128,0.1)', roleColor: '#008080', action: 'Pending onboarding', status: 'Incomplete', statusBg: 'rgba(226,75,74,0.1)', statusColor: '#E24B4A' },
    { initials: 'RT', avBg: 'rgba(48,176,96,0.12)', avColor: '#30B060', name: 'Rachel Torres', role: 'HR', roleBg: 'rgba(48,176,96,0.12)', roleColor: '#30B060', action: 'Approved timesheet', status: 'Done', statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060' },
    { initials: 'DM', avBg: 'rgba(0,128,128,0.12)', avColor: '#008080', name: 'David Mills', role: 'DSP', roleBg: 'rgba(0,128,128,0.1)', roleColor: '#008080', action: 'Docs under review', status: 'Review', statusBg: 'rgba(55,138,221,0.1)', statusColor: '#378ADD' },
  ]

  const activityItems = [
    { icon: 'ti-clock', color: '#BA7517', bg: 'rgba(186,117,23,0.1)', text: <><strong>Maria Santos</strong> submitted weekly timesheet — awaiting approval.</>, time: '10 min ago' },
    { icon: 'ti-notes', color: '#E24B4A', bg: 'rgba(226,75,74,0.1)', text: <>Case note submitted for <strong>Client #0043</strong> — awaiting review.</>, time: '42 min ago' },
    { icon: 'ti-user-plus', color: '#378ADD', bg: 'rgba(55,138,221,0.1)', text: <>New client profile created: <strong>Johnson, M.</strong></>, time: '2 hrs ago' },
    { icon: 'ti-alert-triangle', color: '#E24B4A', bg: 'rgba(226,75,74,0.1)', text: <><strong>Amara Okafor</strong> onboarding incomplete — action required.</>, time: '3 hrs ago' },
    { icon: 'ti-file-check', color: '#30B060', bg: 'rgba(48,176,96,0.12)', text: <>Timesheet approved for <strong>Kevin O&apos;Brien</strong>.</>, time: 'Yesterday' },
  ]

  const metrics = [
    { icon: 'ti-users', iconBg: 'rgba(0,128,128,0.1)', iconColor: '#008080', badge: '+4 new', badgeBg: 'rgba(48,176,96,0.12)', badgeColor: '#30B060', value: '47', label: 'Active clients' },
    { icon: 'ti-user-check', iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060', badge: '+2', badgeBg: 'rgba(48,176,96,0.12)', badgeColor: '#30B060', value: '18', label: 'DSP staff' },
    { icon: 'ti-clock', iconBg: 'rgba(186,117,23,0.1)', iconColor: '#BA7517', badge: '5 pending', badgeBg: 'rgba(186,117,23,0.12)', badgeColor: '#BA7517', value: '5', label: 'Timesheets to approve' },
    { icon: 'ti-notes', iconBg: 'rgba(226,75,74,0.1)', iconColor: '#E24B4A', badge: '3 pending', badgeBg: 'rgba(226,75,74,0.1)', badgeColor: '#E24B4A', value: '3', label: 'Case notes to review' },
  ]

  const quickActions = [
    { icon: 'ti-user-plus', label: 'New client', bg: 'rgba(0,128,128,0.1)', color: '#008080' },
    { icon: 'ti-clock', label: 'Approve timesheets', bg: 'rgba(186,117,23,0.1)', color: '#BA7517' },
    { icon: 'ti-notes', label: 'Review case notes', bg: 'rgba(226,75,74,0.1)', color: '#E24B4A' },
    { icon: 'ti-arrows-exchange', label: 'DSP assignment', bg: 'rgba(48,176,96,0.12)', color: '#30B060' },
  ]

  const s: Record<string, React.CSSProperties> = {
    panel: { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' },
    panelHeader: { padding: '14px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 },
    panelTitle: { fontSize: 14, fontWeight: 500, color: '#111', flex: 1 },
  }

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
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}><i className="ti ti-bell" /></div>
          <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#E24B4A', border: '1.5px solid #fff' }} />
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}><i className="ti ti-settings" /></div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: m.iconColor }}>
                  <i className={`ti ${m.icon}`} />
                </div>
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 500, background: m.badgeBg, color: m.badgeColor }}>{m.badge}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 500, color: '#111', letterSpacing: -0.5 }}>{m.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <div style={{ marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Quick actions</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
            {quickActions.map((qa) => (
              <div key={qa.label} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: qa.bg, color: qa.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  <i className={`ti ${qa.icon}`} />
                </div>
                <span style={{ fontSize: 12, color: '#111', fontWeight: 500 }}>{qa.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Two-col */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

          {/* Staff table */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <span style={s.panelTitle}>Recent staff activity</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#30B060', fontWeight: 500 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30B060' }} />
                Live
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #e5e7eb' }}>
                  {['Staff member', 'Role', 'Action', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < staffRows.length - 1 ? '0.5px solid #e5e7eb' : 'none' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: '#111' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: row.avBg, color: row.avColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{row.initials}</div>
                        {row.name}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, background: row.roleBg, color: row.roleColor }}>{row.role}</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280' }}>{row.action}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4, background: row.statusBg, color: row.statusColor }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: row.statusColor }} />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Activity feed */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <span style={s.panelTitle}>Recent activity</span>
              <span style={{ fontSize: 12, color: '#008080', cursor: 'pointer' }}>View all</span>
            </div>
            <div>
              {activityItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 16px', borderBottom: i < activityItems.length - 1 ? '0.5px solid #e5e7eb' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                    <i className={`ti ${item.icon}`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#111', lineHeight: 1.4 }}>{item.text}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{item.time}</div>
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
