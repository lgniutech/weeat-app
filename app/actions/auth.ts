"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  // Envia o código (Token) para o e-mail
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

  // Redireciona para a tela de verificar código
  return redirect(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
}

// 2. Ação Blindada: Verifica Código + Atualiza Senha de uma vez
export async function resetPasswordWithCodeAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  
  const supabase = await createClient();

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter no mínimo 6 caracteres." };
  }

  // PASSO A: Valida o código e cria a sessão
  const { error: verifyError, data } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });

  if (verifyError) {
    return { error: "Código inválido ou expirado." };
  }

  if (!data.session) {
    return { error: "Falha na validação. Tente gerar um novo código." };
  }

  // PASSO B: Atualiza a senha usando a sessão criada
  const { error: updateError } = await supabase.auth.updateUser({
    password: password
  });

  if (updateError) {
    return { error: "Erro ao salvar nova senha: " + updateError.message };
  }

  return redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
