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

// 1. Envia o e-mail (que agora terá o CÓDIGO VISÍVEL após sua alteração no painel)
export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();

  // signInWithOtp dispara o template "Magic Link".
  // Com a alteração no painel, o usuário verá o Token numérico.
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

  // Redireciona para a tela onde ele digita o código e a nova senha juntos
  return redirect(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
}

// 2. Verifica Código + Atualiza Senha (Tudo junto para não perder a sessão)
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

  // PASSO A: Valida o código (Isso cria a sessão no servidor momentaneamente)
  const { error: verifyError, data } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email', // 'email' é o tipo correto para OTP gerado via signInWithOtp
  });

  if (verifyError) {
    return { error: "Código inválido ou expirado." };
  }

  if (!data.session) {
    return { error: "Falha na validação. Tente gerar um novo código." };
  }

  // PASSO B: Atualiza a senha imediatamente usando a sessão recém-criada
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
