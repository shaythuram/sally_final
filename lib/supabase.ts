import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks for Electron
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
//   (typeof window !== 'undefined' && (window as any).env?.NEXT_PUBLIC_SUPABASE_URL)

// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
//   (typeof window !== 'undefined' && (window as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const supabaseUrl = "https://fjxfsaookhadepmcuzok.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeGZzYW9va2hhZGVwbWN1em9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTM1MDgsImV4cCI6MjA3MjgyOTUwOH0.RrUyUkTNhgF13pTL5orFxQvUsOgdq9s9MXLrkxXpFlk"

// Debug logging
if (typeof window !== 'undefined') {
  console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing')
  console.log('Supabase Key:', supabaseAnonKey ? 'Found' : 'Missing')
  console.log('Environment check:', {
    processEnv: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    windowEnv: !!(window as any).env?.NEXT_PUBLIC_SUPABASE_URL
  })
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface UserProfile {
  id: string
  username: string
  fullName: string
  dateJoined: string
  email: string
  organisation: string
  uid: string
  purpose: string
  outlookConnected: boolean
  gmailConnected: boolean
  callsTaken: number
  createdAt?: string
  updatedAt?: string
}
