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

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // signInWithOtp com TRAVA DE SEGURANÇA
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: false, // <--- AQUI ESTÁ A MÁGICA: Bloqueia criação de novas contas
    },
  });

  if (error) {
    // Dica: Por segurança, o Supabase pode não retornar erro se o usuário não existir
    // (para evitar que hackers descubram quais emails existem).
    // Mas o importante é que a conta NÃO será criada.
    return { error: "Erro ao processar: " + error.message };
  }

  return { success: "Se o e-mail estiver cadastrado, você receberá o link de acesso!" };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
