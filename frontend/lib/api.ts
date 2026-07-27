import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;
api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original?._retry || original?.url === '/auth/login') {
    return Promise.reject(error);
  }
  original._retry = true;
  refreshing ??= api
    .post('/auth/refresh', { refreshToken: localStorage.getItem('refreshToken') })
    .then(({ data }) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken as string;
    })
    .finally(() => { refreshing = null; });
  try {
    original.headers.Authorization = `Bearer ${await refreshing}`;
    return api(original);
  } catch (refreshError) {
    localStorage.clear();
    window.location.href = '/login';
    return Promise.reject(refreshError);
  }
});
