import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FarmProvider } from './context/FarmContext';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import Charts from './components/Charts';
import Devices from './components/Devices';
import Weather from './components/Weather';
import UserManagement from './components/UserManagement';
import ScheduleManager from './components/ScheduleManager';
import ThresholdAlertPage from './components/ThresholdAlertPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Trang đăng nhập */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Dashboard với nested routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard Home */}
            <Route 
              path="dashboard" 
              element={
                <FarmProvider>
                  <DashboardHome />
                </FarmProvider>
              } 
            />
            
            {/* Charts - Không cần FarmProvider */}
            <Route path="charts" element={<Charts />} />
            
            {/* Devices - Cần FarmProvider */}
            <Route 
              path="devices" 
              element={
                <FarmProvider>
                  <Devices />
                </FarmProvider>
              } 
            />
            
            {/* Weather - Không cần FarmProvider */}
            <Route path="weather" element={<Weather />} />
            
            {/* Threshold Alerts - Cảnh báo ngưỡng */}
            <Route 
              path="alerts" 
              element={
                <FarmProvider>
                  <ThresholdAlertPage />
                </FarmProvider>
              } 
            />
            
            {/* User Management - chỉ ADMIN */}
            <Route 
              path="users" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            
            {/* Schedule Management - OPERATOR và ADMIN */}
            <Route 
              path="schedules" 
              element={
                <ProtectedRoute allowedRoles={['OPERATOR', 'ADMIN']}>
                  <ScheduleManager />
                </ProtectedRoute>
              } 
            />
            
            {/* Redirect root đến dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Component wrapper cho Login page
function LoginPage() {
  const handleLoginSuccess = () => {
    window.location.href = '/dashboard';
  };

  return <Login onLoginSuccess={handleLoginSuccess} />;
}

export default App;
