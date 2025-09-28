"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  Plus,
  FileText,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sidebar } from "@/components/sidebar"
import { useTranscription } from "@/hooks/use-transcription"
import { CallManager } from "@/lib/call-management"
import { supabase } from "@/lib/supabase"
import { UpcomingCallsManager, UpcomingCall } from "@/lib/upcoming-calls-manager"
import { DocumentUploadService } from "@/lib/document-upload-service"


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
  const router = useRouter()
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
    currentCall,
    transcriptEntries,
    startCall,
    stopCall,
    addTranscriptEntry,
    lastUploadedAudioPath,
    lastRecordingBlob,
    getLocalRecordingBlob,
  } = useTranscription()

  // Get dynamic DISCO panel data
  const panels = getDiscoPanelData(discoData)
  
  // User state for database operations
  const [user, setUser] = useState<any>(null)
  const [upcomingCalls, setUpcomingCalls] = useState<UpcomingCall[]>([])

  // Start Call modal state
  const [isStartCallModalOpen, setIsStartCallModalOpen] = useState(false)
  const [selectedUpcomingId, setSelectedUpcomingId] = useState<string | null>(null)
  
  // Create Call modal state (from calls page)
  const [isCreateCallOpen, setIsCreateCallOpen] = useState(false)
  const [newCall, setNewCall] = useState({
    title: "",
    company: "",
    date: "",
    time: "",
    attendees: "",
    description: "",
    agenda: [] as string[],
  })
  const [callLink, setCallLink] = useState("")
  const [emailAttendees, setEmailAttendees] = useState<string[]>([])
  const [currentEmailInput, setCurrentEmailInput] = useState("")
  const [agendaInput, setAgendaInput] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const createCallContentRef = useRef<HTMLDivElement | null>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)
  
  // Initialize user
  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        // Load user's upcoming calls for Start Call modal
        const calls = await UpcomingCallsManager.getUserUpcomingCalls(user.id)
        setUpcomingCalls(calls)
      }
    }
    initializeUser()
  }, [])

  // Auto-start call if navigated with callId from Upcoming Calls
  const searchParams = useSearchParams()
  const hasAutoStartedRef = useRef(false)
  // router already declared above
  useEffect(() => {
    const maybeStartCall = async () => {
      try {
        const callId = searchParams.get('callId')
        if (!callId) return
        if (!user) return
        if (hasAutoStartedRef.current) {
          console.log(' Already auto-started, skipping')
          return // Prevent multiple auto-starts
        }

        // Set guard immediately to prevent race conditions
        hasAutoStartedRef.current = true
        console.log('🔒 Set guard to prevent duplicate calls')

        // Fetch upcoming call details
        const upcoming = await (await import('@/lib/upcoming-calls-manager')).UpcomingCallsManager.getUpcomingCallById(callId)
        if (!upcoming) return

        // Start live call with details from upcoming call
        const callData = {
          title: upcoming.title,
          company: upcoming.company,
          meetingAgenda: Array.isArray(upcoming.agenda) ? upcoming.agenda : [],
          meetingDescription: upcoming.description || '',
          attendeeEmails: Array.isArray(upcoming.attendees) ? upcoming.attendees : [],
          transcriptAdminEmail: user.email || '',
          callLink: (upcoming as any).call_link || undefined,
          assistantId: upcoming.assistant_id,
          threadId: upcoming.thread_id,
        }

        console.log('🎯 STARTING CALL FROM UPCOMING - Call ID:', callId);
        console.log('📋 Upcoming Call Details:', {
          call_id: callId,
          title: upcoming.title,
          company: upcoming.company,
          assistant_id: upcoming.assistant_id,
          thread_id: upcoming.thread_id
        });

        const ok = await startCall(callData, user.id, { sourceUpcomingCallId: callId })
        if (ok) {
          console.log('✅ Successfully started call from upcoming call ID:', callId);
          
          // Log any uploaded files from the upcoming call
          console.log('📁 ===== UPLOADED FILES FROM UPCOMING CALL =====');
          console.log('📞 Call ID:', callId);
          if (upcoming.documents && Array.isArray(upcoming.documents) && upcoming.documents.length > 0) {
            console.log('📄 Document URLs:');
            upcoming.documents.forEach((doc: any) => {
              const docUrl = `https://your-supabase-project.supabase.co/storage/v1/object/public/call-documents/${doc.path}`;
              console.log(`   - ${docUrl}`);
            });
          } else {
            console.log('📄 Documents: No documents in this upcoming call');
          }
          
          try { await (await import('@/lib/upcoming-calls-manager')).UpcomingCallsManager.deleteUpcomingCall(callId) } catch {}
          try {
            const calls = await (await import('@/lib/upcoming-calls-manager')).UpcomingCallsManager.getUserUpcomingCalls(user.id)
            setUpcomingCalls(calls)
          } catch {}
        } else {
          console.error('❌ Failed to start call from upcoming call ID:', callId);
        }
      } catch (e) {
        console.error('Failed to auto-start call from upcoming call:', e)
      }
    }
    maybeStartCall()
  }, [searchParams, user])

  // Enhanced start call handler that creates a database record
  const handleStartCall = async () => {
    if (!user) {
      console.error('No user found')
      return
    }

    try {
      // Open modal to select or create a call
      setIsStartCallModalOpen(true)
    } catch (error) {
      console.error('Error starting call:', error)
    }
  }

  // Enhanced stop call handler that saves all data
  const handleStopCall = async () => {
    try {
      console.log('🛑 handleStopCall called - starting stop call process')
      // Stop call and save all data
      const success = await stopCall()
      console.log('🛑 stopCall returned:', success)
      if (success) {
        console.log('✅ Call stopped and data saved successfully')
        console.log('🪟 Setting post-call modal to open...')
        setIsPostCallModalOpen(true)
        console.log('🪟 Post-call modal state set to true')
      } else {
        console.error('❌ Failed to stop call properly - stopCall returned false')
      }
    } catch (error) {
      console.error('❌ Error stopping call:', error)
    }
  }

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

  // Post-call modal state and actions
  const [isPostCallModalOpen, setIsPostCallModalOpen] = useState(false)
  const downloadLastRecording = async () => {
    try {
      // Prefer local in-memory blob recorded during this session
      const localBlob = lastRecordingBlob || getLocalRecordingBlob()
      if (localBlob) {
        const url = URL.createObjectURL(localBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'recording.webm'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }

      // Fallback: use storage path if blob not available
      let path = lastUploadedAudioPath
      if (!path && user) {
        const { data, error } = await supabase
          .from('calls')
          .select('voice_recording_path')
          .eq('owner_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (!error && data?.voice_recording_path) {
          path = data.voice_recording_path as string
        }
      }
      if (!path) {
        console.error('No recording path available to download')
        return
      }
      const { data, error } = await supabase.storage
        .from('call-recordings')
        .createSignedUrl(path, 300)
      if (error || !data?.signedUrl) {
        console.error('Failed to create signed URL:', error)
        return
      }
      const response = await fetch(data.signedUrl)
      if (!response.ok) {
        console.error('Failed to fetch recording via signed URL:', response.status)
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (path.split('/').pop() || 'recording.webm')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Failed to download recording:', e)
    }
  }

  // Confirm starting selected upcoming call
  const confirmStartFromUpcoming = async () => {
    if (!user || !selectedUpcomingId) return
    try {
      const upcoming = await UpcomingCallsManager.getUpcomingCallById(selectedUpcomingId)
      if (!upcoming) return
      const callData = {
        title: upcoming.title,
        company: upcoming.company,
        meetingAgenda: Array.isArray(upcoming.agenda) ? upcoming.agenda : [],
        meetingDescription: upcoming.description || '',
        attendeeEmails: Array.isArray(upcoming.attendees) ? upcoming.attendees : [],
        transcriptAdminEmail: user.email || '',
        callLink: (upcoming as any).call_link || undefined,
        assistantId: upcoming.assistant_id,
        threadId: upcoming.thread_id,
      }
      console.log('🎯 STARTING SELECTED UPCOMING CALL - Call ID:', selectedUpcomingId);
      console.log('📋 Selected Call Details:', {
        call_id: selectedUpcomingId,
        title: upcoming.title,
        company: upcoming.company,
        assistant_id: upcoming.assistant_id,
        thread_id: upcoming.thread_id
      });

      const ok = await startCall(callData, user.id, { sourceUpcomingCallId: selectedUpcomingId })
      if (ok) {
        console.log('✅ Successfully started selected upcoming call ID:', selectedUpcomingId);
        
        // Log any uploaded files from the upcoming call
        console.log('📁 ===== UPLOADED FILES FROM UPCOMING CALL =====');
        console.log('📞 Call ID:', selectedUpcomingId);
        console.log('Description', upcoming.description);
        if (upcoming.documents && Array.isArray(upcoming.documents) && upcoming.documents.length > 0) {
          console.log('📄 Document URLs:');
          upcoming.documents.forEach((doc: any) => {
            const docUrl = `https://your-supabase-project.supabase.co/storage/v1/object/public/call-documents/${doc.path}`;
            console.log(`   - ${docUrl}`);
          });
        } else {
          console.log('📄 Documents: No documents in this upcoming call');
        }
        
        setIsStartCallModalOpen(false)
        try { await UpcomingCallsManager.deleteUpcomingCall(selectedUpcomingId) } catch {}
        try { const calls = await UpcomingCallsManager.getUserUpcomingCalls(user.id); setUpcomingCalls(calls) } catch {}
      } else {
        console.error('❌ Failed to start selected upcoming call ID:', selectedUpcomingId);
      }
    } catch (e) {
      console.error('Failed to start from upcoming call:', e)
    }
  }


  // Create Call modal handlers (from calls page)
  const handleCloseCreateCallModal = () => {
    setIsCreateCallOpen(false)
    setNewCall({ title: "", company: "", date: "", time: "", attendees: "", description: "", agenda: [] })
    setEmailAttendees([])
    setCurrentEmailInput("")
    setUploadedFiles([])
    setAgendaInput("")
    setIsLoading(false)
    setShowScrollHint(false)
    setCallLink("")
    
    // Refresh upcoming calls list
    if (user) {
      UpcomingCallsManager.getUserUpcomingCalls(user.id).then(calls => {
        setUpcomingCalls(calls)
      }).catch(console.error)
    }
  }

  const handleCreateCall = async () => {
    if (!newCall.title || !newCall.company || !newCall.date || !newCall.time) {
      alert("Please fill in all required fields")
      return
    }

    if (!user) {
      console.error('No user found')
      return
    }

    setIsLoading(true)

    try {
      // Create the call in the database
      const callData = {
        title: newCall.title,
        company: newCall.company,
        date: newCall.date,
        time: newCall.time,
        attendees: emailAttendees,
        description: newCall.description,
        agenda: newCall.agenda,
        callLink: callLink,
      }

      const createdCall = await UpcomingCallsManager.createUpcomingCall(user.id, callData)
      console.log('Created upcoming call:', createdCall)

      // Upload documents if any
      if (uploadedFiles.length > 0) {
        const uploadedDocuments = await DocumentUploadService.uploadDocuments(
          uploadedFiles, 
          user.id, 
          createdCall.call_id
        )
        console.log('Uploaded documents:', uploadedDocuments)
        
        // Update the upcoming call with document references
        await UpcomingCallsManager.updateUpcomingCall(createdCall.call_id, {
          documents: uploadedDocuments
        })
      }

      // Create AI assistant if files were uploaded
      if (uploadedFiles.length > 0) {
        try {
          const { createAssistantWithFiles } = await import('@/lib/call-management')
          
          // Use the original uploaded files directly instead of downloading from URLs
          if (uploadedFiles.length > 0) {
            const assistantName = `Assistant for ${callData.title} - ${callData.company}`;
            const instructions = callData.description
              ? `You are a helpful assistant for this call about: ${callData.description}. Use the uploaded documents and your knowledge to answer questions and assist with any call-related queries.`
              : `You are a helpful assistant for this call. Use the uploaded documents and your knowledge to answer questions and assist with any call-related queries.`;
            
            const result = await createAssistantWithFiles(uploadedFiles, assistantName, instructions);
            
            if (result.error) {
              console.error('Failed to create assistant:', result.error);
            } else {
              console.log('🤖 Assistant created successfully');
              console.log('🧵 Thread ID:', result.thread_id || 'No thread created');
              console.log('📁 Vector Store ID:', result.vectorStore_id);
              console.log('📄 Files uploaded:', result.uploadedFiles);
              
              // Store the assistant_id and thread_id in the upcoming call record
              await UpcomingCallsManager.updateUpcomingCall(createdCall.call_id, {
                assistant_id: result.assistant_id,
                thread_id: result.thread_id
              });
            }
          }
        } catch (assistantError) {
          console.error('Error creating assistant:', assistantError);
        }
      }

      // Refresh upcoming calls list
      const updatedCalls = await UpcomingCallsManager.getUserUpcomingCalls(user.id)
      setUpcomingCalls(updatedCalls)

      handleCloseCreateCallModal()
      // Show success message
      console.log("Call created successfully!")
      
    } catch (error) {
      console.error('Error creating call:', error)
      alert('Failed to create call. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Email attendees helpers for Create Call modal
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailInputChange = (value: string) => {
    setCurrentEmailInput(value)
    const pieces = value.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
    const validNew = pieces.filter((p) => isValidEmail(p) && !emailAttendees.includes(p))
    if (validNew.length > 0) {
      setEmailAttendees([...emailAttendees, ...validNew])
      setCurrentEmailInput("")
    }
  }

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const email = currentEmailInput.trim()
      if (email && isValidEmail(email) && !emailAttendees.includes(email)) {
        setEmailAttendees([...emailAttendees, email])
        setCurrentEmailInput("")
      }
    }
    if (e.key === 'Backspace' && currentEmailInput === '' && emailAttendees.length > 0) {
      // remove last tag on backspace when input empty
      setEmailAttendees(emailAttendees.slice(0, -1))
    }
  }

  const removeEmailTag = (emailToRemove: string) => {
    setEmailAttendees(emailAttendees.filter((e) => e !== emailToRemove))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  // Create Call modal scroll hint
  useEffect(() => {
    if (!isCreateCallOpen) return
    const el = createCallContentRef.current
    if (!el) return
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      setShowScrollHint(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 10)
    }
    update()
    el.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [isCreateCallOpen])

  const scrollCreateCallDown = () => {
    if (createCallContentRef.current) {
      createCallContentRef.current.scrollTop = createCallContentRef.current.scrollHeight
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
      .map(msg => `${msg.username}: ${msg.text}`)
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
                    // Show Create Call button if no upcoming calls, otherwise show Start Call button
                    upcomingCalls.length === 0 ? (
                      <Button 
                        onClick={() => setIsCreateCallOpen(true)}
                        disabled={!user}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Call
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleStartCall}
                        disabled={!selectedScreenSource || !user}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Call
                      </Button>
                    )
                  ) : (
                    <Button 
                      onClick={handleStopCall}
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
          {/* Start Call Modal */}
          <Dialog open={isStartCallModalOpen} onOpenChange={setIsStartCallModalOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Start a Call</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {upcomingCalls.length === 0 && (
                  <div className="text-sm text-gray-500">No upcoming calls found.</div>
                )}
                {upcomingCalls.map((c) => (
                  <button
                    key={c.call_id}
                    onClick={() => setSelectedUpcomingId(c.call_id)}
                    className={`w-full text-left p-3 rounded border ${selectedUpcomingId === c.call_id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="font-medium text-gray-900">{c.title}</div>
                    <div className="text-xs text-gray-600">{c.company} • {c.call_date} {c.call_time}</div>
                    {Array.isArray(c.agenda) && c.agenda.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500 truncate">Agenda: {c.agenda.join(', ')}</div>
                    )}
                  </button>
                ))}
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={confirmStartFromUpcoming} disabled={!selectedUpcomingId} className="w-full">Start Selected Call</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Post Call Modal */}
          {console.log('🪟 Modal render check - isPostCallModalOpen:', isPostCallModalOpen)}
          <Dialog open={isPostCallModalOpen} onOpenChange={setIsPostCallModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Call Ended</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">What would you like to do next?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button onClick={downloadLastRecording} variant="outline">Download Recording</Button>
                  <Button onClick={() => { setIsPostCallModalOpen(false); router.push('/?view=recent') }}>Go to Recent Calls</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Call Modal */}
          {isCreateCallOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleCloseCreateCallModal} />

              <div className="relative bg-white rounded-lg shadow-2xl w-[500px] max-w-[90vw] max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Create New Call</h2>
                  <Button variant="ghost" size="sm" onClick={handleCloseCreateCallModal}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div ref={createCallContentRef} className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Call Title *</label>
                    <Input
                      value={newCall.title}
                      onChange={(e) => setNewCall({ ...newCall, title: e.target.value })}
                      placeholder="Enter call title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
                    <Input
                      value={newCall.company}
                      onChange={(e) => setNewCall({ ...newCall, company: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                      <Input
                        type="date"
                        value={newCall.date}
                        onChange={(e) => setNewCall({ ...newCall, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                      <Input
                        type="time"
                        value={newCall.time}
                        onChange={(e) => setNewCall({ ...newCall, time: e.target.value })}
                      />
                    </div>
                  </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Call Link</label>
                <Input
                  value={callLink}
                  onChange={(e) => setCallLink(e.target.value)}
                  placeholder="Paste meeting link (Zoom, Meet, Teams, etc.)"
                />
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attendees</label>
                    <div className="border border-gray-300 rounded-md p-2 min-h-[42px] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {emailAttendees.map((email) => (
                          <div key={email} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-md">
                            <span>{email}</span>
                            <button
                              type="button"
                              onClick={() => removeEmailTag(email)}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                              aria-label={`Remove ${email}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    <Input
                        value={currentEmailInput}
                        onChange={(e) => handleEmailInputChange(e.target.value)}
                        onKeyDown={handleEmailInputKeyDown}
                        placeholder={emailAttendees.length === 0 ? "Enter attendee emails (comma separated)" : "Add another email and press comma"}
                        className="border-0 p-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                    {currentEmailInput && !isValidEmail(currentEmailInput) && currentEmailInput.includes('@') === false && (
                      <p className="mt-1 text-sm text-red-600">Email must include @</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <Textarea
                      value={newCall.description}
                      onChange={(e) => setNewCall({ ...newCall, description: e.target.value })}
                      placeholder="Enter call description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Agenda</label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={agendaInput}
                          onChange={(e) => setAgendaInput(e.target.value)}
                          placeholder="Enter agenda item"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && agendaInput.trim()) {
                              setNewCall({ ...newCall, agenda: [...newCall.agenda, agendaInput.trim()] })
                              setAgendaInput("")
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (agendaInput.trim()) {
                              setNewCall({ ...newCall, agenda: [...newCall.agenda, agendaInput.trim()] })
                              setAgendaInput("")
                            }
                          }}
                          disabled={!agendaInput.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {newCall.agenda.length > 0 && (
                        <div className="space-y-1">
                          {newCall.agenda.map((item, index) => (
                            <div key={`new-agenda-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                              <span className="text-sm text-gray-700">{index + 1}. {item}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setNewCall({
                                    ...newCall,
                                    agenda: newCall.agenda.filter((_, i) => i !== index)
                                  })
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents & Emails</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.eml,.msg,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center justify-center text-center"
                      >
                        <FileText className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Click to upload documents and emails</span>
                        <span className="text-xs text-gray-500 mt-1">PDF, DOC, PPT, EML files supported</span>
                      </label>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                        {uploadedFiles.map((file, index) => (
                          <div key={`uploaded-file-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-700">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                  <Button variant="outline" onClick={handleCloseCreateCallModal}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCall} disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </div>
                    ) : (
                      "Create Call"
                    )}
                  </Button>
                </div>

                {showScrollHint && (
                  <button
                    type="button"
                    onClick={scrollCreateCallDown}
                    className="absolute bottom-20 right-6 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition-colors"
                    aria-label="Scroll down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className={`flex-1 grid grid-cols-1 gap-8 ${isTranscriptionVisible ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
            {/* Left Column - Live Transcription */}
            {isTranscriptionVisible && (
              <div className="lg:col-span-1">
                <Card className="h-full shadow-sm flex flex-col">
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
                  <CardContent className="space-y-4 flex-1 flex flex-col">
                    {showGenie ? (
                      /* Genie Content */
                      <>
                        <div className="bg-gray-50 rounded-lg p-3 flex-1 min-h-[300px] flex flex-col">
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
                        <div className="bg-gray-50 rounded-lg p-3 flex-1 min-h-[300px] flex flex-col overflow-hidden">
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
                                      className="flex justify-start"
                                    >
                                      <div
                                        className={`max-w-[80%] p-3 rounded-lg text-sm bg-white text-gray-700 border border-gray-200 ${message.isAccumulating ? 'opacity-80' : ''}`}
                                      >
                                        <div className="flex items-center gap-1 mb-1">
                                          <span className="text-xs opacity-70">
                                            {message.username || 'Speaker'}
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

                        {/* Screen Source Status */}
                        {screenSources.length > 0 && selectedScreenSource && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                            <div className="flex items-center gap-1 text-green-700 mb-1">
                              <CheckCircle className="h-3 w-3" />
                              <span className="font-medium">Ready to Record</span>
                            </div>
                            <p className="text-green-600">
                              Screen source automatically selected
                            </p>
                          </div>
                        )}

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
