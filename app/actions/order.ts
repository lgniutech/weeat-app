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
  deliveryType: "entrega" | "retirada" | "mesa"; 
  tableNumber?: string; 
  address?: string;
  paymentMethod: string;
  changeFor?: string;
  totalPrice: number;
  items: OrderItemInput[];
  notes?: string;
}

// CRIAR PEDIDO
export async function createOrderAction(order: OrderInput) {
  const supabase = await createClient();

  // LÓGICA DE STATUS INICIAL:
  // Mesa -> 'aceito' (Vai direto pra cozinha)
  // Entrega/Retirada -> 'pendente' (Precisa que a loja aceite no painel/gestor)
  const initialStatus = order.deliveryType === 'mesa' ? 'aceito' : 'pendente';

  const orderData = {
    store_id: order.storeId,
    status: initialStatus,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    delivery_type: order.deliveryType,
    address: order.address,
    payment_method: order.paymentMethod,
    change_for: order.changeFor,
    total_price: order.totalPrice,
    last_status_change: new Date().toISOString(),
    table_number: order.tableNumber || null,
    cancellation_reason: order.notes 
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
    selected_addons: JSON.stringify(item.selected_addons),
    status: 'pendente' // Item nasce pendente (para ser feito)
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);

  if (itemsError) {
    console.error("Erro ao criar itens:", itemsError);
    return { error: "Erro ao registrar itens do pedido." };
  }

  // Log no histórico com o status correto
  await supabase.from("order_history").insert({
      order_id: newOrder.id,
      previous_status: null,
      new_status: initialStatus,
      changed_at: new Date().toISOString()
  });

  revalidatePath("/");
  return { success: true, orderId: newOrder.id };
}

// BUSCAR PEDIDOS (PAINEL LOJISTA)
export async function getStoreOrdersAction(storeId: string, dateFilter?: string) {
    const supabase = await createClient();
    
    let query = supabase
        .from("orders")
        .select(`*, items:order_items(*)`)
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

// ATUALIZAR STATUS
export async function updateOrderStatusAction(orderId: string, newStatus: string, reason?: string) {
    const supabase = await createClient();

    const { data: currentOrder } = await supabase.from("orders").select("status").eq("id", orderId).single();
    if (!currentOrder) return { error: "Pedido não encontrado" };
    
    const updateData: any = { 
        status: newStatus,
        last_status_change: new Date().toISOString() 
    };
    if (reason) updateData.cancellation_reason = reason;

    const { error: updateError } = await supabase.from("orders").update(updateData).eq("id", orderId);
    if (updateError) return { error: "Erro ao atualizar status" };

    await supabase.from("order_history").insert({
        order_id: orderId,
        previous_status: currentOrder.status,
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
      .select(`*, store:stores(name, slug), items:order_items(*)`)
      .eq("customer_phone", clean)
      .order("created_at", { ascending: false })
      .limit(5)

  if (error) return [];
  return data || [];
}

// BUSCAR CONTA DA MESA
export async function getTableOrdersAction(storeId: string, tableNumber: string) {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      total_price,
      status,
      created_at,
      order_items (
        id,
        product_name,
        quantity,
        unit_price,
        total_price,
        observation,
        removed_ingredients,
        selected_addons
      )
    `)
    .eq("store_id", storeId)
    .eq("table_number", tableNumber)
    .neq("status", "concluido") 
    .neq("status", "cancelado")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar conta da mesa:", error);
    return [];
  }

  return orders || [];
}
