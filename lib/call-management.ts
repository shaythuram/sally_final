import { supabase } from './supabase'
import { Call, CreateCallData, UpdateCallData, TranscriptData, TranscriptEntry, TranscriptPermissions } from './supabase'

export class CallManager {
  // Create a new call with transcript permissions
  static async createCall(callData: CreateCallData, userId: string): Promise<Call | null> {
    try {
      // Create initial transcript structure
      const initialTranscript: TranscriptData = {
        entries: [],
        permissions: {
          admin: callData.transcriptAdminEmail,
          editors: [callData.transcriptAdminEmail],
          viewers: []
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('calls')
        .insert([{
          owner_id: userId,
          title: callData.title,
          company: callData.company,
          call_date: new Date().toISOString().split('T')[0],
          duration: 0, // will be updated when call ends
          attendees: callData.attendeeEmails.length,
          attendee_emails: callData.attendeeEmails,
          call_link: callData.callLink ?? null,
          bot_id: callData.botId ?? null,
          meeting_id: callData.meetingId ?? null,
          labels: [],
          members_emails: callData.attendeeEmails || [],
          members_uids: [],
          documents: [],
          meeting_agenda: callData.meetingAgenda,
          meeting_description: callData.meetingDescription,
          status: 'active',
          transcript: initialTranscript,
          post_call_actions: {},
          genie_content: [],
          post_call_completion: 0,
          tasks_completed: 0,
          total_tasks: 0,
          pending_tasks: 0,
          assistant_id: callData.assistantId ?? null,
          thread_id: callData.threadId ?? null
        }])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating call:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error creating call:', error)
      return null
    }
  }

  // Create a new call with a specific call_id (for joining from upcoming calls)
  static async createCallWithId(callData: CreateCallData, userId: string, callId: string): Promise<Call | null> {
    try {
      console.log('🔄 createCallWithId called with callId:', callId);
      
      // First check if a call with this ID already exists
      const { data: existingCall, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .eq('call_id', callId)
        .single()
      
      if (existingCall && !fetchError) {
        console.log('✅ Call with ID already exists, returning existing call:', callId);
        return existingCall;
      }
      
      console.log('🆕 Creating new call with ID:', callId);
      
      // Create initial transcript structure
      const initialTranscript: TranscriptData = {
        entries: [],
        permissions: {
          admin: callData.transcriptAdminEmail,
          editors: [callData.transcriptAdminEmail],
          viewers: []
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('calls')
        .insert([{
          call_id: callId, // Use the specific call_id
          owner_id: userId,
          title: callData.title,
          company: callData.company,
          call_date: new Date().toISOString().split('T')[0],
          duration: 0, // will be updated when call ends
          attendees: callData.attendeeEmails.length,
          attendee_emails: callData.attendeeEmails,
          call_link: callData.callLink ?? null,
          bot_id: callData.botId ?? null,
          meeting_id: callData.meetingId ?? null,
          labels: [],
          members_emails: callData.attendeeEmails || [],
          members_uids: [],
          documents: [],
          meeting_agenda: callData.meetingAgenda,
          meeting_description: callData.meetingDescription,
          status: 'active',
          transcript: initialTranscript,
          post_call_actions: {},
          genie_content: [],
          post_call_completion: 0,
          tasks_completed: 0,
          total_tasks: 0,
          pending_tasks: 0,
          assistant_id: callData.assistantId ?? null,
          thread_id: callData.threadId ?? null
        }])
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error creating call with specific ID:', error)
        console.error('Call ID that failed:', callId)
        console.error('Error details:', error)
        return null
      }
      
      console.log('✅ Successfully created call with ID:', callId);
      return data
    } catch (error) {
      console.error('❌ Exception in createCallWithId:', error)
      return null
    }
  }

  // Replace the entire transcript entries array
  static async updateCallTranscript(callId: string, entries: any[]): Promise<boolean> {
    try {
      // Check if entries are already formatted (with order, speaker, text) or need formatting
      const isFormattedEntries = entries.length > 0 && entries[0].hasOwnProperty('order');
      
      let finalTranscriptData;
      
      if (isFormattedEntries) {
        // Use the formatted entries directly (from stopCall)
        finalTranscriptData = {
          entries: entries,
          permissions: { admin: '', editors: [], viewers: [] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        console.log('\ud83d\udcc4 Using formatted transcript entries:', entries.length);
      } else {
        // Handle legacy TranscriptEntry format
        const { data: call, error: fetchError } = await supabase
          .from('calls')
          .select('transcript')
          .eq('call_id', callId)
          .single()

        if (fetchError || !call) {
          console.error('Error fetching call for transcript update:', fetchError)
          return false
        }

        const transcript: TranscriptData = call.transcript || {
          entries: [],
          permissions: { admin: '', editors: [], viewers: [] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        transcript.entries = entries
        transcript.updated_at = new Date().toISOString()
        finalTranscriptData = transcript;
      }

      const { error } = await supabase
        .from('calls')
        .update({ transcript: finalTranscriptData })
        .eq('call_id', callId)

      if (error) {
        console.error('Error updating call transcript:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error updating call transcript:', error)
      return false
    }
  }

  // Set assistant and thread IDs after external creation
  static async setAssistantAndThreadIds(callId: string, assistantId: string, threadId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ assistant_id: assistantId, thread_id: threadId })
        .eq('call_id', callId)

      if (error) {
        console.error('Error setting assistant/thread IDs:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error setting assistant/thread IDs:', error)
      return false
    }
  }

  // Add transcript entry
  static async addTranscriptEntry(callId: string, entry: TranscriptEntry): Promise<boolean> {
    try {
      // Get current call
      const { data: call, error: fetchError } = await supabase
        .from('calls')
        .select('transcript')
        .eq('call_id', callId)
        .single()
      
      if (fetchError || !call) {
        console.error('Error fetching call:', fetchError)
        return false
      }

      const transcript: TranscriptData = call.transcript
      const newEntry: TranscriptEntry = {
        ...entry,
        id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        edited_at: new Date().toISOString()
      }

      transcript.entries.push(newEntry)
      transcript.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('calls')
        .update({ transcript: transcript })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating transcript:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error adding transcript entry:', error)
      return false
    }
  }

  // Update transcript entry
  static async updateTranscriptEntry(callId: string, entryId: string, updatedText: string, editorEmail: string): Promise<boolean> {
    try {
      // Get current call
      const { data: call, error: fetchError } = await supabase
        .from('calls')
        .select('transcript')
        .eq('call_id', callId)
        .single()
      
      if (fetchError || !call) {
        console.error('Error fetching call:', fetchError)
        return false
      }

      const transcript: TranscriptData = call.transcript
      
      // Find and update the entry
      const entryIndex = transcript.entries.findIndex(entry => entry.id === entryId)
      if (entryIndex === -1) {
        console.error('Entry not found')
        return false
      }

      transcript.entries[entryIndex] = {
        ...transcript.entries[entryIndex],
        text: updatedText,
        edited_by: editorEmail,
        edited_at: new Date().toISOString(),
        is_edited: true
      }

      transcript.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('calls')
        .update({ transcript: transcript })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating transcript entry:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating transcript entry:', error)
      return false
    }
  }

  // Update transcript permissions
  static async updateTranscriptPermissions(callId: string, permissions: TranscriptPermissions): Promise<boolean> {
    try {
      // Get current call
      const { data: call, error: fetchError } = await supabase
        .from('calls')
        .select('transcript')
        .eq('call_id', callId)
        .single()
      
      if (fetchError || !call) {
        console.error('Error fetching call:', fetchError)
        return false
      }

      const transcript: TranscriptData = call.transcript
      transcript.permissions = permissions
      transcript.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('calls')
        .update({ transcript: transcript })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating transcript permissions:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating transcript permissions:', error)
      return false
    }
  }

  // Check if user has edit permissions for transcript
  static async canEditTranscript(callId: string, userEmail: string): Promise<boolean> {
    try {
      const { data: call, error } = await supabase
        .from('calls')
        .select('transcript, owner_id')
        .eq('call_id', callId)
        .single()
      
      if (error || !call) {
        console.error('Error fetching call:', error)
        return false
      }

      const transcript: TranscriptData = call.transcript
      const permissions = transcript.permissions

      // Check if user is the call owner
      if (call.owner_id === userEmail) {
        return true
      }

      // Check if user is the admin
      if (permissions.admin === userEmail) {
        return true
      }

      // Check if user is in editors list
      if (permissions.editors.includes(userEmail)) {
        return true
      }

      return false
    } catch (error) {
      console.error('Error checking edit permissions:', error)
      return false
    }
  }

  // Get transcript with permissions check
  static async getTranscript(callId: string, userEmail: string): Promise<TranscriptData | null> {
    try {
      const { data: call, error } = await supabase
        .from('calls')
        .select('transcript, owner_id')
        .eq('call_id', callId)
        .single()
      
      if (error || !call) {
        console.error('Error fetching call:', error)
        return null
      }

      const transcript: TranscriptData = call.transcript
      const permissions = transcript.permissions

      // Check if user has access (owner, admin, editor, or viewer)
      const hasAccess = 
        call.owner_id === userEmail ||
        permissions.admin === userEmail ||
        permissions.editors.includes(userEmail) ||
        permissions.viewers.includes(userEmail)

      if (!hasAccess) {
        console.error('User does not have access to this transcript')
        return null
      }

      return transcript
    } catch (error) {
      console.error('Error getting transcript:', error)
      return null
    }
  }

  // Update call with AI summary
  static async updateCallSummary(callId: string, summary: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ ai_summary: summary })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating summary:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating summary:', error)
      return false
    }
  }

  // Update call with DISCO data
  static async updateCallDisco(callId: string, discoData: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ disco_data: discoData })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating DISCO data:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating DISCO data:', error)
      return false
    }
  }

  // Update call with post-call actions
  static async updateCallActions(callId: string, actions: Record<string, 'completed' | 'inprogress' | 'unfinished'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ post_call_actions: actions })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating actions:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating actions:', error)
      return false
    }
  }

  // Update labels on a call
  static async updateCallLabels(callId: string, labels: Array<{ text: string; color: string }>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ labels })
        .eq('call_id', callId)

      if (error) {
        console.error('Error updating call labels:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error updating call labels:', error)
      return false
    }
  }

  // Update call with genie content
  static async updateCallGenie(callId: string, genieContent: any): Promise<boolean> {
    try {
      // Handle both old format (string[]) and new format (split object)
      let finalGenieData;
      
      if (Array.isArray(genieContent)) {
        // Legacy format - convert to new structure
        finalGenieData = {
          live_analysis: genieContent.map((content, index) => ({
            content: content,
            type: 'live_analysis',
            order: index + 1
          })),
          ai_chat_qna: []
        };
        console.log('\ud83e\uddde Converting legacy genie format to split structure');
      } else {
        // New split format
        finalGenieData = genieContent;
        console.log('\ud83e\uddde Using new split genie format');
      }
      
      console.log('\ud83e\uddde Final Genie data for storage:', JSON.stringify(finalGenieData, null, 2));
      
      const { error } = await supabase
        .from('calls')
        .update({ genie_content: finalGenieData })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating genie content:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating genie content:', error)
      return false
    }
  }

  // Update call with voice recording path
  static async updateCallRecording(callId: string, recordingPath: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ voice_recording_path: recordingPath })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error updating recording path:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating recording path:', error)
      return false
    }
  }

  // Complete call
  static async completeCall(callId: string, duration: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ 
          status: 'completed',
          duration: duration
        })
        .eq('call_id', callId)
      
      if (error) {
        console.error('Error completing call:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error completing call:', error)
      return false
    }
  }

  // Get current active call for a user
  static async getCurrentCall(userId: string): Promise<Call | null> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('owner_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        console.error('Error getting current call:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error getting current call:', error)
      return null
    }
  }

  // Get user's calls
  static async getUserCalls(userId: string): Promise<Call[]> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching calls:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching calls:', error)
      return []
    }
  }
}
