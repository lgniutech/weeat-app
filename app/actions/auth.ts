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

  // MUDANÇA: Voltamos para signInWithOtp (Link Mágico)
  // Ele gera um 'token_hash' que funciona Cross-Device (PC para Celular, etc)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/verify`, // Aponta para o Escudo
      shouldCreateUser: false, // Não cria conta nova
    },
  });

  if (error) {
    let msg = error.message
    if (msg.includes("Rate limit")) msg = "Muitas tentativas. Aguarde 60 segundos."
    if (msg.includes("Signups not allowed")) msg = "Não encontramos uma conta com este e-mail."
    return { error: msg };
  }

  return { success: "Link de acesso enviado! Verifique seu e-mail." };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
