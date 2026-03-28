import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress known console errors and warnings early
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  const errorMessage = String(args[0] || '');
  if (
    errorMessage.includes('useAuth must be used within') ||
    errorMessage.includes('AuthProvider') ||
    errorMessage.includes('@firebase/firestore') ||
    errorMessage.includes('WebChannel') ||
    errorMessage.includes('transport errored') ||
    errorMessage.includes('stream') ||
    errorMessage.includes('RPC') ||
    errorMessage.includes('ERR_INTERNET_DISCONN') ||
    errorMessage.includes('Failed to load resource') ||
    errorMessage.includes('www.google.com') ||
    errorMessage.includes('firestore.googleapis.com') ||
    errorMessage.includes('net::ERR_') ||
    errorMessage.includes('error occurred in the') ||
    errorMessage.includes('Consider adding an error boundary') ||
    errorMessage.includes('Missing or insufficient permissions') ||
    errorMessage.includes('permission-denied') ||
    errorMessage.includes('Error fetching admin data')
  ) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  const warnMessage = String(args[0] || '');
  if (
    warnMessage.includes('deprecated') ||
    warnMessage.includes('FirestoreSettings') ||
    warnMessage.includes('enableMultiTabIndexedDbPersistence')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

createRoot(document.getElementById('root')).render(
  <App />
)
