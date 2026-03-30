import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Clock, AlertCircle, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      // Get current admin data
      const adminDoc = await getDoc(doc(db, 'admins', auth.currentUser.uid));
      if (adminDoc.exists()) {
        setAdminData({
          id: auth.currentUser.uid,
          ...adminDoc.data()
        });
      }

      // Get all pending admins sorted by registration date
      setLoadingAdmins(true);
      const pendingQuery = query(
        collection(db, 'admins'),
        where('approvalStatus', '==', 'pending'),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(pendingQuery);
      const pending = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingAdmins(pending);
      setLoadingAdmins(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoadingAdmins(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Icon */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-8 py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative">
                <Clock size={64} className="text-white animate-pulse" />
                <div className="absolute inset-0 bg-white/20 rounded-full blur-lg"></div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Pending Approval</h1>
            <p className="text-white/90 text-lg">Your admin account is waiting for super admin verification</p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {/* Admin Info */}
            {adminData && (
              <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-blue-600">
                      {adminData.displayName?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{adminData.displayName}</h3>
                    <p className="text-sm text-gray-600">{adminData.email}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Registered: {adminData.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) || 'Recently'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {adminData.provider === 'google' ? '🔴 Google Sign-In' : '📧 Email/Password'}
                    </p>
                  </div>
                  <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                    ⏳ Pending
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800">What's happening?</p>
                  <p className="text-gray-600 text-sm mt-1">
                    A super admin needs to review and approve your registration before you can access the dashboard.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <AlertCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800">How long does it take?</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Approval typically takes 1-2 hours during business hours. You'll be notified once you're approved.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <AlertCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800">Next steps</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Try logging in again after the super admin approves your account. You'll gain full access to the dashboard.
                  </p>
                </div>
              </div>
            </div>

            {/* Pending Admins Queue */}
            {!loadingAdmins && pendingAdmins.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-gray-600" />
                  Pending Approval Queue (Registration Order)
                </h3>
                <div className="space-y-3">
                  {pendingAdmins.map((admin, index) => (
                    <div
                      key={admin.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        admin.id === auth.currentUser?.uid
                          ? 'bg-blue-100 border border-blue-300'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-600">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {admin.displayName}
                          {admin.id === auth.currentUser?.uid && (
                            <span className="ml-2 text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">You</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {admin.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        }) || 'Recent'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              Logout & Return to Login
            </button>
          </div>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>Questions? Contact your super admin for approval status.</p>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
