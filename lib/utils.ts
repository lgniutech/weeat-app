import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- FUNÇÕES DE FORMATAÇÃO E MÁSCARAS ---

export function formatPhone(value: string) {
  if (!value) return ""
  
  // Remove tudo que não é número
  let numbers = value.replace(/\D/g, "")
  
  // Limita a 11 dígitos
  if (numbers.length > 11) numbers = numbers.slice(0, 11)

  // Aplica a máscara (99) 99999-9999 ou (99) 9999-9999
  return numbers
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d)(\d{4})$/, "$1-$2")
}

export function formatCep(value: string) {
  if (!value) return ""
  
  // Remove tudo que não é número
  let numbers = value.replace(/\D/g, "")
  
  // Limita a 8 dígitos
  if (numbers.length > 8) numbers = numbers.slice(0, 8)

  // Aplica a máscara 00000-000
  return numbers.replace(/^(\d{5})(\d)/, "$1-$2")
}

export function formatOnlyLetters(value: string) {
  if (!value) return ""
  
  // Mantém apenas letras (com acentos) e espaços
  // Remove números e símbolos especiais
  return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "")
}

export function cleanPhone(value: string) {
  // Retorna apenas números: 11912345678 (Ideal para salvar no banco)
  return value.replace(/\D/g, "")
}
