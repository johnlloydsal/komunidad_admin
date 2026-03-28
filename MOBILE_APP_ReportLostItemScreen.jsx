import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ReportLostItemScreen = ({ navigation }) => {
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [yourName, setYourName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const currentUser = auth.currentUser;

  // Load user data when component mounts
  React.useEffect(() => {
    if (currentUser) {
      setYourName(currentUser.displayName || '');
      setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  const zones = [
    'Select zone',
    'Zone 1',
    'Zone 2',
    'Zone 3',
    'Zone 4',
    'Zone 5',
    'Zone 6',
    'Zone 7',
    'Barangay Hall',
    'Market Area',
    'School Area',
    'Health Center',
    'Other',
  ];

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to add photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const timestamp = Date.now();
      const fileName = `lost_items/${timestamp}_${currentUser.uid}.jpg`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!itemName.trim()) {
      Alert.alert('Missing Information', 'Please enter the item name');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please enter a description');
      return;
    }

    if (!yourName.trim()) {
      Alert.alert('Missing Information', 'Please enter your name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Missing Information', 'Please enter your email');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your phone number');
      return;
    }

    if (!location || location === 'Select zone') {
      Alert.alert('Missing Information', 'Please select a location');
      return;
    }

    setSubmitting(true);

    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (image) {
        imageUrl = await uploadImage(image);
      }

      // Create lost item document
      const lostItemData = {
        itemName: itemName.trim(),
        description: description.trim(),
        reporterName: yourName.trim(),
        userEmail: email.trim(),
        contactInfo: phoneNumber.trim(),
        location: location,
        status: 'lost',
        imageUrl: imageUrl,
        userId: currentUser?.uid || null,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'lost_items'), lostItemData);

      Alert.alert(
        'Success',
        'Your lost item report has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setItemName('');
              setDescription('');
              setPhoneNumber('');
              setLocation('Select zone');
              setImage(null);
              
              // Navigate back or to lost & found screen
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting lost item:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Lost Item</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Item Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Item Name"
            value={itemName}
            onChangeText={setItemName}
            editable={!submitting}
          />
        </View>

        {/* Description / Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description / Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description / Notes"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!submitting}
          />
        </View>

        {/* Your Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            value={yourName}
            onChangeText={setYourName}
            editable={!submitting}
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!submitting}
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!submitting}
          />
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location (Where was it lost?)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={location}
              onValueChange={(itemValue) => setLocation(itemValue)}
              enabled={!submitting}
              style={styles.picker}
            >
              {zones.map((zone, index) => (
                <Picker.Item key={index} label={zone} value={zone} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Image Upload */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Add Photo (Optional)</Text>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={showImageOptions}
            disabled={submitting}
          >
            <Icon name="camera-plus" size={24} color="#4A90E2" />
            <Text style={styles.imageButtonText}>
              {image ? 'Change Photo' : 'Add Photo'}
            </Text>
          </TouchableOpacity>

          {image && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImage(null)}
                disabled={submitting}
              >
                <Icon name="close-circle" size={24} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
  },
  imageButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginTop: 15,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#99C4E8',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReportLostItemScreen;
