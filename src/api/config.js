// API base URL — set per environment in app.json → expo.extra.apiBaseUrl.
// Dev default: the Mac's LAN IP (find it with `ipconfig getifaddr en0`), so a
// physical phone on the same network reaches the local Spring Boot backend.
// For production builds, point extra.apiBaseUrl at the Railway API URL.
import Constants from 'expo-constants';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://192.168.0.13:8080/api';
