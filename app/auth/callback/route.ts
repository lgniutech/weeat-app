import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    // 1. Prepara a URL de destino correta (tratando Vercel/Localhost)
    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';
    
    let redirectUrl = `${origin}${next}`;
    if (!isLocalEnv && forwardedHost) {
      redirectUrl = `https://${forwardedHost}${next}`;
    }

    // 2. Cria a Resposta de Redirecionamento (ainda vazia de cookies)
    const response = NextResponse.redirect(redirectUrl);

    // 3. Cria o cliente Supabase configurado para escrever cookies NESSA resposta
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
            // AQUI ESTÁ O SEGREDO: Escreve os cookies no Redirect Response
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // 4. Troca o código pela sessão (isso vai disparar o setAll acima)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Retorna a resposta que já contém o redirecionamento E os cookies
      return response;
    }
  }

  // Se der erro, manda pro login
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
