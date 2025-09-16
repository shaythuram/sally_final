import { supabase } from './supabase'

export class AudioUploadService {
  // Upload audio file to Supabase Storage
  static async uploadAudioFile(audioBlob: Blob, callId: string, userId: string): Promise<string | null> {
    try {
      const fileName = `call_${callId}_${Date.now()}.webm`
      // Path must start with the authenticated user's uid to satisfy storage RLS
      const filePath = `${userId}/${callId}/${fileName}`
      
      const { data, error } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, audioBlob, {
          contentType: (audioBlob as any)?.type || 'audio/webm',
          upsert: false
        })
      
      if (error) {
        console.error('Error uploading audio:', {
          message: (error as any).message,
          name: (error as any).name,
          status: (error as any).statusCode || (error as any).status,
          filePath,
        })
        return null
      }
      
      return filePath
    } catch (error) {
      console.error('Error uploading audio:', error)
      return null
    }
  }

  // Get public URL for audio file
  static getAudioUrl(filePath: string): string | null {
    try {
      const { data } = supabase.storage
        .from('call-recordings')
        .getPublicUrl(filePath)
      
      return data.publicUrl
    } catch (error) {
      console.error('Error getting audio URL:', error)
      return null
    }
  }

  // Delete audio file
  static async deleteAudioFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('call-recordings')
        .remove([filePath])
      
      if (error) {
        console.error('Error deleting audio:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error deleting audio:', error)
      return false
    }
  }

  // Create signed URL for private access
  static async getSignedAudioUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('call-recordings')
        .createSignedUrl(filePath, expiresIn)
      
      if (error) {
        console.error('Error creating signed URL:', error)
        return null
      }
      
      return data.signedUrl
    } catch (error) {
      console.error('Error creating signed URL:', error)
      return null
    }
  }

  // Download audio file as blob
  static async downloadAudioFile(filePath: string): Promise<Blob | null> {
    try {
      const { data, error } = await supabase.storage
        .from('call-recordings')
        .download(filePath)
      
      if (error) {
        console.error('Error downloading audio:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error downloading audio:', error)
      return null
    }
  }
}
