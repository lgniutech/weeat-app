"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface OrderItemInput {
  product_name: string;
  quantity: number;
  unit_price: number;
  observation?: string;
  removed_ingredients: string[]; 
  selected_addons: { name: string; price: number }[]; 
}

interface OrderInput {
  storeId: string;
  customerName: string;
  customerPhone: string;
  // Adicionado 'mesa' como opção
  deliveryType: "entrega" | "retirada" | "mesa"; 
  // Novo campo para o número da mesa
  tableNumber?: string; 
  address?: string;
  paymentMethod: string;
  changeFor?: string;
  totalPrice: number;
  items: OrderItemInput[];
}

// CRIAR PEDIDO
export async function createOrderAction(order: OrderInput) {
  const supabase = await createClient();

  // Preparar objeto para inserção
  const orderData = {
    store_id: order.storeId,
    status: "pendente",
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    delivery_type: order.deliveryType,
    address: order.address,
    payment_method: order.paymentMethod,
    change_for: order.changeFor,
    total_price: order.totalPrice,
    last_status_change: new Date().toISOString(),
    // Salva o número da mesa se existir
    table_number: order.tableNumber || null 
  };

  const { data: newOrder, error: orderError } = await supabase
    .from("orders")
    .insert(orderData)
    .select()
    .single();

  if (orderError) {
    console.error("Erro ao criar pedido:", orderError);
    return { error: "Erro ao registrar pedido." };
  }

  const itemsToInsert = order.items.map(item => ({
    order_id: newOrder.id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity,
    observation: item.observation,
    removed_ingredients: JSON.stringify(item.removed_ingredients),
    selected_addons: JSON.stringify(item.selected_addons)
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);

  if (itemsError) {
    console.error("Erro ao criar itens:", itemsError);
    return { error: "Erro ao registrar itens do pedido." };
  }

  await supabase.from("order_history").insert({
      order_id: newOrder.id,
      previous_status: null,
      new_status: 'pendente',
      changed_at: new Date().toISOString()
  });

  return { success: true, orderId: newOrder.id };
}

// BUSCAR PEDIDOS (PAINEL LOJISTA)
export async function getStoreOrdersAction(storeId: string, dateFilter?: string) {
    const supabase = await createClient();
    
    let query = supabase
        .from("orders")
        .select(`
            *,
            items:order_items(*)
        `)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

    if (dateFilter) {
        query = query
            .gte('created_at', `${dateFilter}T00:00:00`)
            .lte('created_at', `${dateFilter}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) console.error(error);
    return data || [];
}

// ATUALIZAR STATUS (COM MOTIVO OPCIONAL)
export async function updateOrderStatusAction(orderId: string, newStatus: string, reason?: string) {
    const supabase = await createClient();

    const { data: currentOrder } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();

    if (!currentOrder) return { error: "Pedido não encontrado" };
    const previousStatus = currentOrder.status;

    // Objeto de atualização dinâmica
    const updateData: any = { 
        status: newStatus,
        last_status_change: new Date().toISOString() 
    };

    // Se tiver motivo (cancelamento), salva
    if (reason) {
        updateData.cancellation_reason = reason;
    }

    const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);
    
    if (updateError) return { error: "Erro ao atualizar status" };

    await supabase.from("order_history").insert({
        order_id: orderId,
        previous_status: previousStatus,
        new_status: newStatus,
        changed_at: new Date().toISOString()
    });
    
    revalidatePath("/");
    return { success: true };
}

// RASTREIO (CLIENTE)
export async function getCustomerOrdersAction(phone: string) {
  const supabase = await createClient();
  const clean = phone.replace(/\D/g, "")

  if (!clean) return []

  const { data, error } = await supabase
      .from("orders")
      .select(`
          *,
          store:stores(name, slug),
          items:order_items(*)
      `)
      .eq("customer_phone", clean)
      .order("created_at", { ascending: false })
      .limit(5)

  if (error) {
      console.error("Erro ao buscar pedidos:", error);
      return [];
  }
  
  return data || [];
}
