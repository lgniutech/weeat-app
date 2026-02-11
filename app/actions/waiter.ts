"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TableStatus = 'free' | 'occupied';

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

// --- 1. BUSCAR STATUS (GARÇOM) ---
export async function getTablesStatusAction(storeId: string): Promise<TableData[]> {
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("total_tables")
    .eq("id", storeId)
    .single();
    
  const totalTables = store?.total_tables || 10; 

  // Busca tudo que NÃO foi pago/concluido
  const { data: activeOrders } = await supabase
    .from("orders")
    .select(`
      id, status, total_price, address, customer_name, table_number,
      order_items ( name:product_name, quantity, price:unit_price )
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "mesa")
    .neq("status", "concluido") 
    .neq("status", "cancelado");

  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    // Filtra pedidos desta mesa
    const tableOrders = activeOrders?.filter(o => 
       o.table_number === tableNum || (o.address && o.address.replace(/\D/g, '') === tableNum)
    ) || [];
    
    const readyOrders = tableOrders.filter(o => o.status === 'enviado'); // Prontos da cozinha
    const isPreparing = tableOrders.some(o => ['aceito', 'preparando'].includes(o.status)); // Em produção
    
    // Status Simples: Livre ou Ocupada
    let status: TableStatus = 'free';
    if (tableOrders.length > 0) {
      status = 'occupied';
    }

    const total = tableOrders.reduce((acc, o) => acc + (o.total_price || 0), 0);
    const allItems = activeOrders?.filter(o => o.table_number === tableNum).flatMap(o => o.order_items || []) || [];

    return {
      id: tableNum,
      status: status,
      orderId: tableOrders[0]?.id,
      customerName: tableOrders[0]?.customer_name,
      total: total,
      items: allItems,
      orderStatus: tableOrders[0]?.status,
      hasReadyItems: readyOrders.length > 0,
      readyOrderIds: readyOrders.map(o => o.id),
      isPreparing: isPreparing
    };
  });

  return tables;
}

// --- 2. MENU (Mantido Igual) ---
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

// --- 3. CRIAR PEDIDO (Mantido Igual) ---
export async function createTableOrderAction(
    storeId: string, 
    tableNum: string, 
    items: any[], 
    clientName?: string, 
    clientPhone?: string 
) {
  const supabase = await createClient();
  try {
      const total = items.reduce((acc, item) => acc + (item.totalPrice || (item.price * item.quantity)), 0);
      const finalName = clientName && clientName.trim() !== "" ? clientName : `Mesa ${tableNum}`;
      const finalPhone = clientPhone && clientPhone.trim() !== "" ? clientPhone : "00000000000";

      const { data: order, error } = await supabase.from("orders").insert({
        store_id: storeId,
        customer_name: finalName,
        customer_phone: finalPhone, 
        delivery_type: "mesa",
        address: `Mesa ${tableNum}`,
        table_number: tableNum,
        payment_method: "card_machine",
        status: "aceito", 
        total_price: total,
        last_status_change: new Date().toISOString()
      }).select().single();

      if (error) return { error: error.message };

      if (items.length > 0) {
          const orderItems = items.map(i => ({
            order_id: order.id,
            product_name: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            total_price: (i.totalPrice || i.price * i.quantity),
            observation: i.observation || "",
            removed_ingredients: i.removedIngredients ? JSON.stringify(i.removedIngredients) : null,
            selected_addons: i.selectedAddons ? JSON.stringify(i.selectedAddons) : null,
            status: 'pendente'
          }));
          await supabase.from("order_items").insert(orderItems);
      }
      
      await supabase.from("order_history").insert({ order_id: order.id, new_status: 'aceito' });
      revalidatePath("/");
      return { success: true, orderId: order.id };

  } catch (err: any) { return { error: "Erro interno." }; }
}

// --- 4. ADICIONAR ITENS (Mantido Igual) ---
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTableTotal: number) {
  const supabase = await createClient();
  try {
      const addedTotal = newItems.reduce((acc, item) => acc + (item.totalPrice || (item.price * item.quantity)), 0);
      
      const orderItems = newItems.map(i => ({
        order_id: orderId,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: (i.totalPrice || i.price * i.quantity),
        observation: i.observation || "",
        removed_ingredients: i.removedIngredients ? JSON.stringify(i.removedIngredients) : null,
        selected_addons: i.selectedAddons ? JSON.stringify(i.selectedAddons) : null,
        status: 'pendente'
      }));

      await supabase.from("order_items").insert(orderItems);
      
      await supabase.from("orders")
        .update({ 
            total_price: currentTableTotal + addedTotal, 
            status: "aceito", 
            last_status_change: new Date().toISOString() 
        })
        .eq("id", orderId);

      revalidatePath("/");
      return { success: true };
  } catch (err) { return { error: "Erro ao processar." }; }
}

// --- 5. FECHAR MESA (GARÇOM) ---
// Função única: Recebeu -> Fechou -> Sumiu
export async function closeTableAction(tableNum: string, storeId: string) {
  const supabase = await createClient();
  const { data: orders } = await supabase.from("orders")
      .select("id")
      .eq("store_id", storeId)
      .eq("table_number", tableNum)
      .neq("status", "concluido") 
      .neq("status", "cancelado");

  if (!orders || orders.length === 0) return { success: true };
  const ids = orders.map(o => o.id);

  // Define status 'concluido'. Isso limpa a mesa para o Garçom e para o Caixa.
  await supabase
      .from("orders")
      .update({ 
          status: "concluido", 
          payment_method: "card_machine", // Assume maquininha se foi o garçom
          last_status_change: new Date().toISOString() 
      })
      .in("id", ids);
      
  // Limpa itens do KDS
  await supabase.from("order_items").update({ status: 'concluido' }).in("order_id", ids);

  revalidatePath("/");
  return { success: true };
}

// --- 6. SERVIR ---
export async function serveReadyOrdersAction(orderIds: string[]) {
    const supabase = await createClient();
    await supabase
        .from("orders")
        .update({ status: "entregue", last_status_change: new Date().toISOString() })
        .in("id", orderIds);

    revalidatePath("/");
    return { success: true };
}
