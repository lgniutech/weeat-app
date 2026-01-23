"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  return redirect("/");
}

// MUDANÇA: Agora envia um link de LOGIN MÁGICO (Magic Link)
export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // signInWithOtp envia um link que loga o usuário direto
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Redireciona para o callback, que vai mandar para a Home '/'
      emailRedirectTo: `${origin}/auth/callback`, 
    },
  });

  if (error) {
    return { error: "Erro ao enviar link: " + error.message };
  }

  return { success: "Link de acesso mágico enviado para seu e-mail!" };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
// Removemos a updatePasswordAction pois faremos isso na loja agora
