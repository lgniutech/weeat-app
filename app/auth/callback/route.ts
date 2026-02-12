import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignora erro se for chamado de componente server-side (não é o caso aqui)
            }
          },
        },
      }
    );

    // Tenta trocar o código pela sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Sucesso! A sessão foi gravada nos cookies automaticamente pelo setAll acima.
      // Agora redirecionamos para a página certa (reset-password).
      
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      let redirectUrl = `${origin}${next}`;
      if (!isLocalEnv && forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`;
      }

      return NextResponse.redirect(redirectUrl);
    }
  }

  // Se falhar, redireciona para o login com o erro visível
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
