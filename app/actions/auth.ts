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
    if (error.message.includes("Invalid login credentials")) {
        return { error: "E-mail ou senha inválidos." };
    }
    return { error: "Erro ao entrar: " + error.message };
  }

  return redirect("/");
}

export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // AJUSTE: Mantivemos o signInWithOtp pela robustez cross-device que você citou,
  // mas agora apontamos o redirecionamento (next) para a página de criar nova senha.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // O segredo está aqui: ?next=/auth/reset-password
      emailRedirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    let msg = error.message
    if (msg.includes("Rate limit")) msg = "Muitas tentativas. Aguarde 60 segundos."
    if (msg.includes("Signups not allowed")) msg = "Não encontramos uma conta com este e-mail."
    return { error: msg };
  }

  return { success: "Link de redefinição enviado! Verifique seu e-mail." };
}

export async function updatePasswordAction(prevState: any, formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const supabase = await createClient();

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter no mínimo 6 caracteres." };
  }

  // Como o usuário chegou aqui via Link Mágico, ele já está logado na sessão atual.
  // Podemos apenas atualizar o usuário.
  const { error } = await supabase.auth.updateUser({ 
    password: password 
  });

  if (error) {
    return { error: "Erro ao atualizar senha: " + error.message };
  }

  return redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
