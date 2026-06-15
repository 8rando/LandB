import { createBrowserRouter, Navigate } from 'react-router';
import { Root } from './components/Root';
import { Layout } from './components/Layout';
import { SupabaseLogin } from './components/SupabaseLogin';
import { DatabaseSetup } from './components/DatabaseSetup';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Checkout } from './components/Checkout';
import { Invoices } from './components/Invoices';
import { BulkUpload } from './components/BulkUpload';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { SupabaseProtectedRoute } from './components/SupabaseProtectedRoute';

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        path: '/',
        element: <SupabaseLogin />,
      },
      {
        path: '/setup',
        element: <DatabaseSetup />,
      },
      {
        element: (
          <SupabaseProtectedRoute>
            <Layout />
          </SupabaseProtectedRoute>
        ),
        children: [
          {
            path: '/dashboard',
            element: <Dashboard />,
          },
          {
            path: '/inventory',
            element: (
              <SupabaseProtectedRoute allowedRoles={['admin', 'cashier']}>
                <Inventory />
              </SupabaseProtectedRoute>
            ),
          },
          {
            path: '/checkout',
            element: <Checkout />,
          },
          {
            path: '/invoices',
            element: <Invoices />,
          },
          {
            path: '/bulk-upload',
            element: (
              <SupabaseProtectedRoute allowedRoles={['admin']}>
                <BulkUpload />
              </SupabaseProtectedRoute>
            ),
          },
          {
            path: '/users',
            element: (
              <SupabaseProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </SupabaseProtectedRoute>
            ),
          },
          {
            path: '/settings',
            element: (
              <SupabaseProtectedRoute allowedRoles={['admin']}>
                <Settings />
              </SupabaseProtectedRoute>
            ),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
