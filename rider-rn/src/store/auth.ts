import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';

interface User {
  id: string; first_name: string; last_name: string; phone: string; role_name: string;
}

interface AuthState {
  user: User | null; token: string | null; hydrated: boolean;
  setAuth:   (user: User, token: string, refresh: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate:   () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, token: null, hydrated: false,

  setAuth: async (user, token, refresh) => {
    await Keychain.setGenericPassword('token',   token,                { service: 'tc_token' });
    await Keychain.setGenericPassword('refresh', refresh,              { service: 'tc_refresh' });
    await Keychain.setGenericPassword('user',    JSON.stringify(user), { service: 'tc_user' });
    set({ user, token });
  },

  clearAuth: async () => {
    await Keychain.resetGenericPassword({ service: 'tc_token' });
    await Keychain.resetGenericPassword({ service: 'tc_refresh' });
    await Keychain.resetGenericPassword({ service: 'tc_user' });
    set({ user: null, token: null });
  },

  hydrate: async () => {
    try {
      const [tc, uc] = await Promise.all([
        Keychain.getGenericPassword({ service: 'tc_token' }),
        Keychain.getGenericPassword({ service: 'tc_user' }),
      ]);
      const token = tc ? tc.password : null;
      const user  = uc ? JSON.parse(uc.password) as User : null;
      set({ token, user, hydrated: true });
    } catch { set({ hydrated: true }); }
  },
}));
