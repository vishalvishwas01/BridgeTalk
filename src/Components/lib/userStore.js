import { doc, getDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../lib/firebase';

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,

  // fetch user info from Firestore
  fetchUserInfo: async (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        set({ currentUser: docSnap.data(), isLoading: false });
      } else {
        set({ currentUser: null, isLoading: false });
      }
    } catch (err) {
      console.log(err);
      return set({ currentUser: null, isLoading: false });
    }
  },

  // 🔹 new method to update a single field of currentUser
  updateCurrentUserField: (field, value) => {
    set((state) => ({
      currentUser: {
        ...state.currentUser,
        [field]: value,
      },
    }));
  },
}));
