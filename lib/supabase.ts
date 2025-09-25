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

// User-related interfaces
export interface UserProfile {
  username: string
  full_name: string
  date_joined: string
  email: string
  organisation: string
  uid: string
  purpose: string
  outlook_connected: boolean
  gmail_connected: boolean
  calls_taken: number
  created_at?: string
  updated_at?: string
}

// Transcript-related interfaces
export interface TranscriptEntry {
  id: string
  timestamp: string
  speaker: string
  text: string
  confidence?: number
  edited_by?: string
  edited_at?: string
  is_edited?: boolean
}

export interface TranscriptPermissions {
  admin: string // email of the admin
  editors: string[] // array of editor emails
  viewers: string[] // array of viewer emails (optional)
}

export interface TranscriptData {
  entries: TranscriptEntry[]
  permissions: TranscriptPermissions
  created_at: string
  updated_at: string
}

// Call-related interfaces
export interface Call {
  call_id: string
  owner_id: string
  title: string
  company: string
  call_date: string
  duration: number
  attendees: number
  attendee_emails: string[]
  call_link?: string
  bot_id?: string
  meeting_id?: string
  
  // Meeting Planning
  meeting_agenda: string[]
  meeting_description?: string
  
  // AI & Analysis
  ai_summary?: string
  assistant_id?: string
  thread_id?: string
  
  // Status & Metadata
  status: 'active' | 'completed' | 'archived'
  
  // Media & Content
  voice_recording_path?: string
  transcript: TranscriptData // JSON object with transcript data and permissions
  transcript_speakers?: Record<string, any>
  
  // DISCO Framework Data
  disco_data?: Record<string, any>
  
  // Post-Call Actions & Completion
  post_call_actions: Record<string, 'completed' | 'inprogress' | 'unfinished'>
  post_call_completion: number
  tasks_completed: number
  total_tasks: number
  pending_tasks: number
  labels?: Array<{ text: string; color: string }>
  members_emails?: string[]
  members_uids?: string[]
  documents?: Array<{ name: string; size?: string; path?: string }>
  
  // Genie Content
  genie_content: string[]
  
  created_at: string
  updated_at: string
}

// Additional interfaces
export interface DiscoData {
  decision_criteria?: string[]
  impact?: string[]
  situation?: string[]
  challenges?: string[]
  objectives?: string[]
}

// Call creation interface
export interface CreateCallData {
  title: string
  company: string
  meetingAgenda: string[]
  meetingDescription?: string
  attendeeEmails: string[]
  transcriptAdminEmail: string
  callLink?: string
  assistantId?: string
  threadId?: string
  botId?: string
  meetingId?: string
}

// Call update interface
export interface UpdateCallData {
  call_id: string
  duration?: number
  transcript?: TranscriptData
  ai_summary?: string
  disco_data?: DiscoData
  post_call_actions?: Record<string, 'completed' | 'inprogress' | 'unfinished'>
  genie_content?: string[]
  voice_recording_path?: string
}

// Transcript permission management
export interface TranscriptPermissionUpdate {
  call_id: string
  admin_email: string
  editor_emails: string[]
  viewer_emails?: string[]
}