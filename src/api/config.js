// API base URL — set per environment in app.json → expo.extra.apiBaseUrl.
// Default: the LIVE Railway backend (works anywhere, and it's the only place
// the Ask-AI key exists). To develop against the local Spring Boot instead,
// swap in extra.apiBaseUrlLocal (the Mac's LAN IP — `ipconfig getifaddr en0`).
import Constants from 'expo-constants';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Constants.expoConfig?.extra?.apiBaseUrl ??
  'https://backend-production-cef3.up.railway.app/api';
