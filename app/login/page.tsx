"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase, UserProfile } from "@/lib/supabase"

interface SignupProgress {
  step: number
  total: number
  message: string
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"login" | "signup">("login")
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [organisation, setOrganisation] = useState("")
  const [purpose, setPurpose] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Progress modal state
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState<SignupProgress>({
    step: 0,
    total: 4,
    message: ""
  })
  const [isLoading, setIsLoading] = useState(false)

  const updateProgress = (step: number, message: string) => {
    setProgress({
      step,
      total: 4,
      message
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (password !== confirmPassword) {
      alert("Passwords do not match")
      return
    }

    if (!username || !fullName || !organisation || !purpose || !email || !password) {
      alert("Please fill in all fields")
      return
    }

    setIsLoading(true)
    setShowProgress(true)

    try {
      // Step 1: Create user account in Supabase Auth
      updateProgress(1, "Creating your account...")
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            fullName,
            organisation,
            purpose
          }
        }
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      // Step 2: Wait for user to be created and get UID
      updateProgress(2, "Setting up your profile...")
      
      const uid = authData.user.id

      // Step 3: Save user details to database
      updateProgress(3, "Saving your information...")
      
      const userProfile: Omit<UserProfile, 'id'> = {
        username,
        fullName,
        dateJoined: new Date().toISOString(),
        email,
        organisation,
        uid,
        purpose,
        outlookConnected: false,
        gmailConnected: false,
        callsTaken: 0
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([userProfile])

      if (profileError) {
        throw new Error(profileError.message)
      }

      // Step 4: Complete setup and log in
      updateProgress(4, "Welcome to Sally! Logging you in...")
      
      // Save auth state to localStorage [[memory:8342785]]
      if (typeof window !== "undefined") {
        localStorage.setItem("sally_auth", "true")
        localStorage.setItem("sally_fullname", fullName)
        localStorage.setItem("sally_email", email)
      }

      // Wait a moment to show completion, then redirect
      setTimeout(() => {
        setShowProgress(false)
        setIsLoading(false)
        router.replace("/")
      }, 1000)

    } catch (error) {
      console.error('Signup error:', error)
      alert(`Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setShowProgress(false)
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      alert("Please fill in all fields")
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data.user) {
        // Get user profile to save name and email to localStorage [[memory:8342785]]
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('fullName, email')
          .eq('uid', data.user.id)
          .single()

        if (typeof window !== "undefined") {
          localStorage.setItem("sally_auth", "true")
          if (profile) {
            localStorage.setItem("sally_fullname", profile.fullName)
            localStorage.setItem("sally_email", profile.email)
          }
        }
        
        router.replace("/")
      }
    } catch (error) {
      console.error('Login error:', error)
      alert(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocial = (provider: "gmail" | "outlook") => {
    // Dummy social auth
    if (typeof window !== "undefined") {
      localStorage.setItem("sally_auth", "true")
      localStorage.setItem("sally_provider", provider)
    }
    router.replace("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold">SALLY</h1>
          <p className="text-sm text-gray-600">AI-powered dashboard</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">{tab === "login" ? "Sign in" : "Create account"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input 
                      id="login-email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input 
                      id="login-password" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
                <div className="relative my-4">
                  <div className="border-t" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white px-2 text-xs text-gray-500">or continue with</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button type="button" variant="outline" onClick={() => handleSocial("gmail")} disabled={isLoading}>
                    Sign in with Gmail
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleSocial("outlook")} disabled={isLoading}>
                    Sign in with Outlook
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-username">Username</Label>
                      <Input 
                        id="signup-username" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-fullname">Full name</Label>
                      <Input 
                        id="signup-fullname" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        required 
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-organisation">Organisation</Label>
                    <Input 
                      id="signup-organisation" 
                      value={organisation} 
                      onChange={(e) => setOrganisation(e.target.value)} 
                      required 
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purpose</Label>
                    <Select value={purpose} onValueChange={setPurpose} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales calls and demos</SelectItem>
                        <SelectItem value="success">Customer success & account reviews</SelectItem>
                        <SelectItem value="support">Customer support / incident reviews</SelectItem>
                        <SelectItem value="recruiting">Recruiting interviews</SelectItem>
                        <SelectItem value="product">Product discovery / research</SelectItem>
                        <SelectItem value="internal">Internal team meetings</SelectItem>
                        <SelectItem value="compliance">Compliance / security reviews</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input 
                      id="signup-confirm" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required 
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
                <div className="relative my-4">
                  <div className="border-t" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white px-2 text-xs text-gray-500">or sign up with</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button type="button" variant="outline" onClick={() => handleSocial("gmail")} disabled={isLoading}>
                    Sign up with Gmail
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleSocial("outlook")} disabled={isLoading}>
                    Sign up with Outlook
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Progress Modal */}
      <Dialog open={showProgress} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Creating Your Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress.step} of {progress.total}</span>
              </div>
              <Progress value={(progress.step / progress.total) * 100} className="w-full" />
            </div>
            <p className="text-sm text-gray-600 text-center">
              {progress.message}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


