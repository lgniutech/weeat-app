"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- TIPOS ---
export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
};

// --- LISTAR CUPONS ---
export async function getCouponsAction(storeId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar cupons:", error);
    return [];
  }
  return data as Coupon[];
}

// --- SALVAR (CRIAR/EDITAR) ---
export async function saveCouponAction(formData: FormData, storeId: string) {
  const supabase = await createClient();
  
  const id = formData.get("id") as string;
  const code = formData.get("code") as string;
  const type = formData.get("type") as 'percent' | 'fixed';
  const value = parseFloat(formData.get("value") as string);
  const minOrder = parseFloat((formData.get("minOrder") as string) || "0");
  const maxUses = formData.get("maxUses") ? parseInt(formData.get("maxUses") as string) : null;
  const expiresAt = formData.get("expiresAt") as string;
  
  if (!code || !value) return { error: "Código e Valor são obrigatórios." };
  
  // Limpa o código (uppercase, sem espaços)
  const cleanCode = code.toUpperCase().trim().replace(/\s/g, "");

  const couponData = {
    store_id: storeId,
    code: cleanCode,
    discount_type: type,
    discount_value: value,
    min_order_value: minOrder,
    max_uses: maxUses,
    expires_at: expiresAt || null,
  };

  try {
    if (id) {
      // Editar
      const { error } = await supabase
        .from("coupons")
        .update(couponData)
        .eq("id", id)
        .eq("store_id", storeId);
      if (error) throw error;
    } else {
      // Criar Novo
      const { error } = await supabase
        .from("coupons")
        .insert(couponData);
      if (error) throw error;
    }

    revalidatePath("/");
    return { success: true };

  } catch (error: any) {
    if (error.message.includes("unique_coupon_per_store")) {
      return { error: "Este código de cupom já existe na sua loja." };
    }
    return { error: "Erro ao salvar cupom." };
  }
}

// --- ALTERAR STATUS (ATIVO/INATIVO) ---
export async function toggleCouponStatusAction(couponId: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("coupons").update({ is_active: isActive }).eq("id", couponId);
  revalidatePath("/");
}

// --- DELETAR ---
export async function deleteCouponAction(couponId: string) {
  const supabase = await createClient();
  await supabase.from("coupons").delete().eq("id", couponId);
  revalidatePath("/");
}
