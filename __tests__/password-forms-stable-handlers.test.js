// DEEP-38 remainder: the two password forms still hand their Paper fields
// inline onChangeText closures, recreated on every render. Input is memo'd
// (src/components/ui/Input.jsx) because every Paper field animates a floating
// label; a fresh handler identity per keystroke defeats that memo, so typing
// in one field re-renders every animated sibling. profile-edit.jsx was fixed
// (useCallback per field); change-password.jsx and reset-password.jsx are the
// last two forms. This probe records every props object the screen hands
// Input and demands one handler identity per field across a keystroke.
import { fireEvent, render } from '@testing-library/react-native';
import ResetPassword from '../app/(auth)/reset-password';
import ChangePassword from '../app/change-password';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ token: 'tok-1' }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  friendlyAuthError: (_e, fallback) => fallback,
}));

// DEEP-38 probe, same shape as profile-edit.test.js: the recorder is NOT
// memo'd, so it re-runs on every parent render and captures the props the
// screen actually handed over, keyed by field label.
const recordedProps = {};
jest.mock('../src/components/ui/Input', () => {
  const React = require('react');
  const RealInput = jest.requireActual('../src/components/ui/Input').default;
  const RecordingInput = (props) => {
    (recordedProps[props.label] = recordedProps[props.label] ?? []).push(props);
    return React.createElement(RealInput, props);
  };
  return { __esModule: true, default: RecordingInput };
});

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>
  );

// One handler identity per field, however many times the field re-rendered.
const handlerIdentities = (label) => new Set(recordedProps[label].map((p) => p.onChangeText));

beforeEach(() => {
  for (const key of Object.keys(recordedProps)) delete recordedProps[key];
});

test('change-password: a keystroke leaves every field holding the same handler', async () => {
  // Arrange
  const labels = [
    'Current password',
    'New password (at least 8 characters)',
    'Re-enter new password',
  ];
  const r = await wrap(<ChangePassword />);

  // Act: type into the first field; the state change re-renders the form.
  await fireEvent.changeText(r.getByLabelText('Current password'), 'old-secret');

  // Assert: the probe saw the re-render, and no field got a new handler.
  for (const label of labels) {
    expect(recordedProps[label].length).toBeGreaterThan(1);
    expect(handlerIdentities(label).size).toBe(1);
  }
});

test('reset-password: a keystroke leaves every field holding the same handler', async () => {
  // Arrange
  const labels = ['New password (at least 8 characters)', 'Re-enter new password'];
  const r = await wrap(<ResetPassword />);

  // Act
  await fireEvent.changeText(r.getByLabelText('New password (at least 8 characters)'), 'longenough1');

  // Assert
  for (const label of labels) {
    expect(recordedProps[label].length).toBeGreaterThan(1);
    expect(handlerIdentities(label).size).toBe(1);
  }
});
