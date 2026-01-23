"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Action para CRIAR a loja (Mantida igual, apenas para contexto)
export async function createStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const cnpj = formData.get("cnpj") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    if (!name || !cnpj || !whatsapp) return { error: "Preencha Nome, CNPJ e WhatsApp." };

    const randomSuffix = Math.floor(Math.random() * 10000);
    const generatedSlug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + `-${randomSuffix}`;

    let logoUrl = "";

    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, logoFile);
      if (uploadError) throw new Error("Erro no upload da logo. Verifique o bucket.");
      const { data } = supabase.storage.from('store-assets').getPublicUrl(fileName);
      logoUrl = data.publicUrl;
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

    if (error) throw error;

  } catch (error: any) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}

// NOVA ACTION: Para ATUALIZAR a loja
export async function updateStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    let updateData: any = {
      name,
      whatsapp: whatsapp.replace(/\D/g, ''),
      settings: { business_hours: JSON.parse(businessHours) }
    };

    // Só faz upload se o usuário enviou uma nova imagem
    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw new Error("Erro ao atualizar logo.");

      const { data } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);
      
      updateData.logo_url = data.publicUrl;
    }

    const { error } = await supabase
      .from("stores")
      .update(updateData)
      .eq("owner_id", user.id);

    if (error) throw error;

  } catch (error: any) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: "Loja atualizada com sucesso!" };
}
