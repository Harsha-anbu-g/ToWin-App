// The SOS card pressed for real: tap Send SOS, confirm, and read what the app
// then tells the person. Each answer comes from the SOS decision table: one box
// per situation, what the texts did against what family could see.
//
// fixtures/sos-decision-table.json is a copy of the file the server test proves
// the server sends (website repo, backend/src/test/resources/sos/). Change both
// together.
//
// The card is on no screen right now (owner call 2026-07-17). It stays in the
// codebase for when it returns, and it must not return saying "sent" for an
// alert that reached no one.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import api from '../src/api/client';
import SosCard from '../src/components/home/SosCard';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';
import table from './fixtures/sos-decision-table.json';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
}));

const CALL = 'Failed to send SOS. Please call your contacts directly.';

// The sentence the app shows for each "told" in the table.
const APP_SAYS = {
  'all contacts texted': () =>
    'SOS sent to all emergency contacts. If no one calls you back in a few minutes, call them.',
  'some contacts texted': ({ contactsTexted, contactsTotal }) =>
    `SOS sent to ${contactsTexted} of your ${contactsTotal} emergency contacts. Call them to be sure.`,
  'family only': () =>
    'Your family will see your alert in Towinly. No text message was sent. If it is urgent, call them now.',
  'nobody on file': () =>
    'You have no emergency contacts yet, so no one was alerted. Please call your local emergency number.',
  'texts failed': () => CALL,
};

// What axios does with an answer: a 2xx resolves, anything else rejects with
// the answer on error.response.
const asAxios = ({ status, body }) =>
  status >= 200 && status < 300
    ? Promise.resolve({ status, data: body })
    : Promise.reject(
        Object.assign(new Error(`Request failed with status code ${status}`), {
          response: { status, data: body },
        })
      );

// Same order as app/_layout.jsx. gcTime Infinity so no timer outlives the test.
const showCard = () =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
          })
        }
      >
        <ToastProvider>
          <ConfirmProvider>
            <SosCard />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

// Tap the card's button, then answer the "Send SOS?" box that opens.
const tapSendSos = async (answer, confirmWith = 'Send SOS') => {
  api.post.mockImplementation(answer);
  const view = await showCard();
  // Awaited: in this setup a press is not finished until its updates have landed.
  await fireEvent.press(view.getByLabelText('Send SOS'));
  const box = await view.findByTestId('confirm-modal');
  await fireEvent.press(within(box).getByLabelText(confirmWith));
  return view;
};

// Fake clocks, as in toast-duration.test.js. The notice stays up fifteen seconds
// and the data layer reports back on a timer; neither may outlive its test.
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => jest.useRealTimers());

test('the card is checked against all twelve boxes of the decision table', () => {
  // test.each over an empty table would pass by running nothing.
  expect(table.boxes).toHaveLength(12);
});

test.each(table.boxes.map((box) => [box.box, box.told, box.answer]))(
  '%s: the app says "%s"',
  async (_box, told, answer) => {
    const view = await tapSendSos(() => asAxios(answer));

    expect(await view.findByText(APP_SAYS[told](answer.body))).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/emergency/sos');
  }
);

test('never shows a wifi sign-in page that answered "OK" as sent', async () => {
  const view = await tapSendSos(() =>
    Promise.resolve({ status: 200, data: '<html>Sign in to this network</html>' })
  );

  expect(await view.findByText(CALL)).toBeTruthy();
});

test("shows the server's own words for a second press within a minute", async () => {
  const { status, message } = table.secondPress;
  const view = await tapSendSos(() => asAxios({ status, body: { message, status } }));

  expect(await view.findByText(message)).toBeTruthy();
});

test('sends nothing when the person answers Cancel', async () => {
  const view = await tapSendSos(() => asAxios(table.boxes[0].answer), 'Cancel');

  await waitFor(() => expect(view.queryByTestId('confirm-modal')).toBeNull());
  expect(api.post).not.toHaveBeenCalled();
});
