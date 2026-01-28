import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- NOVAS FUNÇÕES ---

export function formatPhone(value: string) {
  if (!value) return ""
  
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "")
  
  // Limita a 11 dígitos (DDD + 9 + 8 dígitos)
  // Aplica a máscara (11) 91234-5678 visualmente
  const char = { 0: "(", 2: ") ", 7: "-" }
  let phone = ""
  
  for (let i = 0; i < numbers.length; i++) {
    // @ts-ignore
    if (char[i]) phone += char[i]
    phone += numbers[i]
  }
  
  // Retorna formatado: (11) 91234-5678 (Max 15 chars)
  return phone.slice(0, 15) 
}

export function cleanPhone(value: string) {
  // Retorna apenas números: 11912345678 (Ideal para salvar no banco)
  return value.replace(/\D/g, "")
}
