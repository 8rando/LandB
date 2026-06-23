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

type Mode = 'login' | 'register' | 'forgot'

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)
  const captchaRef = useRef<HCaptcha | null>(null)
  const {
    signIn, signUp, resendConfirmation, updatePassword, resetPassword,
    user, isLocked, lockoutTime, sessionConflict, clearSessionConflict,
    isPasswordRecovery, clearPasswordRecovery,
  } = useSupabaseAuth()
  const navigate = useNavigate()

  const captchaEnabled = Boolean(HCAPTCHA_SITE_KEY)

  useEffect(() => {
    if (user && !isPasswordRecovery) navigate('/dashboard')
  }, [user, isPasswordRecovery, navigate])

  const resetCaptcha = () => {
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
  }

  const resetFields = () => {
    setPassword('')
    setConfirmPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
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

    if (captchaEnabled && !captchaToken && mode !== 'register') {
      setError('Please complete the captcha.')
      return
    }

    setLoading(true)
    const tokenForRequest = captchaToken ?? undefined
    resetCaptcha()

    try {
      if (mode === 'login') {
        const { success, error: signInError } = await signIn(email, password, tokenForRequest)
        if (!success) {
          setError(signInError || 'Login failed')
          setPassword('')
        }
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        const { success, needsEmailConfirmation, error: signUpError } = await signUp(
          email, password, username, undefined,
        )
        if (!success) {
          setError(signUpError || 'Registration failed')
        } else if (needsEmailConfirmation) {
          setPendingConfirmationEmail(email)
        }
      } else if (mode === 'forgot') {
        const { success, error: resetError } = await resetPassword(email, tokenForRequest)
        if (!success) {
          setError(resetError || 'Could not send reset email.')
        } else {
          setForgotSent(true)
        }
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { success, error: updateError } = await updatePassword(newPassword)
    setLoading(false)
    if (!success) {
      setError(updateError || 'Could not update password.')
    } else {
      clearPasswordRecovery()
      navigate('/dashboard')
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
    const { success, error: resendError } = await resendConfirmation(pendingConfirmationEmail, tokenForRequest)
    setLoading(false)
    if (success) {
      setInfo('Confirmation email resent. Check your inbox (and spam folder).')
    } else {
      setError(resendError || 'Could not resend confirmation email.')
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setForgotSent(false)
    setPendingConfirmationEmail(null)
    resetFields()
  }

  useEffect(() => {
    return () => clearSessionConflict()
  }, [])

  // Password reset — user arrived via the reset email link
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <Database className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl">Set new password</CardTitle>
              <p className="text-muted-foreground">Choose a strong password for your account.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 12 characters"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    At least 12 characters with a lowercase letter, an uppercase letter, a number, and a special character.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirm Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    disabled={loading}
                  />
                </div>
                {error && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

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
            {/* Email confirmation pending */}
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
                {info && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{info}</AlertDescription></Alert>}
                {error && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                {captchaEnabled && (
                  <div className="flex justify-center">
                    <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY as string}
                      onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={handleResend} disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Resend email
                  </Button>
                  <Button type="button" onClick={() => switchMode('login')}>Back to sign in</Button>
                </div>
              </div>

            ) : mode === 'forgot' ? (
              /* Forgot password */
              forgotSent ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center text-center space-y-3 py-2">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <MailCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Check your email</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link has been sent.
                      </p>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => switchMode('login')}>Back to sign in</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">Reset your password</p>
                    <p className="text-sm text-muted-foreground mt-1">Enter your account email and we'll send a reset link.</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com" required disabled={loading} />
                    </div>
                    {captchaEnabled && (
                      <div className="flex justify-center">
                        <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY as string}
                          onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
                      </div>
                    )}
                    {error && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send reset link
                    </Button>
                  </form>
                  <div className="text-center text-sm">
                    <button onClick={() => switchMode('login')} className="text-blue-600 hover:underline">Back to sign in</button>
                  </div>
                </div>
              )

            ) : (
              /* Login / Register */
              <>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <button type="button" onClick={() => switchMode('login')}
                    className={`py-2 rounded-lg text-sm border-2 transition-colors ${mode === 'login' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    Sign In
                  </button>
                  <button type="button" onClick={() => switchMode('register')}
                    className={`py-2 rounded-lg text-sm border-2 transition-colors ${mode === 'register' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    Register
                  </button>
                </div>

                {sessionConflict && mode === 'login' && (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>You were signed out because this account was logged into on another device.</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'register' && (
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" type="text" value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. jsmith" required disabled={loading} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">{mode === 'register' ? 'Email' : 'Email or Username'}</Label>
                    <Input id="email" type={mode === 'register' ? 'email' : 'text'} value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === 'register' ? 'you@example.com' : 'you@example.com or jsmith'}
                      required disabled={loading} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'Create a strong password' : 'Enter your password'}
                      required disabled={loading} />
                    {mode === 'register' && (
                      <p className="text-xs text-muted-foreground">
                        At least 12 characters with a lowercase letter, an uppercase letter, a number, and a special character.
                      </p>
                    )}
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" type="password" value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password" required disabled={loading} />
                    </div>
                  )}

                  {captchaEnabled && mode !== 'register' && (
                    <div className="flex justify-center">
                      <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY as string}
                        onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
                    </div>
                  )}

                  {error && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

                  {mode === 'login' && isLocked && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Account locked for {lockoutTime} seconds due to multiple failed attempts.</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || (mode === 'login' && isLocked)}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground space-y-1">
                  {mode === 'login' ? (
                    <>
                      <p>
                        No account yet?{' '}
                        <button onClick={() => switchMode('register')} className="text-blue-600 hover:underline">Register here</button>
                      </p>
                      <p>
                        <button onClick={() => switchMode('forgot')} className="text-blue-600 hover:underline">Forgot password?</button>
                      </p>
                    </>
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
