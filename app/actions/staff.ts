"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "weeat_staff_session";

export async function verifyStaffPinAction(slug: string, pin: string) {
  const supabase = await createClient();
  const cookieStore = await cookies();

  // 1. Achar a loja pelo Slug
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!store) {
    return { error: "Loja não encontrada." };
  }

  // 2. Verificar se o PIN bate com algum funcionário dessa loja
  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, name, role")
    .eq("store_id", store.id)
    .eq("pin", pin)
    .single();

  if (!staff) {
    return { error: "PIN incorreto." };
  }

  // 3. Criar Sessão (Cookie Simples)
  // Armazenamos o ID, Nome, Cargo e ID da Loja para validar nas próximas telas
  const sessionData = JSON.stringify({
    staffId: staff.id,
    name: staff.name,
    role: staff.role,
    storeId: store.id,
    storeSlug: slug
  });

  // Define o cookie para expirar em 24h
  cookieStore.set(COOKIE_NAME, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, 
    path: "/",
  });

  // 4. Determinar Redirecionamento baseado no Cargo
  let redirectUrl = `/${slug}/staff/`;

  switch (staff.role) {
    case "kitchen":
      redirectUrl += "kitchen"; // KDS
      break;
    case "waiter":
      redirectUrl += "waiter"; // Garçom
      break;
    case "courier":
      redirectUrl += "courier"; // Entregador
      break;
    default:
      return { error: "Cargo não reconhecido." };
  }

  return { success: true, redirectUrl };
}

// Função para logout do staff
export async function logoutStaffAction(slug: string) {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect(`/${slug}/staff`);
}

// Função auxiliar para pegar o usuário atual (usada nas páginas protegidas)
export async function getStaffSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}
