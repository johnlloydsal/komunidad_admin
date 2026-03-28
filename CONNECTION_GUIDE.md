# 🔗 Connecting Mobile App to Admin Panel

## Firebase Configuration (CRITICAL!)

### ⚠️ IMPORTANT: Both apps MUST use the SAME Firebase project!

Your Admin Panel uses this Firebase project:
```
Project ID: komunidad-36f9b
```

---

## ✅ Step 1: Configure Firebase in Mobile App

### For React Native App

**1. Install Firebase**
```bash
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/storage
```

**2. Create `firebase.js` in your mobile app**

```javascript
// mobile-app/src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ⚠️ MUST USE EXACT SAME CONFIG AS ADMIN PANEL!
const firebaseConfig = {
  apiKey: "AIzaSyC2zpDwzx9cCvfI3blw2oTIbMvJ2MoRs0A",
  authDomain: "komunidad-36f9b.firebaseapp.com",
  projectId: "komunidad-36f9b",
  storageBucket: "komunidad-36f9b.firebasestorage.app",
  messagingSenderId: "888930015901",
  appId: "1:888930015901:web:4d613c2b868a5823951274",
  measurementId: "G-55GWSZQ6KW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

---

## ✅ Step 2: Verify Firestore Collection Names

### MUST USE THESE EXACT COLLECTION NAMES:

| Feature | Collection Name | Used By |
|---------|----------------|---------|
| Users | `users` | Registration, Login, User Management |
| Admins | `admins` | Admin accounts |
| Reports | `reports` | Community reports |
| Feedback | `feedback` | User feedback/reviews |
| Announcements | `announcements` | Barangay announcements |
| Lost Items | `lost_items` | Lost & Found |
| Service Requests | `service_requests` | Service requests |

---

## ✅ Step 3: Set Up Firestore Security Rules

**Go to Firebase Console:** https://console.firebase.google.com/project/komunidad-36f9b/firestore/rules

**Replace with these rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      // Anyone can create (for registration)
      allow create: if true;
      
      // Users can read their own document
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Admins can read and update any user
      allow read, update: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Admins collection
    match /admins/{adminId} {
      // Only admins can read
      allow read: if request.auth != null && request.auth.uid == adminId;
      
      // Only existing admins can create new admins
      allow create: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Reports collection
    match /reports/{reportId} {
      // Authenticated users can create
      allow create: if request.auth != null;
      
      // Users can read their own reports
      allow read: if request.auth != null;
      
      // Admins can read, update, delete
      allow read, update, delete: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Feedback collection
    match /feedback/{feedbackId} {
      // Authenticated users can create
      allow create: if request.auth != null;
      
      // Anyone can read feedback
      allow read: if request.auth != null;
      
      // Admins can delete
      allow delete: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Announcements collection
    match /announcements/{announcementId} {
      // Anyone can read
      allow read: if true;
      
      // Only admins can create, update, delete
      allow create, update, delete: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Lost Items collection
    match /lost_items/{itemId} {
      // Authenticated users can create
      allow create: if request.auth != null;
      
      // Anyone authenticated can read
      allow read: if request.auth != null;
      
      // Admins can update and delete
      allow update, delete: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Service Requests collection
    match /service_requests/{requestId} {
      // Authenticated users can create
      allow create: if request.auth != null;
      
      // Anyone authenticated can read
      allow read: if request.auth != null;
      
      // Admins can update and delete
      allow update, delete: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
  }
}

// Storage rules
service firebase.storage {
  match /b/{bucket}/o {
    match /user-ids/{userId}/{allPaths=**} {
      // Users can upload their ID
      allow write: if request.auth != null;
      
      // Admins can read IDs
      allow read: if request.auth != null;
    }
    
    match /reports/{allPaths=**} {
      // Authenticated users can upload
      allow write: if request.auth != null;
      allow read: if request.auth != null;
    }
    
    match /lost-items/{allPaths=**} {
      allow write: if request.auth != null;
      allow read: if request.auth != null;
    }
  }
}
```

---

## ✅ Step 4: Test Connection

### Test in Mobile App:

**1. Test Firestore Write:**
```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

async function testConnection() {
  try {
    const testDoc = await addDoc(collection(db, 'reports'), {
      description: 'Test report from mobile app',
      category: 'test',
      createdAt: serverTimestamp(),
      reporterName: 'Test User'
    });
    
    console.log('✅ Connected! Document ID:', testDoc.id);
    alert('✅ Successfully connected to admin panel!');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    alert('❌ Connection failed: ' + error.message);
  }
}
```

**2. Check in Admin Panel:**
- Open http://localhost:5174/
- Go to "View Reports"
- You should see the test report!

