'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CallManager } from '@/lib/call-management'
import { TranscriptEntry, TranscriptPermissions } from '@/lib/supabase'

interface TranscriptEditorProps {
  callId: string
  userEmail: string
  initialTranscript: any
}

export function TranscriptEditor({ callId, userEmail, initialTranscript }: TranscriptEditorProps) {
  const [transcript, setTranscript] = useState<any>(initialTranscript)
  const [canEdit, setCanEdit] = useState(false)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [newEditorEmail, setNewEditorEmail] = useState('')

  useEffect(() => {
    checkEditPermissions()
  }, [])

  const checkEditPermissions = async () => {
    const hasPermission = await CallManager.canEditTranscript(callId, userEmail)
    setCanEdit(hasPermission)
  }

  const handleEditEntry = (entry: TranscriptEntry) => {
    setEditingEntry(entry.id)
    setEditText(entry.text)
  }

  const handleSaveEdit = async (entryId: string) => {
    const success = await CallManager.updateTranscriptEntry(callId, entryId, editText, userEmail)
    if (success) {
      // Update local state
      setTranscript((prev: any) => ({
        ...prev,
        entries: prev.entries.map((entry: TranscriptEntry) =>
          entry.id === entryId
            ? { ...entry, text: editText, edited_by: userEmail, edited_at: new Date().toISOString(), is_edited: true }
            : entry
        ),
        updated_at: new Date().toISOString()
      }))
      setEditingEntry(null)
      setEditText('')
    }
  }

  const handleAddEditor = async () => {
    if (!newEditorEmail) return

    const updatedPermissions: TranscriptPermissions = {
      ...transcript.permissions,
      editors: [...transcript.permissions.editors, newEditorEmail]
    }

    const success = await CallManager.updateTranscriptPermissions(callId, updatedPermissions)
    if (success) {
      setTranscript((prev: any) => ({
        ...prev,
        permissions: updatedPermissions
      }))
      setNewEditorEmail('')
    }
  }

  const handleRemoveEditor = async (emailToRemove: string) => {
    const updatedPermissions: TranscriptPermissions = {
      ...transcript.permissions,
      editors: transcript.permissions.editors.filter((email: string) => email !== emailToRemove)
    }

    const success = await CallManager.updateTranscriptPermissions(callId, updatedPermissions)
    if (success) {
      setTranscript((prev: any) => ({
        ...prev,
        permissions: updatedPermissions
      }))
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transcript Editor</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Admin: {transcript.permissions.admin}</Badge>
          <Badge variant="secondary">Editors: {transcript.permissions.editors.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Permission Management */}
        {canEdit && transcript.permissions.admin === userEmail && (
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Manage Edit Permissions</h3>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Add editor email"
                value={newEditorEmail}
                onChange={(e) => setNewEditorEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddEditor} disabled={!newEditorEmail}>
                Add Editor
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Current Editors:</h4>
              {transcript.permissions.editors.map((email: string) => (
                <div key={email} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{email}</span>
                  {email !== transcript.permissions.admin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveEditor(email)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript Entries */}
        <div className="space-y-4">
          <h3 className="font-semibold">Transcript Entries</h3>
          {transcript.entries.map((entry: TranscriptEntry) => (
            <div key={entry.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <Badge variant="outline">{entry.speaker}</Badge>
                  <span className="text-sm text-gray-500 ml-2">{entry.timestamp}</span>
                </div>
                {entry.is_edited && (
                  <Badge variant="secondary">Edited by {entry.edited_by}</Badge>
                )}
              </div>
              
              {editingEntry === entry.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(entry.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingEntry(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-2">{entry.text}</p>
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => handleEditEntry(entry)}>
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
