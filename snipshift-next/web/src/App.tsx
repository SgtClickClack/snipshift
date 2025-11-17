import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import PublicJobBoard from './pages/PublicJobBoard';
import JobDetailPage from './pages/JobDetailPage';
import BusinessDashboard from './pages/BusinessDashboard';
import CreateJobPage from './pages/CreateJobPage';
import EditJobPage from './pages/EditJobPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      // --- Public Routes ---
      {
        path: '/',
        element: <PublicJobBoard />,
      },
      {
        path: '/jobs/:jobId',
        element: <JobDetailPage />,
      },
      
      // --- Auth Route ---
      {
        path: '/login',
        element: <LoginPage />,
      },

      // --- Protected Business Routes ---
      {
        element: <ProtectedRoute />, // <-- Wrapper route
        children: [
          {
            path: '/business-dashboard',
            element: <BusinessDashboard />,
          },
          {
            path: '/create-job',
            element: <CreateJobPage />,
          },
          {
            path: '/edit-job/:jobId',
            element: <EditJobPage />,
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;

