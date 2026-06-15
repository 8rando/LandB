import { useState, useEffect } from 'react'
import { Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { databaseService } from '../../services/supabase'

interface ConnectionStatusProps {
  showDetails?: boolean
}

export function ConnectionStatus({ showDetails = false }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [dbConnected, setDbConnected] = useState<boolean | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const checkDatabaseConnection = async () => {
      try {
        const { connected } = await databaseService.testConnection()
        setDbConnected(connected)
        setLastCheck(new Date())
      } catch (error) {
        setDbConnected(false)
        setLastCheck(new Date())
      }
    }

    checkDatabaseConnection()

    const interval = setInterval(checkDatabaseConnection, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  if (!isOnline) {
    return (
      <Alert>
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          No internet connection. Some features may not work.
        </AlertDescription>
      </Alert>
    )
  }

  if (dbConnected === false) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Database connection error. Please check your configuration.
          {showDetails && lastCheck && (
            <span className="block text-xs mt-1">
              Last checked: {lastCheck.toLocaleTimeString()}
            </span>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (showDetails && dbConnected === true) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Wifi className="w-4 h-4" />
        <span>Connected to database</span>
        {lastCheck && (
          <span className="text-xs text-gray-500">
            ({lastCheck.toLocaleTimeString()})
          </span>
        )}
      </div>
    )
  }

  return null
}