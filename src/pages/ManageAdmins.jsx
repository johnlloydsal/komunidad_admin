import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Check, X, Mail, Clock, AlertCircle } from 'lucide-react';
import Toast from '../components/Toast';

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, all

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      const allAdmins = adminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const pending = allAdmins.filter(a => a.approvalStatus === 'pending');
      const approved = allAdmins.filter(a => a.approvalStatus === 'approved');
      
      setPendingAdmins(pending.sort((a, b) => 
        (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0))
      ));
      setAdmins(approved.sort((a, b) => 
        (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0))
      ));
    } catch (error) {
      console.error('Error fetching admins:', error);
      setToast({ type: 'error', message: 'Failed to load admins' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (adminId) => {
    setApproving(adminId);
    try {
      await updateDoc(doc(db, 'admins', adminId), {
        approvalStatus: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser.uid
      });
      setToast({ type: 'success', message: 'Admin approved successfully' });
      await fetchAdmins();
    } catch (error) {
      console.error('Error approving admin:', error);
      setToast({ type: 'error', message: 'Failed to approve admin' });
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (adminId) => {
    setRejecting(adminId);
    try {
      await updateDoc(doc(db, 'admins', adminId), {
        approvalStatus: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser.uid
      });
      setToast({ type: 'success', message: 'Admin rejected' });
      await fetchAdmins();
    } catch (error) {
      console.error('Error rejecting admin:', error);
      setToast({ type: 'error', message: 'Failed to reject admin' });
    } finally {
      setRejecting(null);
    }
  };

  const getDisplayData = () => {
    if (activeTab === 'pending') return pendingAdmins;
    if (activeTab === 'approved') return admins;
    return [...pendingAdmins, ...admins];
  };

  const displayData = getDisplayData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">Loading admins...</div>
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Registrations</h1>
        <p className="text-gray-600 mt-2">Approve or reject admin account registrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={18} />
            Pending ({pendingAdmins.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'approved'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Check size={18} />
            Approved ({admins.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({pendingAdmins.length + admins.length})
        </button>
      </div>

      {/* Pending Admins List */}
      {displayData.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <AlertCircle size={32} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No {activeTab === 'pending' ? 'pending' : activeTab === 'approved' ? 'approved' : ''} admins</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {displayData.map((admin) => (
            <div
              key={admin.id}
              className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
                admin.approvalStatus === 'pending' ? 'border-yellow-500' :
                admin.approvalStatus === 'approved' ? 'border-green-500' :
                'border-red-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-bold text-blue-600">
                        {admin.displayName?.charAt(0).toUpperCase() || 'A'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{admin.displayName || 'Unknown'}</h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail size={14} />
                        {admin.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      admin.provider === 'google'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {admin.provider === 'google' ? '🔴 Google Sign-In' : '📧 Email/Password'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      admin.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      admin.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {admin.approvalStatus === 'pending' ? '⏳ Pending' :
                       admin.approvalStatus === 'approved' ? '✅ Approved' :
                       '❌ Rejected'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {admin.role?.toUpperCase() || 'ADMIN'}
                    </span>
                  </div>

                  <div className="mt-3 text-sm text-gray-500">
                    <p>Registered: {admin.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                    {admin.approvedAt && (
                      <p>Approved: {admin.approvedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {admin.approvalStatus === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(admin.id)}
                      disabled={approving === admin.id}
                      className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Check size={16} />
                      {approving === admin.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(admin.id)}
                      disabled={rejecting === admin.id}
                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                      {rejecting === admin.id ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-yellow-700 font-medium">Pending Approval</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingAdmins.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-green-700 font-medium">Approved Admins</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{admins.length}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-blue-700 font-medium">Total Admins</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{pendingAdmins.length + admins.length}</p>
        </div>
      </div>
    </div>
  );
};

export default ManageAdmins;
