import { create } from 'zustand';

const useGlobalStore = create((set) => ({
  user_data: {},
  update_user_data: (newUserData) =>
    set(() => ({ user_data: { ...newUserData } })),
}));

export default useGlobalStore;
