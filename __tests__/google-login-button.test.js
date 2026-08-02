// Google login ships on the WEB build only: the same full-page redirect the
// website uses (backend /oauth2/authorization/google → website /oauth/callback
// → shared-origin token the app reads through the web session bridge). On
// native it renders nothing — Google in the store build would trigger Apple
// guideline 4.8 (Sign in with Apple) and needs the deep-link PKCE flow.
import { Platform } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import GoogleLoginButton, { GOOGLE_OAUTH_URL } from '../src/components/auth/GoogleLoginButton';

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('GoogleLoginButton', () => {
  afterEach(() => jest.restoreAllMocks());

  test('the OAuth URL is the backend authorization endpoint, not /api', () => {
    expect(GOOGLE_OAUTH_URL).toMatch(/\/oauth2\/authorization\/google$/);
    expect(GOOGLE_OAUTH_URL).not.toContain('/api/');
  });

  test('on web, renders the button and navigates on press', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const assign = jest.fn();
    global.window = { location: { assign } };

    const { findByText, getByLabelText } = await wrap(<GoogleLoginButton />);
    await findByText('Log in with Google');
    fireEvent.press(getByLabelText('Log in with Google'));

    expect(assign).toHaveBeenCalledWith(GOOGLE_OAUTH_URL);
    delete global.window;
  });

  test('on native, renders nothing at all — no button, no divider', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { queryByText } = await wrap(<GoogleLoginButton />);
    expect(queryByText('Log in with Google')).toBeNull();
    expect(queryByText(/no password to remember/i)).toBeNull();
  });

  test('a custom label carries through (register uses Continue with Google)', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    global.window = { location: { assign: jest.fn() } };
    const { findByText } = await wrap(<GoogleLoginButton label="Continue with Google" />);
    await findByText('Continue with Google');
    delete global.window;
  });
});
