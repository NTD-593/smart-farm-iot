import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const menuItems = [
    { icon: '📊', label: 'Tổng quan', path: '/dashboard' },
    { icon: '📈', label: 'Biểu đồ', path: '/charts' },
    { icon: '⚡', label: 'Thiết bị', path: '/devices' },
    { icon: '🌤️', label: 'Thời tiết', path: '/weather' },
    { icon: '⏰', label: 'Hẹn giờ', path: '/schedules', role: ['OPERATOR', 'ADMIN'] },
    { icon: '👥', label: 'Người dùng', path: '/users', role: ['ADMIN'] },
  ];

  const filteredMenu = menuItems.filter(item => {
    if (!item.role) return true;
    return item.role.includes(user?.role);
  });

  const getPageTitle = () => {
    const currentPath = location.pathname;
    const currentItem = menuItems.find(item => item.path === currentPath);
    return currentItem?.label || 'Dashboard';
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🌱</span>
            {!sidebarCollapsed && <span className="logo-text">Smart Farm</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredMenu.map((item, index) => (
            <button
              key={index}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={() => setShowLogoutModal(true)}>
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-label">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">Xác nhận đăng xuất</h3>
            <p className="modal-message">Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?</p>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowLogoutModal(false)}>
                Hủy
              </button>
              <button className="modal-btn confirm-btn" onClick={handleLogout}>
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="page-title">{getPageTitle()}</h1>
            <p className="page-subtitle">Hệ thống giám sát nông trại thông minh</p>
          </div>
          <div className="top-bar-right">
            <div className="user-profile">
              <div className="user-avatar">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.fullName || user?.username}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
            <span className="current-date">{new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </header>

        {/* Content Area - Renders child routes */}
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
