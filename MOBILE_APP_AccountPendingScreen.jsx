// ==================================================================
// MOBILE APP - Account Pending Screen
// Place this file in your mobile app screens folder
// ==================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

const AccountPendingScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState('pending');
  const [userEmail, setUserEmail] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    
    // Listen to auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // No user logged in, redirect to login
        navigation.replace('Login');
        return;
      }
      
      setUserEmail(user.email);
      setLoading(false);
      
      // 🔥 REAL-TIME LISTENER - Detects admin approval/rejection INSTANTLY!
      const unsubscribeFirestore = onSnapshot(
        doc(db, 'users', user.uid),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const status = data.approvalStatus || 'pending';
            
            console.log('📊 User approval status:', status);
            console.log('📊 isApproved:', data.isApproved);
            console.log('📊 accountStatus:', data.accountStatus);
            console.log('📊 rejectionReason:', data.rejectionReason);
            
            setUserStatus(status);
            
            // ✅ APPROVED - Automatically redirect to homepage!
            if (data.isApproved === true || status === 'approved') {
              console.log('✅ Account approved! Redirecting to home...');
              
              // Show brief success message then redirect
              setTimeout(() => {
                navigation.replace('Home'); // Change 'Home' to your main screen name
              }, 1500);
            }
            
            // ❌ REJECTED - Show reason from admin
            if (status === 'rejected') {
              const reason = data.rejectionReason || 'No reason provided. Please contact the administrator.';
              console.log('❌ Account rejected:', reason);
              setRejectionReason(reason);
            }
          } else {
            console.log('⚠️ User document does not exist in Firestore');
          }
        },
        (error) => {
          console.error('❌ Error listening to user status:', error);
        }
      );
      
      // Cleanup Firestore listener
      return () => {
        unsubscribeFirestore();
      };
    });
    
    // Cleanup auth listener
    return () => {
      unsubscribeAuth();
    };
  }, [navigation]);
  
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Logo/Icon */}
      <View style={styles.iconContainer}>
        <View style={[styles.hourglassIcon, userStatus === 'rejected' && styles.rejectedIcon]}>
          <Text style={styles.hourglassText}>
            {userStatus === 'rejected' ? '❌' : userStatus === 'approved' ? '✅' : '⏳'}
          </Text>
        </View>
      </View>
      
      {/* Main Message */}
      <Text style={styles.title}>
        {userStatus === 'rejected' ? 'Account Rejected' : 
         userStatus === 'approved' ? 'Account Approved!' :
         'Account Pending Approval'}
      </Text>
      
      {/* Pending Status */}
      {userStatus === 'pending' && (
        <>
          <View style={styles.messageBox}>
            <Text style={styles.thankYouText}>Thank you for registering!</Text>
            <Text style={styles.reviewText}>
              Your account is currently under review by an administrator.
              You will receive access once your account has been approved.
            </Text>
            <Text style={styles.emailText}>📧 {userEmail}</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#FF9800" />
            <Text style={styles.statusText}>Status: Pending Review</Text>
          </View>
        </>
      )}
      
      {/* Approved Status */}
      {userStatus === 'approved' && (
        <View style={styles.approvedContainer}>
          <Text style={styles.approvedText}>✅ Your account has been approved!</Text>
          <Text style={styles.approvedSubtext}>Redirecting to home screen...</Text>
          <ActivityIndicator size="small" color="white" style={{ marginTop: 10 }} />
        </View>
      )}
      
      {/* Rejected Status with Admin's Reason */}
      {userStatus === 'rejected' && (
        <View style={styles.rejectedMainContainer}>
          <View style={styles.rejectedContainer}>
            <Text style={styles.rejectedTitle}>Account Not Approved</Text>
            <Text style={styles.rejectedText}>
              Your account registration was not approved by the administrator.
            </Text>
          </View>
          
          {rejectionReason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason from Admin:</Text>
              <Text style={styles.reasonText}>"{rejectionReason}"</Text>
            </View>
          )}
          
          <View style={styles.contactContainer}>
            <Text style={styles.contactText}>
              Please contact the barangay office for more information or to reapply.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#334455',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  hourglassIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#5A6A7A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectedIcon: {
    backgroundColor: '#D32F2F',
  },
  hourglassText: {
    fontSize: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  messageBox: {
    backgroundColor: '#3D4F5F',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: '100%',
  },
  thankYouText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  reviewText: {
    fontSize: 14,
    color: '#B0BEC5',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  emailText: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: '600',
  },
  approvedContainer: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  approvedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  approvedSubtext: {
    color: '#E8F5E9',
    fontSize: 14,
    textAlign: 'center',
  },
  rejectedMainContainer: {
    width: '100%',
    marginTop: 10,
  },
  rejectedContainer: {
    backgroundColor: '#D32F2F',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 15,
  },
  rejectedTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  rejectedText: {
    color: '#FFCDD2',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  reasonContainer: {
    backgroundColor: '#424242',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  reasonLabel: {
    color: '#FFB74D',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  reasonText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  contactContainer: {
    backgroundColor: '#37474F',
    padding: 15,
    borderRadius: 10,
  },
  contactText: {
    color: '#B0BEC5',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AccountPendingScreen;
