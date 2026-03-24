import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBxF03V2zlmaMulBBqcnlLAzneQCeNuWHk",
  authDomain: "wisdom-wave-e933a.firebaseapp.com",
  projectId: "wisdom-wave-e933a",
  storageBucket: "wisdom-wave-e933a.firebasestorage.app",
  messagingSenderId: "784347496076",
  appId: "1:784347496076:web:c3acc73bc3d1eb60db85a9",
  measurementId: "G-G58DG7CYBD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;