# Mobile App Integration Guide - User Approval System

## Overview
This document explains how the mobile app should integrate with the admin approval system for user registration and authentication.

## User Registration Flow

### 1. Registration with ID Verification

When a user registers in the mobile app, collect the following information:

```javascript
// Required fields during registration
const userRegistrationData = {
  email: string,
  password: string,
  displayName: string,
  firstName: string,
  lastName: string,
  phoneNumber: string,
  address: string,
  username: string,
  
  // ID Verification (REQUIRED)
  idImageUrl: string,      // Upload to Firebase Storage
  idNumber: string,        // ID number from the valid ID
  idType: string,          // e.g., "National ID", "Driver's License", etc.
  
  // System fields
  approvalStatus: 'pending',
  isApproved: false,
  isPending: true,
  createdAt: serverTimestamp()
};
```

### 2. Save to Firestore with Firebase Auth

**UPDATED APPROACH**: Create Firebase Auth account first, then save to Firestore with pending status:

```javascript
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function registerUser(formData, idImageFile) {
  try {
    // 1. Create Firebase Auth account first
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );
    
    const userId = userCredential.user.uid;
    
    // 2. Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: formData.displayName
    });
    
    // 3. Upload ID image to Firebase Storage
    const storage = getStorage();
    const idImageRef = ref(storage, `user-ids/${userId}_${Date.now()}.jpg`);
    await uploadBytes(idImageRef, idImageFile);
    const idImageUrl = await getDownloadURL(idImageRef);
    
    // 4. Save user data to Firestore with pending status
    await setDoc(doc(db, 'users', userId), {
      email: formData.email,
      displayName: formData.displayName,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
      address: formData.address,
      username: formData.username,
      
      // ID Verification
      idImageUrl: idImageUrl,
      idNumber: formData.idNumber,
      idType: formData.idType,
      
      // Approval status
      approvalStatus: 'pending',
      isApproved: false,
      isPending: true,
      accountStatus: 'pending',
      
      // Timestamps
      createdAt: serverTimestamp()
    });
    
    // 5. Return success with userId for pending screen
    return {
      success: true,
      userId: userId,
      message: 'Registration submitted! Please wait for admin approval.'
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'Email already in use' };
    }
    return { success: false, message: error.message };
  }
}

// Usage in registration screen
const result = await registerUser(formData, idImage);
if (result.success) {
  // Navigate to pending approval screen
  navigation.replace('PendingApproval', { userId: result.userId });
} else {
  Alert.alert('Error', result.message);
}
```

### 3. Pending Approval Screen with Auto-Redirect

**CRITICAL**: After registration or when login shows pending status, show this screen that listens for approval changes:

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';

function PendingApprovalScreen({ userId, navigation }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!userId) {
      // No user ID provided, go back to login
      navigation.replace('Login');
      return;
    }

    // Listen for real-time approval status changes
    const userDocRef = doc(db, 'users', userId);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        
        // Check if approved
        if (userData.isApproved === true || userData.approvalStatus === 'approved') {
          Alert.alert(
            '✅ Account Approved!',
            'Your account has been approved. You can now access the app.',
            [
              {
                text: 'Continue',
                onPress: () => {
                  // Auto-redirect to Home/Main screen
                  navigation.replace('Home');
                }
              }
            ]
          );
        }
        
        // Check if rejected
        if (userData.approvalStatus === 'rejected') {
          Alert.alert(
            '❌ Account Rejected',
            `Your account was rejected. Reason: ${userData.rejectionReason || 'Not specified'}`,
            [
              {
                text: 'OK',
                onPress: () => navigation.replace('Login')
              }
            ]
          );
        }
      }
      setChecking(false);
    });

    // Cleanup listener
    return () => unsubscribe();
  }, [userId]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        ⏳ Account Pending Approval
      </Text>
      
      {checking && <ActivityIndicator size="large" color="#0000ff" />}
      
      <Text style={{ textAlign: 'center', color: '#666', marginVertical: 20 }}>
        Your account has been submitted for review. 
        An admin will verify your ID and approve your account within 24-48 hours.
        {'\n\n'}
        ✨ This screen will automatically update when your account is approved!
      </Text>

      <Button 
        title="Refresh" 
        onPress={() => setChecking(true)} 
      />
      
      <Button 
        title="Back to Login" 
        onPress={() => navigation.replace('Login')} 
      />
    </View>
  );
}

export default PendingApprovalScreen;
```

**Usage in Login Flow:**

```javascript
// In your Login screen
const result = await handleLogin(email, password);

if (result.success) {
  navigation.replace('Home');
} else if (result.isPending) {
  // Navigate to pending screen with userId
  navigation.replace('PendingApproval', { userId: result.userId });
} else {
  Alert.alert('Error', result.message);
}
```

## Login Flow

### 1. Simplified Login with Approval Check

**UPDATED APPROACH**: Check approval status in Firestore and allow login if approved:

```javascript
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';

