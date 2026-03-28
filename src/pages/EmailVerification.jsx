import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { sendEmailVerification } from 'firebase/auth';
import { Mail, CheckCircle, RefreshCw } from 'lucide-react';

const EmailVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Handle redirects in separate effect to avoid render-time navigation
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => navigate('/login'), 0);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // Handle countdown for verified users
  useEffect(() => {
    if (!user || !user.emailVerified) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShouldRedirect(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  // Handle navigation after countdown
  useEffect(() => {
    if (shouldRedirect) {
      const timer = setTimeout(() => navigate('/'), 0);
      return () => clearTimeout(timer);
    }
  }, [shouldRedirect, navigate]);

  const handleResendEmail = async () => {
    if (!user || user.emailVerified) return;
    
    setResending(true);
    try {
      await sendEmailVerification(user);
      setMessage('✅ Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Resend error:', error);
      setMessage('❌ Failed to send email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;
    
    try {
      await user.reload();
      if (user.emailVerified) {
        navigate('/');
      } else {
        setMessage('⏳ Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (error) {
      console.error('Check verification error:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center">
          {user.emailVerified ? (
            // Verified - Show success and countdown
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Email Verified! ✅</h1>
              <p className="text-gray-600 mb-6">
                Your email <strong>{user.email}</strong> has been successfully verified.
              </p>
              
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
                <p className="text-lg font-bold text-green-800 mb-2">
                  Welcome to KOMUNIDAD Admin! 🎉
                </p>
                <p className="text-gray-700 text-sm mb-4">
                  Redirecting to dashboard in <span className="text-2xl font-bold text-purple-600">{countdown}</span> seconds...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                  ></div>
                </div>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-bold"
              >
                Go to Dashboard Now
              </button>
            </>
          ) : (
            // Not verified - Show instructions
            <>
              <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Mail className="text-purple-600" size={48} />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Check Your Email</h1>
              <p className="text-gray-600 mb-6">
                We've sent a verification email to:
                <br />
                <strong className="text-purple-600">{user.email}</strong>
              </p>

              <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-bold text-blue-800 mb-3">📬 Next Steps:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                  <li>Open your Gmail inbox</li>
                  <li>Look for an email from <strong>noreply@komunidad-36f9b.firebaseapp.com</strong></li>
                  <li>Click the verification link in the email</li>
                  <li>Come back here and click "I've Verified My Email"</li>
                </ol>
              </div>

              {message && (
                <div className="mb-4 p-3 rounded-lg bg-gray-100 text-sm">
                  {message}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleCheckVerification}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-bold"
                >
                  I've Verified My Email
                </button>

                <button
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="w-full bg-white border-2 border-purple-600 text-purple-600 py-3 rounded-lg hover:bg-purple-50 transition-colors font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} className={resending ? 'animate-spin' : ''} />
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>

                <button
                  onClick={() => {
                    auth.signOut();
                    navigate('/login');
                  }}
                  className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
