// Apple guideline 1.2 asks a user-generated-content app for "a method for
// filtering objectionable material from being posted". src/lib/contentFilter.js
// is that method and app/(tabs)/action.jsx has always run it on a help request.
// Two surfaces skipped it, and they are the two places people actually write to
// each other: the private chat composer, and the comment a family member leaves
// on a helper for their parent.
//
// Private one-to-one chat between an elder and a helper is what a reviewer
// probes and where an elder is most exposed, so it gets the same check and the
// same sentence as the help form. HARD-113.
//
// A third surface was still open: the help request a guardian composes for
// their parent (FamilyNeedsForParent). It posts free text to the same /needs
// endpoint the parent's own composer posts to, and the backend carries no
// wordlist of its own, so a request typed there went out unchecked. It is also
// the path a reviewer reaches by accepting a family invitation. APS-05.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ChatThread from '../app/chat/[connectionId]';
import FamilyNeedsForParent from '../src/components/family/FamilyNeedsForParent';
import FamilyReviewForParent from '../src/components/family/FamilyReviewForParent';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { objectionableMessage } from '../src/lib/contentFilter';
import { clearDrafts } from '../src/lib/chatDrafts';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({ connectionId: 'c1' }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

import api from '../src/api/client';

const conn = {
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Priya',
  otherUserRole: 'HELPER',
  type: 'HELP',
  status: 'ACTIVE',
  currentTrustLevel: 'MESSAGING',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: false,
};

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false, gcTime: Infinity },
              mutations: { retry: false, gcTime: Infinity },
            },
          })
        }
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

const stubChat = () =>
  api.get.mockImplementation((url) => {
    if (url === '/connections') return Promise.resolve({ data: [conn] });
    if (url.startsWith('/messages/c1')) return Promise.resolve({ data: { content: [] } });
    return Promise.resolve({ data: {} });
  });

const sends = () => api.post.mock.calls.filter(([url]) => String(url).includes('/send'));

beforeEach(() => {
  clearDrafts();
  jest.clearAllMocks();
});

describe('the private message composer', () => {
  test('a message with a blocked word never reaches the server', async () => {
    // Arrange
    stubChat();
    const r = await wrap(<ChatThread />);

    // Act
    await fireEvent.changeText(await r.findByLabelText('Message'), 'just kys already');
    await fireEvent.press(r.getByLabelText('Send message'));

    // Assert - nothing was posted, and the reason is the help form's sentence,
    // word for word, so the app never explains the same rule two ways.
    await waitFor(() => expect(r.getByText(objectionableMessage('kys'))).toBeTruthy());
    expect(sends()).toHaveLength(0);
  });

  test('the words stay in the composer so they can be fixed', async () => {
    // Arrange - HCI rule 9: a refusal must never eat what somebody typed.
    stubChat();
    const r = await wrap(<ChatThread />);

    // Act
    await fireEvent.changeText(await r.findByLabelText('Message'), 'just kys already');
    await fireEvent.press(r.getByLabelText('Send message'));

    // Assert
    await waitFor(() => expect(r.getByText(objectionableMessage('kys'))).toBeTruthy());
    expect(r.getByLabelText('Message').props.value).toBe('just kys already');
  });

  test('editing the message clears the refusal', async () => {
    // Arrange
    stubChat();
    const r = await wrap(<ChatThread />);
    await fireEvent.changeText(await r.findByLabelText('Message'), 'just kys already');
    await fireEvent.press(r.getByLabelText('Send message'));
    await waitFor(() => expect(r.getByText(objectionableMessage('kys'))).toBeTruthy());

    // Act
    await fireEvent.changeText(r.getByLabelText('Message'), 'just leave already');

    // Assert - a stale refusal sitting over a corrected message is its own bug.
    await waitFor(() => expect(r.queryByText(objectionableMessage('kys'))).toBeNull());
  });

  test('an ordinary message still sends', async () => {
    // Arrange
    stubChat();
    const r = await wrap(<ChatThread />);

    // Act
    await fireEvent.changeText(await r.findByLabelText('Message'), 'See you at two, thank you');
    await fireEvent.press(r.getByLabelText('Send message'));

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/messages/c1/send', { content: 'See you at two, thank you' })
    );
    expect(r.queryByText(/Please take out/)).toBeNull();
  });
});

