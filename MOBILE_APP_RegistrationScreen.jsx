// ==================================================================
// MOBILE APP - Registration Screen (WITH ID IMAGE UPLOAD)
// Place this file in your mobile app screens folder
//
// Dependencies (run in your mobile app folder):
//   npx expo install expo-image-picker
// ==================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ID_TYPES = [
  'Barangay ID',
  'PhilSys ID',
  'Passport',
  "Driver's License",
  'SSS ID',
  'GSIS ID',
  "Voter's ID",
  'Postal ID',
  'Other',
];

const ZONES = [
  'Zone 1',
  'Zone 2',
  'Zone 3',
  'Zone 4',
  'Zone 5',
  'Zone 6',
  'Zone 7',
  'Zone 8',
  'Purok 1',
  'Purok 2',
  'Purok 3',
  'Purok 4',
  'Purok 5',
  'Purok 6',
];

const RegistrationScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [idImage, setIdImage] = useState(null); // { uri, base64 }
  const [selectedIdType, setSelectedIdType] = useState('Barangay ID');
  const [selectedZone, setSelectedZone] = useState('Zone 1');
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    phone: '',
    houseStreet: '',
    submitId: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Pick ID image from camera or gallery ──
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
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Upload image blob to Firebase Storage, return download URL ──
  const uploadIdImage = async (uid, imageUri) => {
    try {
      setUploadProgress('Uploading ID image...');
      console.log('📸 Starting ID image upload for UID:', uid);
      console.log('📸 Image URI:', imageUri);
      
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error('Failed to fetch image from URI');
      }
      const blob = await response.blob();
      console.log('📸 Image blob created, size:', blob.size, 'bytes');

      const storage = getStorage();
      const fileName = `user-ids/${uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      console.log('📸 Uploading to:', fileName);
      
      await uploadBytes(storageRef, blob);
      console.log('✅ Upload successful, getting download URL...');
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ Download URL obtained:', downloadURL);
      
      setUploadProgress('');
      return downloadURL;
    } catch (error) {
      console.error('❌ ID image upload error:', error);
      setUploadProgress('');
      throw new Error(`Failed to upload ID image: ${error.message}`);
    }
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.username || !formData.firstName || !formData.lastName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (!idImage) {
      Alert.alert('ID Required', 'Please upload a photo of your Barangay ID');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const auth = getAuth();
      const db = getFirestore();

      // Step 1: Create Firebase Auth account
      console.log('📝 Creating Firebase Auth account...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      console.log('✅ Auth account created:', user.uid);

      // Step 2: Upload ID image to Firebase Storage
      console.log('📸 Uploading ID image...');
      let idImageUrl = '';
      try {
        idImageUrl = await uploadIdImage(user.uid, idImage.uri);
        console.log('✅ ID image uploaded:', idImageUrl);
        
        // Verify the URL is valid
        if (!idImageUrl || !idImageUrl.startsWith('https://')) {
          throw new Error('Invalid image URL received');
        }
      } catch (uploadError) {
        console.error('❌ ID image upload failed:', uploadError);
        // Delete the auth account if image upload fails
        await user.delete();
        Alert.alert(
          'Upload Failed',
          'Failed to upload ID image. Please check your internet connection and try again.'
        );
        setLoading(false);
        return;
      }

      // Step 3: Save user document to Firestore WITH the image URL
      console.log('📝 Creating Firestore user document...');
      const userData = {
        // Basic Information
        uid: user.uid,
        email: formData.email,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        displayName: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone || '',
        phoneNumber: formData.phone || '',
        houseStreet: formData.houseStreet || '',
        zone: selectedZone,
        address: formData.houseStreet ? `${formData.houseStreet}, ${selectedZone}` : selectedZone,

        // ✅ ID Verification - saved so admin can see it
        idType: selectedIdType,
        submitId: formData.submitId || selectedIdType,
        idImageUrl: idImageUrl,   // ← admin panel reads this field
        idNumber: formData.submitId || '',
        photoUrl: '',

        // Approval Status
        approvalStatus: 'pending',
        isApproved: false,
        isPending: true,
        accountStatus: 'pending',
        role: 'user',

        // Activity Counters
        reportsCount: 0,
        feedbackCount: 0,
        lostItemsCount: 0,

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      console.log('✅ Firestore document created successfully');
      console.log('📊 User data saved with fields:', Object.keys(userData));
      console.log('📸 ID Image URL in document:', userData.idImageUrl);
      console.log('🔍 Verifying idImageUrl was saved correctly...');
      
      // Verify the document was saved with idImageUrl
      const verifyDoc = await getDoc(doc(db, 'users', user.uid));
      if (verifyDoc.exists()) {
        const savedData = verifyDoc.data();
        console.log('✅ Document verified. idImageUrl in Firestore:', savedData.idImageUrl);
        if (!savedData.idImageUrl) {
          console.error('❌ WARNING: idImageUrl was not saved to Firestore!');
        }
      }
      
      Alert.alert(
        'Registration Successful!',
        'Your account has been created. Please wait for admin approval.',
        [{ text: 'OK', onPress: () => navigation.replace('AccountPending') }]
      );

    } catch (error) {
      console.error('❌ Registration error:', error);
      let errorMessage = 'Registration failed. ';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please login instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Use at least 6 characters.';
          break;
        case 'permission-denied':
          errorMessage = 'Permission denied. Please contact support.';
          break;
        default:
          errorMessage += error.message;
      }
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Register</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        {/* Username */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={formData.username}
            onChangeText={(v) => handleInputChange('username', v)}
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        {/* First Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={formData.firstName}
            onChangeText={(v) => handleInputChange('firstName', v)}
            editable={!loading}
          />
        </View>

        {/* Last Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={formData.lastName}
            onChangeText={(v) => handleInputChange('lastName', v)}
            editable={!loading}
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={formData.phone}
            onChangeText={(v) => handleInputChange('phone', v)}
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        {/* House No. & Street */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>House No. & Street</Text>
          <TextInput
            style={styles.input}
            placeholder="House No. & Street"
            value={formData.houseStreet}
            onChangeText={(v) => handleInputChange('houseStreet', v)}
            editable={!loading}
          />
        </View>

        {/* Zone / Purok Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Zone / Purok *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowZonePicker(!showZonePicker)}
            disabled={loading}
          >
            <Text style={styles.selectorText}>{selectedZone}</Text>
            <Text style={styles.selectorArrow}>▼</Text>
          </TouchableOpacity>
          {showZonePicker && (
            <View style={styles.pickerDropdown}>
              {ZONES.map((zone) => (
                <TouchableOpacity
                  key={zone}
                  style={[styles.pickerItem, selectedZone === zone && styles.pickerItemActive]}
                  onPress={() => { setSelectedZone(zone); setShowZonePicker(false); }}
                >
                  <Text style={[styles.pickerItemText, selectedZone === zone && styles.pickerItemTextActive]}>
                    {zone}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Submit ID (for verification) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Submit ID (for verification)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter ID number (optional)"
            value={formData.submitId}
            onChangeText={(v) => handleInputChange('submitId', v)}
            editable={!loading}
          />
        </View>

        {/* Upload Barangay ID Picture */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Upload Barangay ID Picture *</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handlePickIdImage}
            disabled={loading}
          >
            {idImage ? (
              <View style={styles.uploadPreview}>
                <Image source={{ uri: idImage.uri }} style={styles.previewImage} />
                <Text style={styles.uploadSuccessText}>✓ ID photo selected</Text>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Text style={styles.uploadPlaceholderIcon}>📷</Text>
                <Text style={styles.uploadPlaceholderText}>Choose</Text>
                <Text style={styles.uploadHint}>Please upload a clear photo of your Barangay ID to verify your residency</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@example.com"
            value={formData.email}
            onChangeText={(v) => handleInputChange('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            value={formData.password}
            onChangeText={(v) => handleInputChange('password', v)}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            value={formData.confirmPassword}
            onChangeText={(v) => handleInputChange('confirmPassword', v)}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {/* Upload progress */}
        {uploadProgress ? (
          <View style={styles.progressBox}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        ) : null}

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="white" />
              <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                {uploadProgress || 'Registering...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
          <Text style={styles.loginLink}>
            Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
          </Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ After registration, your account will be reviewed by an administrator.
            You'll receive access once approved.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  formContainer: { padding: 20, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // ID Type selector
  selector: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: { fontSize: 16, color: '#333' },
  selectorArrow: { fontSize: 12, color: '#999' },
  pickerDropdown: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerItemActive: { backgroundColor: '#EBF5FF' },
  pickerItemText: { fontSize: 15, color: '#333' },
  pickerItemTextActive: { color: '#4A90E2', fontWeight: '600' },
  // ID Upload
  uploadBox: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    borderRadius: 10,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    padding: 10,
  },
  uploadBoxDone: { borderColor: '#4A90E2', borderStyle: 'solid', backgroundColor: '#EBF5FF' },
  uploadIcon: { fontSize: 36, marginBottom: 8 },
  uploadText: { fontSize: 15, color: '#555', fontWeight: '600', textAlign: 'center' },
  uploadSubText: { fontSize: 12, color: '#999', marginTop: 4 },
  idPreview: { width: '100%', height: 160, borderRadius: 8 },
  uploadChangeText: { fontSize: 13, color: '#4A90E2', marginTop: 8, fontWeight: '600' },
  // Progress
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#EBF5FF',
    padding: 10,
    borderRadius: 8,
  },
  progressText: { fontSize: 13, color: '#4A90E2', marginLeft: 8 },
  // Button
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  // Links
  loginLink: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' },
  loginLinkBold: { color: '#4A90E2', fontWeight: 'bold' },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
    marginBottom: 40,
  },
  infoText: { fontSize: 13, color: '#1976D2', lineHeight: 18 },
});

export default RegistrationScreen;
