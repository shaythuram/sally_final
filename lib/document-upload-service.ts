import { supabase } from './supabase'
import { DocumentInfo } from './upcoming-calls-manager'

export class DocumentUploadService {
  // Upload multiple files to Supabase Storage
  static async uploadDocuments(
    files: File[], 
    userId: string, 
    callId: string
  ): Promise<DocumentInfo[]> {
    const uploadedDocuments: DocumentInfo[] = []
    
    for (const file of files) {
      try {
        const documentInfo = await this.uploadSingleDocument(file, userId, callId)
        if (documentInfo) {
          uploadedDocuments.push(documentInfo)
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error)
      }
    }
    
    return uploadedDocuments
  }

  // Upload a single document to Supabase Storage
  static async uploadSingleDocument(
    file: File, 
    userId: string, 
    callId: string
  ): Promise<DocumentInfo | null> {
    try {
      // Create a unique filename with timestamp
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      // Path must start with the authenticated user's uid to satisfy storage RLS
      const filePath = `${userId}/${callId}/${fileName}`

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('call-documents')
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        })

      if (error) {
        console.error('Error uploading document:', {
          message: error.message,
          name: (error as any).name,
          status: (error as any).statusCode || (error as any).status,
        })
        return null
      }

      // Return document info
      const documentInfo: DocumentInfo = {
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type,
        uploaded_at: new Date().toISOString()
      }

      try {
        const { data: signed } = await supabase.storage
          .from('call-documents')
          .createSignedUrl(filePath, 60 * 60)
        console.log('✅ Document uploaded:', {
          bucket: 'call-documents',
          path: filePath,
          signedUrl: signed?.signedUrl
        })
      } catch (_) {
        // non-fatal
      }

      return documentInfo
    } catch (error) {
      console.error('Error uploading document:', error)
      return null
    }
  }

  // Get download URL for a document
  static async getDocumentUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('call-documents')
        .createSignedUrl(filePath, 60 * 60) // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error)
        return null
      }

      return data.signedUrl
    } catch (error) {
      console.error('Error getting document URL:', error)
      return null
    }
  }

  // Delete a document from storage
  static async deleteDocument(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('call-documents')
        .remove([filePath])

      if (error) {
        console.error('Error deleting document:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting document:', error)
      return false
    }
  }

  // Delete multiple documents
  static async deleteDocuments(filePaths: string[]): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('call-documents')
        .remove(filePaths)

      if (error) {
        console.error('Error deleting documents:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting documents:', error)
      return false
    }
  }
}
