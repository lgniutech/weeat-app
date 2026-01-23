"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const cnpj = formData.get("cnpj") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: "Sessão expirada. Faça login novamente." };
    }

    // CORREÇÃO: Removemos a validação do 'slug' aqui.
    // Validamos apenas o que o usuário realmente preenche.
    if (!name || !cnpj || !whatsapp) {
      return { error: "Preencha Nome, CNPJ e WhatsApp." };
    }

    // GERADOR DE SLUG AUTOMÁTICO
    // Cria algo como "hamburgueria-do-dev-1234"
    const randomSuffix = Math.floor(Math.random() * 10000);
    const generatedSlug = name
      .toLowerCase()
      .normalize("NFD") // Remove acentos
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-") // Substitui espaços e símbolos por traço
      .replace(/^-+|-+$/g, "") + `-${randomSuffix}`;

    let logoUrl = "";

    // Upload da Logo
    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(fileName, logoFile);

      if (uploadError) {
        console.error("Erro Upload:", uploadError);
        // Mensagem amigável caso o bucket não exista
        throw new Error("Erro ao salvar logo. Verifique se a pasta de arquivos (bucket) foi criada no Supabase.");
      }

      const { data } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);
      
      logoUrl = data.publicUrl;
    }

    // Limpeza de caracteres especiais para salvar apenas números
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');

    const { error: storeError } = await supabase
      .from("stores")
      .insert({
        owner_id: user.id,
        name,
        slug: generatedSlug, // Usamos o slug gerado
        cnpj: cleanCnpj,
        whatsapp: cleanWhatsapp,
        logo_url: logoUrl,
        settings: {
          business_hours: businessHours ? JSON.parse(businessHours) : []
        }
      });

    if (storeError) {
      throw storeError;
    }

  } catch (error: any) {
    console.error("Erro ao criar loja:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}
