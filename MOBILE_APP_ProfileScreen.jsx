// ==================================================================
// MOBILE APP - My Profile Screen (WITH ID SUBMISSION)
// Place this file in your mobile app screens folder
// ==================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [idImage, setIdImage] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const auth = getAuth();
      const db = getFirestore();
      const user = auth.currentUser;

      if (!user) {
        navigation.replace('Login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData({ id: user.uid, ...userDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handlePickIdImage = () => {
    Alert.alert('Upload ID', 'Choose how to upload your ID photo', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets?.[0]) {
            setIdImage(result.assets[0]);
            uploadIdImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery permission is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets?.[0]) {
            setIdImage(result.assets[0]);
            uploadIdImage(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadIdImage = async (imageUri) => {
    setUploading(true);
    try {
      const auth = getAuth();
      const db = getFirestore();
      const user = auth.currentUser;

      if (!user) return;

      // Upload image to Firebase Storage
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storage = getStorage();
      const storageRef = ref(storage, `user-ids/${user.uid}_${Date.now()}.jpg`);
      
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      // Update user document in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        idImageUrl: downloadUrl,
        idSubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'ID uploaded successfully! Waiting for admin approval.');
      
      // Refresh user data
      await fetchUserData();
    } catch (error) {
      console.error('Error uploading ID:', error);
      Alert.alert('Error', 'Failed to upload ID. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              const auth = getAuth();
              await signOut(auth);
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const isApproved = userData?.isApproved === true || userData?.approvalStatus === 'approved';
  const isPending = userData?.approvalStatus === 'pending';
  const hasSubmittedId = userData?.idImageUrl ? true : false;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userData?.displayName?.charAt(0) || userData?.firstName?.charAt(0) || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>
          {userData?.displayName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim()}
        </Text>
        <Text style={styles.username}>@{userData?.username || 'user'}</Text>
        <Text style={styles.email}>{userData?.email || ''}</Text>
        <Text style={[styles.statusBadge, isApproved ? styles.approvedBadge : styles.pendingBadge]}>
          {isApproved ? '✓ Verified' : '⏳ Pending Approval'}
        </Text>
        <Text style={styles.memberSince}>
          Member since {userData?.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
        </Text>
      </View>

      {/* ID Verification Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.verificationCard}
          onPress={() => !hasSubmittedId && handlePickIdImage()}
          disabled={uploading || hasSubmittedId}
        >
          <View style={styles.verificationIcon}>
            <Text style={styles.verificationIconText}>
              {hasSubmittedId ? (isApproved ? '✓' : '⏳') : '📋'}
            </Text>
          </View>
          <View style={styles.verificationContent}>
            <Text style={styles.verificationTitle}>Submit ID for Verification</Text>
            <Text style={styles.verificationDesc}>
              {uploading 
                ? 'Uploading...'
                : hasSubmittedId
                ? (isApproved 
                    ? '✅ Verified - You have full access'
                    : '⏳ Verification pending - waiting for admin approval')
                : '📤 Upload your ID to get verified and access all features'}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Account Information */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ProfileEdit')}
        >
          <View style={styles.menuIcon}>
            <Text style={styles.menuIconText}>👤</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Account Information</Text>
            <Text style={styles.menuDesc}>View and manage your account details</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Banner if Pending */}
      {!isApproved && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Your ID verification is pending admin approval
          </Text>
        </View>
      )}

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 30,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  approvedBadge: {
    backgroundColor: '#28a745',
    color: '#fff',
  },
  pendingBadge: {
    backgroundColor: '#ffc107',
    color: '#000',
  },
  memberSince: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  verificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verificationIconText: {
    fontSize: 24,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  verificationDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconText: {
    fontSize: 20,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: 12,
    color: '#999',
  },
  banner: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  bannerText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  logoutSection: {
    padding: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
