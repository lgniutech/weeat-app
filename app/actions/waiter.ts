"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TableStatus = 'free' | 'occupied' | 'payment';

export type TableData = {
  id: string;
  status: TableStatus;
  orderId?: string;
  customerName?: string;
  total: number;
  items?: any[];
  orderStatus?: string;
};

// --- 1. BUSCAR STATUS DAS MESAS ---
export async function getTablesStatusAction(storeId: string): Promise<TableData[]> {
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("total_tables")
    .eq("id", storeId)
    .single();
    
  const totalTables = store?.total_tables || 10; 

  const { data: activeOrders } = await supabase
    .from("orders")
    .select(`
      id, 
      status, 
      total_price, 
      delivery_address, 
      customer_name,
      table_number,
      order_items ( name:product_name, quantity, price:unit_price )
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "mesa")
    .neq("status", "entregue") 
    .neq("status", "cancelado");

  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    // Tenta encontrar pelo campo table_number (ideal) ou fallback no delivery_address
    const order = activeOrders?.find(o => 
       o.table_number === tableNum || 
       o.delivery_address?.replace(/\D/g, '') === tableNum
    );
    
    let status: TableStatus = 'free';
    if (order) {
      if (order.status === 'pagando') status = 'payment';
      else status = 'occupied';
    }

    return {
      id: tableNum,
      status: status,
      orderId: order?.id,
      customerName: order?.customer_name,
      total: order?.total_price || 0,
      items: order?.order_items || [],
      orderStatus: order?.status
    };
  });

  return tables;
}

// --- 2. BUSCAR CARDÁPIO COMPLETO (COM ADICIONAIS) ---
export async function getWaiterMenuAction(storeId: string) {
  const supabase = await createClient();
  
  // Busca Categorias -> Produtos -> (Ingredientes + Adicionais)
  const { data: categories } = await supabase
    .from("categories")
    .select(`
      id, name,
      products (
        id, name, price, description, is_available, category_id, image_url,
        product_ingredients (
            ingredient:ingredients (id, name)
        ),
        product_addons (
            price,
            addon:addons (id, name)
        )
      )
    `)
    .eq("store_id", storeId)
    .order("index", { ascending: true });

  if (!categories) return [];

  // Formata a resposta para facilitar o uso no front
  return categories.map(cat => ({
    ...cat,
    products: cat.products?.filter((p: any) => p.is_available).map((p: any) => ({
        ...p,
        ingredients: p.product_ingredients?.map((pi: any) => pi.ingredient).filter(Boolean) || [],
        addons: p.product_addons?.map((pa: any) => ({
            ...pa.addon,
            price: pa.price
        })).filter((a: any) => a.id) || []
    }))
  })).filter(cat => cat.products.length > 0);
}

// --- 3. CRIAR PEDIDO (ABRIR MESA) ---
export async function createTableOrderAction(storeId: string, tableNum: string, items: any[]) {
  const supabase = await createClient();
  
  try {
      const total = items.reduce((acc, item) => acc + (item.totalPrice || (item.price * item.quantity)), 0);

      // A. Inserir Pedido Principal
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        store_id: storeId,
        customer_name: `Mesa ${tableNum}`,
        customer_phone: "00000000000", // FIX: Campo obrigatório no banco
        delivery_type: "mesa",
        delivery_address: `Mesa ${tableNum}`,
        table_number: tableNum, // Preenche o campo dedicado
        payment_method: "card_machine",
        status: "aceito",
        total_price: total,
        last_status_change: new Date().toISOString()
      }).select().single();

      if (orderError) {
        console.error("Erro SQL Order:", orderError);
        return { error: `Erro no Banco: ${orderError.message}` };
      }

      // B. Inserir Itens na tabela relacional com JSONB
      if (items.length > 0) {
          const orderItemsData = items.map(i => ({
            order_id: order.id,
            product_name: i.name,
            quantity: i.quantity,
            unit_price: i.price, // Preço base unitário
            total_price: (i.totalPrice || i.price * i.quantity), // Preço total do item com adicionais
            observation: i.observation || "",
            removed_ingredients: i.removedIngredients ? JSON.stringify(i.removedIngredients) : null,
            selected_addons: i.selectedAddons ? JSON.stringify(i.selectedAddons) : null
          }));

          const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);

          if (itemsError) {
            console.error("Erro SQL Itens:", itemsError);
          }
      }
      
      // Histórico
      await supabase.from("order_history").insert({
          order_id: order.id,
          new_status: 'aceito',
          changed_at: new Date().toISOString()
      });

      revalidatePath("/");
      return { success: true, orderId: order.id };

  } catch (err: any) {
      console.error("Erro Crítico:", err);
      return { error: "Erro interno no servidor." };
  }
}

// --- 4. ADICIONAR ITENS À MESA ---
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTableTotal: number) {
  const supabase = await createClient();

  try {
      // Calcular total dos novos itens (considerando adicionais)
      const addedTotal = newItems.reduce((acc, item) => acc + (item.totalPrice || (item.price * item.quantity)), 0);
      
      const orderItemsData = newItems.map(i => ({
        order_id: orderId,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: (i.totalPrice || i.price * i.quantity),
        observation: i.observation || "",
        removed_ingredients: i.removedIngredients ? JSON.stringify(i.removedIngredients) : null,
        selected_addons: i.selectedAddons ? JSON.stringify(i.selectedAddons) : null
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);
      if (itemsError) return { error: "Erro ao adicionar itens no banco." };

      const newTotal = currentTableTotal + addedTotal;

      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          total_price: newTotal,
          status: "preparando", 
          last_status_change: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) return { error: "Erro ao atualizar total." };

      revalidatePath("/");
      return { success: true };

  } catch (err) {
      return { error: "Erro ao processar adição de itens." };
  }
}

// --- 5. FECHAR MESA ---
export async function closeTableAction(orderId: string, storeSlug: string) {
  const supabase = await createClient();
  const { error } = await supabase
      .from("orders")
      .update({ 
          status: "entregue",
          last_status_change: new Date().toISOString()
      })
      .eq("id", orderId);

  if (error) return { error: error.message };
  revalidatePath(`/${storeSlug}/staff/waiter`);
  return { success: true };
}
