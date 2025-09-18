"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Folder,
  FileText,
  FileImage,
  FileSpreadsheet,
  Presentation,
  Mail,
  Download,
  Share,
  MoreHorizontal,
  ArrowLeft,
  Grid3X3,
  List,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sidebar } from "@/components/sidebar"
import { supabase } from "@/lib/supabase"
import { DocumentUploadService } from "@/lib/document-upload-service"
import { useRouter } from "next/navigation"

// Helpers
function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed( i === 0 ? 0 : 1)} ${units[i]}`
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "application/pdf":
      return <FileText className="h-8 w-8 text-gray-600" />
    case "application/vnd.ms-powerpoint":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return <Presentation className="h-8 w-8 text-gray-600" />
    case "text/plain":
      return <FileText className="h-8 w-8 text-gray-600" />
    case "message/rfc822":
      return <Mail className="h-8 w-8 text-gray-600" />
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return <FileSpreadsheet className="h-8 w-8 text-gray-600" />
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return <FileText className="h-8 w-8 text-gray-600" />
    case "image/png":
    case "image/jpeg":
      return <FileImage className="h-8 w-8 text-gray-600" />
    default:
      return <FileText className="h-8 w-8 text-gray-600" />
  }
}

export default function FilesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [files, setFiles] = useState<Array<{
    id: string
    name: string
    type: string
    size: string
    created: string
    path: string
  }>>([])
  // Removed inline preview due to CSP; we'll open files in a new tab instead

  useEffect(() => {
    const init = async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Supabase auth error:', authError)
      }
      const uid = auth.user?.id || null
      console.log('FilesPage auth uid:', uid)
      if (!uid) {
        router.replace("/login")
        return
      }
      setUserId(uid)

      const docs = await DocumentUploadService.listUserDocuments(uid)
      console.log('FilesPage documents loaded:', docs?.length)
      const normalized = docs.map(d => ({
        id: d.path,
        name: d.name,
        type: d.type,
        size: formatBytes(d.size || 0),
        created: d.uploaded_at,
        path: d.path,
      }))
      setFiles(normalized)
      setLoading(false)
    }
    init()
  }, [router])

  const filteredFiles = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return files.filter(file => file.name.toLowerCase().includes(q))
  }, [files, searchQuery])

  const openInNewTab = async (file: { path: string }) => {
    const url = await DocumentUploadService.getDocumentUrl(file.path)
    if (url) window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <h1 className="text-xl font-semibold">Sally</h1>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files and folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>

              <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-6 py-8">
        {/* Folders disabled: showing only files */}

        {/* Files */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">All Files</h2>
            <span className="text-sm text-gray-500">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <Card className="border-gray-200">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading files…</h3>
                <p className="text-gray-500">Please wait while we fetch your documents.</p>
              </CardContent>
            </Card>
          ) : filteredFiles.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-500">
                  {searchQuery
                    ? "Try adjusting your search terms."
                    : "Your uploaded files will appear here."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-2"
              }
            >
              {filteredFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow border-gray-200 cursor-pointer" onClick={() => openInNewTab(file)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getFileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
                          <p className="text-sm text-gray-500">{file.size}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={async (e) => {
                            e.stopPropagation()
                            const url = await DocumentUploadService.getDocumentUrl(file.path)
                            if (url) window.open(url, "_blank")
                          }}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">uploaded</Badge>
                        <span className="text-xs text-gray-500">{new Date(file.created).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{file.path}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Preview removed due to CSP; files open in a new tab */}
      </div>
    </Sidebar>
  )
}
