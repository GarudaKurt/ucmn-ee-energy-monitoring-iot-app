import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDwhKHNyxcsdu252xfl4jefdvG_GKgJV6o",
  authDomain: "ucmn-ee-5d7f9.firebaseapp.com",
  databaseURL: "https://ucmn-ee-5d7f9-default-rtdb.firebaseio.com",
  projectId: "ucmn-ee-5d7f9",
  storageBucket: "ucmn-ee-5d7f9.firebasestorage.app",
  messagingSenderId: "34959562854",
  appId: "1:34959562854:web:83d0719315e9281f85f5a7"
};


// Prevent re-initialization (VERY IMPORTANT for Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exports
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const database = getDatabase(app);