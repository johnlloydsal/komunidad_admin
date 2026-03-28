import { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Link2, CheckCircle, AlertCircle, Users, Upload, Database, Zap } from 'lucide-react';

const ConnectFirebase = () => {
  // Pre-fill with the 8 visible Firebase Auth users from the console
  const [bulkEmails, setBulkEmails] = useState(`charles_alex@komunidad-36f9b.com
alexissalvador4@komunidad-36f9b.com
johnlloydsalvador_@komunidad-36f9b.com
johnlloyd_salvador@komunidad-36f9b.com
johnlloyd_salvador31@komunidad-36f9b.com
johnlloydsalvador08@gmail.com
alexissalvador717@gmail.com
johnlloydsalvador09@gmail.com`);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [firestoreCount, setFirestoreCount] = useState(null);
  const [checking, setChecking] = useState(false);

  // Auto-check Firestore count on page load
  useEffect(() => {
    checkFirestoreConnection();
  }, []);

  const checkFirestoreConnection = async () => {
    setChecking(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      setFirestoreCount(snapshot.size);
    } catch (error) {
      console.error('Error checking Firestore:', error);
      alert('Error connecting to Firestore: ' + error.message);
    } finally {
      setChecking(false);
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    
    if (!bulkEmails.trim()) {
      alert('Please enter at least one email address');
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      // Parse emails from textarea (one per line or comma-separated)
      const emails = bulkEmails
        .split(/[\n,]/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      if (emails.length === 0) {
        alert('No valid email addresses found');
        setImporting(false);
        return;
      }

      const successList = [];
      const errorList = [];

      // Create Firestore document for each email
      for (const email of emails) {
        try {
          // Generate a unique ID
          const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Extract username from email (before @)
          const username = email.split('@')[0];
          
          await setDoc(doc(db, 'users', userId), {
            email: email,
            username: username,
            fullName: '',
            phone: '',
            address: '',
            idType: '',
            idNumber: '',
            idImageUrl: '',
            
            // Approval status - set to pending by default
            approvalStatus: 'pending',
            isApproved: false,
            isPending: true,
            accountStatus: 'pending',
            role: 'user',
            
            // Timestamps
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          successList.push(email);
        } catch (error) {
          console.error(`Error adding ${email}:`, error);
          errorList.push({ email, error: error.message });
        }
      }

      setResults({
        total: emails.length,
        success: successList.length,
        failed: errorList.length,
        successList,
        errorList
      });

      // Refresh count
      checkFirestoreConnection();

    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import users: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Link2 className="h-8 w-8 text-blue-600" />
          Connect Firebase to Admin Panel
        </h2>
        <p className="text-gray-600">
          Sync your Firebase Authentication users to Firestore database
        </p>
      </div>

      {/* Quick Auto-Sync Button - Show only if no users in Firestore */}
      {firestoreCount === 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <AlertCircle className="h-8 w-8" />
                No Users Found in Admin Panel!
              </h3>
              <p className="text-orange-100 text-lg mb-1">
                Your Firebase has <strong>8 registered users</strong> but admin panel shows <strong>0</strong>
              </p>
              <p className="text-orange-100">
                Click below to automatically sync all users in one click!
              </p>
            </div>
            <button
              onClick={handleBulkImport}
              disabled={importing}
              className="bg-white text-orange-600 px-8 py-4 rounded-lg hover:bg-orange-50 transition-all font-bold text-xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <Zap className="h-6 w-6" />
                  AUTO-SYNC ALL 8 USERS NOW
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success Message - Show after sync */}
      {firestoreCount > 0 && results && results.success > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-12 w-12" />
            <div>
              <h3 className="text-2xl font-bold mb-1">
                ✅ Successfully Connected!
              </h3>
              <p className="text-green-100 text-lg">
                {results.success} users synced to admin panel. Go to "Manage Users" to approve them!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database className="h-6 w-6 text-blue-600" />
          Connection Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Firebase Config</p>
            <p className="text-2xl font-bold text-green-600">Connected</p>
          </div>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Firestore Users</p>
            <p className="text-2xl font-bold text-blue-600">
              {firestoreCount !== null ? firestoreCount : '?'}
            </p>
          </div>
          
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 text-center">
            <AlertCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Firebase Auth</p>
            <p className="text-lg font-bold text-purple-600">Check Console</p>
          </div>
        </div>

        <button
          onClick={checkFirestoreConnection}
          disabled={checking}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          {checking ? 'Checking...' : 'Refresh Connection Status'}
        </button>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 mb-6 rounded-r-lg">
        <h3 className="text-lg font-bold text-blue-900 mb-3">📌 How It Works</h3>
        <div className="space-y-2 text-blue-800">
          <p><strong>Problem:</strong> Firebase Authentication (login) and Firestore (database) are separate systems.</p>
          <p><strong>Your Situation:</strong> You have 8 users in Firebase Auth, but 0 in Firestore.</p>
          <p><strong>Solution:</strong> Use the bulk import below to create Firestore records for your existing users.</p>
        </div>
      </div>

      {/* Bulk Import Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Upload className="h-6 w-6 text-green-600" />
          Bulk Import Users
        </h3>
        
        <form onSubmit={handleBulkImport}>
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Enter User Emails (one per line or comma-separated)
            </label>
            <textarea
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              placeholder="user1@example.com
user2@example.com
user3@example.com

OR comma-separated:
user1@example.com, user2@example.com, user3@example.com"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Copy emails from your Firebase Authentication console
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Default Settings:</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Username: Extracted from email (before @)</li>
              <li>Approval Status: <strong>Pending</strong> (needs admin approval)</li>
              <li>Account Status: Pending</li>
              <li>Role: User</li>
            </ul>
            <p className="text-sm text-yellow-800 mt-2">
              ℹ️ You can edit details later in "Manage Users"
            </p>
          </div>

          <button
            type="submit"
            disabled={importing}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 font-semibold text-lg flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Importing Users...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Import Users to Firestore
              </>
            )}
          </button>
        </form>

        {/* Results */}
        {results && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-bold text-lg mb-3">Import Results:</h4>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{results.total}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{results.success}</p>
                <p className="text-sm text-gray-600">Success</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{results.failed}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>

            {results.success > 0 && (
              <div className="mb-3">
                <p className="font-semibold text-green-700 mb-2">✅ Successfully Added:</p>
                <div className="bg-white rounded p-3 max-h-40 overflow-y-auto">
                  {results.successList.map((email, idx) => (
                    <div key={idx} className="text-sm text-gray-700 py-1">
                      {idx + 1}. {email}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.failed > 0 && (
              <div>
                <p className="font-semibold text-red-700 mb-2">❌ Failed:</p>
                <div className="bg-white rounded p-3 max-h-40 overflow-y-auto">
                  {results.errorList.map((item, idx) => (
                    <div key={idx} className="text-sm text-red-700 py-1">
                      {item.email}: {item.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                ✨ <strong>Next Step:</strong> Go to "Manage Users" to approve the pending users!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Guide */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">🚀 Quick Start Guide</h3>
        <ol className="space-y-3 text-gray-700">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
            <div>
              <p className="font-semibold">Open Firebase Console</p>
              <p className="text-sm text-gray-600">Go to Authentication → Users tab</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
            <div>
              <p className="font-semibold">Copy User Emails</p>
              <p className="text-sm text-gray-600">Copy all 8 email addresses from the list</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
            <div>
              <p className="font-semibold">Paste Here</p>
              <p className="text-sm text-gray-600">Paste emails in the textarea above</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
            <div>
              <p className="font-semibold">Click Import</p>
              <p className="text-sm text-gray-600">All users will be added to Firestore instantly!</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">5</span>
            <div>
              <p className="font-semibold">Approve Users</p>
              <p className="text-sm text-gray-600">Go to "Manage Users" to approve them</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default ConnectFirebase;
