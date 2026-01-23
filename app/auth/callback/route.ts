import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Se houver um parametro 'next', usaremos ele para redirecionar
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Login com sucesso, redireciona para a página desejada (ex: /update-password)
      const forwardedHost = request.headers.get('x-forwarded-host') 
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // Em dev, usamos o origin normal
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        // Em produção (Vercel), respeitamos o host original se houver proxy
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        // Fallback
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Se der erro ou não tiver código, volta pro login com erro genérico
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}
