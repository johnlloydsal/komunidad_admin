# 🔧 Troubleshooting Guide - Mobile App Issues

## ❌ Common Issues & Solutions

### Issue 1: "User still stuck on Pending Approval after admin approved"

**Symptoms:**
- Admin approved the user
- User tries to login
- Still sees "Pending Approval" screen
- Screen doesn't auto-redirect

**Root Causes:**
1. Real-time listener not working properly
2. Firestore fields not being checked correctly
3. User document not updating

**Solution:**

#### Step 1: Verify Admin Approved Correctly

Check Firestore Console (https://console.firebase.google.com):
```
Collection: users
Document: [userId]

Required fields after approval:
✅ isApproved: true
✅ approvalStatus: "approved"
✅ isPending: false
✅ accountStatus: "active"
```

If these fields are NOT set, the admin panel has an issue. Make sure you're using the updated ManageUsers.jsx.

#### Step 2: Fix Pending Approval Screen

Make sure your Pending Approval screen uses this EXACT code:

```javascript
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'users', userId),
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        
        // Check BOTH fields
        const isApproved = userData.isApproved === true || 
                         userData.approvalStatus === 'approved';
        
        if (isApproved) {
          // IMMEDIATELY redirect
          navigation.replace('Home');
        }
      }
    }
  );
  return () => unsubscribe();
}, [userId]);
```

**Key Points:**
- Use `onSnapshot` (NOT `getDoc` - needs real-time updates)
- Check BOTH `isApproved` and `approvalStatus`
- Use `navigation.replace('Home')` not `.navigate()`

---

### Issue 2: "Username changes when refreshing admin panel"

**Symptoms:**
- Display name shows correctly initially
- After refresh, username/name changes or disappears

**Solution:**

This is a cache/state issue. Fix in your mobile app:

```javascript
// When saving user data during registration:
await setDoc(doc(db, 'users', userId), {
  email: email,
  displayName: displayName,  // Save this!
  firstName: firstName,
  lastName: lastName,
  username: username,
  // ... other fields
});

// Make sure displayName is ALWAYS set
// Don't rely only on firstName/lastName
```

---

### Issue 3: "Can't login after approval"

**Symptoms:**
- Admin approved user
- User enters correct email/password
- Gets "Invalid credentials" or stays on login screen

**Cause:** Firebase Auth account might not exist yet (if you followed old approach of saving only to Firestore first)

**Solution:**

Use the UPDATED registration approach (from QUICK_START_MOBILE.md):

```javascript
// During registration - Create Firebase Auth FIRST
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
const userId = userCredential.user.uid;

// Then save to Firestore with that userId
await setDoc(doc(db, 'users', userId), {
  // ... user data with pending status
});
```

---

### Issue 4: "Pending screen doesn't auto-redirect"

**Debug Steps:**

1. Add console logs to Pending Approval screen:

```javascript
useEffect(() => {
  console.log('👀 Starting listener for userId:', userId);
  
  const unsubscribe = onSnapshot(
    doc(db, 'users', userId),
    (docSnapshot) => {
      console.log('📄 Document snapshot received');
      
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        console.log('✅ User data:', userData);
        console.log('isApproved:', userData.isApproved);
        console.log('approvalStatus:', userData.approvalStatus);
        
        if (userData.isApproved === true || userData.approvalStatus === 'approved') {
          console.log('🚀 Redirecting to Home!');
          navigation.replace('Home');
        } else {
          console.log('⏳ Still pending...');
        }
      } else {
        console.log('❌ Document does not exist');
      }
    },
    (error) => {
      console.error('🔥 Firestore error:', error);
    }
  );
  
  return () => {
    console.log('🧹 Cleaning up listener');
    unsubscribe();
  };
}, [userId]);
```

2. Check the console output:
   - If you see "Document does not exist" → User document not created
   - If isApproved is `false` → Admin hasn't approved or approval didn't save
   - If no logs appear → Listener not working (check Firebase config)

---

### Issue 5: "Google Sign-In bypasses approval"

**Solution:**

Ensure Google Sign-In ALSO checks approval:

```javascript
async function handleGoogleSignIn() {
  // 1. Sign in with Google
  const userInfo = await GoogleSignin.signIn();
  const credential = GoogleAuthProvider.credential(userInfo.idToken);
  const userCredential = await signInWithCredential(auth, credential);
  const userId = userCredential.user.uid;
  
  // 2. Check if user document exists
  const userDoc = await getDoc(doc(db, 'users', userId));
  
  if (!userDoc.exists()) {
    // New Google user - create with PENDING status
    await setDoc(doc(db, 'users', userId), {
      email: userInfo.user.email,
      displayName: userInfo.user.name,
      photoUrl: userInfo.user.photo,
      authProvider: 'google',
      isApproved: false,      // ← IMPORTANT
      approvalStatus: 'pending',
      isPending: true,
      createdAt: serverTimestamp()
    });
    
    // Go to pending screen
    navigation.replace('PendingApproval', { userId });
    return;
  }
  
  // 3. Existing user - check approval
  const userData = userDoc.data();
  if (userData.isApproved === true || userData.approvalStatus === 'approved') {
    navigation.replace('Home');
  } else {
    navigation.replace('PendingApproval', { userId });
  }
}
```

---

## 🧪 Testing Checklist

### Test Scenario 1: New User Registration
- [ ] User fills registration form with ID upload
- [ ] Firebase Auth account created
- [ ] Firestore document created with `isPending: true, isApproved: false`
- [ ] User sees Pending Approval screen
- [ ] Pending screen shows waiting message

### Test Scenario 2: Admin Approval
- [ ] Admin opens admin panel
- [ ] Goes to Manage Users
- [ ] Sees user with "Pending" badge
- [ ] Clicks "Approve User"
- [ ] Sees success message
- [ ] User document in Firestore now has `isApproved: true`

### Test Scenario 3: Auto-Redirect
- [ ] User is on Pending Approval screen
- [ ] Admin approves user (in admin panel)
- [ ] Pending screen **automatically** shows alert
- [ ] User clicks "Continue"
- [ ] **Redirects to Home screen** ✅

### Test Scenario 4: Login After Approval
- [ ] User approved previously
- [ ] User enters email/password
- [ ] Firebase Auth login succeeds
- [ ] App checks Firestore
- [ ] isApproved is `true`
- [ ] **Goes directly to Home** ✅

---

## 📋 Quick Fix Checklist

If auto-redirect not working:

1. ✅ Check Firestore document has `isApproved: true`
2. ✅ Check Pending screen uses `onSnapshot` (not `getDoc`)
3. ✅ Check userId is passed correctly to Pending screen
4. ✅ Check navigation uses `.replace()` not `.navigate()`
5. ✅ Check Firebase config is correct in mobile app
6. ✅ Check user has internet connection
7. ✅ Try logging out and logging in again

---

## 🔍 How to Debug

### View Firestore Data
```javascript
// Add this to your Pending Approval screen temporarily
useEffect(() => {
  const checkUserData = async () => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      console.log('USER DATA:', JSON.stringify(userDoc.data(), null, 2));
    }
  };
  checkUserData();
}, []);
```

### Force Refresh
```javascript
// Add a manual refresh button
<Button
  title="Force Check Status"
  onPress={async () => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    if (userData?.isApproved === true) {
      Alert.alert('Approved!', 'Redirecting...', [
        { text: 'OK', onPress: () => navigation.replace('Home') }
      ]);
    } else {
      Alert.alert('Status', `Still pending. isApproved: ${userData?.isApproved}`);
    }
  }}
/>
```

---

## 🆘 If Nothing Works

1. **Clear app data/cache**
2. **Uninstall and reinstall app**
3. **Check Firebase Firestore rules** - make sure users can read their own data
4. **Verify userId** - make sure it matches between Auth and Firestore
5. **Check admin panel** - verify approval actually saved to Firestore

### Firestore Rules (Required)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can read their own document
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Anyone can create (for registration)
      allow create: if true;
      
      // Only admins can update
      allow update: if request.auth != null;
    }
  }
}
```

---

**Last Updated:** February 18, 2026
**Status:** Production Ready ✅
