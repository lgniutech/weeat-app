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

  // ESTRATÉGIA BLINDADA: Login Mágico (Magic Link)
  // Em vez de "Recuperar Senha" (que tem regras chatas de segurança),
  // nós apenas logamos o usuário via e-mail e mandamos ele para a tela de trocar a senha.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // O 'next' aqui garante que após o clique, ele caia na tela de Nova Senha
      emailRedirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
      shouldCreateUser: false, // Só funciona se o usuário já existir
    },
  });

  if (error) {
    let msg = error.message;
    if (msg.includes("Rate limit")) msg = "Muitas tentativas. Aguarde 60 segundos.";
    if (msg.includes("Signups not allowed")) msg = "Não encontramos uma conta com este e-mail.";
    return { error: msg };
  }

  return { success: "Link de acesso enviado! Verifique seu e-mail." };
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

  // Aqui o usuário JÁ ESTÁ LOGADO (pelo Magic Link).
  // Então o supabase sabe quem é e permite trocar a senha.
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
