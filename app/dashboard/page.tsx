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

// Helper function to get DISCO panel data
const getDiscoPanelData = (discoData: any) => {
  // Helper function to check if value is meaningful (for fallback text)
  const hasMeaningfulData = (value: any) => {
    return value && 
           value !== "None yet" && 
           value !== "none yet" && 
           value !== "None" && 
           value !== "none" && 
           value.trim() !== "";
  };
  
  // Helper function to format content for display
  const formatContent = (value: any, fallback: string) => {
    if (!value) return fallback;
    
    // If it's "None yet" or similar, show it as is
    if (value === "None yet" || value === "none yet" || value === "None" || value === "none") {
      return value;
    }
    
    // If it's an array, join it with bullet points
    if (Array.isArray(value)) {
      return value.map(item => `• ${item}`).join('\n');
    }
    
    // If it's a string, check if it contains bullet points or needs formatting
    if (typeof value === 'string') {
      // If it already contains bullet points, return as is
      if (value.includes('•') || value.includes('-') || value.includes('*')) {
        return value;
      }
      
      // If it contains line breaks or multiple sentences, format as bullet points
      if (value.includes('\n') || (value.includes('. ') && value.split('. ').length > 2)) {
        const lines = value.split('\n').filter(line => line.trim());
        if (lines.length > 1) {
          return lines.map(line => `• ${line.trim()}`).join('\n');
        }
        
        // Split by sentences and format as bullet points
        const sentences = value.split('. ').filter(sentence => sentence.trim());
        if (sentences.length > 1) {
          return sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
        }
      }
      
      // If it's a single sentence, return as is
      return value;
    }
    
    // Otherwise return the value as is
    return value;
  };
  
  const panels = [
    {
      id: "decision",
      letter: "D",
      title: "Decision Criteria",
      color: "bg-blue-500",
      content: formatContent(
        discoData.Decision_Criteria, 
        "What factors is the buyer using to evaluate potential solutions?"
      ),
      isVisible: true
    },
    {
      id: "impact", 
      letter: "I",
      title: "Impact",
      color: "bg-green-500",
      content: formatContent(
        discoData.Impact,
        "What are the business or technical impacts if this problem is solved?"
      ),
      isVisible: true
    },
    {
      id: "situation",
      letter: "S", 
      title: "Situation",
      color: "bg-purple-500",
      content: formatContent(
        discoData.Situation,
        "What is the current state of the buyer's tools, workflow, or operations?"
      ),
      isVisible: true
    },
    {
      id: "challenges",
      letter: "C",
      title: "Challenges", 
      color: "bg-red-500",
      content: formatContent(
        discoData.Challenges,
        "What pain points or limitations is the buyer currently facing?"
      ),
      isVisible: true
    },
    {
      id: "objectives",
      letter: "O",
      title: "Objectives",
      color: "bg-orange-500", 
      content: formatContent(
        discoData.Objectives,
        "What goals is the buyer trying to achieve in the next 3-12 months?"
      ),
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
  ];
  
  return panels;
}

export default function DashboardPage() {
  const [showAllPanels, setShowAllPanels] = useState(true)
  const [isContentProtected, setIsContentProtected] = useState(false)
  const [isTranscriptionVisible, setIsTranscriptionVisible] = useState(true)
  const [showGenie, setShowGenie] = useState(false)
  const [userInput, setUserInput] = useState("")
  const [genieMessages, setGenieMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: string;
  }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const genieMessagesEndRef = useRef<HTMLDivElement>(null);
  const genieScrollAreaRef = useRef<HTMLDivElement>(null);
  
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
    discoData,
    isAnalyzingDisco,
    discoError,
    rawDiscoResponse,
    quickAnalysisData,
    isAnalyzingQuick,
    quickAnalysisError,
    setSelectedScreenSource,
    setDiarizationEnabled,
    setQuickAnalysisData,
    startUnifiedRecording,
    stopUnifiedRecording,
    getSpeakerColor,
    analyzeDisco,
    analyzeQuick,
    sendAiChat,
  } = useTranscription()

  // Get dynamic DISCO panel data
  const panels = getDiscoPanelData(discoData)
  

  const togglePanelVisibility = (panelId: string) => {
    // For now, we'll keep the panels always visible since they're dynamic
    // In the future, you could add panel visibility state if needed
  }

  const handleShowAll = () => {
    setShowAllPanels(true)
  }

  const toggleContentProtection = async () => {
    try {
      // Check if we're in an Electron environment
      if (typeof window !== 'undefined' && window.electronAPI) {
        const newState = !isContentProtected
        const result = await window.electronAPI.setContentProtection(newState)
        setIsContentProtected(newState)
      } else {
        // Fallback for web environment - just toggle the state
        const newState = !isContentProtected
        setIsContentProtected(newState)
      }
    } catch (error) {
      console.error('Failed to toggle content protection:', error)
    }
  }

  const toggleTranscriptionVisibility = () => {
    setIsTranscriptionVisible(!isTranscriptionVisible)
  }

  const toggleGenie = () => {
    setShowGenie(!showGenie)
  }

  const handleGenieSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim()) {
      const userMessage = userInput.trim();
      
      // Add user message to quickAnalysisData instead of genieMessages
      setQuickAnalysisData(prev => {
        const newContent = `## Your Question\n\n${userMessage}\n\n`;
        return prev + newContent;
      });
      
      // Send to AI and get response
      await sendAiChat(userMessage, (response) => {
        // Response will be added automatically by sendAiChat
      });
      
      setUserInput("")
    }
  }

  const handleManualDiscoAnalysis = async () => {
    const conversation = allMessages
      .filter(msg => msg.text.trim())
      .map(msg => `${msg.type === 'microphone' ? 'You' : `Speaker ${(msg.speakerId || 0) + 1}`}: ${msg.text}`)
      .join('\n');
    
    if (conversation.trim().length > 0) {
      // Trigger both DISCO analysis and Genie real-time help
      await analyzeDisco(conversation);
      await analyzeQuick(conversation);
    } else {
      alert('No conversation content to analyze. Please record some conversation first.');
    }
  }


  const handleHideAll = () => {
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
    if (scrollAreaRef.current) {
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [allMessages]);

  // Auto-scroll to bottom when new Genie messages arrive
  useEffect(() => {
    if (genieScrollAreaRef.current) {
      setTimeout(() => {
        if (genieScrollAreaRef.current) {
          genieScrollAreaRef.current.scrollTop = genieScrollAreaRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [genieMessages]);

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
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Mic className="h-3 w-3" />
                      <span>Audio</span>
                    </div>
                  </div>
                )}
                
                {/* DISCO Analysis Button */}
                {allMessages.length > 0 && (
                  <Button 
                    onClick={handleManualDiscoAnalysis}
                    disabled={isAnalyzingDisco}
                    variant="outline"
                    className="px-3 py-2 text-sm font-medium"
                  >
                    {isAnalyzingDisco ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Layers className="h-4 w-4 mr-2" />
                        Analyze DISCO
                      </>
                    )}
                  </Button>
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
                        {showGenie ? (
                          <MessageSquare className="h-5 w-5 text-gray-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-600" />
                        )}
                        <CardTitle className="text-lg font-semibold">
                          {showGenie ? 'Genie' : 'Live Transcription'}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-600">
                            Genie
                          </label>
                          <Switch
                            checked={showGenie}
                            onCheckedChange={toggleGenie}
                            className="scale-75"
                          />
                        </div>
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
                    {showGenie ? (
                      /* Genie Content */
                      <>
                        <div className="bg-gray-50 rounded-lg p-3 h-[300px] flex flex-col">
                          {isAnalyzingQuick ? (
                            <div className="flex-1 flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <Loader2 className="h-8 w-8 mx-auto mb-3 text-gray-400 animate-spin" />
                                <p className="text-sm font-medium mb-1">Analyzing conversation...</p>
                                <p className="text-xs">Getting real-time insights</p>
                              </div>
                            </div>
                          ) : quickAnalysisData ? (
                            <div className="flex-1 overflow-y-auto">
                              <div className="text-sm text-gray-700 leading-relaxed space-y-4">
                                {quickAnalysisData.split('\n\n').map((section, index) => {
                                  if (section.trim() === '') return null;
                                  
                                  if (section.startsWith('## ')) {
                                    const title = section.replace('## ', '');
                                    return (
                                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                                        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                                      </div>
                                    );
                                  }
                                  
                                  if (section.includes('•') || section.includes('-')) {
                                    const lines = section.split('\n').filter(line => line.trim());
                                    return (
                                      <div key={index} className="ml-4">
                                        <ul className="space-y-1">
                                          {lines.map((line, lineIndex) => (
                                            <li key={lineIndex} className="flex items-start">
                                              <span className="text-blue-500 mr-2">•</span>
                                              <span>{line.replace(/^[•\-]\s*/, '')}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                      <p className="whitespace-pre-wrap">{section}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : genieMessages.length > 0 ? (
                            <div className="flex-1 overflow-hidden">
                              <div ref={genieScrollAreaRef} className="h-full w-full overflow-y-auto">
                                <div className="space-y-3 pr-2 pb-2">
                                  {genieMessages.map((message) => (
                                    <div
                                      key={message.id}
                                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                      <div
                                        className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                          message.type === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white text-gray-700 border border-gray-200'
                                        }`}
                                      >
                                        <div className="text-xs opacity-70 mb-1">
                                          {message.timestamp}
                                        </div>
                                        <div className="whitespace-pre-wrap">
                                          {message.content}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <div ref={genieMessagesEndRef} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <MessageSquare className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                                <p className="text-sm font-medium mb-1">Ready to help with your questions</p>
                                <p className="text-xs">Type your question below to get started</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Error Messages */}
                        {quickAnalysisError && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                            <div className="flex items-center gap-1 text-red-700 mb-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="font-medium">Genie Error</span>
                            </div>
                            <p className="text-red-600">
                              {quickAnalysisError}
                            </p>
                          </div>
                        )}
                        
                        {/* User Input */}
                        <form onSubmit={handleGenieSubmit} className="flex gap-2">
                          <Input
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Ask a question about the conversation..."
                            className="flex-1 h-9 text-sm"
                            disabled={isAnalyzingQuick}
                          />
                          <Button
                            type="submit"
                            disabled={!userInput.trim() || isAnalyzingQuick}
                            size="sm"
                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {isAnalyzingQuick ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
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
                              <div ref={scrollAreaRef} className="h-full w-full overflow-y-auto">
                                <div className="space-y-3 pr-2 pb-2">
                                  {allMessages.map((message) => (
                                    <div
                                      key={message.id}
                                      className={`flex ${message.type === 'microphone' ? 'justify-end' : 'justify-start'}`}
                                    >
                                      <div
                                        className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                          message.type === 'microphone'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white text-gray-700 border border-gray-200'
                                        } ${message.isAccumulating ? 'opacity-80' : ''}`}
                                        style={
                                          message.type === 'system' && diarizationEnabled && message.speakerId !== undefined
                                            ? { 
                                                backgroundColor: getSpeakerColor(message.speakerId),
                                                color: 'white',
                                                border: 'none'
                                              }
                                            : {}
                                        }
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-1">
                                            {message.type === 'microphone' ? (
                                              <span className="text-xs opacity-70">You</span>
                                            ) : diarizationEnabled && message.speakerId !== undefined ? (
                                              <span className="text-xs opacity-70">
                                                Speaker {message.speakerId + 1}
                                              </span>
                                            ) : (
                                              <span className="text-xs opacity-70">System</span>
                                            )}
                                          </div>
                                          <span className="text-xs opacity-70">
                                            {formatMessageTime(message.timestamp)}
                                          </span>
                                        </div>
                                        <div className="whitespace-pre-wrap break-words">
                                          {message.text}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <div ref={messagesEndRef} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Error Messages */}
                        {(systemTranscriptionError || transcriptionError || discoError) && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                            <div className="flex items-center gap-1 text-red-700 mb-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="font-medium">Error</span>
                            </div>
                            <p className="text-red-600">
                              {systemTranscriptionError || transcriptionError || discoError}
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
                              {isAnalyzingDisco ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                panel.letter
                              )}
                            </div>
                            {panel.title}
                          </CardTitle>
                        </CardHeader>
                         <CardContent>
                           <div className={`text-sm leading-relaxed ${
                             panel.content === "None yet" || panel.content === "none yet" || panel.content === "None" || panel.content === "none"
                               ? "text-orange-600 font-medium italic"
                               : "text-gray-600"
                           }`}>
                             {panel.content.includes('\n') ? (
                               <div className="whitespace-pre-line space-y-1">
                                 {panel.content}
                               </div>
                             ) : (
                               <p>{panel.content}</p>
                             )}
                           </div>
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
                              {isAnalyzingDisco ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                panel.letter
                              )}
                            </div>
                            {panel.title}
                          </CardTitle>
                        </CardHeader>
                         <CardContent>
                           <div className={`text-sm leading-relaxed ${
                             panel.content === "None yet" || panel.content === "none yet" || panel.content === "None" || panel.content === "none"
                               ? "text-orange-600 font-medium italic"
                               : "text-gray-600"
                           }`}>
                             {panel.content.includes('\n') ? (
                               <div className="whitespace-pre-line space-y-1">
                                 {panel.content}
                               </div>
                             ) : (
                               <p>{panel.content}</p>
                             )}
                           </div>
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
