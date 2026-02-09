"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "weeat_staff_session";

// --- LOGIN (JÁ EXISTIA) ---
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

  cookieStore.set(COOKIE_NAME, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, 
    path: "/",
  });

  let redirectUrl = `/${slug}/staff/`;
  if (staff.role === "kitchen") redirectUrl += "kitchen";
  else if (staff.role === "waiter") redirectUrl += "waiter";
  else if (staff.role === "courier") redirectUrl += "courier";

  return { success: true, redirectUrl };
}

export async function logoutStaffAction(slug: string) {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect(`/${slug}/staff`);
}

export async function getStaffSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session) return null;
  try { return JSON.parse(session.value); } catch { return null; }
}

// --- NOVAS FUNÇÕES: GERENCIAMENTO (CRUD) ---

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

  // Validação simples
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
      throw error;
    }

    revalidatePath("/"); // Atualiza a lista
    return { success: true };
  } catch (err) {
    return { error: "Erro ao criar funcionário." };
  }
}

export async function deleteStaffAction(staffId: string) {
  const supabase = await createClient();
  await supabase.from("staff_users").delete().eq("id", staffId);
  revalidatePath("/");
}
