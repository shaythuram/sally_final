"use client"

import { useState } from "react"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Link from "next/link"

// Mock data for files and folders
const mockFolders = [
  { id: "folder_1", name: "Dell Projects", fileCount: 12, created: "2025-08-20" },
  { id: "folder_2", name: "Kyndryl Demos", fileCount: 8, created: "2025-08-18" },
  { id: "folder_3", name: "Compliance Documents", fileCount: 15, created: "2025-08-15" },
  { id: "folder_4", name: "Q3 Reports", fileCount: 6, created: "2025-08-10" },
]

const mockFiles = [
  {
    id: "file_1",
    name: "Dell Demo Summary Report.pdf",
    type: "report",
    size: "2.4 MB",
    created: "2025-08-25T10:30:00Z",
    fromCall: "AI-WOP Demo — Dell Ops",
    status: "sent",
    folderId: null,
  },
  {
    id: "file_2",
    name: "Kyndryl Security Presentation.pptx",
    type: "presentation",
    size: "5.1 MB",
    created: "2025-08-24T14:15:00Z",
    fromCall: "Security Review — Kyndryl",
    status: "draft",
    folderId: null,
  },
  {
    id: "file_3",
    name: "Meeting Minutes - Acme Robotics.md",
    type: "minutes",
    size: "45 KB",
    created: "2025-08-23T16:45:00Z",
    fromCall: "Discovery Call — Acme Robotics",
    status: "sent",
    folderId: null,
  },
  {
    id: "file_4",
    name: "Compliance Letter Pack.zip",
    type: "compliance",
    size: "1.8 MB",
    created: "2025-08-22T11:20:00Z",
    fromCall: "Compliance Review — Globex",
    status: "sent",
    folderId: null,
  },
  {
    id: "file_5",
    name: "Six-Week Gantt Chart.xlsx",
    type: "gantt",
    size: "890 KB",
    created: "2025-08-21T09:10:00Z",
    fromCall: "Project Planning — Dell Ops",
    status: "draft",
    folderId: null,
  },
  {
    id: "file_6",
    name: "KPI Baseline Template.docx",
    type: "template",
    size: "1.2 MB",
    created: "2025-08-20T13:30:00Z",
    fromCall: "Pilot Readout — Kyndryl",
    status: "sent",
    folderId: null,
  },
]

const getFileIcon = (type: string) => {
  switch (type) {
    case "report":
      return <FileText className="h-8 w-8 text-gray-600" />
    case "presentation":
      return <Presentation className="h-8 w-8 text-gray-600" />
    case "minutes":
      return <FileText className="h-8 w-8 text-gray-600" />
    case "email":
      return <Mail className="h-8 w-8 text-gray-600" />
    case "gantt":
      return <FileSpreadsheet className="h-8 w-8 text-gray-600" />
    case "template":
      return <FileText className="h-8 w-8 text-gray-600" />
    case "compliance":
      return <FileImage className="h-8 w-8 text-gray-600" />
    default:
      return <FileText className="h-8 w-8 text-gray-600" />
  }
}

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [folders, setFolders] = useState(mockFolders)
  const [files, setFiles] = useState(mockFiles)

  const filteredFiles = files.filter(
    (file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()) && file.folderId === currentFolder,
  )

  const filteredFolders = folders.filter((folder) => folder.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const createFolder = () => {
    if (newFolderName.trim()) {
      const newFolder = {
        id: `folder_${Date.now()}`,
        name: newFolderName.trim(),
        fileCount: 0,
        created: new Date().toISOString().split("T")[0],
      }
      setFolders([...folders, newFolder])
      setNewFolderName("")
      setIsCreateFolderOpen(false)
    }
  }

  const currentFolderData = folders.find((f) => f.id === currentFolder)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <h1 className="text-xl font-semibold">Sally</h1>
              </div>
              <nav className="text-sm text-muted-foreground flex items-center gap-4">
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                <Link href="/calls" className="hover:text-foreground transition-colors">
                  Calls
                </Link>
                <Link href="/files" className="hover:text-foreground transition-colors">
                  Files
                </Link>
              </nav>
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

              <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gray-900 hover:bg-gray-800">
                    <Plus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && createFolder()}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                        Create Folder
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Back button when in folder */}
        {currentFolder && (
          <Button variant="ghost" onClick={() => setCurrentFolder(null)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Files
          </Button>
        )}

        {/* Folders (only show when not in a folder) */}
        {!currentFolder && filteredFolders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Folders</h2>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-2"
              }
            >
              {filteredFolders.map((folder) => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-gray-200"
                  onClick={() => setCurrentFolder(folder.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Folder className="h-8 w-8 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{folder.name}</h3>
                        <p className="text-sm text-gray-500">{folder.fileCount} files</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {currentFolder ? `Files in ${currentFolderData?.name}` : "All Files"}
            </h2>
            <span className="text-sm text-gray-500">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredFiles.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-500">
                  {searchQuery
                    ? "Try adjusting your search terms."
                    : "Generated files will appear here after your calls."}
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
                <Card key={file.id} className="hover:shadow-md transition-shadow border-gray-200">
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
                          <DropdownMenuItem>
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
                        <Badge variant={file.status === "sent" ? "default" : "secondary"} className="text-xs">
                          {file.status}
                        </Badge>
                        <span className="text-xs text-gray-500">{new Date(file.created).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">from: {file.fromCall}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
