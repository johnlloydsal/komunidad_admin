import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      });
      setSuccess(true);
      setEmail('');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 transition"
        >
          <ArrowLeft size={20} />
          Back to Login
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Mail className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Reset Password</h1>
          <p className="text-gray-600 mt-2">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
            <CheckCircle className="text-green-600 mx-auto mb-3" size={48} />
            <h3 className="text-lg font-bold text-green-800 mb-2">Check Your Email</h3>
            <p className="text-gray-700 text-sm mb-4">
              We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
            </p>
            <Link 
              to="/login"
              className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
                placeholder="admin@komunidad.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            Remember your password?{' '}
            <Link to="/login" className="text-purple-600 hover:text-purple-700 font-bold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
