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
  hasReadyItems: boolean;
  readyOrderIds: string[];
  isPreparing: boolean;
};

// --- 1. BUSCAR STATUS DAS MESAS (MANTIDO) ---
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
      address, 
      customer_name,
      table_number,
      order_items ( name:product_name, quantity, price:unit_price )
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "mesa")
    .neq("status", "concluido") 
    .neq("status", "cancelado");

  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    const tableOrders = activeOrders?.filter(o => 
       o.table_number === tableNum || 
       (o.address && o.address.replace(/\D/g, '') === tableNum)
    ) || [];
    
    const readyOrders = tableOrders.filter(o => o.status === 'enviado');
    const hasReadyItems = readyOrders.length > 0;
    const isPreparing = tableOrders.some(o => ['aceito', 'preparando'].includes(o.status));
    
    let status: TableStatus = 'free';
    if (tableOrders.length > 0) {
      if (tableOrders.some(o => o.status === 'pagando')) status = 'payment';
      else status = 'occupied';
    }

    const total = tableOrders.reduce((acc, o) => acc + (o.total_price || 0), 0);
    const allItems = tableOrders.flatMap(o => o.order_items || []);

    return {
      id: tableNum,
      status: status,
      orderId: tableOrders[0]?.id,
      customerName: tableOrders[0]?.customer_name,
      total: total,
      items: allItems,
      orderStatus: tableOrders[0]?.status,
      hasReadyItems: hasReadyItems,
      readyOrderIds: readyOrders.map(o => o.id),
      isPreparing: isPreparing
    };
  });

  return tables;
}

// --- 2. BUSCAR CARDÁPIO (MANTIDO) ---
export async function getWaiterMenuAction(storeId: string) {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select(`
      id, name,
      products (
        id, name, price, description, is_available, category_id, image_url,
        product_ingredients (ingredient:ingredients (id, name)),
        product_addons (price, addon:addons (id, name))
      )
    `)
    .eq("store_id", storeId)
    .order("index", { ascending: true });

  if (!categories) return [];
  return categories.map(cat => ({
    ...cat,
    products: cat.products?.filter((p: any) => p.is_available).map((p: any) => ({
        ...p,
        ingredients: p.product_ingredients?.map((pi: any) => pi.ingredient).filter(Boolean) || [],
        addons: p.product_addons?.map((pa: any) => ({ ...pa.addon, price: pa.price })).filter((a: any) => a.id) || []
    }))
  })).filter(cat => cat.products.length > 0);
}

// --- 3. CRIAR PEDIDO (ATUALIZADO COM NOME E TELEFONE) ---
export async function createTableOrderAction(
    storeId: string, 
    tableNum: string, 
    items: any[], 
    clientName?: string, // Opcional
    clientPhone?: string // Opcional
) {
  const supabase = await createClient();
  
  try {
      const total = items.reduce((acc, item) => acc + (item.totalPrice || (item.price * item.quantity)), 0);

      // Define os valores finais (usa o input ou o padrão "Mesa X")
      const finalName = clientName && clientName.trim() !== "" ? clientName : `Mesa ${tableNum}`;
      const finalPhone = clientPhone && clientPhone.trim() !== "" ? clientPhone : "00000000000";

      const { data: order, error: orderError } = await supabase.from("orders").insert({
        store_id: storeId,
        customer_name: finalName,      // Salva o nome
        customer_phone: finalPhone,    // Salva o telefone
        delivery_type: "mesa",
        address: `Mesa ${tableNum}`,
        table_number: tableNum,
        payment_method: "card_machine",
        status: "aceito",
        total_price: total,
        last_status_change: new Date().toISOString()
      }).select().single();

      if (orderError) return { error: `Erro SQL: ${orderError.message}` };

      if (items.length > 0) {
          const orderItemsData = items.map(i => ({
            order_id: order.id,
            product_name: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            total_price: (i.totalPrice || i.price * i.quantity),
            observation: i.observation || "",
            removed_ingredients: i.removedIngredients ? JSON.stringify(i.removedIngredients) : null,
            selected_addons: i.selectedAddons ? JSON.stringify(i.selectedAddons) : null
          }));
          await supabase.from("order_items").insert(orderItemsData);
      }
      
      await supabase.from("order_history").insert({ order_id: order.id, new_status: 'aceito', changed_at: new Date().toISOString() });
      revalidatePath("/");
      return { success: true, orderId: order.id };

  } catch (err: any) { return { error: "Erro interno no servidor." }; }
}

// --- 4. ADICIONAR ITENS (MANTIDO) ---
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTableTotal: number) {
  const supabase = await createClient();
  try {
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
      if (itemsError) return { error: "Erro ao adicionar itens." };

      const newTotal = currentTableTotal + addedTotal;
      const { error: updateError } = await supabase.from("orders")
        .update({ total_price: newTotal, status: "preparando", last_status_change: new Date().toISOString() })
        .eq("id", orderId);

      if (updateError) return { error: "Erro ao atualizar total." };
      revalidatePath("/");
      return { success: true };
  } catch (err) { return { error: "Erro ao processar." }; }
}

// --- 5. FECHAR MESA (MANTIDO) ---
export async function closeTableAction(tableNum: string, storeId: string) {
  const supabase = await createClient();
  const { data: orders } = await supabase.from("orders")
      .select("id, table_number, address")
      .eq("store_id", storeId)
      .neq("status", "concluido") 
      .neq("status", "cancelado");
      
  const targetOrders = orders?.filter(o => 
      o.table_number === tableNum || 
      (o.address && o.address.replace(/\D/g, '') === tableNum)
  ) || [];

  if (targetOrders.length === 0) return { success: true };
  const ids = targetOrders.map(o => o.id);

  const { error } = await supabase
      .from("orders")
      .update({ status: "concluido", last_status_change: new Date().toISOString() })
      .in("id", ids);

  if (error) return { error: `Erro no Banco: ${error.message}` };
  revalidatePath("/");
  return { success: true };
}

// --- 6. SERVIR ITENS (MANTIDO) ---
export async function serveReadyOrdersAction(orderIds: string[]) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("orders")
        .update({ status: "entregue", last_status_change: new Date().toISOString() })
        .in("id", orderIds);

    if (error) return { error: error.message };
    revalidatePath("/");
    return { success: true };
}
