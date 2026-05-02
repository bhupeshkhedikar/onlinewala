


import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";  // Correct import for Realtime Database
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
// Firebase config (use your own config here)

const firebaseConfig = {
  apiKey: "AIzaSyBfhvs3AGwnsjqQyWZz719Xmo8keGzFkDU",
  authDomain: "onlinewala-9fbb8.firebaseapp.com",
  projectId: "onlinewala-9fbb8",
  storageBucket: "onlinewala-9fbb8.firebasestorage.app",
  messagingSenderId: "532843773763",
  appId: "1:532843773763:web:6845fa9ad3315fd30239f6",
  measurementId: "G-6M3890GFGP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth and Database instances
const auth = getAuth(app);
const db = getFirestore(app); // Use getDatabase instead of directly using .ref
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { auth, db,analytics,storage };  // Export db and auth
export { signInWithEmailAndPassword, createUserWithEmailAndPassword };
