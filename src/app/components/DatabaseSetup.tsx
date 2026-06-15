import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { AlertCircle, CheckCircle, Database, Loader2, Users, Settings, Package } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { databaseService, authService, settingsService, productsService } from '../../services/supabase'

interface DatabaseStatus {
  connected: boolean
  userCount: number
  productCount: number
  invoiceCount: number
  error: Error | null
}

export function DatabaseSetup() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setLoading(true)
    try {
      const healthStatus = await databaseService.getHealthStatus()
      setStatus(healthStatus)
    } catch (error) {
      setStatus({
        connected: false,
        userCount: 0,
        productCount: 0,
        invoiceCount: 0,
        error: error as Error
      })
    } finally {
      setLoading(false)
    }
  }

  const initializeDatabase = async () => {
    setInitializing(true)
    try {
      const { success, error } = await databaseService.initializeDatabase()
      if (!success && error) {
        console.error('Database initialization failed:', error)
      }
      await checkStatus()
    } catch (error) {
      console.error('Database initialization failed:', error)
    } finally {
      setInitializing(false)
    }
  }

  const seedSampleData = async () => {
    setSeeding(true)
    try {
      const { success, error } = await databaseService.seedSampleData()
      if (!success && error) {
        console.error('Sample data seeding failed:', error)
      }
      await checkStatus()
    } catch (error) {
      console.error('Sample data seeding failed:', error)
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Checking database status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Database Setup</h1>
        <p className="text-muted-foreground">Configure your Supabase database for LanIMS</p>
      </div>

      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {status.connected ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={status.connected ? 'text-green-600' : 'text-red-600'}>
                {status.connected ? 'Connected to Supabase' : 'Connection Failed'}
              </span>
            </div>

            {status.error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error: {status.error.message}
                </AlertDescription>
              </Alert>
            )}

            {status.connected && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{status.userCount}</div>
                  <div className="text-sm text-muted-foreground">Users</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Package className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">{status.productCount}</div>
                  <div className="text-sm text-muted-foreground">Products</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Settings className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">{status.invoiceCount}</div>
                  <div className="text-sm text-muted-foreground">Invoices</div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button onClick={checkStatus} variant="outline" disabled={loading}>
                <Database className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>

              {status.connected && status.userCount === 0 && (
                <Button onClick={initializeDatabase} disabled={initializing}>
                  {initializing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Initialize Database
                </Button>
              )}

              {status.connected && status.productCount === 0 && (
                <Button onClick={seedSampleData} variant="secondary" disabled={seeding}>
                  {seeding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Sample Data
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>Follow these steps to set up your database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2">
            <li>Ensure your Supabase project is created and running</li>
            <li>Run the main schema SQL file in your Supabase SQL editor</li>
            <li>Run the additional functions SQL file for extended functionality</li>
            <li>Click "Initialize Database" to create the default admin user</li>
            <li>Optionally click "Add Sample Data" to populate with demo products</li>
          </ol>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Default admin credentials: admin@lanims.com / admin123
              <br />
              You can change these after the initial setup.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}