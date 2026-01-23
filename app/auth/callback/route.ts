import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // MUDANÇA: Se não houver um destino definido, mandamos para /update-password
  // Assim, quem vem de convite ou magic link cai na tela de definir senha primeiro.
  const next = searchParams.get("next") ?? "/update-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Se der erro, volta para login
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
