import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Fetch admin data from Firestore
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          if (adminDoc.exists()) {
            setAdminData(adminDoc.data());
          } else {
            // Fallback to auth data
            setAdminData({
              displayName: currentUser.displayName || 'Admin User',
              email: currentUser.email
            });
          }
        } catch (error) {
          // Silently handle - fallback to auth data
          // This can happen during initial auth state changes
          setAdminData({
            displayName: currentUser.displayName || 'Admin User',
            email: currentUser.email
          });
        }
      } else {
        setAdminData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const value = {
    user,
    adminData,
    loading,
    getInitials
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
