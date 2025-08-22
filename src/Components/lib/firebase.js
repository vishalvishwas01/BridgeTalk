import {getFirestore} from "firebase/firestore"
import { getStorage } from "firebase/storage";
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth"


const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "reactapp-d18a5.firebaseapp.com",
  projectId: "reactapp-d18a5",
  storageBucket: "reactapp-d18a5.firebasestorage.app",
  messagingSenderId: "1028845921178",
  appId: "1:1028845921178:web:e7487b85fb10c81ed6d023"
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth()
export const db = getFirestore()
export const storage =getStorage()