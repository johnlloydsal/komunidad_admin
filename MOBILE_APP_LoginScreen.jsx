// ==================================================================
// MOBILE APP - Login Screen WITH GOOGLE SIGN-IN
// Place this file in your mobile app screens folder
//
// Dependencies (run in your mobile app folder):
//   npx expo install @react-native-google-signin/google-signin
//   OR
//   npx expo install expo-auth-session expo-crypto
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
} from 'react-native';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithCredential,
  GoogleAuthProvider,
  sendEmailVerification 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Google Sign-In Configuration
  // Replace with your actual Web Client ID from Firebase Console
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    webClientId: '888930015901-XXXXXXXXX.apps.googleusercontent.com', // Replace with your actual Web Client ID
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    }
  }, [response]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Email/Password Login ──
  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        await auth.signOut();
        Alert.alert(
          'Email Not Verified',
          `Verification email sent to ${user.email}.\n\nPlease check your inbox and verify your email, then login again.`,
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Check user approval status
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.approvalStatus === 'rejected') {
          Alert.alert('Account Rejected', 'Your account has been rejected by the admin.');
          await auth.signOut();
          return;
        }

        if (!userData.approvalStatus || userData.approvalStatus === 'pending') {
          // Navigate to pending screen
          navigation.replace('AccountPending');
          return;
        }
      }

      // User is approved and verified, navigate to main app
      navigation.replace('Home');
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        Alert.alert('Error', 'Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('Error', 'Too many failed attempts. Please try again later.');
      } else {
        Alert.alert('Error', 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In Handler ──
  const handleGoogleSignIn = async (idToken) => {
    setLoading(true);
    try {
      const auth = getAuth();
      const db = getFirestore();

      // Create credential from Google ID token
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      console.log('✅ Google sign-in successful:', user.email, 'UID:', user.uid);

      // ✅ CRITICAL: Check if email already exists in Firestore (ANY user with this email)
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', user.email));
      const emailSnapshot = await getDocs(emailQuery);

      console.log(`📧 Checking for existing accounts with email: ${user.email}`);
      console.log(`   Found ${emailSnapshot.size} existing account(s)`);

      // ✅ PREVENT DUPLICATE ACCOUNTS - Only allow ONE account per email
      if (!emailSnapshot.empty) {
        const existingUserDoc = emailSnapshot.docs[0];
        const existingUserId = existingUserDoc.id;
        const existingUserData = existingUserDoc.data();
        
        console.log('   Existing account UID:', existingUserId);
        console.log('   New Google UID:', user.uid);
        
        // If the email already exists with a DIFFERENT UID, it's a duplicate
        if (existingUserId !== user.uid) {
          console.log('❌ DUPLICATE ACCOUNT BLOCKED!');
          console.log(`   Email ${user.email} is already registered`);
          console.log(`   Existing user: ${existingUserData.displayName || existingUserData.username}`);
          console.log(`   Registration method: ${existingUserData.provider || 'email/password'}`);
          
          // Delete the newly created Firebase Auth account immediately
          try {
            await user.delete();
            console.log('✅ Deleted newly created Auth account (UID:', user.uid, ')');
          } catch (deleteError) {
            console.error('⚠️ Could not delete Auth account:', deleteError);
            // If deletion fails, at least sign out
            await auth.signOut();
          }
          
          // Determine the registration method of existing account
          const existingMethod = existingUserData.provider === 'google' 
            ? 'Google sign-in' 
            : 'email and password';
          
          Alert.alert(
            'Account Already Exists',
            `The email ${user.email} is already registered.\n\n` +
            `Please sign in using ${existingMethod} instead.\n\n` +
            `Only one account per email is allowed.`,
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
        
        // Email exists with SAME UID - this is the user's account, just needs Firestore doc update
        console.log('✅ Same UID - This is an existing Google user signing in again');
      }

      // Check if user document exists for THIS UID
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // NEW USER - Create Firestore document

        // NEW GOOGLE USER - Create user document (auto-approved)
        console.log('🆕 Creating new Google user document...');
        
        const displayName = user.displayName || user.email.split('@')[0];
        const [firstName, ...lastNameParts] = displayName.split(' ');
        const lastName = lastNameParts.join(' ') || '';

        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName,
          firstName,
          lastName,
          username: user.email.split('@')[0],
          photoUrl: user.photoURL || null,
          phoneNumber: user.phoneNumber || '',
          
          // ⏳ PENDING approval - Google users must wait for admin approval
          approvalStatus: 'pending',
          isApproved: false,
          isPending: true,
          accountStatus: 'pending',
          role: 'user',
          
          // Google users must submit ID for verification
          idType: '',
          submitId: '',
          idImageUrl: '',  // Must upload ID photo
          
          // Metadata
          provider: 'google',
          emailVerified: user.emailVerified,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          registrationMethod: 'google',
          
          // Activity Counters
          reportsCount: 0,
          feedbackCount: 0,
          lostItemsCount: 0,
        });

        console.log('✅ Google user created');
      } else {
        console.log('✅ Existing Google user found, proceeding to login');
      }

      // STEP 2: Check approval status
      // Get fresh user data from Firestore
      const currentUserDoc = await getDoc(userDocRef);
      const currentUserData = currentUserDoc.data();
      
      const isApproved = currentUserData?.isApproved === true || currentUserData?.approvalStatus === 'approved';
      const isRejected = currentUserData?.approvalStatus === 'rejected';
      
      console.log('📊 User approval check:');
      console.log('  - isApproved:', currentUserData?.isApproved);
      console.log('  - approvalStatus:', currentUserData?.approvalStatus);
      console.log('  - accountStatus:', currentUserData?.accountStatus);
      
      if (isRejected) {
        // Account rejected by admin
        await auth.signOut();
        Alert.alert(
          'Account Rejected',
          currentUserData?.rejectionReason || 'Your account has been rejected. Please contact the administrator.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
      
      if (!isApproved) {
        // Account pending approval
        console.log('⏳ Account pending approval - redirecting to AccountPendingScreen');
        navigation.replace('AccountPending');
        setLoading(false);
        return;
      }
      
      // ✅ Account is approved - proceed to app
      console.log('✅ Account approved - proceeding to app');
      navigation.replace('Home');
      
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      if (error.code === 'auth/account-exists-with-different-credential') {
        Alert.alert('Error', 'An account already exists with this email using a different sign-in method.');
      } else {
        Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>K</Text>
        </View>
        <Text style={styles.title}>KOMUNIDAD</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={[styles.googleButton, loading && styles.buttonDisabled]}
          onPress={() => promptAsync()}
          disabled={loading || !request}
        >
          <Image
            source={{ uri: 'https://www.google.com/favicon.ico' }}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkTextBold}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#9333EA',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 12,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#9333EA',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkTextBold: {
    fontSize: 14,
    color: '#9333EA',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