describe("the review a family member writes on their parent's behalf", () => {
  const helper = { helperUserId: 'h1', helperName: 'Anna Marsh', stageIndex: 6 };

  const openForm = async () => {
    const r = await wrap(<FamilyReviewForParent helper={helper} elderId="e1" elderName="Mum" />);
    await fireEvent.press(r.getByLabelText('Leave a review for Mum'));
    return r;
  };

  test('a comment with a blocked word never reaches the server', async () => {
    // Arrange
    const r = await openForm();

    // Act
    await fireEvent.changeText(r.getByLabelText('A few words (optional)'), 'go kill yourself');
    await fireEvent.press(r.getByText('Save for Mum'));

    // Assert
    await waitFor(() => expect(r.getByText(objectionableMessage('kill yourself'))).toBeTruthy());
    expect(api.post).not.toHaveBeenCalled();
  });

  test('an ordinary comment still saves, with the rating and the parent on it', async () => {
    // Arrange
    const r = await openForm();

    // Act
    await fireEvent.changeText(r.getByLabelText('A few words (optional)'), 'Kind and always on time');
    await fireEvent.press(r.getByText('Save for Mum'));

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/reviews', {
        revieweeId: 'h1',
        rating: 5,
        comment: 'Kind and always on time',
        onBehalfOfElderId: 'e1',
      })
    );
  });
});


describe("the help request a family member writes for their parent", () => {
  const openForm = async () => {
    const r = await wrap(
      <FamilyNeedsForParent elderId="e1" elderName="Margaret" openNeeds={[]} canManage />
    );
    await fireEvent.press(r.getByRole('button', { name: 'Ask for help for Margaret' }));
    return r;
  };

  const posts = () => api.post.mock.calls.filter(([url]) => url === '/needs');

  test('a title with a blocked word never reaches the server', async () => {
    // Arrange
    const r = await openForm();

    // Act
    await fireEvent.changeText(
      r.getByLabelText('What does Margaret need help with?'),
      'someone to sort out that retard next door'
    );
    await fireEvent.press(r.getByText('Send for Margaret'));

    // Assert - the same sentence the parent's own composer uses, word for word.
    await waitFor(() => expect(r.getByText(objectionableMessage('retard'))).toBeTruthy());
    expect(posts()).toHaveLength(0);
  });

  test('a description with a blocked word never reaches the server', async () => {
    // Arrange - the title is clean, so only the second field can refuse this.
    const r = await openForm();

    // Act
    await fireEvent.changeText(
      r.getByLabelText('What does Margaret need help with?'),
      'A ride to the doctor on Tuesday'
    );
    await fireEvent.changeText(
      r.getByLabelText('Anything else a helper should know? (optional)'),
      'tell the driver to kill yourself if he is late'
    );
    await fireEvent.press(r.getByText('Send for Margaret'));

    // Assert
    await waitFor(() => expect(r.getByText(objectionableMessage('kill yourself'))).toBeTruthy());
    expect(posts()).toHaveLength(0);
  });

  test('the words stay in the field so they can be fixed', async () => {
    // Arrange - HCI rule 9, the same promise the chat composer makes.
    const r = await openForm();

    // Act
    await fireEvent.changeText(
      r.getByLabelText('What does Margaret need help with?'),
      'someone to sort out that retard next door'
    );
    await fireEvent.press(r.getByText('Send for Margaret'));

    // Assert
    await waitFor(() => expect(r.getByText(objectionableMessage('retard'))).toBeTruthy());
    expect(r.getByLabelText('What does Margaret need help with?').props.value).toBe(
      'someone to sort out that retard next door'
    );
  });

  test('an ordinary request still goes out, on the parent behalf', async () => {
    // Arrange
    const r = await openForm();

    // Act
    await fireEvent.changeText(
      r.getByLabelText('What does Margaret need help with?'),
      'A ride to the doctor on Tuesday'
    );
    await fireEvent.press(r.getByText('Send for Margaret'));

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/needs', {
        title: 'A ride to the doctor on Tuesday',
        description: null,
        category: 'COMPANIONSHIP',
        urgency: 'NORMAL',
        onBehalfOfElderId: 'e1',
      })
    );
    expect(r.queryByText(/Please take out/)).toBeNull();
  });
});
