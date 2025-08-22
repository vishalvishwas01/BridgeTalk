import { create } from 'zustand'
import { useUserStore } from './userStore';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const useChatStore = create((set, get) => ({
  chatId: null,
  user: null,
  isCurrentUserBlocked: false,
  isReceiverBlocked: false,
  unsubscribeUser: null, // store Firestore unsub fn

  changeChat: (chatId, user) => {
    const currentUser = useUserStore.getState().currentUser;

    // reset
    if (!chatId || !user) {
      // stop previous subscription
      const unsub = get().unsubscribeUser;
      if (unsub) unsub();

      return set({
        chatId: null,
        user: null,
        isCurrentUserBlocked: false,
        isReceiverBlocked: false,
        unsubscribeUser: null,
      });
    }

    // stop old listener
    const oldUnsub = get().unsubscribeUser;
    if (oldUnsub) oldUnsub();

    // listen to the user’s doc for live block updates
    const unsub = onSnapshot(doc(db, "users", user.id), (snap) => {
      const updatedUser = snap.data();
      const isCurrentUserBlocked = updatedUser.blocked.includes(currentUser.id);
      const isReceiverBlocked = currentUser.blocked.includes(updatedUser.id);

      set({
        chatId,
        user: updatedUser,
        isCurrentUserBlocked,
        isReceiverBlocked,
      });
    });

    set({ unsubscribeUser: unsub });
  },

  changeBlock: () => {
    set((state) => ({
      ...state,
      isReceiverBlocked: !state.isReceiverBlocked,
    }));
  },
}));
