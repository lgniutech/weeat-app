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

export async function createStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get("fullName") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const name = formData.get("name") as string;
  const cnpj = formData.get("cnpj") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    if (!name || !cnpj || !whatsapp || !fullName) {
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
      const fileExt = logoFile.name.split('.').pop();
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

export async function updateStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get("fullName") as string;
  const name = formData.get("name") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada. Recarregue a página." };

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

    let updateData: any = {
      name,
      whatsapp: whatsapp.replace(/\D/g, ''),
      settings: { business_hours: JSON.parse(businessHours) }
    };

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

// --- Atualização de Design da Loja (Banner, Bio, Cores) ---
export async function updateStoreDesignAction(prevState: any, formData: FormData) {
    const supabase = await createClient();
    
    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;
    const primaryColor = formData.get("primaryColor") as string;
    const fontFamily = formData.get("fontFamily") as string;
    const bannerOrderJson = formData.get("bannerOrder") as string;
    const newBannerFiles = formData.getAll("newBanners") as File[];
    const logoFile = formData.get("logo") as File;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Sessão expirada." };
  
      let updateData: any = {
        name,
        bio,
        primary_color: primaryColor,
        font_family: fontFamily
      };
  
      // 1. Upload do LOGO
      if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-logo.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, logoFile, { upsert: true });
        if (!uploadError) {
          const { data } = supabase.storage.from('store-assets').getPublicUrl(fileName);
          updateData.logo_url = data.publicUrl;
        }
      }

      // 2. Processar Banners
      let finalBanners: string[] = [];
      let newFileIndex = 0;

      if (bannerOrderJson) {
        try {
            const orderList = JSON.parse(bannerOrderJson);
            for (const item of orderList) {
                if (item === "__NEW__") {
                    const file = newBannerFiles[newFileIndex];
                    newFileIndex++;
                    if (file && file.size > 0) {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `banner-${user.id}-${Date.now()}-${Math.random()}.${fileExt}`;
                        const { error: uploadError } = await supabase.storage
                            .from('store-assets')
                            .upload(fileName, file, { upsert: true });
                        if (!uploadError) {
                            const { data } = supabase.storage.from('store-assets').getPublicUrl(fileName);
                            finalBanners.push(data.publicUrl);
                        }
                    }
                } else {
                    finalBanners.push(item);
                }
            }
        } catch (e) {
            console.error("Erro ordem banners", e);
        }
      }

      if (bannerOrderJson || (newBannerFiles && newBannerFiles.length > 0)) {
         updateData.banners = finalBanners;
         updateData.banner_url = finalBanners.length > 0 ? finalBanners[0] : null;
      }
  
      const { error } = await supabase
        .from("stores")
        .update(updateData)
        .eq("owner_id", user.id);
  
      if (error) throw new Error(error.message);
  
    } catch (error: any) {
      console.error(error);
      return { error: "Erro ao atualizar: " + error.message };
    }
  
    revalidatePath("/");
    return { success: "Loja atualizada com sucesso!" };
}

// --- NOVO: Função para Salvar Preferências de Aparência (Tema/Cor) ---
export async function updateStoreSettings(storeId: string, settings: { theme_mode?: string, theme_color?: string }) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autorizado" };

    const { error } = await supabase
      .from("stores")
      .update(settings)
      .eq("id", storeId)
      .eq("owner_id", user.id);

    if (error) throw new Error(error.message);
    
    revalidatePath("/");
    return { success: true };

  } catch (error: any) {
    console.error("Erro ao salvar tema:", error);
    return { error: error.message };
  }
}
