import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
  
  // Rotas que não exigem login
  const publicRoutes = ['/login', '/forgot-password', '/auth', '/update-password']
  const isPublicRoute = publicRoutes.some(route => url.pathname.startsWith(route))
  
  // Verificação de código na URL (essencial para convites e recuperação)
  const hasCode = url.searchParams.has('code')

  // 1. Se estiver na rota de callback ou tiver um código, deixamos passar direto para o Route Handler processar
  if (url.pathname.startsWith('/auth') || hasCode) {
    return supabaseResponse
  }

  // 2. Se NÃO estiver logado e tentar acessar rota privada -> Login
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 3. Se JÁ estiver logado e tentar acessar Login/Recuperação -> Home
  // Permitimos /update-password para usuários logados trocarem a senha
  if (user && (url.pathname.startsWith('/login') || url.pathname.startsWith('/forgot-password'))) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
