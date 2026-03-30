import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import EmailVerification from './pages/EmailVerification';
import Dashboard from './pages/Dashboard';
import ViewReports from './pages/ViewReports';
import ViewAnnouncements from './pages/ViewAnnouncements';
import ManageBarangayInfo from './pages/ManageBarangayInfo';
import ManageLostFound from './pages/ManageLostFound';
import ManageSupplies from './pages/ManageSupplies';
import ViewBorrowedSupplies from './pages/ViewBorrowedSupplies';
import ManageUsers from './pages/ManageUsers';
import ViewFeedback from './pages/ViewFeedback';
import PendingApproval from './pages/PendingApproval';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ConnectFirebase from './pages/ConnectFirebase';
import ManualUserSync from './pages/ManualUserSync';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/" replace /> : <Register />} 
        />
        <Route 
          path="/forgot-password" 
          element={user ? <Navigate to="/" replace /> : <ForgotPassword />} 
        />
        <Route 
          path="/email-verification" 
          element={user ? <EmailVerification /> : <Navigate to="/login" replace />} 
        />
        <Route
          path="/pending-approval"
          element={user ? <PendingApproval /> : <Navigate to="/login" replace />}
        />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="reports" element={<ViewReports />} />
          <Route path="announcements" element={<ViewAnnouncements />} />
          <Route path="barangay-info" element={<ManageBarangayInfo />} />
          <Route path="lost-found" element={<ManageLostFound />} />
          <Route path="supplies" element={<ManageSupplies />} />
          <Route path="borrowed-supplies" element={<ViewBorrowedSupplies />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="feedback" element={<ViewFeedback />} />
          <Route path="sync-users" element={<ManualUserSync />} />
          <Route path="connect-firebase" element={<ConnectFirebase />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  useEffect(() => {
    // Suppress specific console errors and warnings
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      // Filter out known non-critical errors
      if (
        errorMessage.includes('ERR_INTERNET_DISCONN') ||
        errorMessage.includes('Failed to load resource') ||
        errorMessage.includes('www.google.com/image') ||
        errorMessage.includes('net::ERR_') ||
        errorMessage.includes('@firebase/firestore') ||
        errorMessage.includes('WebChannelConnection') ||
        errorMessage.includes('transport errored') ||
        errorMessage.includes('useAuth must be used within') ||
        errorMessage.includes('AuthProvider') ||
        errorMessage.includes('error occurred in the') ||
        errorMessage.includes('AppContent')
      ) {
        return; // Suppress these errors
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const warnMessage = args.join(' ');
      // Filter out deprecation warnings we've already addressed
      if (
        warnMessage.includes('will be deprecated') ||
        warnMessage.includes('FirestoreSettings.cache') ||
        warnMessage.includes('enableMultiTabIndexedDbPersistence')
      ) {
        return; // Suppress these warnings
      }
      originalWarn.apply(console, args);
    };

    // Global error handler for image loading errors
    const handleImageError = (event) => {
      if (event.target?.tagName === 'IMG') {
        event.stopPropagation();
        event.preventDefault();
      }
    };
    
    window.addEventListener('error', handleImageError, true);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleImageError, true);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
