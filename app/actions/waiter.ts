"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TableStatus = 'free' | 'occupied' | 'payment';

export type TableData = {
  id: string;
  status: TableStatus;
  orderId?: string; // ID do pedido principal (ou o mais recente)
  customerName?: string;
  total: number;
  items?: any[];
  orderStatus?: string;
  // NOVOS CAMPOS PARA O SINO
  hasReadyItems: boolean;
  readyOrderIds: string[]; // Lista de IDs que estão prontos para servir
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

  // Busca TODOS os pedidos ativos (não entregues/cancelados)
  // Inclui 'enviado' que é o status "Pronto na Cozinha"
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
    .neq("status", "entregue") 
    .neq("status", "cancelado");

  const tables = Array.from({ length: totalTables }, (_, i) => {
    const tableNum = (i + 1).toString();
    
    // Filtra todos os pedidos desta mesa
    const tableOrders = activeOrders?.filter(o => 
       o.table_number === tableNum || 
       (o.address && o.address.replace(/\D/g, '') === tableNum)
    ) || [];
    
    // Verifica se tem algum pedido "Pronto" (enviado)
    const readyOrders = tableOrders.filter(o => o.status === 'enviado');
    const hasReadyItems = readyOrders.length > 0;
    
    // Define status geral da mesa
    let status: TableStatus = 'free';
    if (tableOrders.length > 0) {
      // Se tem algum pedido pagando, a mesa tá em pagamento
      if (tableOrders.some(o => o.status === 'pagando')) status = 'payment';
      else status = 'occupied';
    }

    // Calcula total acumulado da mesa (soma de todos os pedidos não pagos)
    const total = tableOrders.reduce((acc, o) => acc + (o.total_price || 0), 0);
    
    // Junta todos os itens para exibição geral
    const allItems = tableOrders.flatMap(o => o.order_items || []);

    return {
      id: tableNum,
      status: status,
      orderId: tableOrders[0]?.id, // Pega um ID qualquer para referência se precisar
      customerName: tableOrders[0]?.customer_name,
      total: total,
      items: allItems,
      orderStatus: tableOrders[0]?.status,
      // NOVAS PROPRIEDADES
      hasReadyItems: hasReadyItems,
      readyOrderIds: readyOrders.map(o => o.id)
    };
  });

  return tables;
}

// --- 2. BUSCAR CARDÁPIO (MANTIDO IGUAL) ---
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

// --- 3. CRIAR PEDIDO (MANTIDO IGUAL) ---
export async function createTableOrderAction(storeId: string, tableNum: string, items: any[]) {
  const supabase = await createClient();
  try {
      const total = items.reduce((acc, item) => acc + (item.totalPrice || (item.price * item.quantity)), 0);
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        store_id: storeId,
        customer_name: `Mesa ${tableNum}`,
        customer_phone: "00000000000",
        delivery_type: "mesa",
        address: `Mesa ${tableNum}`,
        table_number: tableNum,
        payment_method: "card_machine",
        status: "aceito", // Vai direto pra cozinha (não é pendente)
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
      
      await supabase.from("order_history").insert({
          order_id: order.id,
          new_status: 'aceito',
          changed_at: new Date().toISOString()
      });

      revalidatePath("/");
      return { success: true, orderId: order.id };
  } catch (err: any) { return { error: "Erro interno no servidor." }; }
}

// --- 4. ADICIONAR ITENS (MANTIDO IGUAL) ---
export async function addItemsToTableAction(orderId: string, newItems: any[], currentTableTotal: number) {
  // Nota: Isso adiciona itens a um pedido existente. 
  // Se o pedido anterior já foi entregue, o ideal seria criar um novo pedido, 
  // mas para simplificar mantemos a lógica de adicionar ao último ativo.
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

// --- 5. FECHAR MESA (LIBERAR TUDO) ---
export async function closeTableAction(tableNum: string, storeId: string) {
  // Marca TODOS os pedidos desta mesa como entregues (para limpar a mesa)
  const supabase = await createClient();
  
  // Primeiro busca os IDs
  const { data: orders } = await supabase.from("orders")
      .select("id")
      .eq("store_id", storeId)
      .eq("table_number", tableNum)
      .neq("status", "entregue")
      .neq("status", "cancelado");
      
  if (!orders || orders.length === 0) return { success: true };

  const ids = orders.map(o => o.id);

  const { error } = await supabase
      .from("orders")
      .update({ status: "entregue", last_status_change: new Date().toISOString() })
      .in("id", ids);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

// --- 6. NOVO: SERVIR ITENS PRONTOS ---
export async function serveReadyOrdersAction(orderIds: string[]) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from("orders")
        .update({ 
            status: "entregue", // Isso move para "Concluído" no Kanban
            last_status_change: new Date().toISOString()
        })
        .in("id", orderIds);

    if (error) return { error: error.message };
    
    revalidatePath("/");
    return { success: true };
}
