import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Se houver um "next" na URL (ex: /auth/reset-password), usamos ele
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = new Map(); // Armazém temporário

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Lê os cookies da requisição original
            const all: any[] = [];
            request.headers.get("cookie")?.split("; ").forEach((c) => {
               const [name, value] = c.split("=");
               if (name && value) all.push({ name, value });
            });
            return all;
          },
          setAll(cookiesToSet) {
            // Guarda os cookies que o Supabase quer criar
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, { value, options });
            });
          },
        },
      }
    );

    // TROCA O CÓDIGO PELA SESSÃO (Aqui acontece a mágica do login)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Prepara o redirecionamento
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      let redirectUrl = `${origin}${next}`;
      if (!isLocalEnv && forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`;
      }

      const response = NextResponse.redirect(redirectUrl);

      // Aplica os cookies de sessão na resposta final
      cookieStore.forEach((cookie, name) => {
        response.cookies.set(name, cookie.value, cookie.options);
      });

      return response;
    }
  }

  // Se der erro no código, volta pro login com erro
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
