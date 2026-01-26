"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- CATEGORIAS ---

export async function createCategoryAction(storeId: string, name: string) {
  const supabase = await createClient();
  
  // Verifica se o usuário é dono da loja (Segurança extra além do RLS)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não autenticado" };

  const { error } = await supabase.from("categories").insert({
    store_id: storeId,
    name,
    index: 99 // Adiciona no final por padrão
  });

  if (error) {
    console.error("Erro ao criar categoria:", error);
    return { error: "Erro ao criar categoria." };
  }
  
  revalidatePath("/");
  return { success: true };
}

export async function deleteCategoryAction(categoryId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);

  if (error) {
    console.error("Erro ao excluir categoria:", error);
    return { error: "Erro ao excluir categoria. Verifique se há produtos nela." };
  }

  revalidatePath("/");
  return { success: true };
}

// --- PRODUTOS ---

export async function createProductAction(formData: FormData) {
  const supabase = await createClient();

  const storeId = formData.get("storeId") as string;
  const categoryId = formData.get("categoryId") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  // Converte "19,90" para 19.90
  const rawPrice = formData.get("price") as string;
  const price = parseFloat(rawPrice.replace("R$", "").replace(/\./g, "").replace(",", "."));
  
  const imageFile = formData.get("image") as File;

  let imageUrl = "";

  // Upload da Imagem (se houver)
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${storeId}-${Date.now()}.${fileExt}`;
    
    // Upload para o bucket 'menu-assets'
    const { error: uploadError } = await supabase.storage
      .from('menu-assets')
      .upload(fileName, imageFile);
      
    if (!uploadError) {
      const { data } = supabase.storage.from('menu-assets').getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    } else {
        console.error("Erro upload imagem:", uploadError);
    }
  }

  const { error } = await supabase.from("products").insert({
    store_id: storeId,
    category_id: categoryId,
    name,
    description,
    price,
    image_url: imageUrl
  });

  if (error) {
    console.error("Erro ao criar produto:", error);
    return { error: "Erro ao criar produto." };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteProductAction(productId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  
  if (error) return { error: "Erro ao excluir produto." };
  
  revalidatePath("/");
  return { success: true };
}

export async function toggleProductAvailabilityAction(productId: string, isAvailable: boolean) {
  const supabase = await createClient();
  await supabase.from("products").update({ is_available: isAvailable }).eq("id", productId);
  revalidatePath("/");
}
