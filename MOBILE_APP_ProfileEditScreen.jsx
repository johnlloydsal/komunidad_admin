// ==================================================================
// MOBILE APP - Profile Edit Screen (WITH REAL-TIME SYNC TO ADMIN)
// Place this file in your mobile app screens folder
// ==================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const ProfileEditScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phoneNumber: '',
    houseStreet: '',
    zone: '',
  });

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
        const data = userDoc.data();
        setUserData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          username: data.username || '',
          phoneNumber: data.phoneNumber || data.phone || '',
          houseStreet: data.houseStreet || '',
          zone: data.zone || '',
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userData.firstName || !userData.lastName) {
      Alert.alert('Error', 'First Name and Last Name are required');
      return;
    }

    setSaving(true);
    try {
      const auth = getAuth();
      const db = getFirestore();
      const user = auth.currentUser;

      if (!user) {
        navigation.replace('Login');
        return;
      }

      // ✅ UPDATE FIRESTORE - Admin panel will see these changes IMMEDIATELY
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        fullName: `${userData.firstName.trim()} ${userData.lastName.trim()}`,
        displayName: `${userData.firstName.trim()} ${userData.lastName.trim()}`,
        username: userData.username.trim(),
        phoneNumber: userData.phoneNumber.trim(),
        phone: userData.phoneNumber.trim(),
        houseStreet: userData.houseStreet.trim(),
        zone: userData.zone.trim(),
        address: userData.houseStreet.trim() 
          ? `${userData.houseStreet.trim()}, ${userData.zone.trim()}` 
          : userData.zone.trim(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Account Information</Text>
      </View>

      <View style={styles.form}>
        {/* First Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={userData.firstName}
            onChangeText={(value) => handleInputChange('firstName', value)}
            editable={!saving}
          />
        </View>

        {/* Last Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={userData.lastName}
            onChangeText={(value) => handleInputChange('lastName', value)}
            editable={!saving}
          />
        </View>

        {/* Username */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={userData.username}
            onChangeText={(value) => handleInputChange('username', value)}
            editable={!saving}
            autoCapitalize="none"
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={userData.phoneNumber}
            onChangeText={(value) => handleInputChange('phoneNumber', value)}
            keyboardType="phone-pad"
            editable={!saving}
          />
        </View>

        {/* House No. & Street */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>House No. & Street</Text>
          <TextInput
            style={styles.input}
            placeholder="House No. & Street"
            value={userData.houseStreet}
            onChangeText={(value) => handleInputChange('houseStreet', value)}
            editable={!saving}
          />
        </View>

        {/* Zone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Zone / Purok</Text>
          <TextInput
            style={styles.input}
            placeholder="Zone 1, Purok 2, etc."
            value={userData.zone}
            onChangeText={(value) => handleInputChange('zone', value)}
            editable={!saving}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="white" size="small" />
                <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ProfileEditScreen;
