// An SOS used to answer "sent" whether or not it reached anyone. The server now
// reports who was reached, and these sentences must never claim more than that.
import { sosFailedMessage, sosSentMessage } from '../src/lib/sosOutcome';

describe('sosSentMessage', () => {
  test('says all contacts were told only when every one of them was texted', () => {
    const sent = sosSentMessage({ contactsTexted: 2, contactsTotal: 2, familyAlerted: false });

    expect(sent.ok).toBe(true);
    expect(sent.text).toContain('SOS sent to all emergency contacts.');
  });

  test('says what to do if nobody answers, because sent is not the same as read', () => {
    const sent = sosSentMessage({ contactsTexted: 1, contactsTotal: 1, familyAlerted: true });

    expect(sent.text).toBe(
      'SOS sent to all emergency contacts. If no one calls you back in a few minutes, call them.'
    );
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

  test('never reports an answer it cannot read as sent', () => {
    // A wifi sign-in page answers 200 with a page of HTML. So does anything
    // else that is not our server. None of that is an SOS that went out.
    const unreadable = [
      '',
      undefined,
      null,
      '<html>Sign in to this network</html>',
      {},
      { contactsTexted: 2 },
      { contactsTexted: '2', contactsTotal: '2', familyAlerted: true },
      { contactsTexted: -1, contactsTotal: 2 },
      { contactsTexted: 1.5, contactsTotal: 2 },
    ];

    for (const answer of unreadable) {
      expect(sosSentMessage(answer)).toEqual({
        ok: false,
        text: 'Failed to send SOS. Please call your contacts directly.',
      });
    }
  });

  test('points to the emergency number when nobody is on file, whatever the status said', () => {
    const sent = sosSentMessage({ contactsTexted: 0, contactsTotal: 0, familyAlerted: false });

    expect(sent.ok).toBe(false);
    expect(sent.text).toContain('no emergency contacts');
    expect(sent.text).toContain('local emergency number');
  });

  test('counts family only when the server says so outright', () => {
    const sent = sosSentMessage({ contactsTexted: 0, contactsTotal: 2, familyAlerted: 'yes' });

    expect(sent.text).toBe('Failed to send SOS. Please call your contacts directly.');
  });
});

describe('sosFailedMessage', () => {
  const refused = (data, status) => ({ response: { data, status } });
  const CALL = 'Failed to send SOS. Please call your contacts directly.';

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
    expect(sosFailedMessage(refused({ message: 'Your alert was already sent.' }, 429))).toBe(
      'Your alert was already sent.'
    );
  });

  test('lets no other answer replace the instruction to call', () => {
    expect(sosFailedMessage(refused({ message: 'Something went wrong.' }, 500))).toBe(CALL);
    expect(sosFailedMessage(refused({ message: 'Sign in to continue.' }, 403))).toBe(CALL);
    expect(sosFailedMessage(refused('<html>Bad gateway</html>', 502))).toBe(CALL);
  });

  test('shows only a short plain sentence from the server, never anything else', () => {
    expect(sosFailedMessage(refused({ message: { nested: true } }, 429))).toBe(CALL);
    expect(sosFailedMessage(refused({ message: '   ' }, 429))).toBe(CALL);
    expect(sosFailedMessage(refused({ message: 'x'.repeat(5000) }, 429)).length).toBeLessThanOrEqual(200);
  });

  test('says to call the contacts when nothing came back at all', () => {
    expect(sosFailedMessage(new Error('Network Error'))).toBe(
      'Failed to send SOS. Please call your contacts directly.'
    );
  });
});
