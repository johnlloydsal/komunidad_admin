import { useState } from 'react';
import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { RefreshCw, CheckCircle, AlertCircle, Users } from 'lucide-react';

const SyncUsers = () => {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState(null);

  const syncAuthUsersToFirestore = async () => {
    setSyncing(true);
    setResults(null);

    try {
      // Get all existing Firestore users
      const firestoreSnapshot = await getDocs(collection(db, 'users'));
      const existingUIDs = new Set(firestoreSnapshot.docs.map(doc => doc.id));

      // Note: Firebase Web SDK doesn't allow listing all Auth users
      // You need to use Firebase Admin SDK on backend OR manually add users
      
      const message = `
        Found ${existingUIDs.size} users in Firestore.
        
        To sync Firebase Auth users to Firestore, your mobile app MUST create 
        Firestore documents during registration.
        
        Update your mobile app registration code to include setDoc() after 
        createUserWithEmailAndPassword().
      `;

      setResults({
        success: true,
        message,
        firestoreCount: existingUIDs.size
      });

    } catch (error) {
      console.error('Error:', error);
      setResults({
        success: false,
        message: error.message
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sync Users</h2>
        <p className="text-gray-600">
          This page helps diagnose connection issues between Firebase Auth and Firestore.
        </p>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Important</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-2">The admin panel reads from <strong>Firestore</strong>, not Firebase Auth.</p>
              <p>Your mobile app must create Firestore documents when users register.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" />
          Check Firestore Status
        </h3>
        
        <button
          onClick={syncAuthUsersToFirestore}
          disabled={syncing}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center"
        >
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Firestore Users
            </>
          )}
        </button>

        {results && (
          <div className={`mt-4 p-4 rounded-lg ${results.success ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start">
              {results.success ? (
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="ml-3 flex-1">
                <pre className="text-sm whitespace-pre-wrap text-gray-700">{results.message}</pre>
                {results.firestoreCount !== undefined && (
                  <p className="mt-2 text-lg font-semibold text-blue-600">
                    Users in Firestore: {results.firestoreCount}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Mobile App Registration Fix</h3>
        <p className="text-gray-600 mb-4">
          Your mobile app registration code MUST look like this:
        </p>
        
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm">{`// In your mobile app registration screen
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, storage } from './firebase'; // Same config as admin!

const handleRegister = async () => {
  try {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    
    const user = userCredential.user;
    
    // 2. Upload ID image to Storage
    let idImageUrl = '';
    if (idImage) {
      const storageRef = ref(storage, \`user-ids/\${user.uid}\`);
      await uploadBytes(storageRef, idImage);
      idImageUrl = await getDownloadURL(storageRef);
    }
    
    // 3. CREATE FIRESTORE DOCUMENT (THIS IS CRITICAL!)
    await setDoc(doc(db, 'users', user.uid), {
      // User info
      email: email,
      username: username,
      fullName: fullName,
      phone: phone || '',
      address: address || '',
      
      // ID verification
      idType: idType, // 'Barangay ID' or 'School ID'
      idNumber: idNumber,
      idImageUrl: idImageUrl,
      
      // Approval status (REQUIRED for admin panel)
      isApproved: false,
      isPending: true,
      approvalStatus: 'pending',
      accountStatus: 'pending',
      role: 'user',
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('User registered successfully!');
    // Now navigate to PendingApprovalScreen
    
  } catch (error) {
    console.error('Registration error:', error);
    alert(error.message);
  }
};`}</pre>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Key Points:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Use <code className="bg-blue-100 px-1 rounded">setDoc(doc(db, 'users', user.uid), ...)</code> after creating Auth user</li>
            <li>Document ID MUST be the same as user.uid from Authentication</li>
            <li>Include all approval fields: isApproved, isPending, approvalStatus, accountStatus</li>
            <li>Use the SAME Firebase config as this admin panel</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SyncUsers;
