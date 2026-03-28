// ==================================================================
// MOBILE APP - Feedback/Rating Screen
// Place this file in your mobile app screens folder
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
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const FeedbackScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('General');
  
  const auth = getAuth();
  const db = getFirestore();
  
  const handleStarPress = (starNumber) => {
    setRating(starNumber);
  };
  
  const handleSubmitFeedback = async () => {
    // Validation
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }
    
    if (!comment.trim()) {
      Alert.alert('Comment Required', 'Please write your feedback');
      return;
    }
    
    const user = auth.currentUser;
    
    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit feedback');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('📝 Submitting feedback...');
      
      // Submit feedback to Firestore
      await addDoc(collection(db, 'feedback'), {
        // Rating and Comment
        rating: rating,
        comment: comment.trim(),
        category: category,
        
        // User Information
        userId: user.uid,
        userEmail: user.email || 'No email',
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        
        // Status
        isRead: false,
        
        // Timestamp
        createdAt: serverTimestamp()
      });
      
      console.log('✅ Feedback submitted successfully!');
      
      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully. We appreciate your input!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setRating(0);
              setComment('');
              setCategory('General');
              // Optionally navigate back
              // navigation.goBack();
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
    return [1, 2, 3, 4, 5].map((starNumber) => (
      <TouchableOpacity
        key={starNumber}
        onPress={() => handleStarPress(starNumber)}
        style={styles.starButton}
        disabled={loading}
      >
        <Text style={[
          styles.star,
          starNumber <= rating && styles.starFilled
        ]}>
          ★
        </Text>
      </TouchableOpacity>
    ));
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Share Your Feedback</Text>
        <Text style={styles.subtitle}>
          Help us improve our barangay services
        </Text>
        
        {/* Star Rating */}
        <View style={styles.section}>
          <Text style={styles.label}>How would you rate our service?</Text>
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating === 5 && '⭐ Excellent!'}
              {rating === 4 && '⭐ Good!'}
              {rating === 3 && '⭐ Average'}
              {rating === 2 && '⭐ Below Average'}
              {rating === 1 && '⭐ Poor'}
            </Text>
          )}
        </View>
        
        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryButtons}>
            {['General', 'Service Quality', 'Response Time', 'Staff Behavior', 'Facilities'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive
                ]}
                onPress={() => setCategory(cat)}
                disabled={loading}
              >
                <Text style={[
                  styles.categoryButtonText,
                  category === cat && styles.categoryButtonTextActive
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Comment */}
        <View style={styles.section}>
          <Text style={styles.label}>Your Feedback</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tell us about your experience..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!loading}
          />
          <Text style={styles.charCount}>{comment.length} / 500 characters</Text>
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitFeedback}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>
        
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Your feedback helps us improve our barangay services. 
            All feedback is reviewed by administrators.
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
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
    gap: 8,
    marginVertical: 10,
  },
  starButton: {
    padding: 5,
  },
  star: {
    fontSize: 48,
    color: '#ddd',
  },
  starFilled: {
    color: '#FFB800',
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFB800',
    marginTop: 10,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 120,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E8DAEF',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
    marginBottom: 40,
  },
  infoText: {
    fontSize: 13,
    color: '#7D3C98',
    lineHeight: 18,
  },
});

export default FeedbackScreen;
