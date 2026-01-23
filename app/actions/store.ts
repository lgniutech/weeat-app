"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const cnpj = formData.get("cnpj") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string; // Recebe o JSON da view

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Validação básica
    if (!name || !slug || !cnpj) {
      return { error: "Preencha todos os campos obrigatórios." };
    }

    let logoUrl = "";

    // Upload da Logo
    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(fileName, logoFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);
      
      logoUrl = data.publicUrl;
    }

    // Inserção no banco
    const { error: storeError } = await supabase
      .from("stores")
      .insert({
        owner_id: user.id,
        name,
        slug: slug.toLowerCase().trim().replace(/\s+/g, '-'),
        cnpj: cnpj.replace(/\D/g, ''), // Salva apenas números
        logo_url: logoUrl,
        settings: {
          business_hours: businessHours ? JSON.parse(businessHours) : []
        }
      });

    if (storeError) {
      if (storeError.code === '23505') throw new Error("Este link (slug) já está sendo usado.");
      throw storeError;
    }

  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}
