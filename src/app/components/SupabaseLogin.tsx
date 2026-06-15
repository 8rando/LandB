import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import { useSupabaseAuth } from '../context/SupabaseAuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertCircle, Loader2, Database } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { databaseService } from '../../services/supabase'

export function SupabaseLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const { signIn, user, isLocked, lockoutTime } = useSupabaseAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  useEffect(() => {
    // Check if database is initialized
    const checkDatabase = async () => {
      try {
        const { connected, userCount } = await databaseService.getHealthStatus()
        if (!connected || userCount === 0) {
          setShowSetup(true)
        }
      } catch (error) {
        setShowSetup(true)
      }
    }
    checkDatabase()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isLocked) {
      setError(`Account locked. Try again in ${lockoutTime} seconds.`)
      setLoading(false)
      return
    }

    try {
      const { success, error: signInError } = await signIn(email, password)

      if (!success) {
        setError(signInError || 'Login failed')
        setPassword('')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setEmail('admin@lanims.com')
    setPassword('admin123')
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
            {showSetup && (
              <Alert className="mb-4">
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Database setup required.
                  <Link to="/setup" className="text-blue-600 hover:underline ml-1">
                    Click here to configure
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lanims.com"
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
                  placeholder="Enter your password"
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

              {isLocked && (
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
                disabled={loading || isLocked}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDemoLogin}
                  disabled={loading}
                >
                  Use Demo Credentials
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
              <p>Default Admin: admin@lanims.com / admin123</p>
              <p>First time? Set up your database above.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}