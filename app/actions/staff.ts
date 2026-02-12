"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "weeat_staff_session";

// --- LOGIN COM REDIRECIONAMENTO ---
export async function verifyStaffPinAction(slug: string, pin: string) {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const { data: store } = await supabase.from("stores").select("id, name").eq("slug", slug).single();
  if (!store) return { error: "Loja não encontrada." };

  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, name, role")
    .eq("store_id", store.id)
    .eq("pin", pin)
    .single();

  if (!staff) return { error: "PIN incorreto." };

  const sessionData = JSON.stringify({
    staffId: staff.id,
    name: staff.name,
    role: staff.role,
    storeId: store.id,
    storeSlug: slug
  });

  // Define o cookie com path '/'
  cookieStore.set(COOKIE_NAME, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, 
    path: "/", 
  });

  // REDIRECIONAMENTO INTELIGENTE
  let redirectUrl = `/${slug}/staff`; 
  
  if (staff.role === "kitchen") redirectUrl += "/kitchen";
  else if (staff.role === "waiter") redirectUrl += "/waiter";
  else if (staff.role === "cashier") redirectUrl += "/cashier"; 
  else if (staff.role === "courier") redirectUrl += "/courier";

  return { success: true, redirectUrl };
}

// --- LOGOUT CORRIGIDO ---
export async function logoutStaffAction(slug: string) {
  const cookieStore = await cookies();
  
  // É crucial passar o path '/' para deletar o cookie global corretamente
  cookieStore.delete({
    name: COOKIE_NAME,
    path: '/',
  });

  // Garante que o cache da página seja limpo antes de redirecionar
  revalidatePath(`/${slug}/staff`);
  
  redirect(`/${slug}/staff`);
}

export async function getStaffSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session) return null;
  try { return JSON.parse(session.value); } catch { return null; }
}

// --- CRUD DE FUNCIONÁRIOS ---

export async function getStoreStaffAction(storeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data;
}

export async function createStaffAction(storeId: string, name: string, role: string, pin: string) {
  const supabase = await createClient();

  if (!name || !role || !pin) return { error: "Preencha todos os campos." };
  if (pin.length !== 4 || isNaN(Number(pin))) return { error: "O PIN deve ter 4 números." };

  try {
    const { error } = await supabase.from("staff_users").insert({
      store_id: storeId,
      name,
      role,
      pin
    });

    if (error) {
      if (error.message.includes("unique_pin_per_store")) {
        return { error: "Este PIN já está sendo usado por outro funcionário." };
      }
      console.error("Erro Supabase:", error); 
      throw new Error(error.message);
    }

    revalidatePath("/");
    return { success: true };

  } catch (err: any) {
    console.error("Erro Create Staff:", err);
    return { error: err.message || "Erro ao criar funcionário." };
  }
}

export async function deleteStaffAction(staffId: string) {
  const supabase = await createClient();
  await supabase.from("staff_users").delete().eq("id", staffId);
  revalidatePath("/");
}
