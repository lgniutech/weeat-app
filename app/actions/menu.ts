"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- CATEGORIAS ---

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
    return { error: "Não é possível excluir categoria com produtos." };
  }

  revalidatePath("/");
  return { success: true };
}

// --- INGREDIENTES ---

export async function getStoreIngredientsAction(storeId: string) {
    const supabase = await createClient();
    const { data } = await supabase.from("ingredients").select("*").eq("store_id", storeId).order('name');
    return data || [];
}

export async function createIngredientAction(storeId: string, name: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ingredients")
        .insert({ store_id: storeId, name })
        .select()
        .single();
    
    if (error) throw new Error(error.message);
    return data;
}

// --- PRODUTOS ---

// CRIAÇÃO
export async function createProductAction(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const storeId = formData.get("storeId") as string;
  const categoryId = formData.get("categoryId") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const ingredientsJson = formData.get("ingredients") as string;
  
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
    }
  }

  const { data: product, error } = await supabase.from("products").insert({
    store_id: storeId,
    category_id: categoryId,
    name,
    description,
    price,
    image_url: imageUrl
  }).select().single();

  if (error) {
    console.error("Erro ao criar produto:", error);
    return { error: "Erro ao criar produto." };
  }

  if (ingredientsJson) {
      try {
          const ingredientIds = JSON.parse(ingredientsJson);
          if (Array.isArray(ingredientIds) && ingredientIds.length > 0) {
              const relationData = ingredientIds.map((id: string) => ({
                  product_id: product.id,
                  ingredient_id: id
              }));
              await supabase.from("product_ingredients").insert(relationData);
          }
      } catch (e) {
          console.error("Erro ao processar JSON de ingredientes", e);
      }
  }

  revalidatePath("/");
  return { success: true };
}

// EDIÇÃO
export async function updateProductAction(prevState: any, formData: FormData) {
    const supabase = await createClient();
  
    const productId = formData.get("productId") as string;
    const categoryId = formData.get("categoryId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const ingredientsJson = formData.get("ingredients") as string;
    
    const rawPrice = formData.get("price") as string;
    const price = parseFloat(rawPrice.replace("R$", "").replace(/\./g, "").replace(",", "."));
    
    const imageFile = formData.get("image") as File;
  
    // Prepara objeto de atualização (Removido updated_at para evitar erro)
    const updates: any = {
      category_id: categoryId,
      name,
      description,
      price
    };
  
    // Se enviou nova imagem, faz upload
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${productId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('menu-assets')
        .upload(fileName, imageFile);
        
      if (!uploadError) {
        const { data } = supabase.storage.from('menu-assets').getPublicUrl(fileName);
        updates.image_url = data.publicUrl;
      }
    }
  
    // Atualiza tabela products
    const { error } = await supabase.from("products").update(updates).eq("id", productId);
  
    if (error) {
      console.error("Erro ao atualizar produto:", error);
      return { error: "Erro ao atualizar produto." };
    }
  
    // Atualiza Ingredientes (Remove todos e insere os novos selecionados)
    if (ingredientsJson) {
        try {
            const ingredientIds = JSON.parse(ingredientsJson);
            
            // 1. Remove atuais
            await supabase.from("product_ingredients").delete().eq("product_id", productId);
            
            // 2. Insere novos
            if (Array.isArray(ingredientIds) && ingredientIds.length > 0) {
                const relationData = ingredientIds.map((id: string) => ({
                    product_id: productId,
                    ingredient_id: id
                }));
                await supabase.from("product_ingredients").insert(relationData);
            }
        } catch (e) {
            console.error("Erro ao processar JSON de ingredientes na edição", e);
        }
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
