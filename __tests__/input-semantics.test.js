// UX-708 — Inputs know what they hold: keyboard types, autofill, return keys.
//
// Invisible polish that decides whether login takes eight seconds or forty for
// an elder: email fields open the email keyboard and accept iOS/Android
// autofill, passwords reach the password manager, the return key walks the
// form field by field and submits at the end instead of just closing the
// keyboard.
//
// Two layers:
//   1. Render pins on the login and register forms (the acceptance criteria's
//      minimum): the exact semantics props and the return-key chain, plus the
//      keyboard-submit path actually firing the request.
//   2. Source scans so a future field cannot ship half-labelled: an
//      email-address keyboard implies email autofill props, a phone-pad
//      keyboard implies tel autofill (with a reasoned ledger), and any file
//      using secureTextEntry names its textContentType so iOS knows which
//      password story it is telling.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: [] })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

import { createRef } from 'react';
import api from '../src/api/client';
import Login from '../app/(auth)/login';
import Register from '../app/(auth)/register';
import Input from '../src/components/ui/Input';
import PasswordInput from '../src/components/ui/PasswordInput';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <AuthProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

describe('input primitives forward refs', () => {
  test('Input and PasswordInput expose focus() through their ref', async () => {
    // The whole return-key chain stands on this: React 19 passes ref as a
    // prop through memo'd Input into Paper's TextInput. If it ever breaks,
    // every Next key silently does nothing; this pin makes it loud.
    const inputRef = createRef();
    const pwdRef = createRef();
    await render(
      <ThemeProvider>
        <Input ref={inputRef} label="Plain" value="" onChangeText={() => {}} />
        <PasswordInput ref={pwdRef} label="Secret" value="" onChangeText={() => {}} />
      </ThemeProvider>
    );
    expect(typeof inputRef.current?.focus).toBe('function');
    expect(typeof pwdRef.current?.focus).toBe('function');
  });
});

describe('login form input semantics', () => {
  beforeEach(() => jest.clearAllMocks());

  test('identifier field: username autofill, no autocapitalize, walks to the password', async () => {
    // Arrange / Act
    const r = await wrap(<Login />);
    const field = r.getByLabelText('Username, Gmail, or phone');

    // Assert — identifier is username OR email OR phone, so the keyboard stays
    // default; autofill still knows it is the account handle.
    expect(field.props.autoCapitalize).toBe('none');
    expect(field.props.autoCorrect).toBe(false);
    expect(field.props.textContentType).toBe('username');
    expect(field.props.autoComplete).toBe('username');
    expect(field.props.returnKeyType).toBe('next');
    expect(typeof field.props.onSubmitEditing).toBe('function');
  });

  test('password field: password-manager autofill and a Go key that submits', async () => {
    // Arrange
    const r = await wrap(<Login />);
    const field = r.getByLabelText('Password');

    // Assert
    expect(field.props.secureTextEntry).toBe(true);
    expect(field.props.textContentType).toBe('password');
    expect(field.props.autoComplete).toBe('current-password');
    expect(field.props.returnKeyType).toBe('go');
  });

  test('pressing Go on the password actually logs in', async () => {
    // Arrange
    const r = await wrap(<Login />);
    await fireEvent.changeText(r.getByLabelText('Username, Gmail, or phone'), 'mary_h');
    await fireEvent.changeText(r.getByLabelText('Password'), 'longenough1');

    // Act — keyboard submit, no button tap.
    await fireEvent(r.getByLabelText('Password'), 'submitEditing');

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({ identifier: 'mary_h', password: 'longenough1' })
      )
    );
  });
});

