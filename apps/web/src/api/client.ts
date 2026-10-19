import axios from 'axios';

const ACCESS_KEY = 'sipus_access';
const REFRESH_KEY = 'sipus_refresh';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await axios.post('/api/auth/refresh', { refreshToken });    const { accessToken, refreshToken: newRefresh } = res.data.data;
    setTokens(accessToken, newRefresh);
    return accessToken as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall =
      typeof original?.url === 'string' &&
      (original.url.includes('/auth/login') || original.url.includes('/auth/refresh'));

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      refreshPromise ??= doRefresh().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      clearTokens();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** Ambil pesan error yang ramah dari respons API. */
export function errMessage(err: any, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  return err?.response?.data?.message ?? err?.message ?? fallback;
}
