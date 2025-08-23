import {getFirestore} from "firebase/firestore"
import { getStorage } from "firebase/storage";
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth"


const firebaseConfig = {
  // apiKey: import.meta.env.VITE_API_KEY,
  // authDomain: "firebase domain",
  // projectId: "firbase id",
  // storageBucket: "firebasestorage.app",
  // messagingSenderId: "sender id",
  // appId: "firebase app id"
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth()
export const db = getFirestore()
export const storage =getStorage()