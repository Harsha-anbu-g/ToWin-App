// An SOS used to answer "sent" whether or not it reached anyone. The server now
// reports who was reached, and these sentences must never claim more than that.
import { sosFailedMessage, sosSentMessage } from '../src/lib/sosOutcome';

describe('sosSentMessage', () => {
  test('says all contacts were told only when every one of them was texted', () => {
    expect(sosSentMessage({ contactsTexted: 2, contactsTotal: 2, familyAlerted: false })).toEqual({
      ok: true,
      text: 'SOS sent to all emergency contacts.',
    });
  });

  test('names the count when a text did not go out', () => {
    const sent = sosSentMessage({ contactsTexted: 1, contactsTotal: 3, familyAlerted: true });

    expect(sent.ok).toBe(false);
    expect(sent.text).toBe('SOS sent to 1 of your 3 emergency contacts. Call them to be sure.');
  });

  test('says no text went out when only family can see the alert', () => {
    const sent = sosSentMessage({ contactsTexted: 0, contactsTotal: 0, familyAlerted: true });

    expect(sent.ok).toBe(false);
    expect(sent.text).toContain('family');
    expect(sent.text).toContain('No text message was sent');
  });

  test('says the same when every text failed but family can see it', () => {
    const sent = sosSentMessage({ contactsTexted: 0, contactsTotal: 2, familyAlerted: true });

    expect(sent.ok).toBe(false);
    expect(sent.text).toContain('No text message was sent');
  });

  test('never reports success for facts that reached no one', () => {
    const sent = sosSentMessage({ contactsTexted: 0, contactsTotal: 2, familyAlerted: false });

    expect(sent.ok).toBe(false);
    expect(sent.text).toContain('Failed to send SOS');
  });

  test('keeps the old sentence for a server that answers with no body', () => {
    expect(sosSentMessage('')).toEqual({ ok: true, text: 'SOS sent to all emergency contacts.' });
    expect(sosSentMessage(undefined).ok).toBe(true);
  });
});

describe('sosFailedMessage', () => {
  const refused = (data) => ({ response: { data } });

  test('points to the emergency number when nobody is on file', () => {
    const text = sosFailedMessage(
      refused({ contactsTexted: 0, contactsTotal: 0, familyAlerted: false, message: 'server words' })
    );

    expect(text).toContain('no emergency contacts');
    expect(text).toContain('local emergency number');
  });

  test('says to call the contacts when the texts failed', () => {
    const text = sosFailedMessage(
      refused({ contactsTexted: 0, contactsTotal: 2, familyAlerted: false, message: 'server words' })
    );

    expect(text).toBe('Failed to send SOS. Please call your contacts directly.');
  });

  test("passes on the server's own words for a second press within a minute", () => {
    expect(sosFailedMessage(refused({ message: 'Your alert was already sent.', status: 429 }))).toBe(
      'Your alert was already sent.'
    );
  });

  test('says to call the contacts when nothing came back at all', () => {
    expect(sosFailedMessage(new Error('Network Error'))).toBe(
      'Failed to send SOS. Please call your contacts directly.'
    );
  });
});
