import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// F24: /register added so unauthenticated visitors can reach the registration page
const PUBLIC_PATHS = ['/login', '/auth/callback', '/training', '/reset-password', '/register', '/intake', '/reference-form']
const SESSION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // F17: Return 401 for unauthenticated API requests instead of redirecting to login page
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Session timeout check (page routes only)
  if (!pathname.startsWith('/api/')) {
    const lastActivity = request.cookies.get('yc_last_activity')?.value
    const now = Date.now()

    if (lastActivity && now - parseInt(lastActivity) > SESSION_TIMEOUT_MS) {
      const res = NextResponse.redirect(new URL('/login?timeout=true', request.url))
      res.cookies.delete('yc_last_activity')
      return res
    }

    supabaseResponse.cookies.set('yc_last_activity', now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_TIMEOUT_MS / 1000,
      path: '/',
    })
  }

  // F17: Fetch role for every authenticated request so deactivated users are
  // blocked at the middleware layer — no page or API route is reachable after deactivation
  const { data: profile } = await supabase
    .from('users')
    .select('role:roles(name)')
    .eq('id', user.id)
    .single()

  const roleName = (profile?.role as { name: string } | null)?.name

  if (roleName === 'Deactivate') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 })
    }
    if (pathname !== '/deactivated') {
      return NextResponse.redirect(new URL('/deactivated', request.url))
    }
    return supabaseResponse
  }

  // Role-based routing for page routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    const isAdminRole = roleName === 'Admin' || roleName === 'HR'

    if (pathname.startsWith('/admin') && !isAdminRole) {
      return NextResponse.redirect(new URL('/staff/dashboard', request.url))
    }
    if (pathname.startsWith('/staff') && isAdminRole) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
