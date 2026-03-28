// ==================================================================
// MOBILE APP - Submit Feedback/Rating Screen
// Copy this to your mobile app project
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
  ActivityIndicator 
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const SubmitFeedbackScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  
  const auth = getAuth();
  const db = getFirestore();
  
  // REQUIRED: Feedback must be for a specific report
  const reportId = route?.params?.reportId;
  const reportTitle = route?.params?.reportTitle || 'Your Report';
  
  const handleSubmitFeedback = async () => {
    // Validation
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating');
      return;
    }
    
    if (!reportId) {
      Alert.alert('Error', 'No report ID provided');
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please login to submit feedback');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('📝 Submitting feedback for report:', reportId);
      
      // Update the existing report document with rating and feedback
      // This will trigger the admin notification system!
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        rating: rating,
        feedbackComment: comment.trim() || 'No comment provided',
        ratedAt: serverTimestamp(), // Timestamp when user rated
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Feedback added to report!');
      console.log('✅ Admin will receive notification immediately');
      
      Alert.alert(
        'Thank You! 🎉',
        'Your feedback has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setRating(0);
              setComment('');
              // Navigate back
              navigation.goBack();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            disabled={loading}
          >
            <Text style={[
              styles.star,
              star <= rating && styles.starFilled
            ]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rate Your Experience</Text>
        {reportTitle && (
          <Text style={styles.subtitle}>Feedback for: {reportTitle}</Text>
        )}
        
        {/* Star Rating */}
        <View style={styles.section}>
          <Text style={styles.label}>Your Rating</Text>
          {renderStars()}
          <Text style={styles.ratingLabel}>
            {rating > 0 ? `${rating}/5` : 'Tap to rate'}
          </Text>
        </View>
        
        {/* Comment (Optional) */}
        <View style={styles.section}>
          <Text style={styles.label}>Comments (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Tell us about your experience..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmitFeedback}
          disabled={loading || rating === 0}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Your feedback helps us improve our services
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  star: {
    fontSize: 48,
    color: '#ddd',
  },
  starFilled: {
    color: '#FFB800',
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFB800',
    marginTop: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
  },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
    marginBottom: 40,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center',
  },
});

export default SubmitFeedbackScreen;


// ==================================================================
// HOW TO USE IN YOUR MOBILE APP
// ==================================================================

/*

METHOD 1: General Feedback Button
-----------------------------------
Add a "Submit Feedback" button anywhere in your app:

<TouchableOpacity 
  onPress={() => navigation.navigate('SubmitFeedback')}
>
  <Text>Submit Feedback</Text>
</TouchableOpacity>


METHOD 2: Rate a Specific Report (Like in your screenshot)
-----------------------------------------------------------
After user views their report details, add a feedback button:

<TouchableOpacity 
  onPress={() => navigation.navigate('SubmitFeedback', {
    reportId: report.id,
    reportTitle: report.title
  })}
>
  <Text>Rate This Report</Text>
</TouchableOpacity>


METHOD 3: After Report is Resolved
-----------------------------------
Automatically prompt for feedback when admin marks report as resolved:

// In your report detail screen
useEffect(() => {
  if (report.status === 'resolved' && !report.userRated) {
    Alert.alert(
      'Report Resolved!',
      'Would you like to rate this service?',
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Rate Now', 
          onPress: () => navigation.navigate('SubmitFeedback', {
            reportId: report.id,
            reportTitle: report.title
          })
        }
      ]
    );
  }
}, [report.status]);


NAVIGATION SETUP
----------------
In your App.js or navigation file:

import SubmitFeedbackScreen from './screens/SubmitFeedbackScreen';

<Stack.Screen 
  name="SubmitFeedback" 
  component={SubmitFeedbackScreen}
  options={{ title: 'Submit Feedback' }}
/>

*/
