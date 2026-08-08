import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = request.cookies.has('refresh_token')
  const role = request.cookies.get('user_role')?.value

  if (!isAuthenticated && (pathname.startsWith('/chat') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/chat', request.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/chat/:path*', '/admin/:path*'],
}
