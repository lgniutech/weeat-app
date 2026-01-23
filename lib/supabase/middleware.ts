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

  // Verifica se o usuário já tem sessão
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  
  // Rotas públicas que não precisam de login
  // IMPORTANTE: '/auth' deve ser pública para o callback funcionar
  const publicRoutes = ['/login', '/forgot-password', '/auth', '/update-password']
  const isPublicRoute = publicRoutes.some(route => url.pathname.startsWith(route))
  
  // Verifica se há um código na URL (típico de convites/recuperação)
  const hasCode = url.searchParams.has('code')

  // REGRA 1: Se tiver código (convite) ou for rota de auth, deixa passar!
  // Isso impede que o usuário seja jogado para o login antes de validar o convite.
  if (hasCode || url.pathname.startsWith('/auth')) {
    return supabaseResponse
  }

  // REGRA 2: Se NÃO estiver logado e tentar acessar rota privada -> Login
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // REGRA 3: Se JÁ estiver logado e tentar acessar Login/Recuperação -> Dashboard
  // Mas permitimos '/update-password' para quem acabou de entrar via convite
  if (user && (url.pathname.startsWith('/login') || url.pathname.startsWith('/forgot-password'))) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