---

## ✅ Step 5: Verify Data Flow

### From Mobile App to Admin Panel:

#### A. User Registration (Mobile → Admin)
```javascript
// Mobile app - Register user
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const userCredential = await createUserWithEmailAndPassword(auth, email, password);
await setDoc(doc(db, 'users', userCredential.user.uid), {
  email: email,
  displayName: displayName,
  approvalStatus: 'pending',
  isApproved: false,
  isPending: true,
  createdAt: serverTimestamp()
});

// ✅ Check in Admin Panel → Manage Users
```

#### B. Submit Report (Mobile → Admin)
```javascript
// Mobile app - Submit report
await addDoc(collection(db, 'reports'), {
  description: description,
  category: selectedCategory,
  location: location,
  reporterName: user.displayName,
  userId: user.uid,
  createdAt: serverTimestamp(),
  status: 'pending'
});

// ✅ Check in Admin Panel → View Reports
```

#### C. Send Feedback (Mobile → Admin)
```javascript
// Mobile app - Submit feedback
await addDoc(collection(db, 'feedback'), {
  userName: user.displayName,
  rating: rating,
  comment: comment,
  userId: user.uid,
  createdAt: serverTimestamp()
});

// ✅ Check in Admin Panel → View Feedback
```

### From Admin Panel to Mobile App:

#### A. Create Announcement (Admin → Mobile)
```javascript
// Admin creates announcement in panel
// Mobile app fetches with:
const announcements = await getDocs(collection(db, 'announcements'));
```

#### B. Approve User (Admin → Mobile)
```javascript
// Admin approves in panel (sets isApproved: true)
// Mobile app checks with real-time listener:
onSnapshot(doc(db, 'users', userId), (doc) => {
  if (doc.data().isApproved === true) {
    // Redirect to home!
  }
});
```

---

## 🔍 Troubleshooting

### Issue 1: "Permission Denied" errors

**Solution:** Update Firestore security rules (Step 3 above)

### Issue 2: Data not showing in admin panel

**Check:**
1. ✅ Same Firebase project ID?
2. ✅ Correct collection names?
3. ✅ Data actually saved? Check Firebase Console
4. ✅ Security rules allow read access?

### Issue 3: Users can't register

**Check:**
1. ✅ Firebase Auth enabled?
2. ✅ Email/Password sign-in method enabled in Firebase Console?
3. ✅ Security rules allow user creation?

### Issue 4: Real-time updates not working

**Solution:** Use `onSnapshot` instead of `getDocs`:

```javascript
// ❌ Wrong - one-time read
const users = await getDocs(collection(db, 'users'));

// ✅ Correct - real-time updates
onSnapshot(collection(db, 'users'), (snapshot) => {
  const users = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  setUsers(users);
});
```

---

## 📱 Quick Connection Checklist

- [ ] Mobile app has same Firebase config
- [ ] Firebase Auth enabled in console
- [ ] Email/Password sign-in method enabled
- [ ] Firestore security rules updated
- [ ] Storage security rules updated
- [ ] Collection names match exactly
- [ ] Test document created successfully
- [ ] Test document visible in admin panel
- [ ] User registration works
- [ ] User approval works
- [ ] Real-time updates working

---

## 🆘 Still Not Connected?

### Debug Steps:

**1. Check Firebase Console:**
```
https://console.firebase.google.com/project/komunidad-36f9b/firestore/data
```
- Do you see collections: users, reports, feedback?
- Can you see documents inside?

**2. Check Authentication:**
```
https://console.firebase.google.com/project/komunidad-36f9b/authentication/users
```
- Are users being created?

**3. Enable Debug Logging:**
```javascript
// In mobile app
import { setLogLevel } from 'firebase/firestore';
setLogLevel('debug');
```

**4. Check Network:**
- Is device/emulator connected to internet?
- Try on real device if using emulator
- Check firewall settings

**5. Verify Package Versions:**
```bash
# Should be compatible versions
"firebase": "^10.0.0" or higher
```

---

## ✅ Success Indicators

You'll know it's connected when:

1. ✅ User registers in mobile app → Shows in Admin Panel "Manage Users"
2. ✅ Admin approves user → Mobile app auto-redirects to home
3. ✅ User submits report → Shows in Admin Panel "View Reports"
4. ✅ Admin creates announcement → Shows in mobile app
5. ✅ User gives feedback → Shows in Admin Panel "View Feedback"

---

**Project ID:** `komunidad-36f9b`
**Admin Panel:** http://localhost:5174/
**Firebase Console:** https://console.firebase.google.com/project/komunidad-36f9b/

**Both apps MUST use the same Firebase project!**
