import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, User, Settings, LogOut, Check, X, AlertCircle, MessageSquare, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { adminData, getInitials } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const navigate = useNavigate();
  const displayName = adminData?.displayName || 'Admin User';
  const initials = getInitials(displayName);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'report':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'feedback':
        return <MessageSquare size={16} className="text-blue-500" />;
      case 'user':
        return <UserPlus size={16} className="text-green-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <header className="bg-[#4A90E2] text-white px-6 py-3 shadow-sm sticky top-0 z-[100]">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
            />
          </div>
        </div>

        {/* Right Side - Notifications and User */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative cursor-pointer hover:opacity-80 transition"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-semibold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-[9999] max-h-96 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  {notifications.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Mark all read
                      </button>
                      <button
                        onClick={clearAll}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="overflow-y-auto max-h-80">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell size={40} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          console.log('🔔 Notification clicked:', {
                            type: notification.type,
                            id: notification.id,
                            reportId: notification.reportId,
                            serviceRequestId: notification.serviceRequestId,
                            borrowerId: notification.borrowerId,
                            borrowedItemId: notification.borrowedItemId,
                            userId: notification.userId,
                            fullNotification: notification
                          });
                          markAsRead(notification.id);
                          setShowNotifications(false);
                          
                          // Small delay to ensure dropdown closes smoothly before navigation
                          setTimeout(() => {
                            if (notification.type === 'report') {
                              console.log('➡️ Navigating to report:', notification.reportId);
                              navigate('/reports', { 
                                state: { 
                                  reportId: notification.reportId,
                                  timestamp: Date.now() // Force re-render
                                },
                                replace: false
                              });
                            } else if (notification.type === 'service_request') {
                              console.log('➡️ Navigating to service request:', notification.serviceRequestId);
                              navigate('/reports', { 
                                state: { 
                                  serviceRequestId: notification.serviceRequestId, 
                                  activeTab: 'service_requests',
                                  timestamp: Date.now()
                                },
                                replace: false
                              });
                            } else if (notification.type === 'borrow_request') {
                              console.log('➡️ Navigating to borrower items:', notification.borrowerId || notification.borrowedItemId);
                              navigate('/reports', { 
                                state: { 
                                  borrowerId: notification.borrowerId || notification.borrowedItemId, 
                                  borrowerName: notification.borrowerName,
                                  activeTab: 'service_requests',
                                  serviceSubTab: 'borrowed',
                                  timestamp: Date.now()
                                },
                                replace: false
                              });
                            } else if (notification.type === 'lost_item' || notification.type === 'found_item') {
                              console.log('➡️ Navigating to lost/found item');
                              navigate('/lost-found', { 
                                state: { 
                                  itemId: notification.lostItemId || notification.foundItemId,
                                  timestamp: Date.now()
                                },
                                replace: false
                              });
                            } else if (notification.type === 'feedback') {
                              // Navigate to the report/service that was rated
                              if (notification.reportId) {
                                console.log('➡️ Navigating to feedback report:', notification.reportId);
                                navigate('/reports', { 
                                  state: { 
                                    reportId: notification.reportId,
                                    timestamp: Date.now()
                                  },
                                  replace: false
                                });
                              } else if (notification.serviceRequestId) {
                                console.log('➡️ Navigating to feedback service:', notification.serviceRequestId);
                                navigate('/reports', { 
                                  state: { 
                                    serviceRequestId: notification.serviceRequestId, 
                                    activeTab: 'service_requests',
                                    timestamp: Date.now()
                                  },
                                  replace: false
                                });
                              } else if (notification.feedbackId) {
                                console.log('➡️ Navigating to feedback page:', notification.feedbackId);
                                navigate('/feedback', { 
                                  state: { 
                                    feedbackId: notification.feedbackId,
                                    timestamp: Date.now()
                                  },
                                  replace: false
                                });
                              }
                            } else if (notification.type === 'user') {
                              console.log('➡️ Navigating to user:', notification.userId, '| subType:', notification.subType);
                              navigate('/users', { 
                                state: { 
                                  userId: notification.userId,
                                  subType: notification.subType || null,
                                  timestamp: Date.now()
                                },
                                replace: false
                              });
                            }
                          }, 100);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <span className="text-sm font-medium">{displayName}</span>
              <ChevronDown size={14} />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-[9999] overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/50">
                      <span className="text-white text-lg font-bold">{initials}</span>
                    </div>
                    <div className="text-white">
                      <p className="font-semibold">{displayName}</p>
                      <p className="text-xs opacity-90">{adminData?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/profile');
                    }}
                    className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                  >
                    <User size={18} />
                    <span className="text-sm">My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings');
                    }}
                    className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                  >
                    <Settings size={18} />
                    <span className="text-sm">Settings</span>
                  </button>
                </div>

                <div className="border-t">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-3 transition"
                  >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
