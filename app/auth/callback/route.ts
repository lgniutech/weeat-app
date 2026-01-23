import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Se for uma confirmação de e-mail ou convite, o Supabase pode enviar um 'next'
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Se não houver erro, levamos o usuário para o destino final (home ou setup)
      return NextResponse.redirect(`${origin}${next}`);
    }
    
    // Log do erro para depuração se necessário
    console.error("Auth error:", error.message);
  }

  // Se o código expirou ou é inválido, redireciona com um parâmetro claro
  // Adicionamos o fragmento original para ajudar o front-end a entender o erro se necessário
  return NextResponse.redirect(`${origin}/login?error=link-expirado`);
}
