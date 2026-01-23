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
    console.error("Login Error:", error.message)
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

  // MUDANÇA: Aponta para a página de verificação (Escudo) em vez do callback direto
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/verify`, // Página intermediária
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.error("Magic Link Error:", error.message)
    let msg = error.message
    if (msg.includes("Rate limit")) msg = "Muitas tentativas. Aguarde 60 segundos."
    if (msg.includes("Signups not allowed")) msg = "Não encontramos uma conta com este e-mail."
    return { error: msg };
  }

  return { success: "Se o e-mail estiver cadastrado, você receberá o link de acesso!" };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
