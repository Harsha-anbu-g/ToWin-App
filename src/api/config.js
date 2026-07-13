// API base URL — set per environment in app.json → expo.extra.apiBaseUrl.
// Default: the LIVE Railway backend over HTTPS (works anywhere, and it's the
// only place the Ask-AI key exists). To develop against the local Spring Boot
// instead, export EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:8080/api in
// your shell (checked first, below) — that plaintext LAN URL is deliberately
// NOT committed to app.json so it can never ship in a store build.
import Constants from 'expo-constants';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Constants.expoConfig?.extra?.apiBaseUrl ??
  'https://backend-production-cef3.up.railway.app/api';
