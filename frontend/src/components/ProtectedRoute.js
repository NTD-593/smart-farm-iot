import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requireAdmin = false, allowedRoles = null }) {
  const { isAuthenticated, isAdmin, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Đang tải...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#c33'
      }}>
        <h2>⛔ Không có quyền truy cập</h2>
        <p>Bạn cần quyền ADMIN để truy cập trang này.</p>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#c33'
      }}>
        <h2>⛔ Không có quyền truy cập</h2>
        <p>Bạn cần quyền {allowedRoles.join(' hoặc ')} để truy cập trang này.</p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