describe('register form input semantics', () => {
  beforeEach(() => jest.clearAllMocks());

  test('every field knows what it holds and where the return key goes', async () => {
    // Arrange / Act
    const r = await wrap(<Register />);

    const username = r.getByLabelText('Username');
    const email = r.getByLabelText('Email');
    const dob = r.getByLabelText('Date of birth');
    const password = r.getByLabelText('Password');
    const confirm = r.getByLabelText('Re-enter password');

    // Assert — autofill semantics.
    expect(username.props.textContentType).toBe('username');
    expect(username.props.autoComplete).toBe('username-new');
    expect(email.props.keyboardType).toBe('email-address');
    expect(email.props.textContentType).toBe('emailAddress');
    expect(email.props.autoComplete).toBe('email');
    expect(dob.props.textContentType).toBe('birthdate');
    expect(password.props.textContentType).toBe('newPassword');
    expect(password.props.autoComplete).toBe('new-password');
    expect(confirm.props.textContentType).toBe('newPassword');
    expect(confirm.props.autoComplete).toBe('new-password');

    // The return key walks the form top to bottom and finishes on Done.
    for (const field of [username, email, dob, password]) {
      expect(field.props.returnKeyType).toBe('next');
      expect(typeof field.props.onSubmitEditing).toBe('function');
    }
    expect(confirm.props.returnKeyType).toBe('done');
    expect(typeof confirm.props.onSubmitEditing).toBe('function');
  });

  test('Done on the last field submits once the role and terms gates are met', async () => {
    // Arrange
    const r = await wrap(<Register />);
    await fireEvent.press(r.getByRole('radio', { name: /Elder/ }));
    await fireEvent.changeText(r.getByLabelText('Username'), 'sarah_lee');
    await fireEvent.changeText(r.getByLabelText('Email'), 'sarah@example.com');
    await fireEvent.changeText(r.getByLabelText('Date of birth'), 'May 14, 1953');
    await fireEvent.changeText(r.getByLabelText('Password'), 'longenough1');
    await fireEvent.changeText(r.getByLabelText('Re-enter password'), 'longenough1');
    await fireEvent.press(r.getByRole('checkbox'));

    // Act
    await fireEvent(r.getByLabelText('Re-enter password'), 'submitEditing');

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ username: 'sarah_lee' }))
    );
  });

  test('Done on the last field does NOT submit while the terms gate is unmet', async () => {
    // Arrange — everything filled, checkbox never ticked. The visible Create
    // Account button is disabled in this state; the keyboard path must not
    // become a hole in that gate (HCI rule 5, error prevention).
    const r = await wrap(<Register />);
    await fireEvent.press(r.getByRole('radio', { name: /Elder/ }));
    await fireEvent.changeText(r.getByLabelText('Username'), 'sarah_lee');
    await fireEvent.changeText(r.getByLabelText('Email'), 'sarah@example.com');
    await fireEvent.changeText(r.getByLabelText('Date of birth'), 'May 14, 1953');
    await fireEvent.changeText(r.getByLabelText('Password'), 'longenough1');
    await fireEvent.changeText(r.getByLabelText('Re-enter password'), 'longenough1');

    // Act
    await fireEvent(r.getByLabelText('Re-enter password'), 'submitEditing');

    // Assert — give the (wrong) request a beat to appear, then check it never did.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const registerCalls = api.post.mock.calls.filter((c) => c[0] === '/auth/register');
    expect(registerCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Source scans — a field added next month cannot ship half-labelled.
// File-level co-occurrence: coarse on purpose (a file with several inputs can
// in principle satisfy a scan with props on the wrong element), but every
// finer parse of JSX with regexes has proven brittle, and the render pins
// above cover the two highest-traffic forms element by element.
// ---------------------------------------------------------------------------

const listSourceFiles = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      out.push(...listSourceFiles(full));
    } else if (/\.jsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

const SOURCE_FILES = [...listSourceFiles(path.join(ROOT, 'app')), ...listSourceFiles(path.join(ROOT, 'src'))];

const rel = (f) => path.relative(ROOT, f);

describe('input semantics source scans', () => {
  test('an email keyboard implies email autofill (textContentType + autoComplete)', () => {
    const offenders = SOURCE_FILES.filter((f) => {
      const code = fs.readFileSync(f, 'utf8');
      if (!code.includes('keyboardType="email-address"')) return false;
      return !(code.includes('textContentType="emailAddress"') && code.includes('autoComplete="email"'));
    }).map(rel);
    expect(offenders).toEqual([]);
  });

  test('a phone keyboard implies tel autofill, unless the number belongs to someone else', () => {
    // emergency-contacts asks for ANOTHER person's number: autofill would
    // offer the elder their own, which is exactly the wrong suggestion.
    const LEDGER = ['app/emergency-contacts.jsx'];
    const offenders = SOURCE_FILES.filter((f) => {
      const code = fs.readFileSync(f, 'utf8');
      if (!code.includes('keyboardType="phone-pad"')) return false;
      if (LEDGER.includes(rel(f))) return false;
      return !code.includes('autoComplete="tel"');
    }).map(rel);
    expect(offenders).toEqual([]);

    // The ledger must stay honest: an entry that no longer has a phone-pad
    // field should be removed, not carried forever.
    for (const entry of LEDGER) {
      const code = fs.readFileSync(path.join(ROOT, entry), 'utf8');
      expect(code).toContain('keyboardType="phone-pad"');
    }
  });

  test('every file using secureTextEntry names its textContentType', () => {
    // iOS decides the password-manager story from textContentType: "password"
    // offers saved credentials, "newPassword" proposes a strong one, "none"
    // keeps the manager out (the sealed-box passphrase). Leaving it unset
    // makes iOS guess.
    const offenders = SOURCE_FILES.filter((f) => {
      const code = fs.readFileSync(f, 'utf8');
      if (!code.includes('secureTextEntry')) return false;
      return !code.includes('textContentType');
    }).map(rel);
    expect(offenders).toEqual([]);
  });
});