async function handleLogin(email, password) {
  try {
    // 1. Attempt Firebase Auth login first
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    
    // 2. Check approval status in Firestore
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // User document not found in Firestore - allow access anyway (might be admin)
      return { success: true };
    }
    
    const userData = userDoc.data();
    
    // 3. Check if account is approved
    if (userData.isApproved === true || userData.approvalStatus === 'approved') {
      // User is approved - allow access
      return { success: true, userData };
    }
    
    // 4. Check if still pending
    if (userData.isPending === true || userData.approvalStatus === 'pending') {
      // Sign out and show pending message
      await auth.signOut();
      return {
        success: false,
        isPending: true,
        userId: userId,
        message: 'Your account is pending approval. Please wait for admin verification.'
      };
    }
    
    // 5. Check if rejected
    if (userData.approvalStatus === 'rejected') {
      await auth.signOut();
      return {
        success: false,
        message: `Account rejected. Reason: ${userData.rejectionReason || 'Not specified'}`
      };
    }
    
    // Default: allow access if no approval status set
    return { success: true, userData };
    
  } catch (error) {
    console.error('Login error:', error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      return { success: false, message: 'Invalid email or password' };
    }
    return { success: false, message: error.message };
  }
}
```

### 2. Google Sign-In Integration (Updated)

**SIMPLIFIED**: Sign in with Google first, then check approval status:

```javascript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

async function handleGoogleSignIn() {
  try {
    // 1. Sign in with Google
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
    
    // 2. Complete Firebase Auth sign-in
    const userCredential = await signInWithCredential(auth, googleCredential);
    const userId = userCredential.user.uid;
    
    // 3. Check if user document exists in Firestore
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // New Google user - create account with pending status
      await setDoc(userDocRef, {
        email: userInfo.user.email,
        displayName: userInfo.user.name,
        photoUrl: userInfo.user.photo,
        authProvider: 'google',
        approvalStatus: 'pending',
        isApproved: false,
        isPending: true,
        createdAt: serverTimestamp()
      });
      
      // Sign out and show pending
      await auth.signOut();
      
      return {
        success: false,
        isPending: true,
        userId: userId,
        message: 'Account created! Please wait for admin approval.'
      };
    }
    
    // 4. User exists, check approval status
    const userData = userDoc.data();
    
    if (userData.isApproved === true || userData.approvalStatus === 'approved') {
      // Approved - allow access
      return { success: true, userData };
    }
    
    if (userData.isPending === true || userData.approvalStatus === 'pending') {
      // Still pending - sign out
      await auth.signOut();
      return {
        success: false,
        isPending: true,
        userId: userId,
        message: 'Your account is pending approval.'
      };
    }
    
    if (userData.approvalStatus === 'rejected') {
      await auth.signOut();
      return {
        success: false,
        message: `Account rejected: ${userData.rejectionReason || 'Not specified'}`
      };
    }
    
    // Default: allow access
    return { success: true, userData };
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    return { success: false, message: error.message };
  }
}
```

## Admin Approval Process

### What Happens When Admin Approves

When admin approves a user in the admin panel, the following fields are updated:

```javascript
{
  approvalStatus: 'approved',
  isApproved: true,
  isPending: false,
  approvedAt: serverTimestamp(),
  approvedBy: 'Admin'
}
```

### Real-Time Approval Listening (Optional)

You can listen for approval status changes in real-time:

```javascript
import { doc, onSnapshot } from 'firebase/firestore';

function listenForApproval(userId, callback) {
  const userRef = doc(db, 'users', userId);
  
  const unsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const userData = doc.data();
      if (userData.approvalStatus === 'approved') {
        callback({ approved: true });
      } else if (userData.approvalStatus === 'rejected') {
        callback({ 
          approved: false, 
          reason: userData.rejectionReason 
        });
      }
    }
  });
  
  return unsubscribe;
}

// Usage in pending screen
useEffect(() => {
  const unsubscribe = listenForApproval(currentUserId, (result) => {
    if (result.approved) {
      Alert.alert(
        'Account Approved!',
        'Your account has been approved. You can now log in.',
        [{ text: 'Login', onPress: () => navigation.navigate('Login') }]
      );
    }
  });
  
  return () => unsubscribe();
}, []);
```

## Password Reset Integration

The password reset works through Firebase Auth email system:

```javascript
import { sendPasswordResetEmail } from 'firebase/auth';

async function handlePasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent! Check your inbox.'
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```

## Important Notes

1. **Never create Firebase Auth accounts during registration** - Only create Firestore documents
2. **Always check approval status before login attempts**
3. **Google Sign-In users also need approval** - Don't bypass the approval system
4. **Store user ID verification images** - Required for admin verification
5. **Handle rejected users gracefully** - Show rejection reason if available

## Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Anyone can create (for registration)
      allow create: if request.auth == null;
      
      // Only admins can update approval status
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /admins/{adminId} {
      allow read, write: if request.auth != null && request.auth.uid == adminId;
    }
  }
}
```

## Testing Checklist

- [ ] User can register with email and ID upload
- [ ] Registration creates Firestore document (not Auth account)
- [ ] User sees "Pending Approval" screen after registration
- [ ] User cannot login while status is pending
- [ ] Admin can view ID image in admin panel
- [ ] Admin can approve user
- [ ] After approval, user can successfully login
- [ ] Google Sign-In users also go through approval process
- [ ] Rejected users see rejection message
- [ ] Password reset emails are sent successfully
