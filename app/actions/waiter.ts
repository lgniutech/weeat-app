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

// --- 1. BUSCAR STATUS DAS MESAS (COM A CORREÇÃO DE SINCRONIA) ---
export async function getTablesStatusAction(storeId: string): Promise<TableData[]> {
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("total_tables")
    .eq("id", storeId)
    .single();
    
  const totalTables = store?.total_tables || 20; 

  // Trazemos pedidos que NÃO estão concluídos/cancelados
  const { data: activeOrders } = await supabase
    .from("orders")
    .select(`
      id, 
      status, 
      total_price, 
      address, 
      customer_name,
      table_number,
      payment_method, 
      order_items ( name:product_name, quantity, price:unit_price )
    `)
    .eq("store_id", storeId)
    .eq("delivery_type", "mesa")
    .neq("status", "concluido") 
    .neq("status", "cancelado");

  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    // Filtra pedidos desta mesa
    const tableOrders = activeOrders?.filter(o => {
       const isThisTable = o.table_number === tableNum || (o.address && o.address.replace(/\D/g, '') === tableNum);
       
       // --- AQUI ESTÁ A CORREÇÃO DE SINCRONIA ---
       // Se o pedido está 'entregue' (finalizado na mesa) E tem pagamento registrado (finalizado no caixa),
       // então ignoramos ele para que a mesa apareça LIVRE para o garçom.
       const isPaidAndDelivered = o.payment_method && o.payment_method !== 'aguar_pagamento' && o.status === 'entregue';
       
       return isThisTable && !isPaidAndDelivered;
    }) || [];
    
    // Verifica se tem itens prontos (status 'enviado' ou 'pronto' vindo do KDS)
    const readyOrders = tableOrders.filter(o => o.status === 'enviado' || o.status === 'pronto');
    const hasReadyItems = readyOrders.length > 0;
    
    // Verifica se tem itens sendo feitos
    const isPreparing = tableOrders.some(o => ['aceito', 'preparando'].includes(o.status));
    
    let status: TableStatus = 'free';
    if (tableOrders.length > 0) {
      if (tableOrders.some(o => o.status === 'pagando')) status = 'payment';
      else status = 'occupied';
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
      hasReadyItems: hasReadyItems,
      readyOrderIds: readyOrders.map(o => o.id),
      isPreparing: isPreparing
    };
  });

  return tables;
}

// --- 2. BUSCAR CARDÁPIO (SEU CÓDIGO ORIGINAL) ---
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

// --- 3. CRIAR PEDIDO (SEU CÓDIGO ORIGINAL RESTAURADO) ---
export async function createTableOrderAction(
    storeId: string, 
    tableNum: string, 
    items: any[], 
    clientName?: string, 
    clientPhone?: string,
    coupon?: { id: string, code: string, value: number, type: 'percent' | 'fixed', min_order_value?: number } | null
) {
  const supabase = await createClient();
  
  try {
      // Recalcula total no backend para segurança
      const itemsTotal = items.reduce((acc, item) => acc + (item.totalPrice || (item.price * item.quantity)), 0);
      
      let discount = 0;
      let couponId = null;

      // Lógica do Cupom Restaurada
      if (coupon) {
          const minOrder = coupon.min_order_value || 0;
          if (itemsTotal >= minOrder) {
              couponId = coupon.id;
              if (coupon.type === 'percent') {
                  discount = (itemsTotal * coupon.value) / 100;
              } else {
                  discount = coupon.value;
              }
          }
      }

      const finalTotal = Math.max(0, itemsTotal - discount);
      
      const finalName = clientName && clientName.trim() !== "" ? clientName : `Mesa ${tableNum}`;
      const finalPhone = clientPhone && clientPhone.trim() !== "" ? clientPhone : "00000000000";

      const { data: order, error: orderError } = await supabase.from("orders").insert({
        store_id: storeId,
        customer_name: finalName,
        customer_phone: finalPhone, 
        delivery_type: "mesa",
        address: `Mesa ${tableNum}`,
        table_number: tableNum,
        payment_method: "aguar_pagamento", // Inicializa aguardando pagamento
        status: "aceito", 
        total_price: finalTotal, 
        discount: discount,      
        coupon_id: couponId,     
        last_status_change: new Date().toISOString()
      }).select().single();

      if (orderError) return { error: `Erro SQL: ${orderError.message}` };

      if (couponId) {
          await supabase.rpc('increment_coupon_usage', { coupon_id: couponId });
      }

      if (items.length > 0) {
          // Mapeia corretamente os campos complexos (JSON)
          const orderItemsData = items.map(i => ({
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
          await supabase.from("order_items").insert(orderItemsData);
      }
      
      await supabase.from("order_history").insert({ order_id: order.id, new_status: 'aceito', changed_at: new Date().toISOString() });
      revalidatePath("/");
      return { success: true, orderId: order.id };

  } catch (err: any) { 
      console.error(err);
      return { error: "Erro interno no servidor." }; 
  }
}

// --- 4. ADICIONAR ITENS (SEU CÓDIGO ORIGINAL RESTAURADO) ---
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
        selected_addons: i.selectedAddons ? JSON.stringify(i.selectedAddons) : null,
        status: 'pendente'
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);
      if (itemsError) return { error: "Erro ao adicionar itens." };

      const newTotal = currentTableTotal + addedTotal;
      
      const { error: updateError } = await supabase.from("orders")
        .update({ 
            total_price: newTotal, 
            status: "aceito", 
            last_status_change: new Date().toISOString() 
        })
        .eq("id", orderId);

      if (updateError) return { error: "Erro ao atualizar total." };
      revalidatePath("/");
      return { success: true };
  } catch (err) { return { error: "Erro ao processar." }; }
}

// --- 5. FECHAR MESA (GARÇOM - MANTIDO) ---
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

  await supabase.from("order_items").update({ status: 'concluido' }).in("order_id", ids);

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
