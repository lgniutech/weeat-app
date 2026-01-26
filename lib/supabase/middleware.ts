import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Cria uma resposta base que permite modificar cookies
  let supabaseResponse = NextResponse.next({
    request,
  })

  // ⚠️ PREVENÇÃO DE ERRO 500:
  // Se as variáveis não existirem, não tenta criar o cliente para não quebrar o server
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas.")
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

  // Verifica usuário
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const path = url.pathname

  // 1. Definição de Rotas
  
  // Rotas de Autenticação (Sempre Públicas)
  const isAuthRoute = 
    path.startsWith('/login') || 
    path.startsWith('/auth') || 
    path.startsWith('/forgot-password') || 
    path.startsWith('/register') ||
    path.startsWith('/verify');

  // Rotas Protegidas (Exigem Login)
  // O Dashboard fica na raiz '/', o Setup e as Configurações
  const isProtectedRoute = 
    path === '/' || 
    path.startsWith('/setup') || 
    path.startsWith('/settings') ||
    path.startsWith('/dashboard'); // Caso adicione prefixo no futuro

  // 2. LÓGICA DE PROTEÇÃO

  // CASO A: Usuário NÃO Logado
  if (!user) {
    // Se tentar acessar rota protegida (Dashboard, Settings, Setup) -> Login
    if (isProtectedRoute) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Se for Auth ou qualquer outra coisa (LOJA PÚBLICA /slug) -> Libera
    return supabaseResponse
  }

  // CASO B: Usuário JÁ Logado
  if (user) {
    // Se tentar entrar no Login ou Cadastro -> Manda pro Dashboard
    if (isAuthRoute && !path.startsWith('/auth')) { // Deixa /auth passar para callbacks
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
