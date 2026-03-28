import emailjs from '@emailjs/browser';

// EmailJS Configuration
// Get these from https://dashboard.emailjs.com/
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // Replace with your EmailJS public key
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'; // Replace with your service ID
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; // Replace with your template ID

// Check if EmailJS is configured
const isEmailJSConfigured = () => {
  return EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY' && 
         EMAILJS_SERVICE_ID !== 'YOUR_SERVICE_ID' && 
         EMAILJS_TEMPLATE_ID !== 'YOUR_TEMPLATE_ID';
};

// Initialize EmailJS only if configured
if (isEmailJSConfigured()) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Send welcome email to new Google sign-in users
 * @param {Object} userData - User data from Google sign-in
 * @param {string} userData.email - User's email
 * @param {string} userData.displayName - User's display name
 * @param {string} userData.photoURL - User's photo URL (optional)
 */
export const sendGoogleWelcomeEmail = async (userData) => {
  // Skip if EmailJS is not configured
  if (!isEmailJSConfigured()) {
    console.log('ℹ️ EmailJS not configured - skipping welcome email');
    return { success: false, error: 'EmailJS not configured' };
  }

  try {
    const templateParams = {
      to_email: userData.email,
      to_name: userData.displayName || userData.email.split('@')[0],
      user_email: userData.email,
      user_name: userData.displayName || 'User',
      app_name: 'KOMUNIDAD Admin',
      login_method: 'Google',
      message: `Welcome to KOMUNIDAD! Your account has been verified and you now have full access to the admin dashboard.`,
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Welcome email sent successfully:', response.status, response.text);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return { success: false, error };
  }
};

/**
 * Send email verification notification for email/password users
 * @param {Object} userData - User data
 */
export const sendVerificationNotification = async (userData) => {
  // Skip if EmailJS is not configured
  if (!isEmailJSConfigured()) {
    console.log('ℹ️ EmailJS not configured - skipping verification email');
    return { success: false, error: 'EmailJS not configured' };
  }

  try {
    const templateParams = {
      to_email: userData.email,
      to_name: userData.displayName || userData.email.split('@')[0],
      user_email: userData.email,
      user_name: userData.displayName || 'User',
      app_name: 'KOMUNIDAD Admin',
      message: `Thank you for registering! We've sent a verification link to your email. Please check your inbox and verify your email address to complete your registration.`,
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Verification notification sent:', response.status);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
    return { success: false, error };
  }
};

/**
 * Send custom email
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 */
export const sendCustomEmail = async (toEmail, subject, message) => {
  // Skip if EmailJS is not configured
  if (!isEmailJSConfigured()) {
    console.log('ℹ️ EmailJS not configured - skipping custom email');
    return { success: false, error: 'EmailJS not configured' };
  }

  try {
    const templateParams = {
      to_email: toEmail,
      subject: subject,
      message: message,
      app_name: 'KOMUNIDAD Admin',
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Email sent successfully');
    return { success: true, response };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error };
  }
};
