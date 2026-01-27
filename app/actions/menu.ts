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

  const { error } = await supabase.from("categories").insert({ store_id: storeId, name, index: 99 });
  if (error) return { error: "Erro ao criar categoria." };
  
  revalidatePath("/");
  return { success: true };
}

export async function deleteCategoryAction(categoryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { error: "Não é possível excluir categoria com produtos." };
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
    const { data, error } = await supabase.from("ingredients").insert({ store_id: storeId, name }).select().single();
    if (error) throw new Error(error.message);
    return data;
}

// --- ADICIONAIS (Alterado) ---

export async function getStoreAddonsAction(storeId: string) {
    const supabase = await createClient();
    const { data } = await supabase.from("addons").select("*").eq("store_id", storeId).order('name');
    return data || [];
}

// Agora cria APENAS com nome (sem preço global)
export async function createAddonAction(storeId: string, name: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("addons").insert({ store_id: storeId, name }).select().single();
    if (error) throw new Error(error.message);
    return data;
}

// --- PRODUTOS ---

// Função auxiliar para processar imagem
async function handleImageUpload(supabase: any, imageFile: File, prefix: string) {
    if (!imageFile || imageFile.size === 0) return null;
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${prefix}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('menu-assets').upload(fileName, imageFile, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('menu-assets').getPublicUrl(fileName);
    return data.publicUrl;
}

export async function createProductAction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const storeId = formData.get("storeId") as string;
  
  // Tratamento de valores monetários
  const rawPrice = formData.get("price") as string;
  const price = parseFloat(rawPrice.replace("R$", "").replace(/\./g, "").replace(",", "."));

  const imageUrl = await handleImageUpload(supabase, formData.get("image") as File, storeId);

  // Cria Produto
  const { data: product, error } = await supabase.from("products").insert({
    store_id: storeId,
    category_id: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description"),
    price,
    image_url: imageUrl || ""
  }).select().single();

  if (error) return { error: "Erro ao criar produto." };

  // Vínculos
  await saveRelations(supabase, product.id, formData.get("ingredients") as string, formData.get("addons") as string);

  revalidatePath("/");
  return { success: true };
}

export async function updateProductAction(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const productId = formData.get("productId") as string;

    const rawPrice = formData.get("price") as string;
    const price = parseFloat(rawPrice.replace("R$", "").replace(/\./g, "").replace(",", "."));

    const updates: any = {
      category_id: formData.get("categoryId"),
      name: formData.get("name"),
      description: formData.get("description"),
      price
    };

    const imageUrl = await handleImageUpload(supabase, formData.get("image") as File, productId);
    if (imageUrl) updates.image_url = imageUrl;
  
    const { error } = await supabase.from("products").update(updates).eq("id", productId);
    if (error) return { error: "Erro ao atualizar produto." };
  
    // Atualiza Vínculos
    await saveRelations(supabase, productId, formData.get("ingredients") as string, formData.get("addons") as string);
  
    revalidatePath("/");
    return { success: true };
}

// Lógica de salvar Ingredientes e Adicionais (Centralizada)
async function saveRelations(supabase: any, productId: string, ingredientsJson: string, addonsJson: string) {
    // 1. Ingredientes (Simples IDs)
    if (ingredientsJson) {
        try {
            const ids = JSON.parse(ingredientsJson);
            await supabase.from("product_ingredients").delete().eq("product_id", productId);
            if (Array.isArray(ids) && ids.length > 0) {
                await supabase.from("product_ingredients").insert(ids.map((id: string) => ({ product_id: productId, ingredient_id: id })));
            }
        } catch (e) { console.error("Erro ing:", e); }
    }

    // 2. Adicionais (Objeto com Preço: [{id, price}, ...])
    if (addonsJson) {
        try {
            const addons = JSON.parse(addonsJson); // Espera: [{id: "...", price: 1.50}, ...]
            await supabase.from("product_addons").delete().eq("product_id", productId);
            if (Array.isArray(addons) && addons.length > 0) {
                await supabase.from("product_addons").insert(addons.map((item: any) => ({
                    product_id: productId,
                    addon_id: item.id,
                    price: item.price // Salva o preço na relação!
                })));
            }
        } catch (e) { console.error("Erro addons:", e); }
    }
}

export async function deleteProductAction(productId: string) {
  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", productId);
  revalidatePath("/");
  return { success: true };
}

export async function toggleProductAvailabilityAction(productId: string, isAvailable: boolean) {
  const supabase = await createClient();
  await supabase.from("products").update({ is_available: isAvailable }).eq("id", productId);
  revalidatePath("/");
}
