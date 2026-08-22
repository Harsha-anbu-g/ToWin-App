// The floor under every screen.
//
// Before this file there was no error boundary anywhere in the app (`grep -rn
// ErrorBoundary app src` returned nothing), and React unmounts the entire tree
// when a render throws. One bad field from the API therefore left an elder
// looking at a blank white phone with no way back short of force-quitting.
//
// Two exports, one screen:
//   ErrorFallback      what the person sees. expo-router hands it { error, retry }.
//   AppErrorBoundary   the class that catches. Used by tests and available to
//                      any subtree that wants a local net.
//
// app/_layout.jsx re-exports ErrorFallback as `ErrorBoundary`, which is the
// name expo-router looks for on a route module: useScreens.js wraps that
// route's component in <Try catch={ErrorBoundary}>. Because the root layout
// renders every other route inside itself, that one export covers the app.
//
// IMPORTANT: the fallback renders INSTEAD of RootLayout, so it sits OUTSIDE
// ThemeProvider, FontGate, ToastProvider and the query client. It may not call
// useTheme() (the context is null there), may not use Button/Card (they do),
// and may not name a Newsreader family (FontGate never mounted, so the font is
// not registered). It reads the palette straight off the tokens module instead
// and draws itself from react-native primitives only. Nothing it touches can
// be the thing that is already broken.
import { Component } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { light, radius, spacing, text, type } from '../theme/tokens';

// Night mode is opt-in and stored asynchronously, so there is no way to read
// the person's choice without the provider that just went down. The emergency
// screen takes the same default the provider itself starts on: light.
const t = light;

export function ErrorFallback({ error, retry }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.surface }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + spacing[6],
          paddingBottom: insets.bottom + spacing[6],
          paddingHorizontal: spacing[5],
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: type.title, color: t.ink, letterSpacing: -0.5 }}
        >
          Something went wrong
        </Text>
        <Text
          style={{
            fontSize: text.base,
            lineHeight: 27,
            color: t.ink2,
            marginTop: spacing[4],
          }}
        >
          This screen stopped working, and you did nothing wrong. Tap Try again.
        </Text>

        {/* The one filled sky-blue primary on this screen. Hand-built because
            the shared Button reads the theme context, which is gone here. Same
            locked pair: actionFill behind actionInk, 46pt tall. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={retry}
          style={{
            minHeight: 46,
            marginTop: spacing[6],
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[6],
            paddingVertical: spacing[3],
            backgroundColor: t.actionFill,
          }}
        >
          <Text style={{ fontSize: text.base, fontWeight: '600', color: t.actionInk }}>
            Try again
          </Text>
        </Pressable>

        <Text
          style={{
            fontSize: type.meta,
            lineHeight: 21,
            color: t.inkSlate,
            marginTop: spacing[5],
          }}
        >
          If this keeps happening, close Towinly and start it again.
        </Text>

        {/* Developer detail only. An elder gets plain words; whoever is holding
            the phone during a build gets the message that caused it. */}
        {__DEV__ && error?.message ? (
          <Text
            style={{
              fontSize: type.caption,
              lineHeight: 18,
              color: t.inkSlate,
              marginTop: spacing[5],
            }}
          >
            {String(error.message)}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

// getDerivedStateFromError has no function-component equivalent, so this stays
// a class. Same contract as expo-router's own <Try>: catch, show the fallback,
// clear the error when the person asks to retry.
export default class AppErrorBoundary extends Component {
  state = { error: undefined };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No crash reporter is wired up yet, so the console is the only record.
    // Swallowing it silently would hide the very defect this screen exists for.
    console.error('Towinly render error', error, info?.componentStack);
  }

  retry = () => this.setState({ error: undefined });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const Fallback = this.props.fallback ?? ErrorFallback;
    return <Fallback error={error} retry={this.retry} />;
  }
}
