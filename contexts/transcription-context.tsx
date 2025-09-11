"use client"

import React, { createContext, useContext, ReactNode } from 'react'
import { useTranscription, TranscriptionMessage, ScreenSource } from '@/hooks/use-transcription'

interface TranscriptionContextType {
  // State
  isRecording: boolean
  recordingTime: number
  systemPreview: boolean
  selectedScreenSource: string
  screenSources: ScreenSource[]
  systemTranscribing: boolean
  micTranscribing: boolean
  systemTranscriptionError: string
  transcriptionError: string
  systemSpeakers: Map<number, string>
  diarizationEnabled: boolean
  allMessages: TranscriptionMessage[]
  currentMicMessage: string
  
  // Refs
  systemVideoRef: React.RefObject<HTMLVideoElement>
  
  // Actions
  setSelectedScreenSource: (source: string) => void
  setDiarizationEnabled: (enabled: boolean) => void
  startUnifiedRecording: () => Promise<void>
  stopUnifiedRecording: () => void
  getSpeakerColor: (speakerId: number) => string
}

const TranscriptionContext = createContext<TranscriptionContextType | undefined>(undefined)

interface TranscriptionProviderProps {
  children: ReactNode
}

export function TranscriptionProvider({ children }: TranscriptionProviderProps) {
  const transcription = useTranscription()

  return (
    <TranscriptionContext.Provider value={transcription}>
      {children}
    </TranscriptionContext.Provider>
  )
}

export function useTranscriptionContext() {
  const context = useContext(TranscriptionContext)
  if (context === undefined) {
    throw new Error('useTranscriptionContext must be used within a TranscriptionProvider')
  }
  return context
}
