import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { sendGoogleWelcomeEmail } from '../services/emailService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if email is verified
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        navigate('/email-verification');
        setLoading(false);
        return;
      }

      // Check if admin is approved
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (!adminDoc.exists() || adminDoc.data().approvalStatus !== 'approved') {
        // Redirect to pending approval page
        navigate('/pending-approval');
        setLoading(false);
        return;
      }
      
      // Email verified and approved, proceed to dashboard
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError('Failed to sign in. Please try again.');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log('Google Sign-In:', {
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName
      });

      // Check if admin document exists
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      const isNewUser = !adminDoc.exists();
      
      if (isNewUser) {
        // Create admin document for new Google sign-in users with pending approval
        await setDoc(doc(db, 'admins', user.uid), {
          displayName: user.displayName || user.email.split('@')[0],
          email: user.email,
          photoURL: user.photoURL || null,
          role: 'admin',
          provider: 'google',
          emailVerified: user.emailVerified,
          approvalStatus: 'pending', // New admins start as pending
          createdAt: serverTimestamp()
        });
        console.log('✅ New admin account created (pending approval)');
      }

      // Check if admin is approved
      const updatedAdminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (updatedAdminDoc.data().approvalStatus !== 'approved') {
        // Redirect to pending approval page
        navigate('/pending-approval');
        setLoading(false);
        return;
      }

      // STEP 2: Send welcome email to Google users
      if (user.emailVerified) {
        console.log('✅ Email already verified by Google');
        
        // Send welcome email (especially for new users)
        if (isNewUser) {
          try {
            const emailResult = await sendGoogleWelcomeEmail({
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            });
            
            if (emailResult.success) {
              console.log('📧 Welcome email sent to:', user.email);
            }
          } catch (emailError) {
            // Email service errors are handled in emailService.js
            // Don't block login if email fails
          }
        }
        
        // Show verification success screen, then redirect to dashboard
        navigate('/email-verification');
      } else {
        // Rare case: Google account not verified
        console.log('⚠️ Google account not verified, sending verification email');
        try {
          await sendEmailVerification(user);
          await auth.signOut();
          setError('📧 Verification email sent to ' + user.email + '. Please check your Gmail inbox and verify, then sign in again.');
        } catch (emailError) {
          console.error('Could not send verification email:', emailError);
          // Still allow login even if verification email fails
          navigate('/');
        }
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
      console.error('Google sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">K</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">KOMUNIDAD</h1>
          <p className="text-gray-600 mt-2">Admin Dashboard</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="admin@komunidad.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-bold disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="text-center mt-4">
          <Link to="/forgot-password" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
            Forgot Password?
          </Link>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-purple-600 hover:text-purple-700 font-bold">
            Create Admin Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
