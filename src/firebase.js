// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2zpDwzx9cCvfI3blw2oTIbMvJ2MoRs0A",
  authDomain: "komunidad-36f9b.firebaseapp.com",
  projectId: "komunidad-36f9b",
  storageBucket: "komunidad-36f9b.firebasestorage.app",
  messagingSenderId: "888930015901",
  appId: "1:888930015901:web:4d613c2b868a5823951274",
  measurementId: "G-55GWSZQ6KW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Disable analytics in development to avoid CORS issues
let analytics = null;
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  import('firebase/analytics').then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  }).catch(() => {
    // Analytics not available
  });
}

// Export the Firebase services for use in other parts of the app
export { app, analytics, auth, db, storage };
