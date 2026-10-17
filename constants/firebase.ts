import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACn_30j-KEHiW5eQLpHOPpZ_lqNk2g41c",
  authDomain: "smartattendance-edeee.firebaseapp.com",
  projectId: "smartattendance-edeee",
  storageBucket: "smartattendance-edeee.firebasestorage.app",
  messagingSenderId: "926946113478",
  appId: "1:926946113478:web:0d057372b0ffe7521c64c7",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// ✅ Properly initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
