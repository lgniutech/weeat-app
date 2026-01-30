"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Função auxiliar para traduzir erros
function translateError(errorMsg: string) {
  if (errorMsg.includes("duplicate key")) {
     if (errorMsg.includes("stores_slug_key")) return "O nome/link desta loja já está em uso."
     if (errorMsg.includes("stores_cnpj_key")) return "Este CNPJ já está cadastrado em outra loja."
     return "Este registro já existe."
  }
  if (errorMsg.includes("violates check constraint")) return "Dados inválidos."
  if (errorMsg.includes("Password should be")) return "A senha deve ter pelo menos 6 caracteres."
  return errorMsg;
}

// Helper para converter string de moeda
function parseCurrency(value: string) {
  if (!value) return 0;
  return parseFloat(value.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
}

// --- 1. CRIAÇÃO DE LOJA ---
export async function createStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get("fullName") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const name = formData.get("name") as string;
  const cnpj = formData.get("cnpj") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const zipCode = formData.get("zipCode") as string;
  const street = formData.get("street") as string;
  const number = formData.get("number") as string;
  const neighborhood = formData.get("neighborhood") as string;
  const complement = formData.get("complement") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    if (!name || !cnpj || !whatsapp || !fullName || !city || !state) {
      return { error: "Preencha todos os campos obrigatórios." };
    }

    const userUpdates: any = { data: { full_name: fullName } };
    if (password) {
      if (password.length < 6) return { error: "A senha deve ter no mínimo 6 caracteres." };
      if (password !== confirmPassword) return { error: "As senhas não coincidem." };
      userUpdates.password = password;
    }
    const { error: userError } = await supabase.auth.updateUser(userUpdates);
    if (userError) throw new Error(translateError(userError.message));

    const randomSuffix = Math.floor(Math.random() * 10000);
    const generatedSlug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + `-${randomSuffix}`;

    let logoUrl = "";
    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop(); // O front mandará .webp
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, logoFile);
      if (!uploadError) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(fileName);
        logoUrl = data.publicUrl;
      }
    }

    const { error } = await supabase.from("stores").insert({
      owner_id: user.id,
      name,
      slug: generatedSlug,
      cnpj: cnpj.replace(/\D/g, ''),
      whatsapp: whatsapp.replace(/\D/g, ''),
      zip_code: zipCode,
      street,
      number,
      neighborhood,
      complement,
      city,
      state,
      logo_url: logoUrl,
      total_tables: 10, 
      settings: { 
        business_hours: businessHours ? JSON.parse(businessHours) : [],
        delivery_fee: 0,
        minimum_order: 0
      }
    });
    
    if (error) throw new Error(translateError(error.message));

  } catch (error: any) {
    return { error: translateError(error.message) };
  }

  revalidatePath("/");
  redirect("/");
}

// --- 2. ATUALIZAÇÃO BÁSICA ---
export async function updateStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get("fullName") as string;
  const name = formData.get("name") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const zipCode = formData.get("zipCode") as string;
  const street = formData.get("street") as string;
  const number = formData.get("number") as string;
  const neighborhood = formData.get("neighborhood") as string;
  const complement = formData.get("complement") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  
  const latStr = formData.get("latitude") as string;
  const lngStr = formData.get("longitude") as string;

  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;
  const deliveryFeeMode = formData.get("deliveryFeeMode") as string;
  const deliveryFee = formData.get("deliveryFee") as string;
  const pricePerKm = formData.get("pricePerKm") as string;
  const minimumOrder = formData.get("minimumOrder") as string;

  // NOVO CAMPO: Total de Mesas
  const totalTables = formData.get("totalTables") as string;

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    const authUpdates: any = {};
    if (fullName) authUpdates.data = { full_name: fullName };
    
    if (password) {
      if (password.length < 6) return { error: "A nova senha deve ter no mínimo 6 caracteres." };
      if (password !== confirmPassword) return { error: "A confirmação da senha não confere." };
      authUpdates.password = password;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: userError } = await supabase.auth.updateUser(authUpdates);
      if (userError) throw new Error(translateError(userError.message));
    }

    const { data: currentStore } = await supabase.from("stores").select("settings").eq("owner_id", user.id).single();
    const currentSettings = currentStore?.settings || {};

    let finalLat = currentSettings.location?.lat;
    let finalLng = currentSettings.location?.lng;

    if (latStr && latStr.trim() !== "") finalLat = parseFloat(latStr);
    if (lngStr && lngStr.trim() !== "") finalLng = parseFloat(lngStr);

    let updateData: any = {
      name,
      whatsapp: whatsapp.replace(/\D/g, ''),
      zip_code: zipCode,
      street,
      number,
      neighborhood,
      complement,
      city,
      state,
      settings: { 
        ...currentSettings,
        business_hours: JSON.parse(businessHours),
        delivery_fee_mode: deliveryFeeMode || 'fixed',
        delivery_fee: parseCurrency(deliveryFee),
        price_per_km: parseCurrency(pricePerKm),
        minimum_order: parseCurrency(minimumOrder),
        location: {
            lat: finalLat,
            lng: finalLng
        }
      }
    };

    if (totalTables) {
        updateData.total_tables = parseInt(totalTables);
    }

    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, logoFile, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(fileName);
        updateData.logo_url = data.publicUrl;
      }
    }

    const { error } = await supabase
      .from("stores")
      .update(updateData)
      .eq("owner_id", user.id);

    if (error) throw new Error(translateError(error.message));

  } catch (error: any) {
    return { error: translateError(error.message) };
  }

  revalidatePath("/");
  return { success: "Dados atualizados com sucesso!" };
}

// --- 3. ATUALIZAÇÃO DE DESIGN (Mantida) ---
export async function updateStoreDesignAction(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const primaryColor = formData.get("primaryColor") as string;
    const fontFamily = formData.get("fontFamily") as string;
    const logoUrl = formData.get("logoUrl") as string;
    const bannersJson = formData.get("bannersJson") as string;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Sessão expirada." };
      const { data: currentStore } = await supabase.from("stores").select("settings").eq("owner_id", user.id).single();
      const currentSettings = currentStore?.settings || {};
      let updateData: any = {
        name,
        bio,
        primary_color: primaryColor,
        font_family: fontFamily,
        settings: currentSettings 
      };
      if (logoUrl) updateData.logo_url = logoUrl;
      if (bannersJson) {
         try {
             const banners = JSON.parse(bannersJson);
             updateData.banners = banners;
             updateData.banner_url = banners.length > 0 ? banners[0] : null;
         } catch (e) { console.error(e); }
      }
      const { error } = await supabase.from("stores").update(updateData).eq("owner_id", user.id);
      if (error) throw new Error(error.message);
    } catch (error: any) {
      return { error: "Erro ao atualizar: " + error.message };
    }
    revalidatePath("/");
    return { success: "Loja atualizada com sucesso!" };
}

// --- 4. ATUALIZAÇÃO DE TEMA (Mantida) ---
export async function updateStoreSettings(storeId: string, settings: { theme_mode?: string, theme_color?: string }) {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autorizado" };
    const { error } = await supabase.from("stores").update(settings).eq("id", storeId).eq("owner_id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// --- 5. ATUALIZAÇÃO DE MESAS (Mantida) ---
export async function updateStoreTablesAction(tableCount: number) {
    const supabase = await createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Não autorizado" };
        
        const { error } = await supabase
            .from("stores")
            .update({ total_tables: tableCount })
            .eq("owner_id", user.id);
            
        if (error) throw new Error(error.message);
        
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        return { error: "Erro ao salvar mesas: " + error.message };
    }
}
