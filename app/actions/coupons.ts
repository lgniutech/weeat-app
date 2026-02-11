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

// ==========================================================
// ÁREA ADMINISTRATIVA (Dono da Loja)
// ==========================================================

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
      const { error } = await supabase
        .from("coupons")
        .update(couponData)
        .eq("id", id)
        .eq("store_id", storeId);
      if (error) throw error;
    } else {
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

// --- ALTERAR STATUS ---
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

// ==========================================================
// ÁREA DO CLIENTE (Consumidor Final)
// ==========================================================

// --- VALIDAR CUPOM NO CARRINHO ---
export async function validateCouponAction(code: string, storeId: string, cartTotal: number) {
  const supabase = await createClient();
  const cleanCode = code.toUpperCase().trim().replace(/\s/g, "");

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("store_id", storeId)
    .eq("code", cleanCode)
    .single();

  if (error || !coupon) {
    return { error: "Cupom inválido ou não encontrado." };
  }

  if (!coupon.is_active) {
    return { error: "Este cupom foi desativado." };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { error: "Este cupom expirou." };
  }

  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return { error: "Este cupom atingiu o limite de usos." };
  }

  // Verifica valor mínimo do pedido (Ajustado a mensagem)
  if (cartTotal < coupon.min_order_value) {
    const formattedMin = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(coupon.min_order_value);
    return { error: `O valor mínimo para aplicação deste cupom é ${formattedMin}` };
  }

  return { 
    success: true, 
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.discount_type,
      value: coupon.discount_value,
      min_order_value: coupon.min_order_value // <--- AQUI ESTAVA FALTANDO
    }
  };
}

export async function incrementCouponUsageAction(couponId: string) {
  const supabase = await createClient();
  
  // Tenta RPC primeiro, fallback para update direto
  const { error } = await supabase.rpc('increment_coupon_usage', { coupon_id: couponId });
  
  if (error) {
    const { data: coupon } = await supabase.from("coupons").select("used_count").eq("id", couponId).single();
    if (coupon) {
      await supabase
        .from("coupons")
        .update({ used_count: (coupon.used_count || 0) + 1 })
        .eq("id", couponId);
    }
  }
}
