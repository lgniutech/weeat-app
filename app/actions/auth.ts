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
    return { error: "Credenciais inválidas. Verifique e-mail e senha." };
  }

  return redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}

// --- NOVO: Envia o e-mail de recuperação ---
export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // O callback vai redirecionar o usuário para a página de criar nova senha
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) {
    return { error: "Não foi possível enviar o e-mail. Tente novamente." };
  }

  return { success: "Verifique seu e-mail para redefinir a senha." };
}

// --- NOVO: Salva a nova senha ---
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

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: "Erro ao atualizar senha." };
  }

  return redirect("/");
}
