import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient(url, key) : null
export const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '27798078005'
export const money = (amount) => new Intl.NumberFormat('en-ZA', {
  style: 'currency', currency: 'ZAR'
}).format(Number(amount || 0))