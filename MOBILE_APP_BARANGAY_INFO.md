# Mobile App - Barangay Information Integration

## How to Display Barangay Officials and Facilities in Your Mobile App

### Collections to Read From

Your mobile app needs to read from these two Firestore collections:

1. **`barangay_officials`** - Contains barangay officials (Kagawad, SK Chairman, Secretary, etc.)
2. **`barangay_facilities`** - Contains barangay facilities (Multi-Purpose Hall, Health Center, Basketball Court, etc.)

---

## Code Examples for Mobile App

### 1. Fetch Barangay Officials

```javascript
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';

const fetchBarangayOfficials = async () => {
  try {
    const q = query(
      collection(db, 'barangay_officials'),
      orderBy('position', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const officials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('Barangay Officials:', officials);
    return officials;
  } catch (error) {
    console.error('Error fetching officials:', error);
    return [];
  }
};
```

**Expected Data Structure:**
```javascript
{
  id: "ABC123",
  name: "Juan Dela Cruz",
  position: "Kagawad",  // or "SK Chairman", "Secretary", "Tanod", etc.
  imageUrl: "https://firebasestorage.googleapis.com/...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

### 2. Fetch Barangay Facilities

```javascript
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';

const fetchBarangayFacilities = async () => {
  try {
    const q = query(
      collection(db, 'barangay_facilities'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const facilities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('Barangay Facilities:', facilities);
    return facilities;
  } catch (error) {
    console.error('Error fetching facilities:', error);
    return [];
  }
};
```

**Expected Data Structure:**
```javascript
{
  id: "XYZ789",
  name: "Barangay Multi-Purpose Hall",
  category: "Multi-Purpose Hall",  // or "Health Center", "Basketball Court", etc.
  description: "A large hall for community events",
  address: "123 Main Street",
  operatingHours: "8 AM - 5 PM",
  contactNumber: "09123456789",
  imageUrl: "https://firebasestorage.googleapis.com/...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## React Native Component Example

### Barangay Officials Screen

```jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';

const BarangayOfficialsScreen = () => {
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOfficials();
  }, []);

  const fetchOfficials = async () => {
    try {
      const q = query(
        collection(db, 'barangay_officials'),
        orderBy('position', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setOfficials(data);
    } catch (error) {
      console.error('Error fetching officials:', error);
      alert('Failed to load barangay officials');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text>Loading officials...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Barangay Officials</Text>
      
      <FlatList
        data={officials}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imageUrl && (
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.image}
              />
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.position}>{item.position}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16
  },
  info: {
    flex: 1
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  position: {
    fontSize: 14,
    color: '#0066cc'
  }
});

export default BarangayOfficialsScreen;
```

---

### Barangay Facilities Screen

```jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';

const BarangayFacilitiesScreen = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const q = query(
        collection(db, 'barangay_facilities'),
        orderBy('name', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setFacilities(data);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      alert('Failed to load barangay facilities');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text>Loading facilities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Barangay Facilities</Text>
      
      <FlatList
        data={facilities}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imageUrl && (
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.facilityImage}
              />
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.category}>{item.category}</Text>
              {item.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              {item.address && (
                <Text style={styles.detail}>📍 {item.address}</Text>
              )}
              {item.operatingHours && (
                <Text style={styles.detail}>🕒 {item.operatingHours}</Text>
              )}
              {item.contactNumber && (
                <Text style={styles.detail}>📞 {item.contactNumber}</Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  facilityImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12
  },
  info: {
    flex: 1
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  category: {
    fontSize: 14,
    color: '#0066cc',
    marginBottom: 8
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  detail: {
    fontSize: 13,
    color: '#888',
    marginTop: 4
  }
});

export default BarangayFacilitiesScreen;
```

---

## Important Notes

### ✅ What's Working Now

1. **Storage Rules Fixed** - Images can now be uploaded for both officials and facilities
2. **Public Read Access** - Mobile app can read all images without authentication
3. **Proper Collections** - Data is stored in `barangay_officials` and `barangay_facilities`

### 📋 Firestore Rules (Already Configured)

The admin panel already has these rules set:

```javascript
// Barangay officials and facilities
match /barangay_officials/{docId} {
  allow read: if true;  // Public read
  allow create, update, delete: if isAuthenticated();  // Admin only
}

match /barangay_facilities/{docId} {
  allow read: if true;  // Public read
  allow create, update, delete: if isAuthenticated();  // Admin only
}
```

### 🔑 No Authentication Required

Your mobile app can read barangay officials and facilities **WITHOUT** user login:
- ✅ Works for unauthenticated users
- ✅ Works for logged-in users
- ✅ Public information accessible to everyone

---

## Troubleshooting

### Data Not Appearing?

1. **Check Firebase Console**: Go to Firestore and verify data exists in these collections:
   - `barangay_officials`
   - `barangay_facilities`

2. **Check Network**: Ensure mobile device has internet connection

3. **Check Firebase Config**: Ensure your mobile app uses the same Firebase project:
   - Project ID: `komunidad-36f9b`

4. **Check Logs**: Look for error messages in console

5. **Refresh Data**: Add a refresh button to manually reload:

```jsx
const handleRefresh = async () => {
  setRefreshing(true);
  await fetchOfficials(); // or fetchFacilities()
  setRefreshing(false);
};
```

---

**Ready to use!** Your mobile app can now display barangay officials and facilities added from the admin panel.
