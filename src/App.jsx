import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import LandingPage from './pages/LandingPage';
import CommandPalette from './components/CommandPalette';
import './App.css';

function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <GlobalSkeletonLoader />;
  }

  if (!currentUser) return <Navigate to="/" />;
  if (requiredRole && userProfile?.role !== requiredRole) {
    return <Navigate to={userProfile?.role === 'admin' ? '/admin' : '/dashboard'} />;
  }

  return children;
}

function AppRoutes() {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <GlobalSkeletonLoader />;
  }

  return (
    <Routes>
      <Route path="/" element={
        currentUser ? (
          <Navigate to={userProfile?.role === 'admin' ? '/admin' : '/dashboard'} />
        ) : (
          <LandingPage />
        )
      } />
      <Route path="/login" element={
        currentUser ? (
          <Navigate to={userProfile?.role === 'admin' ? '/admin' : '/dashboard'} />
        ) : (
          <LoginPage />
        )
      } />
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute requiredRole="employee">
          <EmployeeDashboard />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <CommandPalette />
      </AuthProvider>
    </Router>
  );
}

function GlobalSkeletonLoader() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Mock Sidebar */}
      <aside className="admin-sidebar" style={{ width: '250px', background: '#ffffff', borderRight: '1px solid #e5e7eb', padding: '24px 14px' }}>
        <div className="skeleton-shimmer" style={{ width: '120px', height: '38px', marginBottom: '48px', borderRadius: '8px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton-shimmer" style={{ height: '40px', width: '100%', borderRadius: '10px' }} />)}
        </div>
      </aside>

      {/* Mock Main Dashboard */}
      <main className="admin-main" style={{ flex: 1, padding: '24px 32px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <div className="skeleton-shimmer" style={{ width: '250px', height: '32px', marginBottom: '8px', borderRadius: '6px' }} />
            <div className="skeleton-shimmer" style={{ width: '180px', height: '16px', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="skeleton-shimmer" style={{ width: '200px', height: '40px', borderRadius: '10px' }} />
            <div className="skeleton-shimmer" style={{ width: '120px', height: '40px', borderRadius: '10px' }} />
          </div>
        </header>

        {/* Stats Row */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton-shimmer" style={{ height: '110px', borderRadius: '16px' }} />)}
        </div>
        
        {/* Main Content Area */}
        <div className="skeleton-shimmer" style={{ height: '400px', width: '100%', borderRadius: '16px' }} />
      </main>
    </div>
  );
}

export default App;
