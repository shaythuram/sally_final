"use client"

import { useState, useEffect } from "react"
import {
  Mic,
  MicOff,
  Square,
  Play,
  Settings,
  Users,
  Clock,
  Monitor,
  Volume2,
  VolumeX,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useTranscription } from "@/hooks/use-transcription"
import { Sidebar } from "@/components/sidebar"

export default function TranscriptionPage() {
  const {
    // State
    isRecording,
    recordingTime,
    systemPreview,
    selectedScreenSource,
    screenSources,
    systemTranscribing,
    micTranscribing,
    systemTranscriptionError,
    transcriptionError,
    systemSpeakers,
    diarizationEnabled,
    allMessages,
    
    // Refs
    systemVideoRef,
    
    // Actions
    setSelectedScreenSource,
    setDiarizationEnabled,
    startUnifiedRecording,
    stopUnifiedRecording,
    getSpeakerColor,
  } = useTranscription();

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Sidebar>
      <div className="h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <h1 className="text-xl font-semibold">Sally</h1>
                </div>
                <div className="text-sm text-muted-foreground">
                  Live Transcription
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-muted-foreground">
                    {isRecording ? 'Recording' : 'Stopped'}
                  </span>
                </div>
                {isRecording && (
                  <div className="text-lg font-mono font-semibold text-gray-900">
                    {formatTime(recordingTime)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-6 flex-1 flex flex-col">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-6 flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold">Live Transcription</h1>
              <p className="text-muted-foreground">Connect to ngrok WebSocket and display real-time transcription</p>
            </div>
          </div>

          {/* Controls Section */}
          <Card className="mb-6 flex-shrink-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Transcription Controls
              </CardTitle>
              <CardDescription>
                Configure your connection settings and start live transcription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Screen Source Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Screen/Window Source</label>
                <Select
                  value={selectedScreenSource}
                  onValueChange={setSelectedScreenSource}
                  disabled={isRecording}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose screen/window..." />
                  </SelectTrigger>
                  <SelectContent>
                    {screenSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          {source.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Diarization Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Speaker Diarization</label>
                  <p className="text-xs text-muted-foreground">
                    Identify different speakers in system audio
                  </p>
                </div>
                <Switch
                  checked={diarizationEnabled}
                  onCheckedChange={setDiarizationEnabled}
                  disabled={isRecording}
                />
              </div>

              {/* Main Control Buttons */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={startUnifiedRecording}
                  disabled={isRecording || !selectedScreenSource}
                  size="lg"
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Transcription
                </Button>
                
                <Button
                  onClick={stopUnifiedRecording}
                  disabled={!isRecording}
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Transcription
                </Button>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {micTranscribing ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : transcriptionError ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <span className="text-sm font-medium">Microphone</span>
                  </div>
                  <Badge variant={micTranscribing ? "default" : "secondary"}>
                    {micTranscribing ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {systemTranscribing ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : systemTranscriptionError ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <span className="text-sm font-medium">System Audio</span>
                  </div>
                  <Badge variant={systemTranscribing ? "default" : "secondary"}>
                    {systemTranscribing ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* Error Messages */}
              {(systemTranscriptionError || transcriptionError) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Error</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    {systemTranscriptionError || transcriptionError}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Speaker Legend */}
          {diarizationEnabled && systemSpeakers.size > 0 && (
            <Card className="mb-6 flex-shrink-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Detected Speakers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Array.from(systemSpeakers.entries()).map(([speakerId, color]) => (
                    <Badge
                      key={speakerId}
                      className="text-xs"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                        borderColor: color,
                      }}
                    >
                      Speaker {speakerId + 1}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


          {/* Live Transcription Chat */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Live Transcription
              </CardTitle>
              <CardDescription>
                Real-time transcription from ngrok WebSocket connection
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 w-full">
                <div className="space-y-3 pr-4">
                  {allMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <VolumeX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No transcription yet. Start recording to connect to ngrok WebSocket.</p>
                    </div>
                  ) : (
                    allMessages.map((message) => (
                      <div
                        key={message.id}
                        className="p-3 rounded-lg max-w-[80%] bg-gray-100 text-gray-900 mr-auto"
                        style={
                          message.type === 'system' && diarizationEnabled && message.speakerId !== undefined
                            ? { borderLeft: `4px solid ${getSpeakerColor(message.speakerId)}` }
                            : {}
                        }
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{message.speakerLabel || 'Speaker'}</Badge>
                            {!message.isFinal && (
                              <Badge variant="outline" className="text-xs">
                                Live
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs opacity-70">
                            {formatMessageTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{message.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Video Preview (when recording) */}
        {systemPreview && (
          <div className="fixed top-4 right-4 w-80 h-48 bg-black rounded-lg overflow-hidden shadow-lg z-50">
            <video
              ref={systemVideoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
    </Sidebar>
  )
}
