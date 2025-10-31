import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCEdZRvQ1YK_yY2XI-PLjHr4wD6aZohmU",
  authDomain: "tasks-tracking-59990.firebaseapp.com",
  projectId: "tasks-tracking-59990",
  storageBucket: "tasks-tracking-59990.firebasestorage.app",
  messagingSenderId: "172986260700",
  appId: "1:172986260700:web:a9b3ffeed7c6569a762819",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);