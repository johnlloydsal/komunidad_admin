import { useState } from 'react';
import { collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, Users, AlertCircle } from 'lucide-react';

const ApproveGoogleUsers = () => {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const approveAllGoogleUsers = async () => {
    if (!window.confirm('This will automatically approve ALL users who signed in with Google. Continue?')) {
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const googleUsers = [];
      const updates = [];

      usersSnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        
        // Check if it's a Google user
        const isGoogleUser = 
          userData.provider === 'google' || 
          userData.registrationMethod === 'google' ||
          (userData.email && userData.email.includes('@gmail.com') && userData.photoUrl);
        
        // Check if not already approved
        const needsApproval = userData.approvalStatus !== 'approved';

        if (isGoogleUser && needsApproval) {
          googleUsers.push({
            id: docSnap.id,
            email: userData.email,
            displayName: userData.displayName || userData.fullName,
          });

          updates.push(
            updateDoc(doc(db, 'users', docSnap.id), {
              approvalStatus: 'approved',
              isApproved: true,
              isPending: false,
              accountStatus: 'active',
              approvedAt: serverTimestamp(),
              approvedBy: 'Admin (Google Auto-Approve)',
              autoApproved: true,
            })
          );
        }
      });

      if (updates.length === 0) {
        setResult({
          success: true,
          count: 0,
          message: 'No Google users found that need approval.',
        });
        setProcessing(false);
        return;
      }

      // Execute all updates
      await Promise.all(updates);

      setResult({
        success: true,
        count: updates.length,
        users: googleUsers,
        message: `Successfully approved ${updates.length} Google user(s)!`,
      });

    } catch (error) {
      console.error('Error approving Google users:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users size={32} className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Auto-Approve Google Users</h1>
              <p className="text-sm text-gray-600">Automatically approve all users who signed in with Google</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">What this does:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Finds all users who registered/signed in with Google</li>
                  <li>Changes their status from "Pending" to "Approved"</li>
                  <li>Allows them to access the mobile app immediately</li>
                  <li>Does NOT affect users who registered with email/password</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={approveAllGoogleUsers}
            disabled={processing}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold transition"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Approve All Google Users
              </>
            )}
          </button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg border-2 ${
              result.success 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.message}
                  </p>
                  {result.users && result.users.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Approved users:</p>
                      <ul className="text-sm space-y-1">
                        {result.users.map((user) => (
                          <li key={user.id} className="text-gray-700">
                            ✓ {user.displayName || user.email} ({user.email})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApproveGoogleUsers;
