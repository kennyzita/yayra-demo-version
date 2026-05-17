'use client'

export default function StaffDashboardPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const metrics = [
    { icon: 'ti-users', iconBg: 'rgba(0,128,128,0.1)', iconColor: '#008080', badge: 'this week', badgeBg: 'rgba(55,138,221,0.1)', badgeColor: '#378ADD', value: '3', label: 'My assigned clients' },
    { icon: 'ti-clock', iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060', badge: 'on track', badgeBg: 'rgba(48,176,96,0.12)', badgeColor: '#30B060', value: '32.5', label: 'Hours logged this week' },
    { icon: 'ti-notes', iconBg: 'rgba(55,138,221,0.1)', iconColor: '#378ADD', badge: 'this month', badgeBg: 'rgba(55,138,221,0.1)', badgeColor: '#378ADD', value: '14', label: 'Case notes submitted' },
    { icon: 'ti-certificate', iconBg: 'rgba(127,119,221,0.1)', iconColor: '#7F77DD', badge: '1 due soon', badgeBg: 'rgba(186,117,23,0.12)', badgeColor: '#BA7517', value: '4/5', label: 'Trainings completed' },
  ]

  const clients = [
    { initials: 'RJ', bg: 'rgba(0,128,128,0.12)', color: '#008080', name: 'Robert Johnson', meta: 'ISP: Community participation · Expires Dec 2026' },
    { initials: 'AM', bg: 'rgba(55,138,221,0.1)', color: '#378ADD', name: 'Angela Moore', meta: 'ISP: ADL support · Expires Mar 2027' },
    { initials: 'TW', bg: 'rgba(186,117,23,0.1)', color: '#BA7517', name: 'Thomas Williams', meta: 'ISP: Independence training · Expires Aug 2026' },
  ]

  const trainings = [
    { icon: 'ti-certificate', iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060', name: 'CDS training', due: 'Completed · May 2026', pct: 100, barColor: '#30B060' },
    { icon: 'ti-certificate', iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060', name: 'CPR / First Aid / BLS', due: 'Completed · Expires Apr 2027', pct: 100, barColor: '#30B060' },
    { icon: 'ti-book', iconBg: 'rgba(0,128,128,0.1)', iconColor: '#008080', name: '60-day orientation', due: 'In progress · Due Jun 12, 2026', pct: 72, barColor: '#008080' },
    { icon: 'ti-alert-triangle', iconBg: 'rgba(186,117,23,0.1)', iconColor: '#BA7517', name: "Danielle's Law compliance", due: 'Due soon · Due May 20, 2026', pct: 30, barColor: '#BA7517' },
  ]

  const tsRows = [
    { day: 'Sun', pct: 0, hours: '—', status: null },
    { day: 'Mon', pct: 100, hours: '8h', status: { label: 'Logged', bg: 'rgba(48,176,96,0.1)', color: '#30B060' } },
    { day: 'Tue', pct: 100, hours: '8h', status: { label: 'Logged', bg: 'rgba(48,176,96,0.1)', color: '#30B060' } },
    { day: 'Wed', pct: 81, hours: '6.5h', status: { label: 'Logged', bg: 'rgba(48,176,96,0.1)', color: '#30B060' } },
    { day: 'Thu', pct: 100, hours: '8h', status: { label: 'Logged', bg: 'rgba(48,176,96,0.1)', color: '#30B060' } },
    { day: 'Fri', pct: 25, hours: '2h', status: { label: 'Pending', bg: 'rgba(186,117,23,0.1)', color: '#BA7517' } },
    { day: 'Sat', pct: 0, hours: '—', status: null },
  ]

  const docs = [
    { done: true, label: 'Resume', tag: 'Uploaded' },
    { done: true, label: "Driver's license", tag: 'Uploaded' },
    { done: true, label: 'CPR certificate', tag: 'Uploaded' },
    { done: true, label: 'Form I-9', tag: 'Uploaded' },
    { done: false, label: 'Direct deposit form', tag: 'Pending' },
    { done: false, label: 'NJ W4', tag: 'Pending' },
  ]

  const panel: React.CSSProperties = { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }
  const panelHeader: React.CSSProperties = { padding: '14px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>My overview</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{today}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}><i className="ti ti-bell" /></div>
          <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#E24B4A', border: '1.5px solid #fff' }} />
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}><i className="ti ti-settings" /></div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Welcome banner */}
        <div style={{ background: '#002830', borderRadius: 10, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'white' }}>Good morning, Maria 👋</div>
            <div style={{ fontSize: 12, color: '#a8c8cc', marginTop: 3 }}>You have 2 clients assigned today and 1 pending case note.</div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[{ val: '32.5', lbl: 'Hours this week' }, { val: '3', lbl: 'Clients assigned' }, { val: '1', lbl: 'Note pending' }].map((stat, i) => (
              <>
                {i > 0 && <div key={`div-${i}`} style={{ width: '0.5px', background: 'rgba(255,255,255,0.1)' }} />}
                <div key={stat.lbl} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: 'white' }}>{stat.val}</div>
                  <div style={{ fontSize: 11, color: '#a8c8cc', marginTop: 2 }}>{stat.lbl}</div>
                </div>
              </>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
            {[
              { icon: 'ti-clock', label: 'Log hours', bg: 'rgba(0,128,128,0.1)', color: '#008080' },
              { icon: 'ti-notes', label: 'Add case note', bg: 'rgba(48,176,96,0.12)', color: '#30B060' },
              { icon: 'ti-upload', label: 'Upload document', bg: 'rgba(55,138,221,0.1)', color: '#378ADD' },
            ].map((qa) => (
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Assigned clients */}
            <div style={panel}>
              <div style={panelHeader}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>My assigned clients</span>
                <span style={{ fontSize: 12, color: '#008080', cursor: 'pointer', fontWeight: 500 }}>View all</span>
              </div>
              {clients.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < clients.length - 1 ? '0.5px solid #e5e7eb' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>{c.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{c.meta}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid #008080', background: 'rgba(0,128,128,0.08)', color: '#008080', cursor: 'pointer' }}>Case note</button>
                    <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'transparent', color: '#111', cursor: 'pointer' }}>View</button>
                  </div>
                </div>
              ))}
            </div>

            {/* My training */}
            <div style={panel}>
              <div style={panelHeader}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>My training</span>
                <span style={{ fontSize: 12, color: '#008080', cursor: 'pointer', fontWeight: 500 }}>View all</span>
              </div>
              {trainings.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < trainings.length - 1 ? '0.5px solid #e5e7eb' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: t.iconBg, color: t.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                    <i className={`ti ${t.icon}`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{t.due}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                      <div style={{ flex: 1, height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: t.barColor, width: `${t.pct}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280', width: 28, textAlign: 'right' }}>{t.pct}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Timesheet */}
            <div style={panel}>
              <div style={panelHeader}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>This week&apos;s timesheet</span>
                <span style={{ fontSize: 12, color: '#008080', cursor: 'pointer', fontWeight: 500 }}>Submit</span>
              </div>
              {tsRows.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < tsRows.length - 1 ? '0.5px solid #e5e7eb' : 'none' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', width: 36, flexShrink: 0 }}>{r.day}</span>
                  <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: '#008080', width: `${r.pct}%` }} />
                  </div>
                  <span style={{ fontSize: 12, color: r.pct > 0 ? '#111' : '#6b7280', width: 40, textAlign: 'right', flexShrink: 0 }}>{r.hours}</span>
                  {r.status ? (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500, flexShrink: 0, background: r.status.bg, color: r.status.color }}>{r.status.label}</span>
                  ) : (
                    <span style={{ width: 52, flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>

            {/* Documents */}
            <div style={panel}>
              <div style={panelHeader}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>My documents</span>
                <span style={{ fontSize: 12, color: '#008080', cursor: 'pointer', fontWeight: 500 }}>Upload new</span>
              </div>
              {docs.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: i < docs.length - 1 ? '0.5px solid #e5e7eb' : 'none' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: d.done ? 'none' : '1.5px solid #BA7517', background: d.done ? '#30B060' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: 'white' }}>
                    {d.done && <i className="ti ti-check" />}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: d.done ? '#6b7280' : '#111', textDecoration: d.done ? 'line-through' : 'none' }}>{d.label}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500, background: d.done ? 'rgba(48,176,96,0.1)' : 'rgba(186,117,23,0.1)', color: d.done ? '#30B060' : '#BA7517' }}>{d.tag}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'rgba(0,160,144,0.04)', cursor: 'pointer' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,160,144,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: '#00A090' }}>
                  <i className="ti ti-download" />
                </div>
                <span style={{ flex: 1, fontSize: 13, color: '#00A090', fontWeight: 500 }}>Employee handbook</span>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500, background: 'rgba(0,160,144,0.12)', color: '#00A090' }}>Download</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
