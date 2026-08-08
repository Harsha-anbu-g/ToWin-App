// The copy of her information that "Send me a copy of my data" hands over.
//
// This file exists because the button used to lie. profile.jsx called
// GET /account/export, threw the response body away, and toasted "check your
// email" when nothing anywhere sends an email (audit finding V2). So the one
// thing every test below is really pinning is that the server's answer reaches
// the person, and that it would fail again the moment it stopped.
//
// Three properties, in order of how much damage their absence does:
//   1. What the server sent is in the file.
//   2. Nothing the server sent is missing from the file, including sections
//      this app has never heard of. A hand-written whitelist would silently
//      lose whatever the backend adds next, which is the same class of bug.
//   3. The Sealed box leaves as a list and never as contents, because that is
//      what the backend does and the page must not promise otherwise.
import { MY_DATA, myDataAsText, myDataFileName } from '../src/lib/myDataCopy';

/** A trimmed but real /account/export body, key names copied from AccountService. */
const EXPORT = {
  account: {
    id: 'u-1',
    username: 'margaret',
    email: 'margaret@example.com',
    phone: null,
    role: 'ELDER',
    trustScore: 15,
    dateOfBirth: '1948-03-02',
    createdAt: '2026-01-04T09:00:00',
  },
  elderProfile: {
    name: 'Margaret',
    age: 78,
    bio: 'I still walk to the shops every morning.',
    interests: ['Gardening', 'Radio 4'],
  },
  needsPosted: [
    { id: 'n-1', title: 'A lift to the pharmacy', status: 'OPEN' },
    { id: 'n-2', title: 'Help with the bins', status: 'CLOSED' },
  ],
  reviewsGiven: [],
  passOnItems: [
    { id: 'p-1', kind: 'LETTER', title: 'For Sarah', body: 'The day you were born it rained.' },
  ],
  sealedBoxItems: [{ id: 's-1', kind: 'MONEY', byteSize: 2048, createdAt: '2026-05-01T10:00:00' }],
  sealedBoxKeyholders: [{ id: 'k-1', keyholderId: 'u-9', status: 'ACTIVE' }],
};

const MADE_ON = '2026-08-07T12:00:00';
const text = (body = EXPORT) => myDataAsText(body, { madeOn: MADE_ON });

describe('the file carries what the server sent', () => {
  test('her own details are in it, under words she would use', () => {
    // Arrange / Act
    const out = text();

    // Assert
    expect(out).toContain('Your account');
    expect(out).toContain('Email: margaret@example.com');
    expect(out).toContain('Trust score: 15');
    expect(out).toContain('Date of birth: 1948-03-02');
  });

  test('her profile, her requests and her letters are in it in full', () => {
    const out = text();
    expect(out).toContain('I still walk to the shops every morning.');
    expect(out).toContain('Gardening, Radio 4');
    expect(out).toContain('A lift to the pharmacy');
    expect(out).toContain('Help with the bins');
    expect(out).toContain('The day you were born it rained.');
  });

  test('it is dated and named for her', () => {
    expect(text()).toContain('7 August 2026');
    expect(myDataFileName()).toBe('Towinly - my information.txt');
  });

  test('an empty section says it is empty rather than vanishing', () => {
    expect(text()).toContain('Reviews you wrote');
    expect(text()).toContain(MY_DATA.nothingHere);
  });
});

describe('nothing the server sent is dropped', () => {
  test('a section this app has never heard of still reaches her', () => {
    // Arrange - the backend gains a section and nobody updates this file.
    const out = myDataAsText(
      { ...EXPORT, futureThing: [{ note: 'a thing added after this app shipped' }] },
      { madeOn: MADE_ON }
    );

    // Assert - the heading falls back to the server's own name for it.
    expect(out).toContain('futureThing');
    expect(out).toContain('a thing added after this app shipped');
  });

  test('a field with no value is shown as empty, never hidden', () => {
    const out = text();
    expect(out).toContain(`Phone: ${MY_DATA.noValue}`);
  });

  test('an empty body is refused rather than handed over as a blank file', () => {
    expect(() => myDataAsText(null, { madeOn: MADE_ON })).toThrow();
    expect(() => myDataAsText({}, { madeOn: MADE_ON })).toThrow();
  });
});

describe('the Sealed box leaves as a list and never as contents', () => {
  test('it is listed by kind and size, with no label and no body', () => {
    const out = text();
    expect(out).toContain('What is in your Sealed box');
    expect(out).toContain('Kind: MONEY');
    expect(out).toContain('Byte size: 2048');
  });

  test('the file says plainly that the contents are not in it', () => {
    // The one sentence that stops this file being a false promise: the export
    // deliberately emits sealed items as metadata only (AccountService
    // addPassOnSections), and the person is told so where she would look.
    expect(text()).toContain(MY_DATA.sealedBoxNote);
    expect(MY_DATA.sealedBoxNote).toMatch(/password/i);
  });

  test('a sealed body would be carried if the server ever sent one, so the note stays true', () => {
    // Guard against the reverse mistake: if a future backend DID send contents,
    // this renderer must not quietly swallow them while the note claims safety.
    const out = myDataAsText(
      { ...EXPORT, sealedBoxItems: [{ id: 's-1', kind: 'MONEY', label: 'LEAKED' }] },
      { madeOn: MADE_ON }
    );
    expect(out).toContain('LEAKED');
  });
});

describe('words a stranger reads', () => {
  const allCopy = [...Object.values(MY_DATA), text()].join('\n');

  test('no em dashes anywhere in the file or its messages', () => {
    expect(allCopy).not.toContain('—');
  });

  test('no beta or prototype wording', () => {
    expect(allCopy).not.toMatch(/\b(beta|prototype|coming soon|placeholder)\b/i);
  });
});
