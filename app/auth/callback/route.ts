import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // Se for recuperação de senha, o Supabase envia para /update-password depois
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Se deu certo, vai para a página definida (home ou troca de senha)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Se o link falhar (ex: expirado), volta pro login com erro amigável
  return NextResponse.redirect(`${origin}/login?error=link-invalido`);
}
