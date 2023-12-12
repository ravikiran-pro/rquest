import { create } from 'zustand';

export const useGlobalStore = create((set) => ({
  user_data: {},
  update_user_data: (newUserData) =>
    set((state) => ({ user_data: { ...newUserData } })),
}));
