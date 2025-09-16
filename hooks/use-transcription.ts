import { useState, useRef, useCallback, useEffect } from 'react';
import { CallManager } from '@/lib/call-management';
import { AudioUploadService } from '@/lib/audio-upload';
import { TranscriptEntry } from '@/lib/supabase';

export interface TranscriptionMessage {
  id: string;
  type: 'microphone' | 'system';
  text: string;
  timestamp: Date;
  isFinal: boolean;
  speakerId?: number;
  speakerLabel?: string;
  isAccumulating?: boolean;
}

export interface DiscoData {
  Decision_Criteria?: string | string[];
  Impact?: string | string[];
  Situation?: string | string[];
  Challenges?: string | string[];
  Objectives?: string | string[];
}

export interface TranscriptionState {
  isRecording: boolean;
  recordingTime: number;
  messages: TranscriptionMessage[];
  systemTranscribing: boolean;
  micTranscribing: boolean;
  systemTranscriptionError: string;
  transcriptionError: string;
  systemSpeakers: Map<number, string>;
  diarizationEnabled: boolean;
}

export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

export const useTranscription = () => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [systemPreview, setSystemPreview] = useState(false);
  const [selectedScreenSource, setSelectedScreenSource] = useState('');
  const [screenSources, setScreenSources] = useState<ScreenSource[]>([]);

  // Transcription state
  const [systemTranscribing, setSystemTranscribing] = useState(false);
  const [micTranscribing, setMicTranscribing] = useState(false);
  const [systemTranscriptionError, setSystemTranscriptionError] = useState('');
  const [transcriptionError, setTranscriptionError] = useState('');
  const [systemSpeakers, setSystemSpeakers] = useState<Map<number, string>>(new Map());
  const [diarizationEnabled, setDiarizationEnabled] = useState(true);

  // Messages
  const [allMessages, setAllMessages] = useState<TranscriptionMessage[]>([]);
  
  // DISCO Analysis state
  const [discoData, setDiscoData] = useState<DiscoData>({});
  const [isAnalyzingDisco, setIsAnalyzingDisco] = useState(false);
  const [discoError, setDiscoError] = useState('');
  const [rawDiscoResponse, setRawDiscoResponse] = useState<any>(null);
  
  // Genie Quick Analysis state
  const [quickAnalysisData, setQuickAnalysisData] = useState<string>('');
  const [isAnalyzingQuick, setIsAnalyzingQuick] = useState(false);
  const [quickAnalysisError, setQuickAnalysisError] = useState('');

  // Refs
  const systemVideoRef = useRef<HTMLVideoElement>(null);
  const systemMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const systemWsRef = useRef<WebSocket | null>(null);
  const micWsRef = useRef<WebSocket | null>(null);
  const systemAudioContextRef = useRef<AudioContext | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const systemProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const systemMicrophoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micMicrophoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const systemBurstTimerRef = useRef<NodeJS.Timeout | null>(null);
  const discoAnalysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio recording state
  const [systemAudioChunks, setSystemAudioChunks] = useState<Blob[]>([]);
  const [micAudioChunks, setMicAudioChunks] = useState<Blob[]>([]);
  
  // Database integration state
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [lastUploadedAudioPath, setLastUploadedAudioPath] = useState<string | null>(null);
  const [lastRecordingBlob, setLastRecordingBlob] = useState<Blob | null>(null);
  
  // WebSocket connection management
  const systemWsReconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const micWsReconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const systemWsReconnectAttemptsRef = useRef<number>(0);
  const micWsReconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds
  const isCallActiveRef = useRef<boolean>(false);

  // Start call with database integration
  const startCall = useCallback(async (callData: {
    title: string
    company: string
    meetingAgenda: string[]
    meetingDescription?: string
    attendeeEmails: string[]
    transcriptAdminEmail: string
    assistantId?: string
    threadId?: string
  }, userId: string) => {
    try {
      // Create call in database
      const newCall = await CallManager.createCall(callData, userId);
      if (!newCall) {
        console.error('Failed to create call in database');
        return false;
      }

      setCurrentCall(newCall);
      setTranscriptEntries([]);
      
      // Start recording and transcription
      await startUnifiedRecording();
      
      return true;
    } catch (error) {
      console.error('Error starting call:', error);
      return false;
    }
  }, []);

  // Stop call with database integration
  const stopCall = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔚 stopCall invoked');
      if (!currentCall) return false;

      // Stop recording
      await stopUnifiedRecording();
      console.log('🎙️ Recording stopped');

      // Allow MediaRecorder "onstop" handlers to flush final chunks before we read them
      await new Promise(resolve => setTimeout(resolve, 600));
      console.log('⏱️ Flush wait complete');
      
      // Upload audio files
      console.log('🎛️ Chunks status:', { micChunks: micAudioChunks.length, systemChunks: systemAudioChunks.length });
      if (systemAudioChunks.length > 0 || micAudioChunks.length > 0) {
        // Ensure we have an active session for Storage RLS
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.error('No active auth session; cannot upload recording.');
          return false;
        }

        const combinedBlob = await createCombinedAudioFile();
        if (combinedBlob) {
          console.log('🧩 Combined blob ready:', { size: combinedBlob.size, type: combinedBlob.type });
          setLastRecordingBlob(combinedBlob);
          console.log('⬆️ Uploading recording to storage...');
          const audioPath = await AudioUploadService.uploadAudioFile(
            combinedBlob, 
            currentCall.call_id, 
            session.user.id
          );
          
          if (audioPath) {
            setLastUploadedAudioPath(audioPath);
            await CallManager.updateCallRecording(currentCall.call_id, audioPath);
            const signedUrl = await AudioUploadService.getSignedAudioUrl(audioPath, 60 * 60);
            console.log('✅ Call recording uploaded:', {
              bucket: 'call-recordings',
              path: audioPath,
              signedUrl
            });
          } else {
            console.error('❌ Upload returned null path (see previous error logs).');
          }
        } else {
          console.warn('⚠️ No combined blob produced from chunks.');
        }
      } else {
        console.warn('⚠️ No audio chunks captured; skipping upload.');
      }

      // Generate AI summary from transcript
      const transcriptText = transcriptEntries.map(entry => `${entry.speaker}: ${entry.text}`).join('\n');
      const aiSummary = transcriptText.length > 0 ? 
        `Meeting Summary:\n\nKey Points:\n${transcriptText.slice(0, 500)}${transcriptText.length > 500 ? '...' : ''}` : 
        'No transcript available';

      // Update call with final data
      await CallManager.updateCallTranscript(currentCall.call_id, transcriptEntries);
      await CallManager.updateCallDisco(currentCall.call_id, discoData);
      await CallManager.updateCallGenie(currentCall.call_id, [quickAnalysisData]);
      await CallManager.updateCallSummary(currentCall.call_id, aiSummary);
      await CallManager.completeCall(currentCall.call_id, Math.floor(recordingTime / 60));
      
      // Clear state
      setCurrentCall(null);
      setTranscriptEntries([]);
      return true;
    } catch (error) {
      console.error('Error stopping call:', error);
      return false;
    }
  }, [currentCall, transcriptEntries, recordingTime, discoData, quickAnalysisData, systemAudioChunks, micAudioChunks]);

  // Add transcript entry to database
  const addTranscriptEntry = useCallback(async (entry: Omit<TranscriptEntry, 'id' | 'edited_at'>) => {
    if (!currentCall) return;

    const transcriptEntry: TranscriptEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      edited_at: new Date().toISOString()
    };

    const success = await CallManager.addTranscriptEntry(currentCall.call_id, transcriptEntry);
    if (success) {
      setTranscriptEntries(prev => [...prev, transcriptEntry]);
    }
  }, [currentCall]);

  // WebSocket connection health monitoring
  const checkWebSocketHealth = useCallback((wsRef: React.MutableRefObject<WebSocket | null>, type: 'system' | 'mic') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn(`${type} WebSocket is not in OPEN state:`, wsRef.current?.readyState);
      return false;
    }
    return true;
  }, []);

  const reconnectWebSocket = useCallback(async (type: 'system' | 'mic', stream?: MediaStream) => {
    if (!isCallActiveRef.current) {
      console.log(`Call not active, skipping ${type} WebSocket reconnection`);
      return;
    }

    const attemptsRef = type === 'system' ? systemWsReconnectAttemptsRef : micWsReconnectAttemptsRef;
    const timeoutRef = type === 'system' ? systemWsReconnectTimeoutRef : micWsReconnectTimeoutRef;
    const wsRef = type === 'system' ? systemWsRef : micWsRef;

    if (attemptsRef.current >= maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${type} WebSocket`);
      if (type === 'system') {
        setSystemTranscriptionError('Failed to reconnect system WebSocket after multiple attempts');
      } else {
        setTranscriptionError('Failed to reconnect microphone WebSocket after multiple attempts');
      }
      return;
    }

    attemptsRef.current += 1;
    console.log(`Attempting to reconnect ${type} WebSocket (attempt ${attemptsRef.current}/${maxReconnectAttempts})`);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Wait before reconnecting
    timeoutRef.current = setTimeout(async () => {
      try {
        if (type === 'system' && stream) {
          await startSystemTranscription(stream);
        } else if (type === 'mic' && stream) {
          await startMicTranscription(stream);
        }
        console.log(`${type} WebSocket reconnected successfully`);
        attemptsRef.current = 0; // Reset attempts on successful reconnection
      } catch (error) {
        console.error(`Failed to reconnect ${type} WebSocket:`, error);
        // Schedule another reconnection attempt
        reconnectWebSocket(type, stream);
      }
    }, reconnectDelay);
  }, []);

  const setupWebSocketHeartbeat = useCallback((wsRef: React.MutableRefObject<WebSocket | null>, type: 'system' | 'mic') => {
    if (!wsRef.current) return;

    const heartbeatInterval = setInterval(() => {
      if (!checkWebSocketHealth(wsRef, type)) {
        console.warn(`${type} WebSocket health check failed, attempting reconnection`);
        clearInterval(heartbeatInterval);
        // Note: We don't have access to the stream here, so we'll handle reconnection in the onclose handler
      }
    }, 5000); // Check every 5 seconds

    // Store interval reference for cleanup
    if (type === 'system') {
      (wsRef.current as any).heartbeatInterval = heartbeatInterval;
    } else {
      (wsRef.current as any).heartbeatInterval = heartbeatInterval;
    }
  }, [checkWebSocketHealth]);

  const cleanupWebSocketHeartbeat = useCallback((wsRef: React.MutableRefObject<WebSocket | null>) => {
    if (wsRef.current && (wsRef.current as any).heartbeatInterval) {
      clearInterval((wsRef.current as any).heartbeatInterval);
      delete (wsRef.current as any).heartbeatInterval;
    }
  }, []);

  // Speaker color generation
  const getSpeakerColor = useCallback((speakerId: number) => {
    if (!systemSpeakers.has(speakerId)) {
      const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c', 
        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
        '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
      ];
      const colorIndex = systemSpeakers.size % colors.length;
      setSystemSpeakers(prev => new Map(prev).set(speakerId, colors[colorIndex]));
    }
    return systemSpeakers.get(speakerId);
  }, [systemSpeakers]);

  // Audio download functionality
  const downloadAudioFile = useCallback((audioBlob: Blob, filename: string) => {
    try {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`✅ Downloaded audio file: ${filename}`);
    } catch (error) {
      console.error(`❌ Error downloading audio file ${filename}:`, error);
    }
  }, []);

  // Build a blob to upload (no auto-download). Prefer mic track if available, else system.
  const createCombinedAudioFile = useCallback(async (): Promise<Blob | null> => {
    try {
      if (micAudioChunks.length > 0) {
        return new Blob(micAudioChunks, { type: 'audio/webm' });
      }
      if (systemAudioChunks.length > 0) {
        return new Blob(systemAudioChunks, { type: 'audio/webm' });
      }
      console.log('⚠️ No audio chunks available to build upload blob');
      return null;
    } catch (error) {
      console.error('❌ Error creating uploadable audio blob:', error);
      return null;
    }
  }, [micAudioChunks, systemAudioChunks]);

  // Provide a synchronous way to fetch the latest local recording blob
  const getLocalRecordingBlob = useCallback((): Blob | null => {
    try {
      if (micAudioChunks.length > 0) {
        return new Blob(micAudioChunks, { type: 'audio/webm' });
      }
      if (systemAudioChunks.length > 0) {
        return new Blob(systemAudioChunks, { type: 'audio/webm' });
      }
      return null;
    } catch (error) {
      console.error('Error creating local recording blob:', error);
      return null;
    }
  }, [micAudioChunks, systemAudioChunks]);

  // DISCO Analysis function
  const analyzeDisco = useCallback(async (conversation: string) => {
    try {
      console.log('🚀 Starting DISCO analysis...');
      console.log('📊 Current DISCO data:', discoData);
      console.log('💬 Conversation to analyze:', conversation);
      
      setIsAnalyzingDisco(true);
      setDiscoError('');
      
      const requestBody = {
        conversation,
        context: {
          type: 'live_transcription',
          currentDISCO: discoData
        }
      };
      
      console.log('📤 Sending request to DISCO API:', {
        url: 'http://localhost:8000/api/analyze-disco',
        body: requestBody
      });
      
      const response = await fetch('http://localhost:8000/api/analyze-disco', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      
      console.log('📥 Full API Response:', result);
      
      // Store raw response for debugging
      setRawDiscoResponse(result);
      
      // Check if response has the expected structure
      if (result.success && result.data) {
        // Standard API response format: { success: true, data: { ... } }
        console.log('✅ DISCO analysis completed successfully (standard format)', result.data);
        setDiscoData(prev => ({
          ...prev,
          ...result.data
        }));
      } else if (result.Decision_Criteria !== undefined || result.Impact !== undefined || result.Situation !== undefined || result.Challenges !== undefined || result.Objectives !== undefined) {
        // Direct DISCO data format: { Decision_Criteria: "...", Impact: "...", ... }
        console.log('✅ DISCO analysis completed successfully (direct format)', result);
        setDiscoData(prev => ({
          ...prev,
          ...result
        }));
      } else {
        console.error('❌ API returned unexpected response format:', result);
        throw new Error('Unexpected response format from DISCO analysis API');
      }
    } catch (error) {
      console.error('Error analyzing DISCO:', error);
      setDiscoError(`DISCO analysis failed: ${(error as Error).message}`);
    } finally {
      setIsAnalyzingDisco(false);
    }
  }, [discoData]);

  // Quick Analysis function for Genie
  const analyzeQuick = useCallback(async (conversation: string) => {
    try {
      console.log('🚀 Starting Quick Analysis...');
      console.log('💬 Conversation for quick analysis:', conversation);
      
      setIsAnalyzingQuick(true);
      setQuickAnalysisError('');
      
      const requestBody = {
        ai_chat: false,
        conversation: conversation,
        assistantId: "asst_UhbQJ7HBkkLvj5NeMOd5daVT"
      };
      
      console.log('📤 Sending request to Quick Analysis API:', {
        url: 'http://localhost:8000/api/generate-quick-answer',
        body: requestBody
      });
      
      const response = await fetch('http://localhost:8000/api/generate-quick-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('📡 Quick Analysis response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log('📥 Quick Analysis response:', result);
      console.log('📥 Quick Analysis analysis text:', result.analysis); 
      
      if (result.analysis) {
        setQuickAnalysisData(prev => {
          const newContent = `## Real-time Analysis\n\n${result.analysis}\n\n`;
          const updated = prev + newContent;
          console.log('✅ Quick Analysis completed successfully');
          console.log('✅ Quick Analysis data appended. New content:', result.analysis);
          console.log('✅ Full Quick Analysis data:', updated);
          return updated;
        });
      } else if (result.response) {
        // Fallback to response field if analysis doesn't exist
        setQuickAnalysisData(prev => {
          const newContent = `## Real-time Analysis\n\n${result.response}\n\n`;
          const updated = prev + newContent;
          console.log('✅ Quick Analysis completed successfully (using response field)');
          console.log('✅ Quick Analysis data appended. New content:', result.response);
          console.log('✅ Full Quick Analysis data:', updated);
          return updated;
        });
      } else {
        throw new Error('No analysis or response data from Quick Analysis API');
      }
    } catch (error) {
      console.error('❌ Error in Quick Analysis:', error);
      setQuickAnalysisError(`Quick Analysis failed: ${(error as Error).message}`);
    } finally {
      setIsAnalyzingQuick(false);
    }
  }, []);

  // AI Chat function for Genie
  const sendAiChat = useCallback(async (userQuery: string, onResponse?: (response: string) => void) => {
    try {
      console.log('🤖 Starting AI Chat...');
      console.log('❓ User query:', userQuery);
      
      setIsAnalyzingQuick(true);
      setQuickAnalysisError('');
      
      const requestBody = {
        ai_chat: true,
        user_query: userQuery,
        assistantId: "asst_UhbQJ7HBkkLvj5NeMOd5daVT"
      };
      
      console.log('📤 Sending request to AI Chat API:', {
        url: 'http://localhost:8000/api/generate-quick-answer',
        body: requestBody
      });
      
      const response = await fetch('http://localhost:8000/api/generate-quick-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('📡 AI Chat response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log('📥 AI Chat response:', result);
      console.log('📥 AI Chat response text:', result.response);
      
      if (result.response) {
        // Call the callback if provided
        if (onResponse) {
          onResponse(result.response);
        }
        
        setQuickAnalysisData(prev => {
          const newContent = `## AI Response\n\n${result.response}\n\n`;
          const updated = prev + newContent;
          console.log('✅ AI Chat completed successfully');
          console.log('✅ AI Chat data appended. New content:', result.response);
          console.log('✅ Full AI Chat data:', updated);
          return updated;
        });
      } else {
        throw new Error('No response data from AI Chat API');
      }
    } catch (error) {
      console.error('❌ Error in AI Chat:', error);
      setQuickAnalysisError(`AI Chat failed: ${(error as Error).message}`);
    } finally {
      setIsAnalyzingQuick(false);
    }
  }, []);

  // Automatic DISCO analysis: first after 20 seconds, then every 10 seconds
  const startDiscoAnalysisInterval = useCallback(() => {
    console.log('🎯 startDiscoAnalysisInterval function called');
    
    if (discoAnalysisTimerRef.current) {
      console.log('🔄 Clearing existing DISCO analysis timer');
      clearTimeout(discoAnalysisTimerRef.current);
    }
    
    console.log('🔄 Starting DISCO analysis automation (first after 20s, then every 10s)');
    
    // First analysis after 20 seconds
    console.log('⏰ Setting up 20-second timeout for first DISCO analysis');
    const firstAnalysis = setTimeout(() => {
      console.log('⏰ 20-second timeout fired! Starting first DISCO analysis');
      console.log('🔍 Raw allMessages data:', allMessages);
      console.log('🔍 Total messages count:', allMessages.length);
      
      // Log each message individually
      allMessages.forEach((msg, index) => {
        console.log(`🔍 Message ${index}:`, {
          id: msg.id,
          type: msg.type,
          text: msg.text,
          isFinal: msg.isFinal,
          isAccumulating: msg.isAccumulating,
          speakerId: msg.speakerId,
          speakerLabel: msg.speakerLabel,
          timestamp: msg.timestamp
        });
      });
      
      // Use all messages with text content, not just final ones
      const messagesWithText = allMessages.filter(msg => msg.text.trim());
      console.log('🔍 Messages with text content:', messagesWithText);
      console.log('🔍 Messages with text count:', messagesWithText.length);
      
      const conversation = messagesWithText
        .map(msg => `${msg.type === 'microphone' ? 'You' : `Speaker ${(msg.speakerId || 0) + 1}`}: ${msg.text}`)
        .join('\n');
      
      console.log('⏰ First DISCO analysis triggered (after 20s). Conversation length:', conversation.length);
      console.log('📝 Conversation content:', conversation);
      console.log('📝 Conversation content (JSON):', JSON.stringify(conversation));
      
      // Send to DISCO analysis if we have content
      if (conversation.trim().length > 0) {
        console.log('✅ Triggering first DISCO analysis...');
        analyzeDisco(conversation);
      } else {
        console.log('⏭️ Skipping first DISCO analysis - no conversation content yet');
      }
      
      // Start the regular 10-second interval after the first analysis
      console.log('⏰ Setting up 10-second interval for regular DISCO analysis');
      discoAnalysisTimerRef.current = setInterval(() => {
        console.log('🔍 Raw allMessages data:', allMessages);
        console.log('🔍 Total messages count:', allMessages.length);
        
        // Log each message individually
        allMessages.forEach((msg, index) => {
          console.log(`🔍 Message ${index}:`, {
            id: msg.id,
            type: msg.type,
            text: msg.text,
            isFinal: msg.isFinal,
            isAccumulating: msg.isAccumulating,
            speakerId: msg.speakerId,
            speakerLabel: msg.speakerLabel,
            timestamp: msg.timestamp
          });
        });
        
        // Use all messages with text content, not just final ones
        const messagesWithText = allMessages.filter(msg => msg.text.trim());
        console.log('🔍 Messages with text content:', messagesWithText);
        console.log('🔍 Messages with text count:', messagesWithText.length);
        
        const conversation = messagesWithText
          .map(msg => `${msg.type === 'microphone' ? 'You' : `Speaker ${(msg.speakerId || 0) + 1}`}: ${msg.text}`)
          .join('\n');
        
        console.log('⏰ Regular DISCO analysis triggered (every 10s). Conversation length:', conversation.length);
        console.log('📝 Conversation content:', conversation);
        console.log('📝 Conversation content (JSON):', JSON.stringify(conversation));
        
        // Send to DISCO analysis if we have content
        if (conversation.trim().length > 0) {
          console.log('✅ Triggering regular DISCO analysis...');
          analyzeDisco(conversation);
        } else {
          console.log('⏭️ Skipping regular DISCO analysis - no conversation content yet');
        }
      }, 10000); // Analyze every 10 seconds after the first one
      
    }, 20000); // First analysis after 20 seconds
    
    // Store the first timeout so we can clear it if needed
    discoAnalysisTimerRef.current = firstAnalysis;
  }, [allMessages, analyzeDisco]);

  const stopDiscoAnalysisInterval = useCallback(() => {
    if (discoAnalysisTimerRef.current) {
      console.log('🛑 Stopping DISCO analysis automation');
      clearTimeout(discoAnalysisTimerRef.current);
      clearInterval(discoAnalysisTimerRef.current);
      discoAnalysisTimerRef.current = null;
    }
  }, []);

  // Message management
  const addSystemMessage = useCallback((speakerId: number, speakerLabel: string, text: string, isFinal: boolean = true) => {
    if (diarizationEnabled) {
      // Individual speaker messages
      const message: TranscriptionMessage = {
        id: `${Date.now()}_${Math.random()}`,
        type: 'system',
        speakerId,
        speakerLabel,
        text: text.trim(),
        timestamp: new Date(),
        isFinal
      };
      setAllMessages(prev => [...prev, message]);
    } else {
      // Accumulate text for burst messages
      setAllMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.isAccumulating) {
          // Add to existing accumulating message
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            text: lastMessage.text + ' ' + text.trim(),
            timestamp: new Date()
          };
          return updatedMessages;
        } else {
          // Create new accumulating message
          const message: TranscriptionMessage = {
            id: `${Date.now()}_${Math.random()}`,
            type: 'system',
            speakerId: 0,
            speakerLabel: 'System Audio',
            text: text.trim(),
            timestamp: new Date(),
            isFinal: false,
            isAccumulating: true
          };
          return [...prev, message];
        }
      });
    }
  }, [diarizationEnabled]);

  const addMicMessage = useCallback((text: string, isFinal: boolean = true) => {
    setAllMessages(prev => {
      const newMessages = [...prev];
      const lastMicIndex = newMessages.findLastIndex(
        msg => msg.type === 'microphone' && msg.isAccumulating
      );
      
      if (isFinal) {
        if (lastMicIndex !== -1) {
          // Finalize existing accumulating message
          newMessages[lastMicIndex] = {
            ...newMessages[lastMicIndex],
            text: text.trim(),
            timestamp: new Date(),
            isFinal: true,
            isAccumulating: false
          };
        } else {
          // Add new final message
          const message: TranscriptionMessage = {
            id: `${Date.now()}_${Math.random()}`,
            type: 'microphone',
            text: text.trim(),
            timestamp: new Date(),
            isFinal: true,
            isAccumulating: false
          };
          newMessages.push(message);
        }
      } else {
        // Interim message
        if (lastMicIndex !== -1) {
          // Update existing accumulating message
          newMessages[lastMicIndex] = {
            ...newMessages[lastMicIndex],
            text: text.trim(),
            timestamp: new Date()
          };
        } else {
          // Add new accumulating message
          const message: TranscriptionMessage = {
            id: `${Date.now()}_${Math.random()}`,
            type: 'microphone',
            text: text.trim(),
            timestamp: new Date(),
            isFinal: false,
            isAccumulating: true
          };
          newMessages.push(message);
        }
      }
      return newMessages;
    });
  }, []);

  // Timer functions (removed burst timer for real-time updates)

  const startSystemBurstTimer = useCallback(() => {
    if (systemBurstTimerRef.current) {
      clearInterval(systemBurstTimerRef.current);
    }
    
    systemBurstTimerRef.current = setInterval(() => {
      // Finalize any accumulating system messages
      setAllMessages(prev => {
        if (prev.length && prev[prev.length - 1].isAccumulating) {
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = {
            ...updatedMessages[updatedMessages.length - 1],
            isAccumulating: false,
            isFinal: true
          };
          return updatedMessages;
        }
        return prev;
      });
    }, 5000);
  }, []);

  const stopSystemBurstTimer = useCallback(() => {
    if (systemBurstTimerRef.current) {
      clearInterval(systemBurstTimerRef.current);
      systemBurstTimerRef.current = null;
    }
    
    // Finalize any remaining accumulating message
    setAllMessages(prev => {
      if (prev.length && prev[prev.length - 1].isAccumulating) {
        const updatedMessages = [...prev];
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          isAccumulating: false,
          isFinal: true
        };
        return updatedMessages;
      }
      return prev;
    });
  }, []);

  // Audio processing setup
  const setupMicAudioProcessing = useCallback((stream: MediaStream) => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      micAudioContextRef.current = audioContext;
      
      // Get microphone input
      const microphone = audioContext.createMediaStreamSource(stream);
      micMicrophoneRef.current = microphone;
      
      // Create script processor for real-time audio processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;
      
      processor.onaudioprocess = (event) => {
        if (micWsRef.current && micWsRef.current.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Check if there's actual audio data (not silence)
          const hasAudio = inputData.some(sample => Math.abs(sample) > 0.01);
          
          if (hasAudio) {
            // Convert float32 to int16
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }
            
            // Convert to base64 and send
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(int16Data.buffer)));
            
            micWsRef.current.send(JSON.stringify({
              type: 'audio_data',
              data: base64Data
            }));
          }
        }
      };
      
      // Connect audio processing chain
      microphone.connect(processor);
      processor.connect(audioContext.destination);
      
      
    } catch (error) {
      console.error('Error setting up microphone audio processing:', error);
      setTranscriptionError('Failed to set up microphone audio processing');
    }
  }, []);

  const setupSystemAudioProcessing = useCallback((stream: MediaStream) => {
    try {
      // Create audio context for system audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      systemAudioContextRef.current = audioContext;
      
      // Get system audio input
      const microphone = audioContext.createMediaStreamSource(stream);
      systemMicrophoneRef.current = microphone;
      
      // Create script processor for real-time audio processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      systemProcessorRef.current = processor;
      
      processor.onaudioprocess = (event) => {
        if (systemWsRef.current && systemWsRef.current.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert float32 to int16
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          // Convert to base64 and send
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(int16Data.buffer)));
          
          systemWsRef.current.send(JSON.stringify({
            type: 'audio_data',
            data: base64Data
          }));
        }
      };
      
      // Connect audio processing chain
      microphone.connect(processor);
      processor.connect(audioContext.destination);
      
    } catch (error) {
      console.error('Error setting up system audio processing:', error);
      setSystemTranscriptionError('Failed to set up system audio processing');
    }
  }, []);

  // WebSocket connections
  const startMicTranscription = useCallback(async (stream: MediaStream) => {
    try {
      // Connect to WebSocket server
      const ws = new WebSocket('ws://localhost:3001');
      micWsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Microphone WebSocket connected successfully');
        setMicTranscribing(true);
        setTranscriptionError('');
        micWsReconnectAttemptsRef.current = 0; // Reset reconnection attempts
        
        // Send start transcription message
        ws.send(JSON.stringify({
          type: 'start_transcription'
        }));
        
        // Set up audio processing
        setupMicAudioProcessing(stream);
        
        // Set up heartbeat monitoring
        setupWebSocketHeartbeat(micWsRef, 'mic');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'transcription':
            if (data.transcript && data.transcript.trim()) {
              // Add real-time microphone message
              addMicMessage(data.transcript, data.is_final);
            }
            break;
            
          case 'transcription_stopped':
            setMicTranscribing(false);
            break;
            
          case 'error':
            setTranscriptionError(data.message);
            setMicTranscribing(false);
            break;
        }
      };
      
      ws.onclose = (event) => {
        console.log('Microphone WebSocket disconnected:', event.code, event.reason);
        cleanupWebSocketHeartbeat(micWsRef);
        setMicTranscribing(false);
        
        // Only attempt reconnection if call is still active and not a normal closure
        if (isCallActiveRef.current && event.code !== 1000) {
          console.log('Call is still active, attempting to reconnect microphone WebSocket');
          setTranscriptionError('Connection lost, attempting to reconnect...');
          reconnectWebSocket('mic', stream);
        } else if (event.code !== 1000) {
          setTranscriptionError('Connection lost unexpectedly');
        }
      };
      
      ws.onerror = (error) => {
        console.error('Microphone WebSocket error:', error);
        setTranscriptionError('Connection error occurred');
        setMicTranscribing(false);
      };
      
    } catch (error) {
      console.error('Error starting transcription:', error);
      setTranscriptionError('Failed to start transcription');
    }
  }, [setupMicAudioProcessing, setupWebSocketHeartbeat, cleanupWebSocketHeartbeat, reconnectWebSocket, addMicMessage]);

  const startSystemTranscription = useCallback(async (stream: MediaStream) => {
    try {
      // Connect to WebSocket server for system audio
      const ws = new WebSocket('ws://localhost:3001');
      systemWsRef.current = ws;
      
      ws.onopen = () => {
        console.log('System WebSocket connected successfully');
        setSystemTranscribing(true);
        setSystemTranscriptionError('');
        setSystemSpeakers(new Map()); // Reset speakers for new session
        systemWsReconnectAttemptsRef.current = 0; // Reset reconnection attempts
        
        // Send start transcription message with diarization setting
        ws.send(JSON.stringify({
          type: 'start_transcription',
          diarization: diarizationEnabled
        }));
        
        // Set up audio processing for system audio
        setupSystemAudioProcessing(stream);
        
        // Start burst timer if diarization is disabled
        if (!diarizationEnabled) {
          startSystemBurstTimer();
        }
        
        // Set up heartbeat monitoring
        setupWebSocketHeartbeat(systemWsRef, 'system');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'transcription':
            if (data.transcript && data.transcript.trim()) {
              if (data.is_final) {
                // Add system message immediately for chat format
                addSystemMessage(
                  data.speaker || 0, 
                  data.speaker_label || 'Speaker 1', 
                  data.transcript, 
                  true
                );
              }
            }
            break;
            
          case 'transcription_stopped':
            setSystemTranscribing(false);
            break;
            
          case 'error':
            setSystemTranscriptionError(data.message);
            setSystemTranscribing(false);
            break;
        }
      };
      
      ws.onclose = (event) => {
        console.log('System WebSocket disconnected:', event.code, event.reason);
        cleanupWebSocketHeartbeat(systemWsRef);
        setSystemTranscribing(false);
        
        // Only attempt reconnection if call is still active and not a normal closure
        if (isCallActiveRef.current && event.code !== 1000) {
          console.log('Call is still active, attempting to reconnect system WebSocket');
          setSystemTranscriptionError('Connection lost, attempting to reconnect...');
          reconnectWebSocket('system', stream);
        } else if (event.code !== 1000) {
          setSystemTranscriptionError('Connection lost unexpectedly');
        }
      };
      
      ws.onerror = (error) => {
        console.error('System WebSocket error:', error);
        setSystemTranscriptionError('Connection error occurred');
        setSystemTranscribing(false);
      };
      
    } catch (error) {
      console.error('Error starting system transcription:', error);
      setSystemTranscriptionError('Failed to start system transcription');
    }
  }, [diarizationEnabled, setupSystemAudioProcessing, addSystemMessage, startSystemBurstTimer, setupWebSocketHeartbeat, cleanupWebSocketHeartbeat, reconnectWebSocket]);

  // Recording functions
  const startSystemRecording = useCallback(async () => {
    try {
      let stream: MediaStream | null = null;
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

      if (isElectron) {
        // Electron path uses selected desktop source id
        let source = screenSources.find((s: ScreenSource) => s.id === selectedScreenSource);
        if (!source) {
          const fallback = screenSources.find((s: ScreenSource) => s.id.startsWith('screen:')) || screenSources[0];
          if (fallback) {
            setSelectedScreenSource(fallback.id);
            source = fallback;
          }
        }
        if (!source) throw new Error('No source selected');

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            // @ts-ignore - Chrome-specific properties for screen capture
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id
            }
          },
          video: {
            // @ts-ignore - Chrome-specific properties for screen capture
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id
            }
          }
        });
      } else {
        // Web path: use standard display capture API (no source id needed)
        stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: true
        });
      }

      // Set up video preview
      if (systemVideoRef.current) {
        systemVideoRef.current.srcObject = stream;
        setSystemPreview(true);
      }

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      systemMediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks for recording
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          setSystemAudioChunks(prev => [...prev, event.data]);
        }
      };

      mediaRecorder.onstop = () => {
        // Prevent auto-download on stop; uploads happen in stopCall
      };

      mediaRecorder.start();

      // Start real-time transcription for system audio
      await startSystemTranscription(stream);

    } catch (error) {
      console.error('Error starting system recording:', error);
      setSystemTranscriptionError(`Failed to start system recording: ${(error as Error).message}`);
    }
  }, [screenSources, selectedScreenSource, startSystemTranscription]);

  const startMicRecording = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000 // Deepgram works best with 16kHz
        }
      });

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      micMediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks for recording
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          setMicAudioChunks(prev => [...prev, event.data]);
        }
      };

      mediaRecorder.onstop = () => {
        // Prevent auto-download on stop; uploads happen in stopCall
      };

      mediaRecorder.start();

      // Start real-time transcription
      await startMicTranscription(stream);

    } catch (error) {
      console.error('Error starting microphone recording:', error);
      setTranscriptionError(`Failed to start microphone recording: ${(error as Error).message}`);
    }
  }, [startMicTranscription]);

  const stopSystemRecording = useCallback(() => {
    if (systemMediaRecorderRef.current) {
      systemMediaRecorderRef.current.stop();
      setSystemPreview(false);

      // Stop all tracks
      if (systemVideoRef.current && systemVideoRef.current.srcObject) {
        const stream = systemVideoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track: MediaStreamTrack) => track.stop());
      }
    }
    
    // Clean up WebSocket connection properly
    if (systemWsRef.current) {
      // Clean up heartbeat monitoring first
      cleanupWebSocketHeartbeat(systemWsRef);
      
      // Send stop message if connection is still open
      if (systemWsRef.current.readyState === WebSocket.OPEN) {
        systemWsRef.current.send(JSON.stringify({
          type: 'stop_transcription'
        }));
      }
      
      // Close connection
      systemWsRef.current.close(1000, 'Call ended normally');
      systemWsRef.current = null;
    }
    
    // Clear reconnection timeout
    if (systemWsReconnectTimeoutRef.current) {
      clearTimeout(systemWsReconnectTimeoutRef.current);
      systemWsReconnectTimeoutRef.current = null;
    }
    
    // Reset reconnection attempts
    systemWsReconnectAttemptsRef.current = 0;
    
    if (systemProcessorRef.current) {
      systemProcessorRef.current.disconnect();
      systemProcessorRef.current = null;
    }
    
    if (systemMicrophoneRef.current) {
      systemMicrophoneRef.current.disconnect();
      systemMicrophoneRef.current = null;
    }
    
    // Stop burst timer
    stopSystemBurstTimer();
    
    setSystemTranscribing(false);
  }, [stopSystemBurstTimer, cleanupWebSocketHeartbeat]);

  const stopMicRecording = useCallback(() => {
    if (micMediaRecorderRef.current) {
      micMediaRecorderRef.current.stop();

      // Stop all tracks
      if (micMediaRecorderRef.current.stream) {
        const tracks = micMediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    }
    
    // Clean up WebSocket connection properly
    if (micWsRef.current) {
      // Clean up heartbeat monitoring first
      cleanupWebSocketHeartbeat(micWsRef);
      
      // Send stop message if connection is still open
      if (micWsRef.current.readyState === WebSocket.OPEN) {
        micWsRef.current.send(JSON.stringify({
          type: 'stop_transcription'
        }));
      }
      
      // Close connection
      micWsRef.current.close(1000, 'Call ended normally');
      micWsRef.current = null;
    }
    
    // Clear reconnection timeout
    if (micWsReconnectTimeoutRef.current) {
      clearTimeout(micWsReconnectTimeoutRef.current);
      micWsReconnectTimeoutRef.current = null;
    }
    
    // Reset reconnection attempts
    micWsReconnectAttemptsRef.current = 0;
    
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }
    
    if (micMicrophoneRef.current) {
      micMicrophoneRef.current.disconnect();
      micMicrophoneRef.current = null;
    }
    
    stopMicTranscription();
  }, [cleanupWebSocketHeartbeat]);

  const stopMicTranscription = useCallback(() => {
    setMicTranscribing(false);
  }, []);

  // Main recording control
  const startUnifiedRecording = useCallback(async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);
      isCallActiveRef.current = true; // Mark call as active
      
      // Clear all data for fresh start
      console.log('🧹 Clearing all data for fresh start');
      setAllMessages([]);
      setSystemSpeakers(new Map());
      setDiscoData({});
      setDiscoError('');
      setRawDiscoResponse(null);
      // Keep Genie data persistent - don't clear quickAnalysisData
      setQuickAnalysisError('');
      
      // Clear audio chunks for new recording
      setSystemAudioChunks([]);
      setMicAudioChunks([]);
      
      // Start system recording
      await startSystemRecording();
      
      // Start microphone recording
      await startMicRecording();
      
      // Start unified timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start DISCO analysis interval
      console.log('🎯 Starting DISCO analysis interval from startUnifiedRecording');
      startDiscoAnalysisInterval();
      
    } catch (error) {
      console.error('Error starting unified recording:', error);
      setIsRecording(false);
      isCallActiveRef.current = false; // Reset call active state on error
    }
  }, [startSystemRecording, startMicRecording, startDiscoAnalysisInterval]);

  // Send data to post-call actions API
  const sendToPostCallActions = useCallback(async (holisticView: any) => {
    try {
      console.log('📤 Sending data to post-call actions API...');
      
      const requestBody = {
        inputData: holisticView,
        assistantId: null
      };
      
      console.log('📤 Post-call actions request:', requestBody);
      
      const response = await fetch('http://localhost:8000/api/post-call-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('📡 Post-call actions response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Post-call actions response:', result);
      
    } catch (error) {
      console.error('❌ Error sending to post-call actions:', error);
    }
  }, []);

  // Call data consolidation function
  const consolidateCallData = useCallback(() => {
    // 1. TRANSCRIPT DATA
    const transcriptData = {
      totalMessages: allMessages.length,
      messages: allMessages.map(msg => ({
        id: msg.id,
        type: msg.type,
        speaker: msg.type === 'microphone' ? 'You' : `Speaker ${(msg.speakerId || 0) + 1}`,
        speakerLabel: msg.speakerLabel,
        text: msg.text,
        timestamp: msg.timestamp,
        isFinal: msg.isFinal
      })),
      conversationText: allMessages
        .filter(msg => msg.text.trim())
        .map(msg => `${msg.type === 'microphone' ? 'You' : `Speaker ${(msg.speakerId || 0) + 1}`}: ${msg.text}`)
        .join('\n'),
      callDuration: recordingTime,
      speakers: Array.from(systemSpeakers.entries()).map(([id, color]) => ({
        id,
        color,
        label: `Speaker ${id + 1}`
      }))
    };
    
    // 2. DISCO ANALYSIS DATA
    const discoAnalysisData = {
      currentDiscoData: discoData,
      rawResponse: rawDiscoResponse,
      error: discoError,
      isAnalyzing: isAnalyzingDisco,
      analysisComplete: !isAnalyzingDisco && !discoError && Object.keys(discoData).length > 0
    };
    
    // 3. GENIE DATA - Split into logical sections
    const splitGenieData = (() => {
      if (!quickAnalysisData.trim()) {
        return {
          realtimeGuidance: [] as Array<{type: string, content: string, timestamp: string}>,
          qnaPairs: [] as Array<{type: string, content: string, timestamp: string}>,
          rawData: quickAnalysisData
        };
      }
      
      const sections = quickAnalysisData.split('## ').filter(section => section.trim());
      const realtimeGuidance: Array<{type: string, content: string, timestamp: string}> = [];
      const qnaPairs: Array<{type: string, content: string, timestamp: string}> = [];
      
      sections.forEach(section => {
        const trimmedSection = section.trim();
        if (trimmedSection.startsWith('Real-time Analysis')) {
          const content = trimmedSection.replace('Real-time Analysis', '').trim();
          if (content) {
            realtimeGuidance.push({
              type: 'realtime_analysis',
              content: content,
              timestamp: new Date().toISOString()
            });
          }
        } else if (trimmedSection.startsWith('AI Response')) {
          const content = trimmedSection.replace('AI Response', '').trim();
          if (content) {
            // Try to detect if this is a Q&A pair or general guidance
            const isQnA = content.includes('?') || content.includes('Question') || content.includes('Answer');
            if (isQnA) {
              qnaPairs.push({
                type: 'ai_response',
                content: content,
                timestamp: new Date().toISOString()
              });
            } else {
              realtimeGuidance.push({
                type: 'ai_guidance',
                content: content,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      });
      
      return {
        realtimeGuidance,
        qnaPairs,
        rawData: quickAnalysisData,
        totalSections: sections.length
      };
    })();
    
    const genieData = {
      ...splitGenieData,
      error: quickAnalysisError,
      isAnalyzing: isAnalyzingQuick,
      hasData: quickAnalysisData.trim().length > 0
    };
    
    // 4. HOLISTIC CONVERSATION VIEW FOR AI
    const holisticView = {
      conversation: {
        messages: allMessages
          .filter(msg => msg.text.trim())
          .map(msg => ({
            speaker: msg.type === 'microphone' ? 'You' : `Speaker ${(msg.speakerId || 0) + 1}`,
            text: msg.text
          }))
      },
      analysis: {
        disco_framework: discoData,
        ai_guidance: splitGenieData.realtimeGuidance,
        qna_interactions: splitGenieData.qnaPairs
      }
    };
    
    // Log post-call actions request data (API call commented out)
    const postCallRequest = {
      inputData: holisticView,
      assistantId: null
    };
    console.log('=== POST-CALL ACTIONS REQUEST DATA ===');
    console.log(JSON.stringify(postCallRequest, null, 2));
    console.log('=== END POST-CALL REQUEST ===');
    
    // Send to post-call actions API (COMMENTED OUT)
    // sendToPostCallActions(holisticView);
    
    // Return the holistic view for external use
    return holisticView;
  }, [allMessages, recordingTime, systemSpeakers, discoData, rawDiscoResponse, discoError, isAnalyzingDisco, quickAnalysisData, quickAnalysisError, isAnalyzingQuick, sendToPostCallActions]);

  const stopUnifiedRecording = useCallback(async () => {
    console.log('Stopping unified recording...');
    setIsRecording(false);
    isCallActiveRef.current = false; // Mark call as inactive
    
    // Stop system recording
    stopSystemRecording();
    
    // Stop microphone recording
    stopMicRecording();
    
    // Stop timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    // Stop DISCO analysis interval
    stopDiscoAnalysisInterval();
    
    // Give MediaRecorder onstop handlers a moment to flush final chunks
    await new Promise(resolve => setTimeout(resolve, 500));

    // CONSOLIDATE AND LOG ALL CALL DATA
    const consolidatedData = consolidateCallData();
    
    // Clear all data for fresh start
    console.log('🧹 Clearing all data for fresh start');
    setAllMessages([]);
    setDiscoData({});
    setDiscoError('');
    setRawDiscoResponse(null);
    // Keep Genie data persistent - don't clear quickAnalysisData
    setQuickAnalysisError('');
    setSystemSpeakers(new Map());
  }, [stopSystemRecording, stopMicRecording, stopDiscoAnalysisInterval, consolidateCallData]);

  // Load screen sources
  const loadScreenSources = useCallback(async () => {
    try {
      // Check if we're running in Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const sources = await (window as any).electronAPI.getDesktopSources();
        setScreenSources(sources);
        
        // Automatically select the first screen source (full screen)
        const screenSource = sources.find((source: ScreenSource) => source.id.startsWith('screen:'));
        if (screenSource) {
          setSelectedScreenSource(screenSource.id);
        }
      } else {
        // Fallback for web environment - mock implementation
        const sources = [
          { id: 'screen:0:0', name: 'Entire Screen', thumbnail: '' },
          { id: 'window:0:0', name: 'Chrome', thumbnail: '' },
          { id: 'window:1:0', name: 'VS Code', thumbnail: '' },
        ];
        setScreenSources(sources);
        // Auto-select the screen source
        setSelectedScreenSource('screen:0:0');
      }
    } catch (error) {
      console.error('Error loading screen sources:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark call as inactive
      isCallActiveRef.current = false;
      
      // Clear all timers
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (systemBurstTimerRef.current) clearInterval(systemBurstTimerRef.current);
      if (discoAnalysisTimerRef.current) {
        clearTimeout(discoAnalysisTimerRef.current);
        clearInterval(discoAnalysisTimerRef.current);
      }
      
      // Clear reconnection timeouts
      if (systemWsReconnectTimeoutRef.current) {
        clearTimeout(systemWsReconnectTimeoutRef.current);
      }
      if (micWsReconnectTimeoutRef.current) {
        clearTimeout(micWsReconnectTimeoutRef.current);
      }
      
      // Stop media recorders
      if (systemMediaRecorderRef.current) systemMediaRecorderRef.current.stop();
      if (micMediaRecorderRef.current) micMediaRecorderRef.current.stop();
      
      // Cleanup WebSocket connections
      if (systemWsRef.current) {
        cleanupWebSocketHeartbeat(systemWsRef);
        if (systemWsRef.current.readyState === WebSocket.OPEN) {
          systemWsRef.current.close(1000, 'Component unmounting');
        }
      }
      if (micWsRef.current) {
        cleanupWebSocketHeartbeat(micWsRef);
        if (micWsRef.current.readyState === WebSocket.OPEN) {
          micWsRef.current.close(1000, 'Component unmounting');
        }
      }
      
      // Cleanup transcription
      stopMicTranscription();
      
      // Cleanup audio contexts
      if (micAudioContextRef.current && micAudioContextRef.current.state !== 'closed') {
        micAudioContextRef.current.close();
      }
      if (systemAudioContextRef.current && systemAudioContextRef.current.state !== 'closed') {
        systemAudioContextRef.current.close();
      }
    };
  }, [stopMicTranscription, cleanupWebSocketHeartbeat]);

  // Load screen sources on mount
  useEffect(() => {
    loadScreenSources();
  }, [loadScreenSources]);

  return {
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
    
    // DISCO Analysis state
    discoData,
    isAnalyzingDisco,
    discoError,
    rawDiscoResponse,
    
    // Genie Quick Analysis state
    quickAnalysisData,
    isAnalyzingQuick,
    quickAnalysisError,
    
    // Database integration state
    currentCall,
    transcriptEntries,
    lastUploadedAudioPath,
    lastRecordingBlob,
    
    // Refs
    systemVideoRef,
    
    // Actions
    setSelectedScreenSource,
    setDiarizationEnabled,
    setQuickAnalysisData,
    startUnifiedRecording,
    stopUnifiedRecording,
    getSpeakerColor,
    analyzeDisco,
    startDiscoAnalysisInterval,
    stopDiscoAnalysisInterval,
    analyzeQuick,
    sendAiChat,
    consolidateCallData,
    downloadAudioFile,
    createCombinedAudioFile,
    getLocalRecordingBlob,
    
    // Database integration actions
    startCall,
    stopCall,
    addTranscriptEntry,
  };
};
