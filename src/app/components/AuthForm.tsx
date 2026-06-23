import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useSupabaseAuth } from '../context/SupabaseAuthContext'
import { HCAPTCHA_SITE_KEY } from '../../lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertCircle, Loader2, Database, MailCheck } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'

type Mode = 'login' | 'register'

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha | null>(null)
  const {
    signIn,
    signUp,
    resendConfirmation,
    user,
    isLocked,
    lockoutTime,
    sessionConflict,
    clearSessionConflict,
  } = useSupabaseAuth()
  const navigate = useNavigate()

  const captchaEnabled = Boolean(HCAPTCHA_SITE_KEY)

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const resetCaptcha = () => {
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
  }

  const resetFields = () => {
    setPassword('')
    setConfirmPassword('')
    setError('')
    setInfo('')
    resetCaptcha()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (mode === 'login' && isLocked) {
      setError(`Account locked. Try again in ${lockoutTime} seconds.`)
      return
    }

    if (captchaEnabled && !captchaToken) {
      setError('Please complete the captcha.')
      return
    }

    setLoading(true)

    // Captcha tokens are single-use — snapshot and immediately invalidate so
    // nothing can replay this one (StrictMode re-renders, double-clicks, etc.).
    const tokenForRequest = captchaToken ?? undefined
    resetCaptcha()

    try {
      if (mode === 'login') {
        const { success, error: signInError } = await signIn(email, password, tokenForRequest)
        if (!success) {
          setError(signInError || 'Login failed')
          setPassword('')
        }
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }

        const { success, needsEmailConfirmation, error: signUpError } = await signUp(
          email,
          password,
          username,
          // Don't pass captcha token on signup — Supabase double-verifies it
          // when email confirmation is enabled, causing already-seen-response.
          // Signup is gated by the email allowlist + confirmation email instead.
          undefined,
        )
        if (!success) {
          setError(signUpError || 'Registration failed')
        } else if (needsEmailConfirmation) {
          setPendingConfirmationEmail(email)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!pendingConfirmationEmail) return
    if (captchaEnabled && !captchaToken) {
      setError('Please complete the captcha to resend.')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    const tokenForRequest = captchaToken ?? undefined
    resetCaptcha()
    const { success, error: resendError } = await resendConfirmation(
      pendingConfirmationEmail,
      tokenForRequest,
    )
    setLoading(false)
    if (success) {
      setInfo('Confirmation email resent. Check your inbox (and spam folder).')
    } else {
      setError(resendError || 'Could not resend confirmation email.')
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setPendingConfirmationEmail(null)
    resetFields()
  }

  useEffect(() => {
    return () => clearSessionConflict()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <Database className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">LanIMS</CardTitle>
            <p className="text-muted-foreground">Inventory Management System</p>
          </CardHeader>
          <CardContent>
            {pendingConfirmationEmail ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center space-y-3 py-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <MailCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Check your email</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We sent a confirmation link to{' '}
                      <span className="font-medium text-foreground">{pendingConfirmationEmail}</span>.
                      Click it to activate your account, then sign in.
                    </p>
                  </div>
                </div>

                {info && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{info}</AlertDescription>
                  </Alert>
                )}
                {error && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {captchaEnabled && (
                  <div className="flex justify-center">
                    <HCaptcha
                      ref={captchaRef}
                      sitekey={HCAPTCHA_SITE_KEY as string}
                      onVerify={setCaptchaToken}
                      onExpire={() => setCaptchaToken(null)}
                      onError={() => setCaptchaToken(null)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResend}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Resend email
                  </Button>
                  <Button
                    type="button"
                    onClick={() => switchMode('login')}
                  >
                    Back to sign in
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`py-2 rounded-lg text-sm border-2 transition-colors ${
                      mode === 'login'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={`py-2 rounded-lg text-sm border-2 transition-colors ${
                      mode === 'register'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Register
                  </button>
                </div>

                {sessionConflict && mode === 'login' && (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You were signed out because this account was logged into on another device.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'register' && (
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. jsmith"
                        required
                        disabled={loading}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'Create a strong password' : 'Enter your password'}
                      required
                      disabled={loading}
                    />
                    {mode === 'register' && (
                      <p className="text-xs text-muted-foreground">
                        At least 8 characters with a lowercase letter, an uppercase letter, a number, and a special character.
                      </p>
                    )}
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        disabled={loading}
                      />
                    </div>
                  )}

                  {captchaEnabled && (
                    <div className="flex justify-center">
                      <HCaptcha
                        ref={captchaRef}
                        sitekey={HCAPTCHA_SITE_KEY as string}
                        onVerify={setCaptchaToken}
                        onExpire={() => setCaptchaToken(null)}
                        onError={() => setCaptchaToken(null)}
                      />
                    </div>
                  )}

                  {error && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {mode === 'login' && isLocked && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Account locked for {lockoutTime} seconds due to multiple failed attempts.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || (mode === 'login' && isLocked)}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
                  {mode === 'login' ? (
                    <p>
                      No account yet?{' '}
                      <button onClick={() => switchMode('register')} className="text-blue-600 hover:underline">
                        Register here
                      </button>
                    </p>
                  ) : (
                    <p>Contact an administrator if signup is blocked.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
