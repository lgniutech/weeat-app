"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ... createStoreAction continua igual ...
export async function createStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  // ... (código existente da criação)
  // Mantenha o código original do createStoreAction aqui
  // Vou abreviar para focar na mudança do updateStoreAction abaixo
  
  // Se precisar do código completo do createStoreAction, me avise, 
  // mas ele não mudou nessa estratégia.
  
  // Apenas para garantir que não quebre, vou copiar o bloco essencial:
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
    if (userError) throw new Error("Erro ao atualizar usuário: " + userError.message);

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
    if (error) throw error;
  } catch (error: any) {
    return { error: error.message };
  }
  revalidatePath("/");
  redirect("/");
}


// --- AQUI ESTÁ A MUDANÇA PRINCIPAL ---
export async function updateStoreAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get("fullName") as string;
  const name = formData.get("name") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const logoFile = formData.get("logo") as File;
  const businessHours = formData.get("businessHours") as string;
  
  // Novos campos de senha
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada. Recarregue a página." };

    // 1. Atualizar Usuário (Nome e SENHA se houver)
    const authUpdates: any = {};
    
    if (fullName) authUpdates.data = { full_name: fullName };
    
    if (password) {
      if (password.length < 6) return { error: "A nova senha deve ter no mínimo 6 caracteres." };
      if (password !== confirmPassword) return { error: "A confirmação da senha não confere." };
      authUpdates.password = password;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: userError } = await supabase.auth.updateUser(authUpdates);
      if (userError) throw new Error("Erro ao atualizar perfil: " + userError.message);
    }

    // 2. Atualizar Loja
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
  return { success: "Dados (e senha) atualizados com sucesso!" };
}
