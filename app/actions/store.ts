"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ACTION DE CRIAÇÃO (Setup Inicial)
export async function createStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  // Dados do Responsável
  const fullName = formData.get("fullName") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Dados da Loja
  const name = formData.get("name") as string;
  const cnpj = formData.get("cnpj") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    // Validações Básicas
    if (!name || !cnpj || !whatsapp || !fullName) {
      return { error: "Preencha todos os campos obrigatórios." };
    }

    // 1. Atualizar Dados do Usuário (Nome e Senha)
    const userUpdates: any = {
      data: { full_name: fullName } // Salva o nome nos metadados
    };

    if (password) {
      if (password.length < 6) return { error: "A senha deve ter no mínimo 6 caracteres." };
      if (password !== confirmPassword) return { error: "As senhas não coincidem." };
      userUpdates.password = password;
    }

    const { error: userError } = await supabase.auth.updateUser(userUpdates);
    if (userError) throw new Error("Erro ao atualizar usuário: " + userError.message);

    // 2. Gerar Slug da Loja
    const randomSuffix = Math.floor(Math.random() * 10000);
    const generatedSlug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + `-${randomSuffix}`;

    // 3. Upload da Logo
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

    // 4. Criar Loja no Banco
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

// ACTION DE ATUALIZAÇÃO (Edição)
export async function updateStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get("fullName") as string;
  const name = formData.get("name") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada." };

    // 1. Atualizar Nome do Usuário (se alterado)
    if (fullName) {
      const { error: userError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (userError) console.error("Erro ao atualizar nome:", userError);
    }

    // 2. Preparar update da Loja
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

    if (error) throw error;

  } catch (error: any) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: "Dados atualizados com sucesso!" };
}
