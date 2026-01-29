// lib/wasender.ts

interface SendMessageParams {
  phone: string;
  message: string;
  token: string;
}

interface WasenderResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function sendWhatsAppMessage({ phone, message, token }: SendMessageParams): Promise<WasenderResponse> {
  // 1. Limpeza do telefone (Remove caracteres não numéricos)
  const cleanPhone = phone.replace(/\D/g, "");

  // Wasender exige formato E.164 (Ex: +5511999999999). 
  // Se o número vier sem o "+", adicionamos. Se vier sem "55", cuidado, mas vamos assumir que vem completo do cadastro.
  // Ajuste simples para garantir o "+" se não tiver.
  const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;

  try {
    const response = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        to: formattedPhone,
        text: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("❌ Erro Wasender:", data);
        return { 
          success: false, 
          error: data?.message || "Falha ao enviar mensagem via WhatsApp." 
        };
    }

    return { success: true, data };

  } catch (error) {
    console.error("❌ Exceção Wasender:", error);
    return { success: false, error: "Erro de conexão com o servidor do WhatsApp." };
  }
}
