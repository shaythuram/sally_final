import { supabase } from './supabase'
import { DocumentInfo } from './upcoming-calls-manager'

export class DocumentUploadService {
  // List all documents for a given user (recursively across calls)
  static async listUserDocuments(userId: string): Promise<DocumentInfo[]> {
    try {
      const bucket = supabase.storage.from('call-documents')

      // First, list immediate children under the user's UID (expected: call IDs as folders)
      const { data: level1, error: e1 } = await bucket.list(userId, { limit: 100 })
      if (e1) {
        console.error('Error listing user root:', e1)
        return []
      }

      const documents: DocumentInfo[] = []

      // Helper to process a directory path by listing its contents and capturing any files
      const listDir = async (dirPath: string) => {
        let offset = 0
        const limit = 100
        while (true) {
          const { data: entries, error } = await bucket.list(dirPath, { limit, offset })
          if (error) {
            console.error('Error listing dir:', dirPath, error)
            break
          }
          if (!entries || entries.length === 0) break
          for (const entry of entries) {
            const isFile = typeof entry?.metadata?.size === 'number'
            if (isFile) {
              const fullPath = `${dirPath}/${entry.name}`
              documents.push({
                name: entry.name,
                path: fullPath,
                size: entry.metadata?.size ?? 0,
                type: inferMimeTypeFromName(entry.name),
                uploaded_at: entry.created_at || entry.updated_at || new Date().toISOString(),
              })
            } else {
              await listDir(`${dirPath}/${entry.name}`)
            }
          }
          if (entries.length < limit) break
          offset += limit
        }
      }

      // Iterate each call folder under the user
      for (const item of level1 || []) {
        const isFileAtRoot = !!(item as any).id || !!item.metadata?.size
        if (isFileAtRoot) {
          // Unexpected, but handle gracefully
          documents.push({
            name: item.name,
            path: `${userId}/${item.name}`,
            size: item.metadata?.size ?? 0,
            type: inferMimeTypeFromName(item.name),
            uploaded_at: item.created_at || item.updated_at || new Date().toISOString(),
          })
        } else {
          await listDir(`${userId}/${item.name}`)
        }
      }

      if (typeof window !== 'undefined') {
        console.log('Listed documents count:', documents.length)
      }
      return documents
    } catch (e) {
      console.error('Error listing documents:', e)
      return []
    }
  }
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

function inferMimeTypeFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain'
  if (lower.endsWith('.csv')) return 'text/csv'
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'application/vnd.ms-powerpoint'
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.zip')) return 'application/zip'
  return 'application/octet-stream'
}
