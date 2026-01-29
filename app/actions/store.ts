"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Função auxiliar para traduzir erros do banco de dados para português amigável
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

// --- 1. CRIAÇÃO DE LOJA (Setup Inicial) ---
export async function createStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get("fullName") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const name = formData.get("name") as string;
  const cnpj = formData.get("cnpj") as string;
  const whatsapp = formData.get("whatsapp") as string;
  
  // Endereço Completo
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

    // Atualiza dados do Usuário (Dono)
    const userUpdates: any = { data: { full_name: fullName } };
    if (password) {
      if (password.length < 6) return { error: "A senha deve ter no mínimo 6 caracteres." };
      if (password !== confirmPassword) return { error: "As senhas não coincidem." };
      userUpdates.password = password;
    }
    const { error: userError } = await supabase.auth.updateUser(userUpdates);
    if (userError) throw new Error(translateError(userError.message));

    // Gera Slug (Link da loja)
    const randomSuffix = Math.floor(Math.random() * 10000);
    const generatedSlug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + `-${randomSuffix}`;

    // Upload do Logo
    let logoUrl = "";
    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, logoFile);
      if (!uploadError) {
        const { data } = supabase.storage.from('store-assets').getPublicUrl(fileName);
        logoUrl = data.publicUrl;
      }
    }

    // Cria a Loja
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
      settings: { business_hours: businessHours ? JSON.parse(businessHours) : [] }
    });
    
    if (error) throw new Error(translateError(error.message));

  } catch (error: any) {
    return { error: translateError(error.message) };
  }

  revalidatePath("/");
  redirect("/");
}

// --- 2. ATUALIZAÇÃO BÁSICA (Dados da Loja - Modal) ---
export async function updateStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get("fullName") as string;
  const name = formData.get("name") as string;
  const whatsapp = formData.get("whatsapp") as string;
  
  // Endereço Completo
  const zipCode = formData.get("zipCode") as string;
  const street = formData.get("street") as string;
  const number = formData.get("number") as string;
  const neighborhood = formData.get("neighborhood") as string;
  const complement = formData.get("complement") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;

  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada. Recarregue a página." };

    // Atualiza Usuário
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

    // Prepara dados da Loja
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
      settings: { business_hours: JSON.parse(businessHours) }
    };

    // Upload Logo
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

// --- 3. ATUALIZAÇÃO DE DESIGN E APARÊNCIA ---
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
  
      let updateData: any = {
        name,
        bio,
        primary_color: primaryColor,
        font_family: fontFamily
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

// --- 4. PREFERÊNCIAS DE TEMA ---
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

// --- 5. CONFIGURAÇÕES DE ENTREGA (LOGÍSTICA) ---
export async function updateStoreDeliverySettingsAction(storeId: string, settings: {
    deliveryFee: number,
    minOrderValue: number,
    timeMin: number,
    timeMax: number
}) {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autorizado" };

    const { error } = await supabase
        .from("stores")
        .update({ 
            delivery_fee: settings.deliveryFee,
            min_order_value: settings.minOrderValue,
            estimated_time_min: settings.timeMin,
            estimated_time_max: settings.timeMax
        })
        .eq("id", storeId)
        .eq("owner_id", user.id); // Segurança adicional

    if (error) return { error: "Erro ao atualizar configurações." };
    
    revalidatePath("/");
    revalidatePath("/settings/store");
    return { success: true };
}
