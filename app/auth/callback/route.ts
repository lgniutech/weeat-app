import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // Se existir um "next" na URL (ex: /auth/reset-password), usamos ele. 
  // Se não, vai para a home.
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = new Map<string, any>(); // Simulador temporário para capturar cookies

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Lê cookies da request
            const all: any[] = [];
            request.headers.get("cookie")?.split("; ").forEach((c) => {
               const [name, value] = c.split("=");
               if (name && value) all.push({ name, value });
            });
            return all;
          },
          setAll(cookiesToSet) {
            // Apenas coleta os cookies que o Supabase quer setar
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, { value, options });
            });
          },
        },
      }
    );

    // Troca o código pela sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Monta a URL de destino final
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      let redirectUrl = `${origin}${next}`;
      if (!isLocalEnv && forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`;
      }

      const response = NextResponse.redirect(redirectUrl);

      // Agora sim, escrevemos os cookies na resposta final
      cookieStore.forEach((cookie, name) => {
        response.cookies.set(name, cookie.value, cookie.options);
      });

      return response;
    }
  }

  // Erro? Manda pro login com aviso
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
