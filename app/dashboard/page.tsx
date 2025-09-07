"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"

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

  const togglePanelVisibility = (panelId: string) => {
    setPanels(prev => prev.map(panel => 
      panel.id === panelId ? { ...panel, isVisible: !panel.isVisible } : panel
    ))
  }

  const handleShowAll = () => {
    setPanels(prev => prev.map(panel => ({ ...panel, isVisible: true })))
    setShowAllPanels(true)
  }

  const handleHideAll = () => {
    setPanels(prev => prev.map(panel => ({ ...panel, isVisible: false })))
    setShowAllPanels(false)
  }

  const visiblePanels = panels.filter(panel => panel.isVisible && panel.id !== "empty")

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
                <nav className="text-sm text-muted-foreground flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Protect</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span>Overlay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Test Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    <span>Demo Mode</span>
                  </div>
                </nav>
              </div>

              <div className="flex items-center gap-4">
                <Button 
                  variant="destructive" 
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
                >
                  <X className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - fills remaining space */}
        <div className="flex-1 flex flex-col px-6 py-6">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Live Transcription */}
            <div className="lg:col-span-1">
              <Card className="h-full shadow-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-lg font-semibold">Live Transcription</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs px-3 py-1">
                      Quick Answers
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Speaker indicators */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">You</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Customer</span>
                    </div>
                  </div>

                  {/* Dual audio status */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">
                        Dual audio capture active: Microphone (You) + System Audio (Customer)
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {mockTranscriptionData.currentTime}
                    </div>
                  </div>

                  {/* Transcription message */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-900 leading-relaxed">
                      {mockTranscriptionData.lastMessage.text}
                    </div>
                    <div className="text-xs text-gray-500 mt-3">
                      {mockTranscriptionData.lastMessage.timestamp}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - SICOD Panels */}
            <div className="lg:col-span-2">
              <div className="flex gap-8 h-full">
                {/* Left side - 3 panels */}
                <div className="flex-1 flex flex-col space-y-6">
                  <Card className="flex-1 shadow-sm border border-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-base font-semibold">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          D
                        </div>
                        Decision Criteria
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        What factors is the buyer using to evaluate potential solutions?
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="flex-1 shadow-sm border border-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-base font-semibold">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          S
                        </div>
                        Situation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        What is the current state of the buyer's tools, workflow, or operations?
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="flex-1 shadow-sm border border-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-base font-semibold">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          O
                        </div>
                        Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        What goals is the buyer trying to achieve in the next 3-12 months?
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Right side - 2 panels */}
                <div className="flex-1 flex flex-col space-y-6">
                  <Card className="flex-1 shadow-sm border border-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-base font-semibold">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          I
                        </div>
                        Impact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        What are the business or technical impacts if this problem is solved?
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="flex-1 shadow-sm border border-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-base font-semibold">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          C
                        </div>
                        Challenges
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        What pain points or limitations is the buyer currently facing?
                      </p>
                    </CardContent>
                  </Card>
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
              {panels.filter(p => p.id !== "empty").map((panel) => (
                <div key={panel.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 ${panel.isVisible ? 'bg-green-500' : 'bg-gray-300'} rounded-full`}></div>
                  <span className="text-sm text-gray-600">{panel.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  )
}
