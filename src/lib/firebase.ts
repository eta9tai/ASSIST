// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add your own Firebase configuration from your Firebase project settings
const firebaseConfig = {
  "projectId": "studio-8875199554-5d8c7",
  "appId": "1:754177785888:web:4cc568aac4ec4b86f17c45",
  "storageBucket": "studio-8875199554-5d8c7.firebasestorage.app",
  "apiKey": "AIzaSyBu8HHrpjutgfyXbs5bgwBLzhNkTxJrtE8",
  "authDomain": "studio-8875199554-5d8c7.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "754177785888"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
