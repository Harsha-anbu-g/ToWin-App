import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useFonts, Newsreader_400Regular, Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import OfflineBanner from '../src/components/OfflineBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ThemedShell() {
  const { mode, t } = useTheme();

  // Material (react-native-paper) theme fed by OUR tokens — the website's
  // ToWin palette, Material components. One source of truth for both systems.
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
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
  });

  // RN has no window focus, so React Query never knows the app was backgrounded
  // unless AppState is wired to focusManager. Without this, the chat 5s poll and
  // the unread 30s poll keep hitting the network with the phone in a pocket.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  // Hold on the splash background until the serif is ready — headings must never
  // flash in a fallback face (Newsreader 400 is the brand voice). BUT if font
  // loading errors, render anyway with the system fallback: a stuck splash is
  // worse than a fallback face (the app looked "frozen on downloading" without this).
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <ThemedShell />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
