import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Megaphone, Package, Users, MessageSquare, LogOut, Box, ClipboardList, Info, Database, UserPlus, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Sidebar = ({ onLogout }) => {
  const { adminData, getInitials } = useAuth();
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'from-blue-500 to-indigo-600' },
    { path: '/reports', icon: FileText, label: 'View Reports', color: 'from-green-500 to-emerald-600' },
    { path: '/announcements', icon: Megaphone, label: 'View Announcements', color: 'from-purple-500 to-pink-600' },
    { path: '/barangay-info', icon: Info, label: 'Barangay Information', color: 'from-cyan-500 to-blue-600' },
    { path: '/lost-found', icon: Package, label: 'Manage Lost & Found', color: 'from-orange-500 to-red-600' },
    { path: '/users', icon: Users, label: 'Manage Users', color: 'from-violet-500 to-purple-600' },
    { path: '/sync-users', icon: UserPlus, label: 'Sync Users (Fix Pending)', color: 'from-teal-500 to-cyan-600' },
    { path: '/feedback', icon: MessageSquare, label: 'View Feedback', color: 'from-yellow-500 to-orange-600' },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-[#4A5F8C] via-[#3d5075] to-[#2d3f5f] text-white min-h-screen flex flex-col shadow-2xl relative overflow-hidden">
      {/* Animated Background Patterns */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      </div>

      {/* Logo Section */}
      <div className="relative p-5 flex items-center gap-3 bg-gradient-to-r from-[#3d5075] to-[#4A5F8C] border-b border-white/10 backdrop-blur-sm animate-slide-up">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <svg className="w-8 h-8 text-white transform group-hover:rotate-12 transition-transform duration-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
            <div className="absolute inset-0 bg-white/20 rounded-full blur-md group-hover:bg-white/30 transition-all duration-300"></div>
          </div>
          <div>
            <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">KOMUNIDAD</span>
            <p className="text-xs text-white/60 tracking-wide">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4 px-2 space-y-1 relative z-10">
        {menuItems.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            onMouseEnter={() => setHoveredItem(index)}
            onMouseLeave={() => setHoveredItem(null)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden animate-slide-up ${
                isActive 
                  ? 'bg-gradient-to-r from-white/20 to-white/10 shadow-lg scale-105' 
                  : 'hover:bg-white/10 hover:translate-x-1'
              }`
            }
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            {({ isActive }) => (
              <>
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-white to-blue-200 rounded-r-full animate-pulse"></div>
                )}
                
                {/* Icon Container */}
                <div className={`relative p-2 rounded-lg transition-all duration-300 ${
                  isActive || hoveredItem === index
                    ? `bg-gradient-to-br ${item.color} shadow-lg`
                    : 'bg-white/5'
                }`}>
                  <item.icon size={18} className={`transition-all duration-300 ${
                    isActive || hoveredItem === index ? 'text-white scale-110' : 'text-white/80'
                  }`} />
                </div>
                
                {/* Label */}
                <span className={`text-sm font-medium flex-1 transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
                }`}>
                  {item.label}
                </span>
                
                {/* Arrow Indicator */}
                <ChevronRight size={16} className={`transition-all duration-300 ${
                  isActive || hoveredItem === index
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-2'
                }`} />
                
                {/* Hover Gradient Effect */}
                {hoveredItem === index && !isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-10 rounded-xl`}></div>
                )}
              </>
            )}
          </NavLink>
        ))}
        
        {/* Logout Button */}
        <button
          onClick={onLogout}
          onMouseEnter={() => setHoveredItem(menuItems.length)}
          onMouseLeave={() => setHoveredItem(null)}
          className="group flex items-center gap-3 px-4 py-3 hover:bg-red-500/20 rounded-xl transition-all duration-300 w-full text-left mt-4 border-t border-white/10 pt-4 relative overflow-hidden hover:translate-x-1"
        >
          <div className={`relative p-2 rounded-lg transition-all duration-300 ${
            hoveredItem === menuItems.length
              ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg'
              : 'bg-white/5'
          }`}>
            <LogOut size={18} className="text-white/80 group-hover:text-white transition-colors" />
          </div>
          <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">Logout</span>
          <ChevronRight size={16} className={`transition-all duration-300 ml-auto ${
            hoveredItem === menuItems.length
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-2'
          }`} />
        </button>
      </nav>

      {/* Footer Decoration */}
      <div className="relative p-4 border-t border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
            {getInitials(adminData?.displayName || 'Admin')}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white truncate">{adminData?.displayName || 'Admin User'}</p>
            <p className="text-xs text-white/60">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
