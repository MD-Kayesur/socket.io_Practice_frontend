import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Your web app's Firebase configuration using Next.js environment variables
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyDh-8ZVNa-Zdkq8jB1R0T17PHJd5WV2d8k",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "socket-io-d3353.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "socket-io-d3353",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "socket-io-d3353.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1067284063185",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:1067284063185:web:2d5ac889c8c819ca3936f0",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters (optional)
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export const signInWithGooglePopup = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  // Returns credential & signed-in user info
  return result;
};

export default app;