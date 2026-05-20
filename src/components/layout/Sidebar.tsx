'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  role: 'admin' | 'staff'
  userName: string
  userInitials: string
  userRole: string
}

interface NavItem {
  href: string
  label: string
  icon: string
  badge?: number
  warnBadge?: number
}

interface NavSection {
  label: string
  items: NavItem[]
}

const adminSections: NavSection[] = [
  {
    label: 'Main',
    items: [
      { href: '/admin/dashboard', label: 'Admin overview', icon: 'ti-layout-dashboard' },
      { href: '/admin/profile', label: 'Profile details', icon: 'ti-id' },
    ],
  },
  {
    label: 'Applications',
    items: [
      { href: '/admin/applications', label: 'DSP application', icon: 'ti-file-text', badge: 3 },
      { href: '/admin/documents', label: 'Upload documents', icon: 'ti-upload' },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/admin/timesheets', label: 'Time sheet', icon: 'ti-clock', warnBadge: 5 },
      { href: '/admin/case-notes', label: 'Case notes', icon: 'ti-notes', warnBadge: 3 },
    ],
  },
  {
    label: 'Clients',
    items: [
      { href: '/admin/clients/new', label: 'Create new client', icon: 'ti-user-plus' },
      { href: '/admin/assignments', label: 'DSP assignment', icon: 'ti-arrows-exchange' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/admin/staff-progress', label: 'Staff progress report', icon: 'ti-clipboard-check' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { href: '/admin/billing', label: 'Billing Management', icon: 'ti-receipt-2' },
    ],
  },
]

const staffSections: NavSection[] = [
  {
    label: 'Main',
    items: [
      { href: '/staff/dashboard', label: 'My overview', icon: 'ti-layout-dashboard' },
      { href: '/staff/profile', label: 'Profile details', icon: 'ti-id' },
    ],
  },
  {
    label: 'Applications',
    items: [
      { href: '/staff/application', label: 'DSP application', icon: 'ti-file-text' },
      { href: '/staff/onboarding', label: 'Onboarding forms', icon: 'ti-clipboard-list', warnBadge: 2 },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/staff/timesheet', label: 'My timesheet', icon: 'ti-clock' },
      { href: '/staff/case-notes', label: 'My case notes', icon: 'ti-notes' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { href: '/staff/training', label: 'My training', icon: 'ti-certificate', warnBadge: 1 },
      { href: '/staff/documents', label: 'My documents', icon: 'ti-folder' },
    ],
  },
]

export function Sidebar({ role, userName, userInitials, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const sections = role === 'admin' ? adminSections : staffSections

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const nav: React.CSSProperties = {
    width: 220, minWidth: 220, background: '#002830',
    display: 'flex', flexDirection: 'column',
    height: '100%', overflowY: 'auto', flexShrink: 0,
  }

  return (
    <div style={nav}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#008080,#30B060)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L11 13.17l6.59-6.59L19 8l-8 8z"/></svg>
        </div>
        <span style={{ fontSize: 16, fontWeight: 500, color: '#fff', letterSpacing: -0.3 }}>
          Yayra<span style={{ color: '#30B060' }}>Care</span>
        </span>
      </div>

      {/* User */}
      <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'white', flexShrink: 0 }}>
          {userInitials}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ fontSize: 13, color: 'white', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
          <div style={{ fontSize: 11, color: '#a8c8cc' }}>{userRole}</div>
        </div>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#30B060', flexShrink: 0 }} />
      </div>

      {/* Nav sections */}
      {sections.map((section) => (
        <div key={section.label}>
          <div style={{ padding: '14px 18px 6px', fontSize: 10, fontWeight: 500, color: 'rgba(168,200,204,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {section.label}
          </div>
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 18px', fontSize: 13,
                  color: isActive ? 'white' : '#a8c8cc',
                  background: isActive ? 'rgba(48,176,96,0.18)' : 'transparent',
                  textDecoration: 'none', position: 'relative', transition: 'all 0.15s',
                }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#30B060', borderRadius: '0 2px 2px 0' }} />
                )}
                <i className={`ti ${item.icon}`} style={{ fontSize: 16, width: 18, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge != null && (
                  <span style={{ background: '#30B060', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 500 }}>
                    {item.badge}
                  </span>
                )}
                {item.warnBadge != null && (
                  <span style={{ background: '#BA7517', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 500 }}>
                    {item.warnBadge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}

      {/* Staff sub-item: Employee handbook */}
      {role === 'staff' && (
        <Link
          href="/staff/handbook"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 18px 6px 46px', fontSize: 12, color: '#00A090', textDecoration: 'none' }}
        >
          <i className="ti ti-download" style={{ fontSize: 14, width: 16, flexShrink: 0 }} />
          Employee handbook
        </Link>
      )}

      <div style={{ flex: 1 }} />

      {/* Bottom */}
      <div style={{ padding: '12px 18px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
        <Link
          href="/settings"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13, color: '#a8c8cc', textDecoration: 'none' }}
        >
          <i className="ti ti-settings" style={{ fontSize: 16, width: 18 }} />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13, color: '#a8c8cc', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}
        >
          <i className="ti ti-logout" style={{ fontSize: 16, width: 18 }} />
          Logout
        </button>
      </div>
    </div>
  )
}
