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
  externalUrl?: string
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
      { href: '/admin/applications', label: 'Hiring', icon: 'ti-briefcase', badge: 3 },
      { href: '/admin/documents', label: 'Upload documents', icon: 'ti-upload' },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/admin/timesheets',  label: 'Time sheet',  icon: 'ti-clock',    warnBadge: 5 },
      { href: '/admin/case-notes',  label: 'Case notes',  icon: 'ti-notes',    warnBadge: 3 },
      { href: '/admin/scheduling',  label: 'Scheduling',  icon: 'ti-calendar'               },
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
  {
    label: 'Administration',
    items: [
      { href: '/admin/users', label: 'User Accounts', icon: 'ti-users-group' },
      { href: '/admin/roles', label: 'Role Management', icon: 'ti-shield-half' },
    ],
  },
  {
    label: 'Quick Links',
    items: [
      { href: '#', externalUrl: 'https://cro.dhs.state.nj.us/Account/Login?ReturnUrl=%2F', label: 'CRO Check', icon: 'ti-user-search' },
      { href: '#', externalUrl: 'https://accessnj.com/index.php/login-2/', label: 'AccessNJ', icon: 'ti-building-community' },
      { href: '#', externalUrl: 'https://uenroll.identogo.com/status-check', label: 'IdentoGO', icon: 'ti-fingerprint' },
      { href: '#', externalUrl: 'https://www.i3screen.net/login/', label: 'MRO Check', icon: 'ti-clipboard-heart' },
      { href: '#', externalUrl: 'https://fara.dhs.state.nj.us/', label: 'FARA Check', icon: 'ti-shield-check' },
      { href: '#', externalUrl: 'https://my.nj.gov/aui/Login', label: 'CARI', icon: 'ti-certificate' },
      { href: '#', externalUrl: 'https://app.hhaexchange.com/identity/account/login', label: 'HHxchange', icon: 'ti-arrows-exchange' },
      { href: '#', externalUrl: 'https://idp.uscis.gov/', label: 'Everify', icon: 'ti-user-check' },
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
      { href: '/staff/timesheet',    label: 'My timesheet',  icon: 'ti-clock'    },
      { href: '/staff/case-notes',   label: 'My case notes', icon: 'ti-notes'    },
      { href: '/staff/my-schedule',  label: 'My schedule',   icon: 'ti-calendar' },
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

function getStaffSections(userRole: string): NavSection[] {
  if (userRole === 'DSP') {
    const trainingSection: NavSection = {
      label: 'Resources',
      items: staffSections
        .find(s => s.label === 'Resources')!
        .items.filter(item => item.href === '/staff/training'),
    }
    return [
      ...staffSections
        .filter(s => s.label === 'Main' || s.label === 'Applications')
        .map(s => s.label === 'Main'
          ? { ...s, items: s.items.filter(item => item.label !== 'My overview') }
          : s
        ),
      trainingSection,
    ]
  }
  if (userRole === 'DSP Staff') {
    return staffSections.filter(s => s.label === 'Main' || s.label === 'Work' || s.label === 'Resources')
  }
  return staffSections
}

export function Sidebar({ role, userName, userInitials, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const sections = role === 'admin'
    ? (userRole === 'HR' ? adminSections.filter(s => s.label !== 'Billing') : adminSections)
    : getStaffSections(userRole)

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
          Reliance Care Services
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
          <div style={{ padding: '14px 18px 5px', fontSize: 10, fontWeight: 600, color: 'rgba(168,200,204,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {section.label}
          </div>
          {section.items.map((item) => {
            const isActive = !item.externalUrl && (pathname === item.href || pathname.startsWith(item.href + '/'))
            const linkStyle: React.CSSProperties = {
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', fontSize: 13, borderRadius: 8,
              color: isActive ? 'white' : '#a8c8cc',
              background: isActive ? '#008080' : 'transparent',
              textDecoration: 'none', transition: 'background 0.15s',
            }
            const inner = (
              <>
                <i className={`ti ${item.icon}`} style={{ fontSize: 16, width: 18, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.externalUrl && (
                  <i className="ti ti-external-link" style={{ fontSize: 12, opacity: 0.5, flexShrink: 0 }} />
                )}
                {item.badge != null && (
                  <span style={{ background: '#f97316', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>
                    {item.badge}
                  </span>
                )}
                {item.warnBadge != null && (
                  <span style={{ background: '#f97316', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>
                    {item.warnBadge}
                  </span>
                )}
              </>
            )
            return (
              <div key={item.externalUrl ?? item.href} style={{ padding: '2px 8px' }}>
                {item.externalUrl ? (
                  <a href={item.externalUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                    {inner}
                  </a>
                ) : (
                  <Link href={item.href} style={linkStyle}>
                    {inner}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {/* Bottom */}
      <div style={{ padding: '12px 18px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
        <Link
          href={role === 'admin' ? '/admin/settings' : '/staff/settings'}
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
