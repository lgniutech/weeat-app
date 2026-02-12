"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(prevState: any, formData: FormData) {
  const email = (formData.get("email") as string).trim();
  const password = (formData.get("password") as string).trim();
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

// 1. Envia o código
export async function forgotPasswordAction(prevState: any, formData: FormData) {
  const email = (formData.get("email") as string).trim();
  const supabase = await createClient();

  // Envia o Magic Link (que contém o código no corpo do email que você configurou)
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

  // Redireciona para a tela de verificar
  return redirect(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
}

// 2. Ação Blindada: Tenta verificar como 'email' ou 'magiclink'
export async function resetPasswordWithCodeAction(prevState: any, formData: FormData) {
  const email = (formData.get("email") as string).trim();
  const code = (formData.get("code") as string).trim(); // Remove espaços extras
  const password = (formData.get("password") as string).trim();
  const confirmPassword = (formData.get("confirmPassword") as string).trim();
  
  const supabase = await createClient();

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter no mínimo 6 caracteres." };
  }

  // TENTATIVA 1: Verificar como token de E-mail padrão
  let { error: verifyError, data } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });

  // TENTATIVA 2: Se falhar, tenta verificar como token de Magic Link
  // (Isso é comum quando o código vem do template de Magic Link)
  if (verifyError) {
    const { error: magicLinkError, data: magicLinkData } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'magiclink',
    });

    if (!magicLinkError && magicLinkData.session) {
      // Sucesso na segunda tentativa! Limpa o erro anterior.
      verifyError = null;
      data = magicLinkData;
    }
  }

  // Se ainda assim der erro...
  if (verifyError) {
    console.error("Erro na verificação:", verifyError);
    return { error: "Código inválido ou expirado. Tente solicitar um novo." };
  }

  if (!data?.session) {
    return { error: "Sessão não criada. Tente novamente." };
  }

  // Sucesso! Atualiza a senha.
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
