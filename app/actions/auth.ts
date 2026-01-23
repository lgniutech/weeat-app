"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

/**
 * Realiza o login do usuário com e-mail e senha.
 */
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

/**
 * Envia o e-mail de recuperação de senha.
 * O link enviado levará o usuário para o callback, que o redirecionará para /update-password.
 */
export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) {
    return { error: "Erro ao enviar e-mail de recuperação: " + error.message };
  }

  return { success: "E-mail de recuperação enviado! Verifique sua caixa de entrada." };
}

/**
 * Atualiza a senha do usuário logado (via link de recuperação ou convite).
 * Após o sucesso, redireciona para o Setup da Loja.
 */
export async function updatePasswordAction(prevState: any, formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: "Erro ao atualizar senha: " + error.message };
  }

  // Fluxo de Onboarding: Após definir a senha, o usuário precisa configurar a loja
  return redirect("/setup");
}

/**
 * Encerra a sessão do usuário.
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
