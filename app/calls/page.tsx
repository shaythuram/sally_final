"use client"

import { useState } from "react"
import {
  Bell,
  Search,
  HelpCircle,
  Calendar,
  Filter,
  MoreHorizontal,
  FileText,
  Mail,
  Clock,
  Users,
  Share,
  Eye,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

// Extended mock data for calls page
const mockCallsData = {
  calls: [
    {
      id: "call_98374",
      title: "AI-WOP Demo — Dell Ops",
      account: "Dell",
      date: "2025-08-25T16:00:00Z",
      duration: 45,
      attendees: [
        { name: "Mei Qi", email: "mei.qi@dell.com", avatar: "/placeholder-user.jpg" },
        { name: "Akshith", email: "ak@sally.ai", avatar: "/placeholder-user.jpg" },
      ],
      stage: "Demo",
      owner: "Akshith",
      postCallCompletion: 85,
      aiSummary:
        "Successful demo of AI-WOP platform to Dell operations team. Key discussion points included latency benchmarks, integration timeline, and compliance requirements. Next steps involve sending technical documentation and scheduling pilot phase.",
      tags: ["Recording", "TranscriptReady", "High Priority"],
      followUps: { total: 5, completed: 3, pending: 2 },
    },
    {
      id: "call_98373",
      title: "Security Review Meeting",
      account: "Kyndryl",
      date: "2025-08-24T14:30:00Z",
      duration: 60,
      attendees: [
        { name: "Sarah Johnson", email: "sarah.j@kyndryl.com", avatar: "/placeholder-user.jpg" },
        { name: "Mike Torres", email: "m.torres@kyndryl.com", avatar: "/placeholder-user.jpg" },
      ],
      stage: "Security Review",
      owner: "Maria",
      postCallCompletion: 60,
      aiSummary:
        "Comprehensive security assessment conducted with Kyndryl team. Discussed data encryption, access controls, and compliance frameworks. Action items include providing security documentation and scheduling follow-up technical review.",
      tags: ["Security", "Compliance"],
      followUps: { total: 3, completed: 1, pending: 2 },
    },
    {
      id: "call_98372",
      title: "Pilot Readout Session",
      account: "Acme Robotics",
      date: "2025-08-23T10:00:00Z",
      duration: 90,
      attendees: [
        { name: "Mike Chen", email: "mike.chen@acme.com", avatar: "/placeholder-user.jpg" },
        { name: "Lisa Wong", email: "lisa.wong@acme.com", avatar: "/placeholder-user.jpg" },
        { name: "David Park", email: "d.park@acme.com", avatar: "/placeholder-user.jpg" },
      ],
      stage: "Pilot Review",
      owner: "David",
      postCallCompletion: 100,
      aiSummary:
        "Excellent pilot results presentation to Acme Robotics leadership. Demonstrated 40% efficiency improvement and 99.9% uptime. Team expressed strong interest in full deployment. Next phase involves contract negotiations and implementation planning.",
      tags: ["Pilot Success", "Contract Ready"],
      followUps: { total: 4, completed: 4, pending: 0 },
    },
    {
      id: "call_98371",
      title: "Technical Deep Dive",
      account: "Globex Corp",
      date: "2025-08-22T15:00:00Z",
      duration: 75,
      attendees: [
        { name: "Jennifer Adams", email: "j.adams@globex.com", avatar: "/placeholder-user.jpg" },
        { name: "Robert Kim", email: "r.kim@globex.com", avatar: "/placeholder-user.jpg" },
      ],
      stage: "Technical Review",
      owner: "Alex",
      postCallCompletion: 40,
      aiSummary:
        "In-depth technical discussion covering API architecture, scalability requirements, and integration patterns. Globex team raised questions about performance under high load and disaster recovery procedures. Follow-up technical documentation needed.",
      tags: ["Technical", "Architecture"],
      followUps: { total: 6, completed: 2, pending: 4 },
    },
    {
      id: "call_98370",
      title: "Quarterly Business Review",
      account: "Dell",
      date: "2025-08-21T11:00:00Z",
      duration: 120,
      attendees: [
        { name: "Mei Qi", email: "mei.qi@dell.com", avatar: "/placeholder-user.jpg" },
        { name: "James Wilson", email: "j.wilson@dell.com", avatar: "/placeholder-user.jpg" },
        { name: "Sarah Chen", email: "s.chen@dell.com", avatar: "/placeholder-user.jpg" },
      ],
      stage: "QBR",
      owner: "Akshith",
      postCallCompletion: 90,
      aiSummary:
        "Comprehensive quarterly review with Dell stakeholders. Reviewed performance metrics, discussed expansion opportunities, and aligned on strategic priorities for Q4. Strong partnership momentum with plans for additional use cases.",
      tags: ["QBR", "Strategic", "Expansion"],
      followUps: { total: 3, completed: 2, pending: 1 },
    },
    {
      id: "call_98369",
      title: "Discovery Call — Manufacturing",
      account: "Acme Robotics",
      date: "2025-08-20T13:30:00Z",
      duration: 45,
      attendees: [
        { name: "Tom Rodriguez", email: "t.rodriguez@acme.com", avatar: "/placeholder-user.jpg" },
        { name: "Emily Zhang", email: "e.zhang@acme.com", avatar: "/placeholder-user.jpg" },
      ],
      stage: "Discovery",
      owner: "Maria",
      postCallCompletion: 75,
      aiSummary:
        "Initial discovery session with Acme's manufacturing division. Identified key pain points in production monitoring and quality control. Strong fit for our automation platform. Scheduled technical demo for next week.",
      tags: ["Discovery", "Manufacturing", "Demo Scheduled"],
      followUps: { total: 4, completed: 3, pending: 1 },
    },
    {
      id: "call_98368",
      title: "Contract Negotiation",
      account: "Kyndryl",
      date: "2025-08-19T16:00:00Z",
      duration: 60,
      attendees: [
        { name: "Sarah Johnson", email: "sarah.j@kyndryl.com", avatar: "/placeholder-user.jpg" },
        { name: "Legal Team", email: "legal@kyndryl.com", avatar: "/placeholder-user.jpg" },
      ],
      stage: "Contract",
      owner: "David",
      postCallCompletion: 95,
      aiSummary:
        "Productive contract negotiation session with Kyndryl legal and procurement teams. Addressed pricing structure, SLA requirements, and liability terms. Minor revisions needed before final signature. Deal expected to close this week.",
      tags: ["Contract", "Legal", "Close Soon"],
      followUps: { total: 2, completed: 1, pending: 1 },
    },
    {
      id: "call_98367",
      title: "Product Roadmap Discussion",
      account: "Globex Corp",
      date: "2025-08-18T10:30:00Z",
      duration: 90,
      attendees: [
        { name: "Jennifer Adams", email: "j.adams@globex.com", avatar: "/placeholder-user.jpg" },
        { name: "Product Team", email: "product@globex.com", avatar: "/placeholder-user.jpg" },
      ],
      stage: "Product Review",
      owner: "Alex",
      postCallCompletion: 55,
      aiSummary:
        "Strategic roadmap alignment session with Globex product leadership. Discussed upcoming feature requirements, integration priorities, and timeline expectations. Need to provide detailed technical specifications and development timeline.",
      tags: ["Roadmap", "Product", "Strategic"],
      followUps: { total: 5, completed: 2, pending: 3 },
    },
  ],
}

export default function CallsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCalls = mockCallsData.calls.filter(
    (call) =>
      call.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.stage.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search calls, accounts, stages..."
                  className="pl-10 w-80 bg-white border-gray-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="bg-white border-gray-200">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-user.jpg" />
                <AvatarFallback>AK</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">All Calls</h1>
            <p className="text-muted-foreground">Manage and review your sales calls</p>
          </div>
        </div>

        {/* Calls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCalls.map((call) => (
            <Card
              key={call.id}
              className="bg-white border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold mb-1 group-hover:text-gray-900 transition-colors">
                      {call.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">{call.account}</span>
                      <span>•</span>
                      <span>{new Date(call.date).toLocaleDateString()}</span>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 mr-2" />
                        Open Notes
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Follow-up
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share className="h-4 w-4 mr-2" />
                        Share Summary
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Call Meta Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{call.duration}min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{call.attendees.length} attendees</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-3">
                  <Badge className="text-xs bg-gray-100 text-gray-700 border-gray-200">{call.stage}</Badge>
                  {call.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs bg-white border-gray-200">
                      {tag}
                    </Badge>
                  ))}
                  {call.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs bg-white border-gray-200">
                      +{call.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Post-Call Completion */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Post-Call Completion</span>
                    <span className="text-sm font-semibold text-gray-900">{call.postCallCompletion}%</span>
                  </div>
                  <Progress value={call.postCallCompletion} className="h-2 bg-gray-100" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>
                      {call.followUps.completed}/{call.followUps.total} tasks completed
                    </span>
                    <span>{call.followUps.pending} pending</span>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    AI Summary
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{call.aiSummary}</p>
                </div>

                {/* Attendees */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {call.attendees.slice(0, 3).map((attendee, i) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-background shadow-sm">
                          <AvatarImage src={attendee.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs bg-gray-100">
                            {attendee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {call.attendees.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-background flex items-center justify-center shadow-sm">
                          <span className="text-xs font-medium">+{call.attendees.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Owner: {call.owner}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredCalls.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No calls found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "No calls match your current filters"}
            </p>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
