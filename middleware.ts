import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Cria uma resposta base que permite modificar cookies
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  
  // MUDANÇA: Removi '/update-password' e '/setup' da lista, pois não existem mais
  const publicRoutes = ['/login', '/forgot-password', '/auth']
  const isPublicRoute = publicRoutes.some(route => url.pathname.startsWith(route))
  
  const hasCode = url.searchParams.has('code')

  // REGRA 1: Se tiver código ou for auth, passa
  if (hasCode || url.pathname.startsWith('/auth')) {
    return supabaseResponse
  }

  // REGRA 2: Não logado tentando rota privada -> Login
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // REGRA 3: Logado tentando Login -> Home
  if (user && (url.pathname.startsWith('/login') || url.pathname.startsWith('/forgot-password'))) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
