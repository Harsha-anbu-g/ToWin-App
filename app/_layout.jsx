import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState, Platform, View } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { loadHapticsPreference } from '../src/lib/haptics';
import { registerServiceWorker } from '../src/lib/registerServiceWorker';
import FontGate from '../src/components/FontGate';
import OfflineBanner from '../src/components/OfflineBanner';
import LiveRegion from '../src/components/ui/LiveRegion';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// Every layout in this app is built for one thumb on a phone. In a desktop
// browser those same layouts would stretch across the whole window and stop
// being readable, so the app is held to a phone-shaped centred column. Applied
// once here because it has to cover EVERY route — including the landing story,
// the chat thread and the tab bar, none of which use <Screen>. A no-op on
// phones, which are all narrower than this.
const WEB_MAX_WIDTH = 560;

function AppFrame({ children }) {
  if (Platform.OS !== 'web') return children;
  return (
    <View style={{ flex: 1, width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center' }}>
      {children}
    </View>
  );
}

function ThemedShell() {
  const { mode, t } = useTheme();

  // Material (react-native-paper) theme fed by OUR tokens — the website's
  // Towinly palette, Material components. One source of truth for both systems.
  const paperTheme = useMemo(() => {
    const base = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.actionFill,
        onPrimary: t.actionInk,
        secondary: t.blueDeep,
        background: t.surface,
        surface: t.canvas,
        surfaceVariant: t.surface2,
        onSurface: t.ink,
        onSurfaceVariant: t.inkSlate,
        outline: t.border,
        error: t.redError,
      },
    };
  }, [mode, t]);

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} backgroundColor={t.surface} />
      {/* Mounted once, always, and empty until something is announced — a live
          region created at the same moment as its text is routinely missed. */}
      <LiveRegion />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.surface },
        }}
      />
    </PaperProvider>
  );
}

export default function RootLayout() {
  // RN has no window focus, so React Query never knows the app was backgrounded
  // unless AppState is wired to focusManager. Without this, the chat 5s poll and
  // the unread 30s poll keep hitting the network with the phone in a pocket.
  useEffect(() => {
    // The saved "Vibration feedback" choice must be in force before the first
    // toast can fire a haptic (rulebook §11: the off switch is absolute).
    loadHapticsPreference();
    // Web only: registered from here rather than an inline <script> in the
    // shell, because the website's CSP (shared domain) allows no inline script.
    registerServiceWorker();
    const sub = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    // FontGate sits INSIDE ThemeProvider so its placeholder is drawn in the
    // person's own theme rather than a hardcoded parchment that would flash
    // white-on-dark for night-mode users.
    <ThemeProvider>
      <FontGate>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              {/* Inside ToastProvider so a confirmed action can raise a toast,
                  and outside AppFrame because the dialog portals to the whole
                  viewport on web rather than into the 560pt phone column. */}
              <ConfirmProvider>
                <AppFrame>
                  <ThemedShell />
                </AppFrame>
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </FontGate>
    </ThemeProvider>
  );
}
