"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, UserProfile } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Mail, User, Building, Target, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [purpose, setPurpose] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [usernameError, setUsernameError] = useState('')

  const updateProgress = (step: number, message: string) => {
    setProgress((step / 4) * 100)
    setProgressMessage(message)
  }

  const checkUsernameAvailability = async (username: string) => {
    if (!username) {
      setUsernameStatus('idle')
      setUsernameError('')
      return
    }

    if (username.length < 5) {
      setUsernameStatus('idle')
      setUsernameError('Username must be at least 5 characters long')
      return
    }

    setUsernameStatus('checking')
    setUsernameError('')

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking username:', error)
        setUsernameStatus('idle')
        setUsernameError('Error checking username availability')
        return
      }

      if (data) {
        setUsernameStatus('taken')
        setUsernameError('Username is already taken')
      } else {
        setUsernameStatus('available')
        setUsernameError('')
      }
    } catch (error) {
      console.error('Error checking username:', error)
      setUsernameStatus('idle')
      setUsernameError('Error checking username availability')
    }
  }

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    // Debounce the username check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(value)
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!email || !password || !confirmPassword || !fullName || !username || !organisation || !purpose) {
      alert("Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match")
      return
    }

    if (usernameStatus === 'taken') {
      alert("Please choose a different username")
      return
    }

    if (usernameStatus === 'checking') {
      alert("Please wait while we check username availability")
      return
    }

    if (username.length < 5) {
      alert("Username must be at least 5 characters long")
      return
    }

    setIsLoading(true)
    setShowProgress(true)

    try {
      // Step 1: Create auth user
      updateProgress(1, "Creating your account...")
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
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
      
      const userProfile: UserProfile = {
        username,
        full_name: fullName,
        date_joined: new Date().toISOString(),
        email,
        organisation,
        uid,
        purpose,
        outlook_connected: false,
        gmail_connected: false,
        calls_taken: 0
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
          .select('full_name, email')
          .eq('uid', data.user.id)
          .single()

        if (typeof window !== "undefined") {
          localStorage.setItem("sally_auth", "true")
          if (profile) {
            localStorage.setItem("sally_fullname", profile.full_name)
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
    alert(`${provider} login coming soon!`)
  }

  if (showProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Setting up your account
            </CardTitle>
            <CardDescription className="text-gray-600">
              Please wait while we create your Sally profile...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="text-gray-900 font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">{progressMessage}</span>
              </div>
            </div>

            <div className="space-y-3">
              {progress >= 25 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Account created</span>
                </div>
              )}
              {progress >= 50 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Profile setup</span>
                </div>
              )}
              {progress >= 75 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Information saved</span>
                </div>
              )}
              {progress >= 100 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Welcome to Sally!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {isLogin 
              ? 'Sign in to your Sally dashboard' 
              : 'Join Sally and start managing your calls'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="Choose a username"
                    className={`pr-10 ${usernameStatus === 'taken' || usernameError.includes('5 characters') ? 'border-red-500' : usernameStatus === 'available' ? 'border-green-500' : ''}`}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {usernameStatus === 'available' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {usernameStatus === 'taken' && (
                      <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                  </div>
                </div>
                {usernameError && (
                  <p className="mt-1 text-sm text-red-600">{usernameError}</p>
                )}
                {usernameStatus === 'available' && (
                  <p className="mt-1 text-sm text-green-600">Username is available!</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation
                </label>
                <Input
                  type="text"
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  placeholder="Your company or organization"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose
                </label>
                <Select value={purpose} onValueChange={setPurpose} required>
                  <SelectTrigger>
                    <SelectValue placeholder="How will you use Sally?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Calls</SelectItem>
                    <SelectItem value="customer-support">Customer Support</SelectItem>
                    <SelectItem value="interviews">Job Interviews</SelectItem>
                    <SelectItem value="meetings">Business Meetings</SelectItem>
                    <SelectItem value="consulting">Consulting Sessions</SelectItem>
                    <SelectItem value="training">Training Sessions</SelectItem>
                    <SelectItem value="research">Research Interviews</SelectItem>
                    <SelectItem value="personal">Personal Calls</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          )}
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleSocial('gmail')}
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                Gmail
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocial('outlook')}
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                Outlook
              </Button>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <span className="inline-flex items-center gap-1">
                    Sign up <ArrowRight className="h-3 w-3" />
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span className="inline-flex items-center gap-1">
                    Sign in <ArrowRight className="h-3 w-3" />
                  </span>
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}