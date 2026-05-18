import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

const PUBLIC_PATHS = ['/login', '/auth/callback']
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
        setAll(cookiesToSet: { name: string; value: string; options?: Partial<ResponseCookie> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Session timeout check
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

  // Role-based routing
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    const { data: user } = await supabase
      .from('users')
      .select('role:roles(name)')
      .eq('id', session.user.id)
      .single()

    const roleName = (user?.role as { name: string } | null)?.name
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
