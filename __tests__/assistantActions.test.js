// AI step 8: the registry of actions the helper may propose. Each one confirms
// first, calls the app's own named API function, and says done or not.
import { runAssistantAction } from '../src/lib/assistantActions';
import { checkInToday } from '../src/api/streaks';
import { postHelpRequest } from '../src/api/needs';

jest.mock('../src/api/streaks', () => ({ checkInToday: jest.fn(async () => ({})) }));
jest.mock('../src/api/needs', () => ({ postHelpRequest: jest.fn(async () => ({ id: 'n1' })) }));

const yes = jest.fn(async () => true);
const no = jest.fn(async () => false);

beforeEach(() => jest.clearAllMocks());

test('an unknown action is ignored', async () => {
  expect(await runAssistantAction({ name: 'deleteMyAccount', arguments: {} }, { confirm: yes })).toBeNull();
  expect(yes).not.toHaveBeenCalled();
});

test('no means nothing is called', async () => {
  const out = await runAssistantAction({ name: 'postHelpRequest', arguments: { title: 'A lift' } }, { confirm: no });
  expect(out).toBeNull();
  expect(postHelpRequest).not.toHaveBeenCalled();
});

test('yes posts exactly the shaped request and reports done', async () => {
  const out = await runAssistantAction(
    {
      name: 'postHelpRequest',
      arguments: { title: 'A lift on Thursday', description: 'To the clinic', category: 'TRANSPORTATION', urgency: 'NORMAL', evil: 1 },
    },
    { confirm: yes }
  );
  expect(postHelpRequest).toHaveBeenCalledWith({
    title: 'A lift on Thursday',
    description: 'To the clinic',
    category: 'TRANSPORTATION',
    urgency: 'NORMAL',
  });
  expect(out).toBe('Done. Your request is posted. Helpers nearby can see it now.');
  const shown = yes.mock.calls[0][0];
  expect(shown.title).toBe('Post this request?');
  expect(shown.message).toContain('A lift on Thursday');
  expect(shown.message).toContain('Transport');
});

test('a failed post says so and points to the screen', async () => {
  postHelpRequest.mockRejectedValueOnce(new Error('500'));
  const out = await runAssistantAction({ name: 'postHelpRequest', arguments: { title: 'A lift' } }, { confirm: yes });
  expect(out).toBe('Could not post the request. Please use Post Request.');
});

test('the check-in still works through the registry', async () => {
  const out = await runAssistantAction({ name: 'checkInToday', arguments: {} }, { confirm: yes });
  expect(checkInToday).toHaveBeenCalledTimes(1);
  expect(out).toBe('Done. You are checked in for today.');
});
