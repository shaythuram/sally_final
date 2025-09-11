import { useState, useRef, useCallback, useEffect } from 'react';

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

  // Automatic DISCO analysis: first after 20 seconds, then every 10 seconds
  const startDiscoAnalysisInterval = useCallback(() => {
    if (discoAnalysisTimerRef.current) {
      clearTimeout(discoAnalysisTimerRef.current);
    }
    
    console.log('🔄 Starting DISCO analysis automation (first after 20s, then every 10s)');
    
    // First analysis after 20 seconds
    const firstAnalysis = setTimeout(() => {
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
      
      const finalMessages = allMessages.filter(msg => msg.isFinal && msg.text.trim());
      console.log('🔍 Final messages after filtering:', finalMessages);
      console.log('🔍 Final messages count:', finalMessages.length);
      
      // Log the filtering process step by step
      const step1 = allMessages.filter(msg => msg.isFinal);
      console.log('🔍 Messages with isFinal=true:', step1);
      
      const step2 = step1.filter(msg => msg.text.trim());
      console.log('🔍 Messages with isFinal=true AND non-empty text:', step2);
      
      const conversation = finalMessages
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
        
        const finalMessages = allMessages.filter(msg => msg.isFinal && msg.text.trim());
        console.log('🔍 Final messages after filtering:', finalMessages);
        console.log('🔍 Final messages count:', finalMessages.length);
        
        // Log the filtering process step by step
        const step1 = allMessages.filter(msg => msg.isFinal);
        console.log('🔍 Messages with isFinal=true:', step1);
        
        const step2 = step1.filter(msg => msg.text.trim());
        console.log('🔍 Messages with isFinal=true AND non-empty text:', step2);
        
        const conversation = finalMessages
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
        setMicTranscribing(true);
        setTranscriptionError('');
        
        // Send start transcription message
        ws.send(JSON.stringify({
          type: 'start_transcription'
        }));
        
        // Set up audio processing
        setupMicAudioProcessing(stream);
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
        setMicTranscribing(false);
        if (event.code !== 1000) { // Not a normal closure
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
  }, [setupMicAudioProcessing]);

  const startSystemTranscription = useCallback(async (stream: MediaStream) => {
    try {
      // Connect to WebSocket server for system audio
      const ws = new WebSocket('ws://localhost:3001');
      systemWsRef.current = ws;
      
      ws.onopen = () => {
        setSystemTranscribing(true);
        setSystemTranscriptionError('');
        setSystemSpeakers(new Map()); // Reset speakers for new session
        
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
        setSystemTranscribing(false);
        if (event.code !== 1000) { // Not a normal closure
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
  }, [diarizationEnabled, setupSystemAudioProcessing, addSystemMessage, startSystemBurstTimer]);

  // Recording functions
  const startSystemRecording = useCallback(async () => {
    try {
      const source = screenSources.find((s: ScreenSource) => s.id === selectedScreenSource);
      if (!source) {
        throw new Error('No source selected');
      }

      // Get user media with the selected screen source
      const stream = await navigator.mediaDevices.getUserMedia({
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
    
    // Stop system transcription
    if (systemWsRef.current) {
      systemWsRef.current.send(JSON.stringify({
        type: 'stop_transcription'
      }));
      systemWsRef.current.close();
      systemWsRef.current = null;
    }
    
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
  }, [stopSystemBurstTimer]);

  const stopMicRecording = useCallback(() => {
    if (micMediaRecorderRef.current) {
      micMediaRecorderRef.current.stop();

      // Stop all tracks
      if (micMediaRecorderRef.current.stream) {
        const tracks = micMediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    }
    
    // Stop transcription and burst timer
    if (micWsRef.current) {
      micWsRef.current.send(JSON.stringify({
        type: 'stop_transcription'
      }));
      micWsRef.current.close();
      micWsRef.current = null;
    }
    
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }
    
    if (micMicrophoneRef.current) {
      micMicrophoneRef.current.disconnect();
      micMicrophoneRef.current = null;
    }
    
    stopMicTranscription();
  }, []);

  const stopMicTranscription = useCallback(() => {
    setMicTranscribing(false);
  }, []);

  // Main recording control
  const startUnifiedRecording = useCallback(async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);
      setAllMessages([]);
      setSystemSpeakers(new Map());
      setDiscoData({}); // Reset DISCO data for new session
      setDiscoError('');
      
      // Start system recording
      await startSystemRecording();
      
      // Start microphone recording
      await startMicRecording();
      
      // Start unified timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start DISCO analysis interval
      startDiscoAnalysisInterval();
      
    } catch (error) {
      console.error('Error starting unified recording:', error);
      setIsRecording(false);
    }
  }, [startSystemRecording, startMicRecording, startDiscoAnalysisInterval]);

  const stopUnifiedRecording = useCallback(() => {
    setIsRecording(false);
    
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
  }, [stopSystemRecording, stopMicRecording, stopDiscoAnalysisInterval]);

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
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (systemBurstTimerRef.current) clearInterval(systemBurstTimerRef.current);
      if (discoAnalysisTimerRef.current) {
        clearTimeout(discoAnalysisTimerRef.current);
        clearInterval(discoAnalysisTimerRef.current);
      }
      if (systemMediaRecorderRef.current) systemMediaRecorderRef.current.stop();
      if (micMediaRecorderRef.current) micMediaRecorderRef.current.stop();
      
      // Cleanup transcription
      stopMicTranscription();
      if (systemWsRef.current) systemWsRef.current.close();
      if (micWsRef.current) micWsRef.current.close();
      if (micAudioContextRef.current) micAudioContextRef.current.close();
      if (systemAudioContextRef.current) systemAudioContextRef.current.close();
    };
  }, [stopMicTranscription]);

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
    
    // Refs
    systemVideoRef,
    
    // Actions
    setSelectedScreenSource,
    setDiarizationEnabled,
    startUnifiedRecording,
    stopUnifiedRecording,
    getSpeakerColor,
    analyzeDisco,
    startDiscoAnalysisInterval,
    stopDiscoAnalysisInterval,
  };
};
