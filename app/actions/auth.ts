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

  // MUDANÇA: Usamos resetPasswordForEmail. 
  // Isso gera um link do tipo 'recovery' que é mais fácil de validar.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/verify`, // Vai para o nosso Escudo
  });

  if (error) {
    console.error("Recovery Error:", error.message)
    let msg = error.message
    if (msg.includes("Rate limit")) msg = "Muitas tentativas. Aguarde 60 segundos."
    return { error: msg };
  }

  return { success: "Link de recuperação enviado! Verifique seu e-mail." };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
