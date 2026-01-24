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

// 1. Envia o código para o e-mail
export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();

  // Usa signInWithOtp SEM link de redirecionamento. 
  // Isso força o envio de um código (Token) no template de e-mail padrão.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    let msg = error.message;
    if (msg.includes("Rate limit")) msg = "Muitas tentativas. Aguarde 60 segundos.";
    if (msg.includes("Signups not allowed")) msg = "Não encontramos uma conta com este e-mail.";
    return { error: msg };
  }

  // Redireciona para a tela de digitar o código
  return redirect(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
}

// 2. Verifica o código digitado e loga o usuário
export async function verifyOtpAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });

  if (error) {
    return { error: "Código inválido ou expirado." };
  }

  // Se deu certo, o usuário já está logado com a sessão gravada.
  // Mandamos ele para definir a nova senha.
  return redirect("/auth/reset-password");
}

// 3. Salva a nova senha
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
