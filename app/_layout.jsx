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
import PushRegistrar from '../src/components/PushRegistrar';
import LiveRegion from '../src/components/ui/LiveRegion';
import { ErrorFallback } from '../src/components/AppErrorBoundary';
import SplashRelease from '../src/components/SplashRelease';
import { holdSplash } from '../src/lib/splash';

// expo-router looks for an `ErrorBoundary` export on a route module and wraps
// that route in <Try catch={ErrorBoundary}> (useScreens.js). Exporting it from
// the ROOT layout puts one net under every screen in the app, because every
// other route renders inside this one. Without it a single render throw
// unmounts the whole tree and leaves a blank phone with no way back.
// The fallback renders in place of RootLayout, so it deliberately depends on
// none of the providers below it. See AppErrorBoundary.jsx.
export { ErrorFallback as ErrorBoundary };

// Module scope, before any component renders: the native launch screen (the
// mark, "from Towinly" at the foot) holds until SplashRelease lets it go, so
// a phone never sees the font-gate skeleton between launch image and first
// screen. See src/lib/splash.js for the ceiling that guarantees it drops.
holdSplash();

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
        outline: t.fieldLine,
        error: t.redError,
      },
    };
  }, [mode, t]);

  return (
    <PaperProvider theme={paperTheme}>
      {/* Style only: SDK 54 is edge-to-edge on Android, where backgroundColor
          is ignored (and warns) — the bar sits over the screen's own surface. */}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {/* Mounted once, always, and empty until something is announced — a live
          region created at the same moment as its text is routinely missed. */}
      <LiveRegion />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.surface },
        }}
      >
        {/* iOS swipe-back stays ON everywhere it is safe — chat included,
            because drafts survive leaving the thread. It goes OFF only where
            the screen IS a form and a half-swipe would eat typed text without
            warning; leaving those is an explicit tap on Back or Cancel
            (UX-707). pass-on/index qualifies through its letter and story
            composers — the heaviest text an elder types anywhere. */}
        <Stack.Screen name="profile-edit" options={{ gestureEnabled: false }} />
        <Stack.Screen name="feedback" options={{ gestureEnabled: false }} />
        <Stack.Screen name="change-password" options={{ gestureEnabled: false }} />
        <Stack.Screen name="emergency-contacts" options={{ gestureEnabled: false }} />
        <Stack.Screen name="pass-on/index" options={{ gestureEnabled: false }} />
      </Stack>
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
                {/* Renders nothing: push permission, token registration and
                    tap routing. Inside AuthProvider (it watches the user)
                    and outside AppFrame (it draws nothing to frame). */}
                <PushRegistrar />
                {/* Renders nothing: drops the native launch screen once the
                    session restore lands (src/lib/splash.js). */}
                <SplashRelease />
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
