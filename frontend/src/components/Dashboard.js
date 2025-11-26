import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SensorDisplay from '../components/SensorDisplay';
import DeviceControl from '../components/DeviceControl';
import SensorChart from '../components/SensorChart';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      logout();
      window.location.href = '/login';
    }
  };

  const menuItems = [
    { icon: '📊', label: 'Tổng quan', path: '/dashboard', active: true },
    { icon: '📈', label: 'Biểu đồ', path: '/charts' },
    { icon: '⚡', label: 'Thiết bị', path: '/devices' },
    { icon: '⏰', label: 'Hẹn giờ', path: '/schedules', role: ['OPERATOR', 'ADMIN'] },
    { icon: '👥', label: 'Người dùng', path: '/users', role: ['ADMIN'] },
  ];

  const filteredMenu = menuItems.filter(item => {
    if (!item.role) return true;
    return item.role.includes(user?.role);
  });

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
              className={`nav-item ${item.active ? 'active' : ''}`}
              onClick={() => item.path !== '/dashboard' && navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-label">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="page-title">Dashboard Admin</h1>
            <p className="page-subtitle">Tổng quan hệ thống Cookiey</p>
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

        {/* Content Area */}
        <main className="content-area">
          <SensorDisplay />
          <DeviceControl />
          <SensorChart />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
