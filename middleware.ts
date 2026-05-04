import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect /admin and /admin/* but NOT /admin/login
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  if (isAdminRoute && !pathname.startsWith('/admin/login')) {
    const token  = req.cookies.get('admin_token')?.value
    const secret = process.env.ADMIN_SECRET || 'lucky-draw-admin-2024'
    if (token !== secret) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
