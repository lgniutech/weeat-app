import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // MUDANÇA: O destino padrão agora é '/setup'
  // Assim, quem clica no convite cai direto na configuração
  const next = searchParams.get("next") ?? "/setup";

  if (code) {
    const supabase = await createClient();
    
    // Troca o código pela sessão (Login Automático)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
