"use client";

import { createClient } from "@/lib/supabase/client";
import { revalidatePath } from "next/cache";

export async function createStoreAction(formData: FormData) {
  const supabase = createClient();
  
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;

  try {
    // 1. Pegar usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    let logoUrl = "";

    // 2. Upload da Logo se existir
    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(filePath);
      
      logoUrl = publicUrl;
    }

    // 3. Criar a loja no banco
    const { error: storeError } = await supabase
      .from("stores")
      .insert({
        owner_id: user.id,
        name,
        slug: slug.toLowerCase().trim(),
        logo_url: logoUrl,
        settings: {
          business_hours: JSON.parse(businessHours)
        }
      });

    if (storeError) {
      if (storeError.code === '23505') throw new Error("Este link (slug) já está em uso.");
      throw storeError;
    }

    revalidatePath("/");
    return { success: true };

  } catch (error: any) {
    return { error: error.message };
  }
}
