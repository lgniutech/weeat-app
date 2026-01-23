import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // LÓGICA DO CONVITE:
  // Se não tiver um destino específico ('next'), mandamos para '/update-password'.
  // Assim, o convidado define a senha logo no primeiro acesso.
  const next = searchParams.get("next") ?? "/update-password";

  if (code) {
    const supabase = await createClient();
    
    // Troca o código (do e-mail) por uma sessão real (Login)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Sucesso! Usuário está logado. Redireciona para definir a senha.
      return NextResponse.redirect(`${origin}${next}`);
    }
    
    console.error("Erro no callback de auth:", error);
  }

  // Se o código for inválido ou expirado, manda pro login com erro
  return NextResponse.redirect(`${origin}/login?error=link-invalido`);
}
