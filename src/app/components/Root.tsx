import { Outlet } from 'react-router';
import { ThemeProvider } from 'next-themes';
import { SupabaseAuthProvider } from '../context/SupabaseAuthContext';
import { SupabaseDataProvider } from '../context/SupabaseDataContext';
import { ErrorBoundary } from './ErrorBoundary';
import { Toaster } from 'sonner';

export function Root() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SupabaseAuthProvider>
          <SupabaseDataProvider>
            <Outlet />
            <Toaster position="top-right" />
          </SupabaseDataProvider>
        </SupabaseAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
