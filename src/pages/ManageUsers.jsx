import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, setDoc, query, orderBy } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../firebase';
import { Trash2, Eye, Mail, Phone, RefreshCw, X, MapPin, CheckCircle, XCircle, Image as ImageIcon, FileText, AlertCircle, UserPlus } from 'lucide-react';
import Toast from '../components/Toast';
import { useLocation, useNavigate } from 'react-router-dom';

// Secondary Firebase app so admin session is NOT disrupted when creating users
const secondaryApp = initializeApp({
  apiKey: "AIzaSyC2zpDwzx9cCvfI3blw2oTIbMvJ2MoRs0A",
  authDomain: "komunidad-36f9b.firebaseapp.com",
  projectId: "komunidad-36f9b",
  storageBucket: "komunidad-36f9b.firebasestorage.app",
  messagingSenderId: "888930015901",
  appId: "1:888930015901:web:4d613c2b868a5823951274",
}, 'secondary');
const secondaryAuth = getAuth(secondaryApp);

// Initialize Firebase Functions for callable deleteUser function
const functions = getFunctions();
const deleteUserFunction = httpsCallable(functions, 'deleteUser');

const EMPTY_FORM = {
  firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '',
  phoneNumber: '', address: '', birthdate: '', idType: '', idNumber: '',
};

