import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PublicJobBoard from './pages/PublicJobBoard';
import JobDetailPage from './pages/JobDetailPage';
import BusinessDashboard from './pages/BusinessDashboard';
import CreateJobPage from './pages/CreateJobPage';
import EditJobPage from './pages/EditJobPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={<PublicJobBoard />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        
        {/* Auth Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Business Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/business-dashboard" element={<BusinessDashboard />} />
          <Route path="/create-job" element={<CreateJobPage />} />
          <Route path="/edit-job/:jobId" element={<EditJobPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;

