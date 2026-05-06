import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';

export const API_BASE = 'https://app.tripli.ng/test/tripchow-backend/public/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

const getToken   = async () => { const c = await Keychain.getGenericPassword({ service: 'tc_token' });   return c ? c.password : null; };
const getRefresh = async () => { const c = await Keychain.getGenericPassword({ service: 'tc_refresh' }); return c ? c.password : null; };

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let _refreshing = false;
let _queue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

client.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (_refreshing) {
        return new Promise((resolve, reject) => _queue.push({ resolve, reject }))
          .then(token => { original.headers.Authorization = `Bearer ${token}`; return client(original); });
      }
      _refreshing = true;
      try {
        const refresh = await getRefresh();
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refresh}` },
        });
        const newToken = data.data.access_token;
        await Keychain.setGenericPassword('token',   newToken,                 { service: 'tc_token' });
        await Keychain.setGenericPassword('refresh', data.data.refresh_token,  { service: 'tc_refresh' });
        _queue.forEach(q => q.resolve(newToken)); _queue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      } catch (e) {
        _queue.forEach(q => q.reject(e)); _queue = [];
        await Keychain.resetGenericPassword({ service: 'tc_token' });
        await Keychain.resetGenericPassword({ service: 'tc_refresh' });
        await Keychain.resetGenericPassword({ service: 'tc_user' });
      } finally { _refreshing = false; }
    }
    return Promise.reject(error);
  }
);

export default client;
