"use client"

import { useState, useEffect, useRef } from "react"
import {
  Clock,
  Shield,
  Layers,
  History,
  CheckCircle,
  Play,
  X,
  Settings,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  AlertCircle,
  Loader2,
  Send,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/sidebar"
import { useTranscription } from "@/hooks/use-transcription"

// Mock data for the dashboard
const mockTranscriptionData = {
  isConnected: true,
  dualAudioActive: true,
  currentTime: "12:34:22 PM",
  lastMessage: {
    text: "Hi, thanks for taking the time today. Before we dive in, can I ask? How is Dell currently leveraging AI across its operations or services?",
    timestamp: "12:34:46 PM",
    speaker: "You"
  }
}

const sicodPanels = [
  {
    id: "decision",
    letter: "D",
    title: "Decision Criteria",
    color: "bg-blue-500",
    content: "What factors is the buyer using to evaluate potential solutions?",
    isVisible: true
  },
  {
    id: "impact", 
    letter: "I",
    title: "Impact",
    color: "bg-green-500",
    content: "What are the business or technical impacts if this problem is solved?",
    isVisible: true
  },
  {
    id: "situation",
    letter: "S", 
    title: "Situation",
    color: "bg-purple-500",
    content: "What is the current state of the buyer's tools, workflow, or operations?",
    isVisible: true
  },
  {
    id: "challenges",
    letter: "C",
    title: "Challenges", 
    color: "bg-red-500",
    content: "What pain points or limitations is the buyer currently facing?",
    isVisible: true
  },
  {
    id: "objectives",
    letter: "O",
    title: "Objectives",
    color: "bg-orange-500", 
    content: "What goals is the buyer trying to achieve in the next 3-12 months?",
    isVisible: true
  },
  {
    id: "empty",
    letter: "",
    title: "",
    color: "",
    content: "",
    isVisible: false
  }
]

export default function DashboardPage() {
  const [panels, setPanels] = useState(sicodPanels)
  const [showAllPanels, setShowAllPanels] = useState(true)
  const [isContentProtected, setIsContentProtected] = useState(false)
  const [isTranscriptionVisible, setIsTranscriptionVisible] = useState(true)
  const [showQuickAnswers, setShowQuickAnswers] = useState(false)
  const [userInput, setUserInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Transcription functionality
  const {
    isRecording,
    recordingTime,
    selectedScreenSource,
    screenSources,
    systemTranscribing,
    micTranscribing,
    systemTranscriptionError,
    transcriptionError,
    systemSpeakers,
    diarizationEnabled,
    allMessages,
    setSelectedScreenSource,
    setDiarizationEnabled,
    startUnifiedRecording,
    stopUnifiedRecording,
    getSpeakerColor,
  } = useTranscription()

  const togglePanelVisibility = (panelId: string) => {
    setPanels(prev => prev.map(panel => 
      panel.id === panelId ? { ...panel, isVisible: !panel.isVisible } : panel
    ))
  }

  const handleShowAll = () => {
    setPanels(prev => prev.map(panel => ({ ...panel, isVisible: true })))
    setShowAllPanels(true)
  }

  const toggleContentProtection = async () => {
    try {
      console.log('Toggle content protection clicked')
      console.log('Window object:', typeof window)
      console.log('ElectronAPI available:', !!window.electronAPI)
      
      // Check if we're in an Electron environment
      if (typeof window !== 'undefined' && window.electronAPI) {
        const newState = !isContentProtected
        console.log('Calling Electron API with state:', newState)
        const result = await window.electronAPI.setContentProtection(newState)
        console.log('Electron API result:', result)
        setIsContentProtected(newState)
      } else {
        // Fallback for web environment - just toggle the state
        const newState = !isContentProtected
        setIsContentProtected(newState)
        console.log('Content protection toggled (web fallback):', newState)
      }
    } catch (error) {
      console.error('Failed to toggle content protection:', error)
    }
  }

  const toggleTranscriptionVisibility = () => {
    setIsTranscriptionVisible(!isTranscriptionVisible)
  }

  const toggleQuickAnswers = () => {
    setShowQuickAnswers(!showQuickAnswers)
  }

  const handleQuickAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim()) {
      // TODO: Handle user input submission
      console.log("User input:", userInput)
      setUserInput("")
    }
  }

  const handleHideAll = () => {
    setPanels(prev => prev.map(panel => ({ ...panel, isVisible: false })))
    setShowAllPanels(false)
  }

  const visiblePanels = panels.filter(panel => panel.isVisible && panel.id !== "empty")

  // Helper functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <Sidebar>
      <div className="h-screen bg-white flex flex-col">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <h1 className="text-2xl font-bold">SALLY</h1>
                </div>
                <nav className="text-sm text-muted-foreground flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">connected</span>
                  </div>
                  
                  <div className="w-px h-4 bg-gray-300"></div>
                  
                  <button 
                    onClick={toggleContentProtection}
                    className={`flex items-center gap-2 transition-colors ${
                      isContentProtected 
                        ? 'text-green-600 hover:text-green-700' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Shield className={`h-4 w-4 ${isContentProtected ? 'text-green-600' : 'text-gray-600'}`} />
                    <span>
                      {isContentProtected ? 'Protected' : 'Protect'}
                    </span>
                  </button>
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <Layers className="h-4 w-4" />
                    <span>Overlay</span>
                  </div>
                </nav>
              </div>

              <div className="flex items-center gap-4">
                {/* Recording Status */}
                {isRecording && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-600 font-medium">Recording</span>
                    </div>
                    <div className="text-gray-500 font-mono">
                      {formatTime(recordingTime)}
                    </div>
                  </div>
                )}
                
                {/* Recording Controls */}
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <Button 
                      onClick={startUnifiedRecording}
                      disabled={!selectedScreenSource}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Call
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopUnifiedRecording}
                      variant="destructive"
                      className="px-4 py-2 text-sm font-medium"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Call
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - fills remaining space */}
        <div className="flex-1 flex flex-col px-6 py-6">
          <div className={`flex-1 grid grid-cols-1 gap-8 ${isTranscriptionVisible ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
            {/* Left Column - Live Transcription */}
            {isTranscriptionVisible && (
              <div className="lg:col-span-1">
                <Card className="h-full shadow-sm">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {showQuickAnswers ? (
                          <MessageSquare className="h-5 w-5 text-gray-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-600" />
                        )}
                        <CardTitle className="text-lg font-semibold">
                          {showQuickAnswers ? 'Quick Answers' : 'Live Transcription'}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleQuickAnswers}
                          className="hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Badge 
                            variant={showQuickAnswers ? "default" : "outline"} 
                            className={`text-xs px-3 py-1 cursor-pointer ${
                              showQuickAnswers 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'hover:bg-blue-50 hover:border-blue-300'
                            }`}
                          >
                            Quick Answers
                          </Badge>
                        </button>
                        <button
                          onClick={toggleTranscriptionVisibility}
                          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                          title="Toggle Live Transcription"
                        >
                          <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {showQuickAnswers ? (
                      /* Quick Answers Content */
                      <>
                        <div className="bg-gray-50 rounded-lg p-3 h-[300px] flex flex-col">
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <MessageSquare className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                              <p className="text-sm font-medium mb-1">Ready to help with your questions</p>
                              <p className="text-xs">Type your question below to get started</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* User Input */}
                        <form onSubmit={handleQuickAnswerSubmit} className="flex gap-2">
                          <Input
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Ask a question about the conversation..."
                            className="flex-1 h-9 text-sm"
                          />
                          <Button
                            type="submit"
                            disabled={!userInput.trim()}
                            size="sm"
                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </form>
                      </>
                    ) : (
                      /* Live Transcription Content */
                      <>
                        {/* Diarization Toggle */}
                        <div className="flex items-center justify-between">
                          <label className={`text-xs font-medium ${isRecording ? 'text-gray-400' : 'text-gray-600'}`}>
                            Speaker Diarization
                            {isRecording && <span className="text-xs text-gray-400 ml-1">(Locked during recording)</span>}
                          </label>
                          <Switch
                            checked={diarizationEnabled}
                            onCheckedChange={setDiarizationEnabled}
                            disabled={isRecording}
                            className="scale-75"
                          />
                        </div>
                        
                        {/* Speaker Legend */}
                        {diarizationEnabled && systemSpeakers.size > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(systemSpeakers.entries()).map(([speakerId, color]) => (
                              <Badge
                                key={speakerId}
                                className="text-xs px-1 py-0"
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
                        )}

                        {/* Transcription Messages */}
                        <div className="bg-gray-50 rounded-lg p-3 h-[300px] flex flex-col overflow-hidden">
                          {allMessages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <div className="text-center">
                                <Clock className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                                <p className="text-xs">Waiting for transcription...</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-hidden">
                              <ScrollArea className="h-full w-full">
                                <div className="space-y-2 pr-2 pb-2 min-h-full">
                                  {allMessages.map((message) => (
                                    <div
                                      key={message.id}
                                    className={`p-2 rounded-lg text-xs w-full break-words ${
                                      message.type === 'microphone'
                                        ? `bg-blue-500 text-white ${message.isAccumulating ? 'opacity-80' : ''}` // You always on the right in blue
                                        : `text-gray-900 ${message.isAccumulating ? 'opacity-80' : ''}` // Speakers always on the left
                                    }`}
                                      style={
                                        message.type === 'system' && diarizationEnabled && message.speakerId !== undefined
                                          ? { 
                                              backgroundColor: getSpeakerColor(message.speakerId),
                                              color: 'white'
                                            }
                                          : message.type === 'system'
                                          ? { backgroundColor: '#f3f4f6', color: '#374151' }
                                          : {}
                                      }
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1">
                                          {message.type === 'microphone' ? null : diarizationEnabled && message.speakerId !== undefined ? (
                                            <Badge
                                              className="text-xs px-1 py-0 bg-white text-gray-700 border-gray-300"
                                            >
                                              Speaker {message.speakerId + 1}
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-xs px-1 py-0 bg-gray-600 text-white">System</Badge>
                                          )}
                                        </div>
                                        <span className={`text-xs ${message.type === 'microphone' ? 'text-blue-100' : 'text-gray-500'}`}>
                                          {formatMessageTime(message.timestamp)}
                                        </span>
                                      </div>
                                      <div className="text-sm leading-relaxed break-words">{message.text}</div>
                                    </div>
                                  ))}
                                  <div ref={messagesEndRef} />
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>

                        {/* Error Messages */}
                        {(systemTranscriptionError || transcriptionError) && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                            <div className="flex items-center gap-1 text-red-700 mb-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="font-medium">Error</span>
                            </div>
                            <p className="text-red-600">
                              {systemTranscriptionError || transcriptionError}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Right Column - SICOD Panels */}
            <div className={isTranscriptionVisible ? "lg:col-span-2" : "lg:col-span-1"}>
              <div className="flex gap-8 h-full">
                {/* Left side - 3 panels */}
                <div className="flex-1 flex flex-col space-y-6">
                  {panels
                    .filter(p => ['decision', 'situation', 'objectives'].includes(p.id) && p.isVisible)
                    .map((panel) => (
                      <Card 
                        key={panel.id} 
                        className="flex-1 shadow-sm border border-gray-200"
                      >
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-3 text-base font-semibold">
                            <div className={`w-8 h-8 ${panel.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                              {panel.letter}
                            </div>
                            {panel.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {panel.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {/* Right side - 2 panels */}
                <div className="flex-1 flex flex-col space-y-6">
                  {panels
                    .filter(p => ['impact', 'challenges'].includes(p.id) && p.isVisible)
                    .map((panel) => (
                      <Card 
                        key={panel.id} 
                        className="flex-1 shadow-sm border border-gray-200"
                      >
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-3 text-base font-semibold">
                            <div className={`w-8 h-8 ${panel.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                              {panel.letter}
                            </div>
                            {panel.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {panel.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="mt-8 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-gray-700">Panel Controls:</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant={showAllPanels ? "default" : "outline"}
                  size="sm"
                  onClick={handleShowAll}
                  className={showAllPanels ? "bg-blue-600 text-white hover:bg-blue-700" : "border-gray-300"}
                >
                  Show All
                </Button>
                <Button 
                  variant={!showAllPanels ? "default" : "outline"}
                  size="sm"
                  onClick={handleHideAll}
                  className={!showAllPanels ? "bg-gray-600 text-white hover:bg-gray-700" : "border-gray-300"}
                >
                  Hide All
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Live Transcription Toggle */}
              <button
                onClick={toggleTranscriptionVisibility}
                className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors group"
              >
                <div className={`w-2 h-2 ${isTranscriptionVisible ? 'bg-green-500' : 'bg-gray-300'} rounded-full group-hover:scale-110 transition-transform`}></div>
                <span className={`text-sm ${isTranscriptionVisible ? 'text-gray-900 font-medium' : 'text-gray-500'} group-hover:text-gray-900 transition-colors`}>
                  Live Transcription
                </span>
              </button>
              
              {/* SICOD Panel Toggles */}
              {panels.filter(p => p.id !== "empty").map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => togglePanelVisibility(panel.id)}
                  className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors group"
                >
                  <div className={`w-2 h-2 ${panel.isVisible ? 'bg-green-500' : 'bg-gray-300'} rounded-full group-hover:scale-110 transition-transform`}></div>
                  <span className={`text-sm ${panel.isVisible ? 'text-gray-900 font-medium' : 'text-gray-500'} group-hover:text-gray-900 transition-colors`}>
                    {panel.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  )
}
