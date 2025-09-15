import { supabase } from './supabase'

export interface UpcomingCall {
  call_id: string
  owner_id: string
  title: string
  company: string
  call_date: string
  call_time: string
  attendees: string[]
  description?: string
  agenda: string[]
  documents: DocumentInfo[]
  assistant_id?: string
  thread_id?: string
  created_at: string
  updated_at: string
}

export interface DocumentInfo {
  name: string
  path: string
  size: number
  type: string
  uploaded_at: string
}

export class UpcomingCallsManager {
  // Get a single upcoming call by ID
  static async getUpcomingCallById(callId: string): Promise<UpcomingCall | null> {
    try {
      const { data, error } = await supabase
        .from('upcoming_calls')
        .select('*')
        .eq('call_id', callId)
        .single()

      if (error) {
        console.error('Error fetching upcoming call by id:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching upcoming call by id:', error)
      return null
    }
  }
  // Create a new upcoming call
  static async createUpcomingCall(
    userId: string, 
    callData: {
      title: string
      company: string
      date: string
      time: string
      attendees: string[]
      description?: string
      agenda: string[]
      assistantId?: string
      threadId?: string
    }
  ): Promise<UpcomingCall | null> {
    try {
      const { data, error } = await supabase
        .from('upcoming_calls')
        .insert([{
          owner_id: userId,
          title: callData.title,
          company: callData.company,
          call_date: callData.date,
          call_time: callData.time,
          attendees: callData.attendees,
          description: callData.description || '',
          agenda: callData.agenda,
          documents: [],
          assistant_id: callData.assistantId ?? null,
          thread_id: callData.threadId ?? null
        }])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating upcoming call:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error creating upcoming call:', error)
      return null
    }
  }

  // Set assistant and thread IDs after external creation for upcoming calls
  static async setAssistantAndThreadIds(
    callId: string,
    assistantId: string,
    threadId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('upcoming_calls')
        .update({ assistant_id: assistantId, thread_id: threadId, updated_at: new Date().toISOString() })
        .eq('call_id', callId)

      if (error) {
        console.error('Error setting assistant/thread IDs for upcoming call:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error setting assistant/thread IDs for upcoming call:', error)
      return false
    }
  }

  // Get all upcoming calls for a user
  static async getUserUpcomingCalls(userId: string): Promise<UpcomingCall[]> {
    try {
      const { data, error } = await supabase
        .from('upcoming_calls')
        .select('*')
        .eq('owner_id', userId)
        .order('call_date', { ascending: true })
      
      if (error) {
        console.error('Error fetching upcoming calls:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching upcoming calls:', error)
      return []
    }
  }

  // Update an upcoming call
  static async updateUpcomingCall(
    callId: string, 
    updates: Partial<UpcomingCall>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('upcoming_calls')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating upcoming call:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating upcoming call:', error)
      return false
    }
  }

  // Add documents to an upcoming call
  static async addDocumentsToCall(
    callId: string, 
    documents: DocumentInfo[]
  ): Promise<boolean> {
    try {
      // Get current call data
      const { data: currentCall, error: fetchError } = await supabase
        .from('upcoming_calls')
        .select('documents')
        .eq('call_id', callId)
        .single()
      
      if (fetchError) {
        console.error('Error fetching call for document update:', fetchError)
        return false
      }

      // Merge with existing documents
      const existingDocuments = currentCall?.documents || []
      const updatedDocuments = [...existingDocuments, ...documents]

      const { error } = await supabase
        .from('upcoming_calls')
        .update({
          documents: updatedDocuments,
          updated_at: new Date().toISOString()
        })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating call documents:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating call documents:', error)
      return false
    }
  }

  // Delete an upcoming call
  static async deleteUpcomingCall(callId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('upcoming_calls')
        .delete()
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error deleting upcoming call:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error deleting upcoming call:', error)
      return false
    }
  }
}