const ManageUsers = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, rejected
  const [toast, setToast] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState(EMPTY_FORM);
  const [registering, setRegistering] = useState(false);
  const [registerErrors, setRegisterErrors] = useState({});
  const [highlightIdSection, setHighlightIdSection] = useState(false);
  const idSectionRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-open user details modal when navigating from notification
  useEffect(() => {
    if (location.state?.userId && users.length > 0) {
      const user = users.find(u => u.id === location.state.userId);
      if (user) {
        console.log('📬 Opening user details from notification:', user.displayName || user.email);
        const isIdNotif = location.state.subType === 'id_submitted';
        setHighlightIdSection(isIdNotif);
        setSelectedUser(user);
        setShowDetailsModal(true);
        // Scroll to ID section after modal renders
        if (isIdNotif) {
          setTimeout(() => {
            idSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 350);
        }
        // Clear the state so it doesn't reopen on re-render
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, users]);

  const fetchUsers = async (showFeedback = false) => {
    if (showFeedback) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      console.log('🔄 Syncing users from Firebase Firestore...');
      
      // Fetch users sorted by newest registrations first
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ Successfully synced ${data.length} users from Firebase`);
      console.log('📊 User Summary:', data.map(u => ({ 
        id: u.id.substring(0, 8) + '...',
        name: u.displayName || u.fullName || u.firstName,
        email: u.email,
        status: u.accountStatus || u.approvalStatus,
        provider: u.provider || 'email',
        createdAt: u.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'
      })));
      
      setUsers(data);
      
      if (showFeedback) {
        setToast({
          type: 'success',
          message: `✅ Synced ${data.length} users from Firebase`
        });
      }
    } catch (error) {
      console.error('❌ Error syncing users from Firebase:', error);
      setToast({
        type: 'error',
        message: `Failed to sync users: ${error.message}`
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (id) => {
    const userToDelete = users.find(u => u.id === id);
    const userName = userToDelete?.displayName || userToDelete?.username || 'this user';
    
    if (window.confirm(`Delete ${userName}?\n\nThis will delete from Firestore database.\n\nNote: You must ALSO manually delete this user from Firebase Authentication Console to fully remove their account.`)) {
      try {
        // Refresh auth token to ensure valid authentication
        const currentUser = auth.currentUser;
        if (currentUser) await currentUser.getIdToken(true);
        
        // Delete from Firestore
        await deleteDoc(doc(db, 'users', id));
        
        // Update local state  
        setUsers(users.filter(user => user.id !== id));
        
        // Show warning about Auth deletion
        setToast({
          type: 'success',
          message: `User deleted from database. ⚠️ IMPORTANT: Go to Firebase Console > Authentication to also delete the user account there (UID: ${id.substring(0, 8)}...)`
        });
        
      } catch (error) {
        console.error('Error deleting user:', error);
        setToast({
          type: 'error',
          message: `Failed to delete user: ${error.message}`
        });
      }
    }
  };

  const handleViewDetails = (user) => {
    console.log('=== USER DETAILS (all fields) ===', JSON.stringify(user, null, 2));
    console.log('Checking ALL image fields:');
    console.log('  idImageUrl:', user.idImageUrl);
    console.log('  validIdUrl:', user.validIdUrl);
    console.log('  idPhotoUrl:', user.idPhotoUrl);
    console.log('  idImage:', user.idImage);
    console.log('  selfieUrl:', user.selfieUrl);
    console.log('  photoIdUrl:', user.photoIdUrl);
    console.log('  idUrl:', user.idUrl);
    console.log('  validId:', user.validId);
    console.log('  idPicture:', user.idPicture);
    console.log('  idPhoto:', user.idPhoto);
    console.log('  photoUrl:', user.photoUrl);
    console.log('  submitId:', user.submitId);
    console.log('  submitIdUrl:', user.submitIdUrl);
    console.log('  submitIdImage:', user.submitIdImage);
    console.log('  idCardUrl:', user.idCardUrl);
    console.log('  cardImage:', user.cardImage);
    console.log('  cardImageUrl:', user.cardImageUrl);
    console.log('  idImageURL:', user.idImageURL);
    console.log('  validIDUrl:', user.validIDUrl);
    console.log('  governmentId:', user.governmentId);
    console.log('  userIdUrl:', user.userIdUrl);
    console.log('  identificationUrl:', user.identificationUrl);
    console.log('  documentUrl:', user.documentUrl);
    console.log('  verificationImage:', user.verificationImage);
    console.log('All user object keys:', Object.keys(user));
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleApproveUser = async (userId) => {
    try {
      console.log('Approving user:', userId);
      
      // Refresh auth token to ensure valid authentication
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('🔑 Refreshing auth token...');
        await currentUser.getIdToken(true);
      } else {
        throw new Error('Admin not authenticated');
      }
      
      // Update user approval status in Firestore with all necessary fields
      await updateDoc(doc(db, 'users', userId), {
        // Status fields (mobile app will listen to these)
        approvalStatus: 'approved',
        isApproved: true,
        isPending: false,
        accountStatus: 'active',
        
        // Metadata
        approvedAt: serverTimestamp(),
        approvedBy: 'Admin',
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ User approved in Firestore');
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { 
          ...user, 
          approvalStatus: 'approved', 
          isApproved: true, 
          isPending: false,
          accountStatus: 'active'
        } : user
      ));
      
      setToast({ 
        message: '✅ User approved! Mobile app will auto-redirect them to homepage.', 
        type: 'success' 
      });
      
      // Close modal if open
      setShowDetailsModal(false);
      setHighlightIdSection(false);
    } catch (error) {
      console.error('❌ Error approving user:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = '❌ Failed to approve user. ';
      
      if (error.code === 'permission-denied') {
        errorMessage += 'Firestore permission denied. Check Firebase security rules.';
      } else {
        errorMessage += error.message;
      }
      
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const validateRegisterForm = () => {
    const errs = {};
    if (!registerForm.firstName.trim()) errs.firstName = 'Required';
    if (!registerForm.lastName.trim()) errs.lastName = 'Required';
    if (!registerForm.email.trim()) errs.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(registerForm.email)) errs.email = 'Invalid email';
    if (!registerForm.password) errs.password = 'Required';
    else if (registerForm.password.length < 6) errs.password = 'Min 6 characters';
    if (registerForm.password !== registerForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleRegisterUser = async () => {
    const errs = validateRegisterForm();
    if (Object.keys(errs).length > 0) { setRegisterErrors(errs); return; }
    
    // ⚠️ Warn if creating user with Gmail address (may conflict with Google sign-in)
    const email = registerForm.email.trim().toLowerCase();
    if (email.endsWith('@gmail.com')) {
      const confirmCreate = window.confirm(
        `⚠️ WARNING: You're creating a user with a Gmail address (${email}).\n\n` +
        `If this user later tries "Continue with Google" in the mobile app, they will see an error ` +
        `because only ONE account per email is allowed.\n\n` +
        `Recommendation: Tell the user to use "Continue with Google" instead of email/password.\n\n` +
        `Do you still want to create this account?`
      );
      if (!confirmCreate) return;
    }
    
    setRegistering(true);
    try {
      // Create auth user in secondary app (won't affect admin session)
      const cred = await createUserWithEmailAndPassword(secondaryAuth, registerForm.email.trim(), registerForm.password);
      const uid = cred.user.uid;
      await secondaryAuth.signOut();

      const displayName = `${registerForm.firstName.trim()} ${registerForm.lastName.trim()}`;

      // Write user document to Firestore
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: registerForm.email.trim(),
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        displayName,
        username: registerForm.username.trim() || registerForm.email.split('@')[0],
        phoneNumber: registerForm.phoneNumber.trim(),
        address: registerForm.address.trim(),
        birthdate: registerForm.birthdate,
        idType: registerForm.idType.trim(),
        idNumber: registerForm.idNumber.trim(),
        approvalStatus: 'approved',
        isApproved: true,
        isPending: false,
        accountStatus: 'active',
        registeredByAdmin: true,
        provider: 'email',  // Mark as email/password account
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setToast({ message: `✅ User "${displayName}" registered successfully!`, type: 'success' });
      setShowRegisterModal(false);
      setRegisterForm(EMPTY_FORM);
      setRegisterErrors({});
      fetchUsers();
    } catch (error) {
      console.error('Error registering user:', error);
      if (error.code === 'auth/email-already-in-use') {
        setRegisterErrors({ email: 'Email already in use' });
      } else {
        setToast({ message: `❌ Failed to register user: ${error.message}`, type: 'error' });
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRejectUser = async (userId, reason = '') => {
    const rejectionReason = reason || prompt('Please provide a reason for rejection (optional):');
    
    if (window.confirm('Are you sure you want to reject this user?')) {
      try {
        // Refresh auth token to ensure valid authentication
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('🔑 Refreshing auth token...');
          await currentUser.getIdToken(true);
        } else {
          throw new Error('Admin not authenticated');
        }
        
        await updateDoc(doc(db, 'users', userId), {
          approvalStatus: 'rejected',
          isApproved: false,
          isPending: false,
          rejectedAt: serverTimestamp(),
          rejectedBy: 'Admin',
          rejectionReason: rejectionReason || 'Not specified'
        });
        
        setUsers(users.map(user => 
          user.id === userId ? { ...user, approvalStatus: 'rejected', isApproved: false, isPending: false } : user
        ));
        
        setToast({ message: '❌ User rejected successfully.', type: 'warning' });
        setShowDetailsModal(false);
        setHighlightIdSection(false);
      } catch (error) {
        console.error('Error rejecting user:', error);
        setToast({ message: '❌ Failed to reject user. Please try again.', type: 'error' });
      }
    }
  };

  const filteredUsers = filterStatus === 'all' 
    ? users 
    : users.filter(user => (user.approvalStatus || 'pending') === filterStatus);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <RefreshCw size={48} className="animate-spin mx-auto mb-4 text-blue-600" />
        <div className="text-xl font-semibold text-gray-700">Syncing users from Firebase...</div>
        <p className="text-sm text-gray-500 mt-2">Loading user data from Firestore</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-semibold text-gray-700">Total: {users.length}</span> | 
            Pending: <span className="font-semibold text-yellow-600">{users.filter(u => (!u.approvalStatus || u.approvalStatus === 'pending') && u.provider !== 'google').length}</span> | 
            Approved: <span className="font-semibold text-green-600">{users.filter(u => u.approvalStatus === 'approved' && u.provider !== 'google').length}</span> | 
            Google: <span className="font-semibold text-blue-600">{users.filter(u => u.provider === 'google').length}</span> | 
            Rejected: <span className="font-semibold text-red-600">{users.filter(u => u.approvalStatus === 'rejected').length}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            📊 Synced from Firebase Firestore | 
            {users.filter(u => u.provider === 'google').length > 0 && (
              <> 💡 Click "Fix Google Users" if Google users can't access the app</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Users</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className={`bg-[#4A90E2] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#3d7bc7] ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Users'}
          </button>
          <button
            onClick={() => { setRegisterForm(EMPTY_FORM); setRegisterErrors({}); setShowRegisterModal(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <UserPlus size={20} />
            Register User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-[#4A90E2] text-white">
            <tr>
              <th className="px-4 py-3 text-left">Avatar</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Username</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left sticky right-0 bg-[#4A90E2]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center overflow-hidden">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-purple-700 font-bold">
                          {user.displayName?.charAt(0) || user.firstName?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}</span>
                      {user.provider === 'google' && (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" title="Google Sign-In">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">{user.username || 'N/A'}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <span className="text-sm">{user.email || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-sm">{user.phoneNumber || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {user.provider === 'google' ? (
                      <span className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-700 flex items-center gap-1 w-fit">
                        <CheckCircle size={12} />
                        Auto-Approved
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        (user.approvalStatus || 'pending') === 'approved' ? 'bg-green-100 text-green-700' :
                        (user.approvalStatus || 'pending') === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {(user.approvalStatus || 'pending').charAt(0).toUpperCase() + (user.approvalStatus || 'pending').slice(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {user.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                  </td>
                  <td className="px-4 py-4 sticky right-0 bg-white border-l shadow-sm">
                    <div className="flex gap-1 justify-center">
                      {/* Only show approve/reject buttons for non-Google users who are pending */}
                      {(!user.approvalStatus || user.approvalStatus === 'pending') && user.provider !== 'google' && (
                        <>
                          <button 
                            onClick={() => handleApproveUser(user.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Approve User"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleRejectUser(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Reject User"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleViewDetails(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-3 border-b z-10">
              <h2 className="text-xl font-bold text-gray-800">User Details</h2>
              <button 
                onClick={() => { setShowDetailsModal(false); setHighlightIdSection(false); }} 
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* User Avatar and Name */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-20 h-20 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden">
                  {selectedUser.photoUrl ? (
                    <img src={selectedUser.photoUrl} alt={selectedUser.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-700 font-bold text-3xl">
                      {selectedUser.displayName?.charAt(0) || selectedUser.firstName?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-800">
                      {selectedUser.displayName || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || 'N/A'}
                    </h3>
                    {selectedUser.provider === 'google' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded flex items-center gap-1" title="Google Sign-In User - Auto-Approved">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">@{selectedUser.username || 'N/A'}</p>
                  {selectedUser.provider === 'google' && (
                    <p className="text-xs text-blue-600 mt-1">✓ Auto-approved (Google Authentication)</p>
                  )}
                </div>
              </div>

              {/* Google Auto-Approved Banner */}
              {selectedUser.provider === 'google' && (
                <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={20} className="text-blue-600" />
                    <div>
                      <p className="font-bold text-blue-800">Google Sign-In User - Auto-Approved</p>
                      <p className="text-sm text-blue-700 mt-1">
                        This user signed in with Google and was automatically approved. No manual approval required.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Approval Status Banner - Only show for non-Google users */}
              {!selectedUser.provider || selectedUser.provider !== 'google' ? (
                selectedUser.approvalStatus && selectedUser.approvalStatus !== 'approved' && (
                  <div className={`p-4 rounded-lg border-2 ${
                    selectedUser.approvalStatus === 'pending' ? 'bg-yellow-50 border-yellow-300' :
                    selectedUser.approvalStatus === 'rejected' ? 'bg-red-50 border-red-300' :
                    'bg-gray-50 border-gray-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={20} className={selectedUser.approvalStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'} />
                      <p className="font-bold text-gray-800">
                        {selectedUser.approvalStatus === 'pending' ? 'Pending Approval' : 'Account Rejected'}
                      </p>
                    </div>
                    {selectedUser.rejectionReason && (
                      <p className="text-sm text-gray-700">Reason: {selectedUser.rejectionReason}</p>
                    )}
                    {selectedUser.approvalStatus === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleApproveUser(selectedUser.id)}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={18} />
                          Approve User
                        </button>
                      <button
                        onClick={() => handleRejectUser(selectedUser.id)}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                      >
                        <XCircle size={18} />
                        Reject User
                      </button>
                    </div>
                  )}
                </div>
              )
              ) : null}

              {/* ID Verification Section - check all possible field names */}
              {(() => {
                // Check ALL possible field name variations for ID image URL
                const idUrl = selectedUser.idImageUrl || selectedUser.validIdUrl || selectedUser.idPhotoUrl ||
                  selectedUser.idImage || selectedUser.selfieUrl || selectedUser.photoIdUrl ||
                  selectedUser.idUrl || selectedUser.validId || selectedUser.idPicture ||
                  selectedUser.idPhoto || selectedUser.submitIdUrl || selectedUser.submitIdImage ||
                  selectedUser.idCardUrl || selectedUser.cardImage || selectedUser.cardImageUrl ||
                  selectedUser.idImageURL || selectedUser.validIDUrl || selectedUser.governmentId ||
                  selectedUser.userIdUrl || selectedUser.identificationUrl || selectedUser.documentUrl ||
                  selectedUser.verificationImage || selectedUser.photoURL || selectedUser.imageUrl ||
                  selectedUser.barangayIdUrl || selectedUser.barangayIdImage || selectedUser.barangayIdImageUrl ||
                  selectedUser.idPictureUrl || selectedUser.uploadedIdUrl || selectedUser.userPhoto ||
                  selectedUser.identityImage || selectedUser.verificationPhoto || selectedUser.govIdUrl ||
                  selectedUser.nationalIdUrl || selectedUser.residenceIdUrl || selectedUser.citizenIdUrl;
                
                const idTypeLabel = selectedUser.idType || selectedUser.submitId;
                const idNumberValue = selectedUser.idNumber || selectedUser.submitId;
                const hasMeta = idNumberValue || idTypeLabel;
                const isPending = !selectedUser.approvalStatus || selectedUser.approvalStatus === 'pending';
                
                // Debug: Log ALL user fields to help identify the image URL field
                console.log('=== ID IMAGE DEBUG ===');
                console.log('ID URL found:', idUrl);
                console.log('All user fields:', Object.keys(selectedUser));
                console.log('Fields containing "url" or "image" or "photo":', 
                  Object.keys(selectedUser).filter(key => 
                    key.toLowerCase().includes('url') || 
                    key.toLowerCase().includes('image') || 
                    key.toLowerCase().includes('photo') ||
                    key.toLowerCase().includes('picture')
                  ).map(key => ({ [key]: selectedUser[key] }))
                );
                
                if (!idUrl && !hasMeta && !isPending) return null;
                return (
                  <div
                    id="id-verification-section"
                    ref={idSectionRef}
                    className={`border-2 rounded-lg p-4 transition-all duration-500 ${
                      highlightIdSection
                        ? idUrl
                          ? 'border-blue-500 bg-blue-100 ring-4 ring-blue-300'
                          : 'border-yellow-500 bg-yellow-100 ring-4 ring-yellow-300'
                        : idUrl
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <FileText size={20} className={idUrl ? 'text-blue-600' : 'text-yellow-600'} />
                      ID Verification
                      {highlightIdSection && (
                        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white animate-pulse">
                          🆕 New Submission
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {idUrl ? (
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Submitted ID</label>
                          <a href={idUrl} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                              src={idUrl}
                              alt="User ID"
                              className="w-full max-h-64 object-contain rounded border-2 border-gray-300 hover:border-blue-500 cursor-pointer transition bg-white p-1"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML += `<div class="w-full h-32 bg-gray-200 rounded border-2 border-red-300 flex flex-col items-center justify-center"><p class="text-sm text-red-500 font-medium">Image failed to load</p><p class="text-xs text-gray-500 mt-1 break-all px-4 text-center">${idUrl}</p></div>`;
                              }}
                            />
                          </a>
                          <a href={idUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-blue-600 underline block text-center">
                            Open image in new tab
                          </a>
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-yellow-100 rounded border-2 border-yellow-300 flex flex-col items-center justify-center">
                          <ImageIcon size={28} className="text-yellow-500 mb-1" />
                          <p className="text-sm text-yellow-700 font-medium">No ID image submitted yet</p>
                          <p className="text-xs text-yellow-600 mt-1">User may need to re-upload their ID</p>
                          <p className="text-xs text-gray-600 mt-1 italic">→ Ask user to go to Profile → Upload ID</p>
                        </div>
                      )}
                      {idNumberValue && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">ID Number</label>
                          <p className="mt-1 px-3 py-2 bg-white rounded border border-gray-300 font-mono text-sm">
                            {idNumberValue}
                          </p>
                        </div>
                      )}
                      {idTypeLabel && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">ID Type</label>
                          <p className="mt-1 px-3 py-2 bg-white rounded border border-gray-300">
                            {idTypeLabel}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* User Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Full Name (if available as single field) */}
                {selectedUser.fullName && (
                  <div className="col-span-2">
                    <label className="text-sm font-bold text-gray-700">Full Name</label>
                    <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedUser.fullName}</p>
                  </div>
                )}

                {/* First Name */}
                {selectedUser.firstName && (
                  <div>
                    <label className="text-sm font-bold text-gray-700">First Name</label>
                    <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedUser.firstName}</p>
                  </div>
                )}

                {/* Last Name */}
                {selectedUser.lastName && (
                  <div>
                    <label className="text-sm font-bold text-gray-700">Last Name</label>
                    <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedUser.lastName}</p>
                  </div>
                )}

                {/* Username */}
                {selectedUser.username && (
                  <div>
                    <label className="text-sm font-bold text-gray-700">Username</label>
                    <p className="mt-1 px-3 py-2 bg-gray-50 rounded">@{selectedUser.username}</p>
                  </div>
                )}

                {/* Email */}
                <div className={!selectedUser.firstName && !selectedUser.lastName ? 'col-span-2' : ''}>
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Mail size={16} />
                    Email
                  </label>
                  <p className="mt-1 px-3 py-2 bg-gray-50 rounded break-all">{selectedUser.email || 'Not provided'}</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Phone size={16} />
                    Phone Number
                  </label>
                  <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedUser.phoneNumber || selectedUser.phone || 'Not provided'}</p>
                </div>

                {/* House No. & Street */}
                {selectedUser.houseStreet && (
                  <div className="col-span-2">
                    <label className="text-sm font-bold text-gray-700">House No. & Street</label>
                    <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedUser.houseStreet}</p>
                  </div>
                )}

                {/* Zone/Purok */}
                {selectedUser.zone && (
                  <div>
                    <label className="text-sm font-bold text-gray-700">Zone / Purok</label>
                    <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedUser.zone}</p>
                  </div>
                )}

                {/* Address (full) */}
                {selectedUser.address && (
                  <div className={selectedUser.zone ? '' : 'col-span-2'}>
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <MapPin size={16} />
                      Address
                    </label>
                    <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedUser.address}</p>
                  </div>
                )}

                {/* Birthdate */}
                {selectedUser.birthdate && (
                  <div>
                    <label className="text-sm font-bold text-gray-700">Birthdate</label>
                    <p className="mt-1 px-3 py-2 bg-gray-50 rounded">{selectedUser.birthdate}</p>
                  </div>
                )}

                {/* Date Joined */}
                <div>
                  <label className="text-sm font-bold text-gray-700">Date Joined</label>
                  <p className="mt-1 px-3 py-2 bg-gray-50 rounded">
                    {selectedUser.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-2">Activity Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{selectedUser.reportsCount || 0}</p>
                    <p className="text-xs text-gray-600">Reports</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{selectedUser.feedbackCount || 0}</p>
                    <p className="text-xs text-gray-600">Feedback</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{selectedUser.lostItemsCount || 0}</p>
                    <p className="text-xs text-gray-600">Lost Items</p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-4 border-t">
                <button
                  onClick={() => { setShowDetailsModal(false); setHighlightIdSection(false); }}
                  className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <X size={20} />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register User Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 sticky top-0 bg-white pb-3 border-b z-10">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UserPlus size={22} className="text-green-600" /> Register New User
              </h2>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-500 hover:text-gray-700 p-2 rounded-full">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm(p => ({ ...p, firstName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${registerErrors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Juan"
                  />
                  {registerErrors.firstName && <p className="text-red-500 text-xs mt-1">{registerErrors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm(p => ({ ...p, lastName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${registerErrors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="dela Cruz"
                  />
                  {registerErrors.lastName && <p className="text-red-500 text-xs mt-1">{registerErrors.lastName}</p>}
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm(p => ({ ...p, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="juandelacruz (optional)"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(p => ({ ...p, email: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${registerErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="user@email.com"
                  />
                  {registerErrors.email && <p className="text-red-500 text-xs mt-1">{registerErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={registerForm.phoneNumber}
                    onChange={(e) => setRegisterForm(p => ({ ...p, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="09XXXXXXXXX"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(p => ({ ...p, password: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${registerErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Min 6 characters"
                  />
                  {registerErrors.password && <p className="text-red-500 text-xs mt-1">{registerErrors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${registerErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Repeat password"
                  />
                  {registerErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{registerErrors.confirmPassword}</p>}
                </div>
              </div>

              {/* Address & Birthdate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Barangay / Street / City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Birthdate</label>
                  <input
                    type="date"
                    value={registerForm.birthdate}
                    onChange={(e) => setRegisterForm(p => ({ ...p, birthdate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* ID Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">ID Type</label>
                  <select
                    value={registerForm.idType}
                    onChange={(e) => setRegisterForm(p => ({ ...p, idType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select ID type</option>
                    <option>PhilSys ID</option>
                    <option>Passport</option>
                    <option>Driver's License</option>
                    <option>SSS ID</option>
                    <option>GSIS ID</option>
                    <option>Voter's ID</option>
                    <option>Postal ID</option>
                    <option>Barangay ID</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">ID Number</label>
                  <input
                    type="text"
                    value={registerForm.idNumber}
                    onChange={(e) => setRegisterForm(p => ({ ...p, idNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="ID number"
                  />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                ✅ This user will be automatically <strong>approved</strong> since they are registered by an admin.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegisterUser}
                  disabled={registering}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {registering ? 'Registering...' : <><UserPlus size={18} /> Register User</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ManageUsers;
