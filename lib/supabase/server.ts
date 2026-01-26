import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  // Tenta pegar a variável NEXT_PUBLIC (padrão) OU a SUPABASE (integração Vercel)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  // Validação
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "ERRO DE CONFIGURAÇÃO: As variáveis do Supabase não foram encontradas. \n" +
      "Certifique-se de ter adicionado NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel \n" +
      "e feito o REDEPLOY após adicionar."
    )
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignora erro de setar cookie em Server Component (padrão do Next.js)
          }
        },
      },
    }
  )
}
