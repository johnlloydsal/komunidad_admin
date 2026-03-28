import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserPlus, Copy, CheckCircle, AlertCircle } from 'lucide-react';

const ManualUserSync = () => {
  const [userData, setUserData] = useState({
    uid: '',
    email: '',
    fullName: '',
    phone: '',
    address: ''
  });
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userData.uid.trim() || !userData.email.trim()) {
      alert('UID and Email are required!');
      return;
    }

    setSyncing(true);
    setResult(null);

    try {
      // Create Firestore document with UID as document ID
      await setDoc(doc(db, 'users', userData.uid.trim()), {
        email: userData.email.trim(),
        username: userData.email.split('@')[0],
        fullName: userData.fullName.trim() || '',
        phone: userData.phone.trim() || '',
        address: userData.address.trim() || '',
        idType: '',
        idNumber: '',
        idImageUrl: '',
        
        // Approval status - set to pending
        approvalStatus: 'pending',
        isApproved: false,
        isPending: true,
        accountStatus: 'pending',
        role: 'user',
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      setResult({ success: true, message: 'User synced successfully! Go to Manage Users to approve them.' });
      
      // Reset form
      setUserData({
        uid: '',
        email: '',
        fullName: '',
        phone: '',
        address: ''
      });
    } catch (error) {
      console.error('Sync error:', error);
      setResult({ success: false, message: 'Failed to sync user: ' + error.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-blue-600" />
          Manual User Sync from Firebase Auth
        </h2>
        <p className="text-gray-600">
          Sync individual Firebase Authentication users to Firestore database
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 rounded-r-lg">
        <h3 className="text-lg font-bold text-blue-900 mb-3">📋 Step-by-Step Instructions</h3>
        <ol className="space-y-3 text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <div>
              Go to <a href="https://console.firebase.google.com/project/komunidad-36f9b/authentication/users" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Firebase Authentication Console</a>
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <div>Click on a user to see their details</div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <div>Copy the <strong>User UID</strong> (looks like: abc123xyz456...)</div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <div>Copy their <strong>Email address</strong></div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <div>Paste both below and click "Sync User"</div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">6.</span>
            <div>Repeat for each of your 7 registered users</div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">7.</span>
            <div>Go to <strong>Manage Users</strong> to approve them!</div>
          </li>
        </ol>
      </div>

      {/* Result Message */}
      {result && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {result.success ? (
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          )}
          <p className={result.success ? 'text-green-800' : 'text-red-800'}>
            {result.message}
          </p>
        </div>
      )}

      {/* Sync Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Add User to Firestore</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                User UID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="uid"
                value={userData.uid}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
                placeholder="abc123xyz456def789 (copy from Firebase Console)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This MUST match the Firebase Auth UID exactly
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={userData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="julio3@komunidad.app"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Full Name <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={userData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Julio Santos"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Phone <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={userData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="+63 912 345 6789"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Address <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                name="address"
                value={userData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Barangay Address"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 my-4">
            <h4 className="font-semibold text-gray-700 mb-2">Default Settings:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Approval Status: <strong>Pending</strong></li>
              <li>• Account Status: Pending</li>
              <li>• Role: User</li>
              <li>• Username: Auto-generated from email</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={syncing}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-semibold text-lg flex items-center justify-center gap-2"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Syncing User...</>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Sync User to Firestore
              </>
            )}
          </button>
        </form>
      </div>

      {/* Quick Reference */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes:</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• The UID must be exactly the same as in Firebase Authentication</li>
          <li>• Don't make up or modify the UID - copy it exactly from Firebase Console</li>
          <li>• After syncing, users will appear in "Manage Users" with Pending status</li>
          <li>• You must approve them before they can access the app</li>
        </ul>
      </div>
    </div>
  );
};

export default ManualUserSync;
