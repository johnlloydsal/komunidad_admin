# 📱 How to Connect Your Mobile App

## Quick Setup Guide

Your admin panel is ready! Here's how to make your mobile app work with it:

---

## 🔧 Step 1: Add Firebase Config to Mobile App

**Create `firebaseConfig.js` in your mobile app:**

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ⚠️ MUST BE EXACT SAME AS ADMIN PANEL!
const firebaseConfig = {
  apiKey: "AIzaSyC2zpDwzx9cCvfI3blw2oTIbMvJ2MoRs0A",
  authDomain: "komunidad-36f9b.firebaseapp.com",
  projectId: "komunidad-36f9b",
  storageBucket: "komunidad-36f9b.firebasestorage.app",
  messagingSenderId: "888930015901",
  appId: "1:888930015901:web:4d613c2b868a5823951274",
  measurementId: "G-55GWSZQ6KW"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

---

## 👤 Step 2: User Registration (Mobile App)

When user registers, create **both** Firebase Auth AND Firestore document:

```javascript
import { auth, db } from './firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const handleRegister = async (formData) => {
  try {
    // 1. Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );
    
    const user = userCredential.user;
    
    // 2. ⚠️ CRITICAL - Create Firestore document (makes user appear in admin!)
    await setDoc(doc(db, 'users', user.uid), {
      email: formData.email,
      username: formData.username,
      fullName: formData.fullName,
      phone: formData.phone || '',
      address: formData.address || '',
      idType: formData.idType || 'Barangay ID',
      idNumber: formData.idNumber || '',
      idImageUrl: formData.idImageUrl || '',
      photoUrl: formData.photoUrl || '',
      
      // Start as pending approval
      approvalStatus: 'pending',
      isApproved: false,
      accountStatus: 'pending',
      role: 'user',
      
      createdAt: serverTimestamp()
    });
    
    // 3. Navigate to "Account Pending" screen
    navigation.navigate('AccountPending');
    
  } catch (error) {
    alert(error.message);
  }
};
```

---

## ⏳ Step 3: Account Pending Screen (Mobile App)

This screen waits for admin approval (like in your screenshot):

```javascript
import { auth, db } from './firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';

const AccountPendingScreen = ({ navigation }) => {
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    // 🔥 Listen for approval in real-time!
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          // ✅ APPROVED - Auto-redirect to home!
          if (data.isApproved || data.approvalStatus === 'approved') {
            navigation.replace('Home');
          }
          
          // ❌ REJECTED - Show message
          if (data.approvalStatus === 'rejected') {
            alert(`Rejected: ${data.rejectionReason || 'Contact admin'}`);
          }
        }
      }
    );
    
    return () => unsubscribe();
  }, []);
  
  return (
    <View>
      <Text>Account Pending Approval</Text>
      <Text>Thank you for registering!</Text>
      <Text>Your account is under review...</Text>
      {/* Show hourglass icon */}
    </View>
  );
};
```

---

## 📝 Step 4: Submit Reports (Mobile App)

```javascript
import { db, auth } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const handleSubmitReport = async (reportData) => {
  try {
    await addDoc(collection(db, 'reports'), {
      category: reportData.category, // "Road Damage", "Noise", etc.
      description: reportData.description,
      location: reportData.location,
      imageUrl: reportData.imageUrl || '',
      
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    alert('Report submitted! Admin will review it.');
  } catch (error) {
    alert('Failed to submit report');
  }
};
```

---

## 📢 Step 5: View Announcements (Mobile App)

```javascript
import { db } from './firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const AnnouncementsScreen = () => {
  const [announcements, setAnnouncements] = useState([]);
  
  useEffect(() => {
    fetchAnnouncements();
  }, []);
  
  const fetchAnnouncements = async () => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    setAnnouncements(data);
  };
  
  return (
    <FlatList
      data={announcements}
      renderItem={({ item }) => (
        <View>
          <Text>{item.title}</Text>
          <Text>{item.content}</Text>
        </View>
      )}
    />
  );
};
```

---

## ⭐ Step 6: Submit Feedback (Mobile App)

```javascript
import { db, auth } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const handleSubmitFeedback = async (rating, comment) => {
  await addDoc(collection(db, 'feedback'), {
    rating: rating, // 1-5 stars
    comment: comment,
    userId: auth.currentUser.uid,
    userEmail: auth.currentUser.email,
    createdAt: serverTimestamp()
  });
  
  alert('Thank you for your feedback!');
};
```

---

## ✅ Testing the Connection

### Test Flow:
1. **Register in mobile app** → User appears in Admin > Manage Users (Pending)
2. **Admin clicks ✓ Approve** → Mobile app auto-redirects to Home (no refresh!)
3. **Submit report in mobile** → Report appears in Admin > View Reports
4. **Create announcement in admin** → Appears in mobile app announcements
5. **Submit feedback in mobile** → Appears in Admin > View Feedback

---

## 🎯 What's Already Working in Admin Panel

- ✅ **Dashboard** - Real-time stats (updates every 30 seconds)
- ✅ **View Reports** - All user reports with filters
- ✅ **View Announcements** - Create/delete announcements
- ✅ **Manage Lost & Found** - Lost/found item management
- ✅ **Manage Users** - Approve/reject users (with success notifications)
- ✅ **View Feedback** - User ratings and comments

---

## 🔐 Important Notes

1. **Same Firebase project** - Mobile app MUST use same config as admin
2. **Create Firestore document** - After Auth registration, always create user document
3. **Use onSnapshot** - For real-time approval detection
4. **Test approval flow** - Register → Approve → Auto-redirect

---

**You're all set!** Just add these code snippets to your mobile app and everything will connect automatically! 🚀
