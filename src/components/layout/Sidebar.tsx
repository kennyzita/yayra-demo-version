'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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
      { href: '/admin/clients/new', label: 'Clients', icon: 'ti-users' },
      { href: '/admin/assignments', label: 'DSP assignment', icon: 'ti-arrows-exchange' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/admin/staff-progress', label: 'Staff progress report', icon: 'ti-chart-bar' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { href: '/admin/billing', label: 'Billing Management', icon: 'ti-report-money' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/users',  label: 'User Accounts',   icon: 'ti-users'    },
      { href: '/admin/roles',  label: 'Role Management', icon: 'ti-shield'   },
    ],
  },
  {
    label: 'Quick Links',
    items: [
      { href: '#', externalUrl: 'https://www.accessnj.org/',            label: 'AccessNJ',    icon: 'ti-external-link' },
      { href: '#', externalUrl: 'https://www.identogo.com/',            label: 'IdentoGO',    icon: 'ti-external-link' },
      { href: '#', externalUrl: 'https://www.mro.com/',                 label: 'MRO Check',   icon: 'ti-external-link' },
      { href: '#', externalUrl: 'https://www.nj.gov/dcf/news/policies/cpps/FARA.pdf', label: 'FARA Check', icon: 'ti-external-link' },
      { href: '#', externalUrl: 'https://www.njconsumeraffairs.gov/',   label: 'CARI',        icon: 'ti-external-link' },
      { href: '#', externalUrl: 'https://www.hhxchange.com/',           label: 'HHxchange',   icon: 'ti-external-link' },
      { href: '#', externalUrl: 'https://www.e-verify.gov/',            label: 'Everify',     icon: 'ti-external-link' },
    ],
  },
  {
    label: '',
    items: [
      { href: '/admin/settings', label: 'Settings', icon: 'ti-settings' },
    ],
  },
]

const staffSections: NavSection[] = [
  {
    label: 'Main',
    items: [
      { href: '/staff/dashboard', label: 'My overview',  icon: 'ti-layout-dashboard' },
      { href: '/staff/profile',   label: 'My profile',   icon: 'ti-id'               },
    ],
  },
  {
    label: 'Applications',
    items: [
      { href: '/staff/application', label: 'DSP application',  icon: 'ti-file-text'        },
      { href: '/staff/onboarding',  label: 'Onboarding forms', icon: 'ti-clipboard-list', warnBadge: 2 },
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
      { href: '/staff/training',  label: 'My training', icon: 'ti-certificate', warnBadge: 1 },
      { href: '/staff/documents', label: 'My documents', icon: 'ti-folder' },
      { href: '#', externalUrl: '/resources/employee-handbook-2025.pdf', label: 'Staff Hand Book', icon: 'ti-book' },
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
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile,   setIsMobile]   = useState(false)

  const sections = role === 'admin'
    ? (userRole === 'HR' ? adminSections.filter(s => s.label !== 'Billing') : adminSections)
    : getStaffSections(userRole)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close drawer on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarStyle: React.CSSProperties = isMobile ? {
    position:  'fixed',
    top:       0,
    left:      0,
    height:    '100dvh',
    width:     280,
    background: '#002830',
    display:   'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    flexShrink: 0,
    zIndex:    300,
    transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
    boxShadow: mobileOpen ? '6px 0 32px rgba(0,0,0,0.35)' : 'none',
  } : {
    width: 220, minWidth: 220, background: '#002830',
    display: 'flex', flexDirection: 'column',
    height: '100%', overflowY: 'auto', flexShrink: 0,
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 299,
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Mobile FAB — open button */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          style={{
            position:  'fixed',
            bottom:    20,
            left:      16,
            zIndex:    298,
            width:     48,
            height:    48,
            borderRadius: 14,
            background: '#002830',
            color:     'white',
            border:    'none',
            cursor:    'pointer',
            display:   'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize:  22,
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          }}
        >
          <i className="ti ti-layout-sidebar" />
        </button>
      )}

      <div style={sidebarStyle}>
        {/* Mobile header row with close button */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#a8c8cc', letterSpacing: 0.3 }}>Navigation</span>
            <button
              onClick={() => setMobileOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8c8cc', fontSize: 20, display: 'flex', padding: 4 }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
        )}

        {/* Logo */}
        {!isMobile && (
          <div style={{ padding: '20px 18px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#008080,#30B060)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L11 13.17l6.59-6.59L19 8l-8 8z"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', letterSpacing: -0.3 }}>Reliance Care Services</span>
          </div>
        )}

        {/* User */}
        <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0 }}>
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
          <div key={section.label || '__bottom'}>
            {section.label && (
              <div style={{ padding: '14px 18px 5px', fontSize: 10, fontWeight: 600, color: 'rgba(168,200,204,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = !item.externalUrl && (pathname === item.href || pathname.startsWith(item.href + '/'))
              const linkStyle: React.CSSProperties = {
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', fontSize: 13, borderRadius: 8,
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
                    <span style={{ background: '#f97316', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>{item.badge}</span>
                  )}
                  {item.warnBadge != null && (
                    <span style={{ background: '#f97316', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>{item.warnBadge}</span>
                  )}
                </>
              )
              return (
                <div key={item.externalUrl ?? item.href} style={{ padding: '2px 8px' }}>
                  {item.externalUrl ? (
                    <a href={item.externalUrl} target="_blank" rel="noreferrer" style={linkStyle}>{inner}</a>
                  ) : (
                    <Link href={item.href} style={linkStyle}>{inner}</Link>
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
    </>
  )
}
