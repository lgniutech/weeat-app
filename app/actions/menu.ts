"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- CATEGORIAS ---

// Ajustado para receber prevState e formData
export async function createCategoryAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const storeId = formData.get("storeId") as string;
  const name = formData.get("name") as string;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não autenticado" };

  if (!name) return { error: "Nome da categoria é obrigatório." };

  const { error } = await supabase.from("categories").insert({
    store_id: storeId,
    name,
    index: 99
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
    return { error: "Não é possível excluir categoria com produtos." };
  }

  revalidatePath("/");
  return { success: true };
}

// --- PRODUTOS ---

// Ajustado para receber prevState e formData (assinatura padrão)
export async function createProductAction(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const storeId = formData.get("storeId") as string;
  const categoryId = formData.get("categoryId") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  
  const rawPrice = formData.get("price") as string;
  const price = parseFloat(rawPrice.replace("R$", "").replace(/\./g, "").replace(",", "."));
  
  const imageFile = formData.get("image") as File;

  let imageUrl = "";

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${storeId}-${Date.now()}.${fileExt}`;
    
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
