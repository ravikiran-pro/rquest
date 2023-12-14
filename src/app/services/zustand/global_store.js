import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useGlobalStore = create(
  persist(
    (set, get) => ({
      user_data: {},
      update_user_data: (newUserData) =>
        set(() => ({ user_data: { ...newUserData } })),
    }),
    {
      name: 'session-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    }
  )
);

export default useGlobalStore;
