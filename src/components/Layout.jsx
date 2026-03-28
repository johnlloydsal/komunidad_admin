import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="flex h-screen bg-barangay-pattern relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Philippine Flag Inspired Gradients */}
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-blue-900/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-red-900/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 bg-gradient-to-br from-yellow-600/3 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }}></div>
        
        {/* Community Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      <Sidebar onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50/80 via-blue-50/40 to-gray-100/80 backdrop-blur-sm">
          {/* Content Container with subtle shadow and backdrop */}
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
