import { useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '../firebase';
import { CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';

const ConnectionTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({
    firebaseConfig: null,
    authConnection: null,
    firestoreRead: null,
    firestoreWrite: null,
    storageConnection: null,
  });

  const testAllConnections = async () => {
    setTesting(true);
    const newResults = {};

    // 1. Test Firebase Config
    try {
      if (db && auth && storage) {
        newResults.firebaseConfig = { success: true, message: 'Firebase initialized successfully' };
      } else {
        newResults.firebaseConfig = { success: false, message: 'Firebase services not initialized' };
      }
    } catch (error) {
      newResults.firebaseConfig = { success: false, message: error.message };
    }

    // 2. Test Auth Connection
    try {
      const currentUser = auth.currentUser;
      newResults.authConnection = { 
        success: true, 
        message: currentUser ? `Logged in as: ${currentUser.email}` : 'Auth ready (not logged in)'
      };
    } catch (error) {
      newResults.authConnection = { success: false, message: error.message };
    }

    // 3. Test Firestore Read
    try {
      console.log('Testing Firestore read...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      newResults.firestoreRead = { 
        success: true, 
        message: `Successfully read Firestore. Found ${usersSnapshot.size} users`,
        count: usersSnapshot.size
      };
    } catch (error) {
      console.error('Firestore read error:', error);
      newResults.firestoreRead = { success: false, message: `Error: ${error.code || error.message}` };
    }

    // 4. Test Firestore Write
    try {
      console.log('Testing Firestore write...');
      const testDocRef = doc(db, '_connection_test', 'test_doc');
      await setDoc(testDocRef, {
        testField: 'Connection test',
        timestamp: serverTimestamp()
      });
      await deleteDoc(testDocRef); // Clean up
      newResults.firestoreWrite = { success: true, message: 'Write permissions working' };
    } catch (error) {
      console.error('Firestore write error:', error);
      newResults.firestoreWrite = { success: false, message: `Error: ${error.code || error.message}` };
    }

    // 5. Test Storage Connection
    try {
      if (storage) {
        newResults.storageConnection = { success: true, message: 'Firebase Storage initialized' };
      } else {
        newResults.storageConnection = { success: false, message: 'Storage not initialized' };
      }
    } catch (error) {
      newResults.storageConnection = { success: false, message: error.message };
    }

    setResults(newResults);
    setTesting(false);
  };

  const ResultItem = ({ title, result }) => {
    if (!result) return null;

    return (
      <div className={`p-4 rounded-lg border-2 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-start gap-3">
          {result.success ? (
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h3 className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
              {title}
            </h3>
            <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              {result.message}
            </p>
            {result.count !== undefined && (
              <p className="text-sm mt-1 font-mono text-green-800">
                User count: {result.count}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Connection Test</h2>
        <p className="text-gray-600">
          Test all Firebase connections to ensure everything is working properly
        </p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-blue-900">About This Test</h3>
            <p className="text-sm text-blue-800 mt-1">
              This checks if your admin panel can properly connect to Firebase Authentication, 
              Firestore Database, and Storage. All connections must pass for the app to work correctly.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={testAllConnections}
        disabled={testing}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-semibold mb-6 flex items-center justify-center gap-2"
      >
        {testing ? (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" />
            Testing Connections...
          </>
        ) : (
          <>
            <RefreshCw className="h-5 w-5" />
            Run Connection Test
          </>
        )}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Test Results:</h3>
          
          <ResultItem title="1. Firebase Configuration" result={results.firebaseConfig} />
          <ResultItem title="2. Firebase Authentication" result={results.authConnection} />
          <ResultItem title="3. Firestore Read Access" result={results.firestoreRead} />
          <ResultItem title="4. Firestore Write Access" result={results.firestoreWrite} />
          <ResultItem title="5. Firebase Storage" result={results.storageConnection} />

          {/* Summary */}
          <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
            <h4 className="font-bold text-gray-900 mb-3">Summary:</h4>
            {Object.values(results).every(r => r?.success) ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">All connections successful! ✨</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">Some connections failed</span>
                </div>
                <div className="text-sm text-gray-700 mt-3">
                  <p className="font-semibold mb-2">Common fixes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check Firebase Console → Project Settings → Your apps</li>
                    <li>Verify Firestore security rules allow read/write</li>
                    <li>Make sure you're logged in to the admin panel</li>
                    <li>Check browser console (F12) for detailed error messages</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Firestore Rules Suggestion */}
          {results.firestoreWrite && !results.firestoreWrite.success && (
            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500">
              <h4 className="font-bold text-yellow-900 mb-2">Firestore Rules Fix:</h4>
              <p className="text-sm text-yellow-800 mb-2">
                If you see "permission-denied", update your Firestore rules in Firebase Console:
              </p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;
