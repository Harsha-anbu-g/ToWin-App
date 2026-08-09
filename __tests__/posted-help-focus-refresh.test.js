// UX-710 follow-through on the old react-review finding: PostedHelpList never
// refreshed on focus. Tab screens stay mounted, so coming back to Posted Help
// only ever showed the cached list — a new applicant stayed invisible until a
// pull-to-refresh or a mutation. The fix re-fetches when the screen regains
// focus, skipping the first focus (the mount fetch already covers it).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

// A useFocusEffect that behaves like the real one: runs the callback as an
// effect on mount (the first focus), and lets the test replay every stored
// callback to simulate the screen regaining focus.
const mockFocusCallbacks = new Set();
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useFocusEffect: (cb) => {
      useEffect(() => {
        mockFocusCallbacks.add(cb);
        const cleanup = cb();
        return () => {
          mockFocusCallbacks.delete(cb);
          if (typeof cleanup === 'function') cleanup();
        };
      }, [cb]);
    },
  };
});

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: { content: [] } })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

import api from '../src/api/client';
import PostedHelpList from '../src/components/needs/PostedHelpList';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

afterEach(() => {
  mockFocusCallbacks.clear();
  jest.clearAllMocks();
});

const needsCalls = () => api.get.mock.calls.filter(([url]) => url === '/needs/mine').length;

test('coming back to the list re-fetches; the first focus does not double-fetch', async () => {
  await wrap(<PostedHelpList />);
  await waitFor(() => expect(needsCalls()).toBe(1));

  // The mount focus must not stack a second fetch on top of the query's own.
  expect(needsCalls()).toBe(1);

  // The screen regains focus — the list checks again for new applicants.
  act(() => {
    mockFocusCallbacks.forEach((cb) => cb());
  });
  await waitFor(() => expect(needsCalls()).toBe(2));
});
