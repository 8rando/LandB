import { Outlet } from 'react-router';
import { SupabaseAuthProvider } from '../context/SupabaseAuthContext';
import { SupabaseDataProvider } from '../context/SupabaseDataContext';
import { ErrorBoundary } from './ErrorBoundary';
import { Toaster } from 'sonner';

export function Root() {
  return (
    <ErrorBoundary>
      <SupabaseAuthProvider>
        <SupabaseDataProvider>
          <Outlet />
          <Toaster position="top-right" />
        </SupabaseDataProvider>
      </SupabaseAuthProvider>
    </ErrorBoundary>
  );
}
