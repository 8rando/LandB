import { createBrowserRouter, Navigate } from 'react-router';
import { Root } from './components/Root';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Checkout } from './components/Checkout';
import { Invoices } from './components/Invoices';
import { BulkUpload } from './components/BulkUpload';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        path: '/',
        element: <Login />,
      },
      {
        element: (
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '/dashboard',
            element: <Dashboard />,
          },
          {
            path: '/inventory',
            element: (
              <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                <Inventory />
              </ProtectedRoute>
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
              <ProtectedRoute allowedRoles={['admin']}>
                <BulkUpload />
              </ProtectedRoute>
            ),
          },
          {
            path: '/users',
            element: (
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            ),
          },
          {
            path: '/settings',
            element: (
              <ProtectedRoute allowedRoles={['admin']}>
                <Settings />
              </ProtectedRoute>
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
