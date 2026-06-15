import { Outlet } from 'react-router';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { Toaster } from 'sonner';

export function Root() {
  return (
    <AuthProvider>
      <DataProvider>
        <Outlet />
        <Toaster position="top-right" />
      </DataProvider>
    </AuthProvider>
  );
}
