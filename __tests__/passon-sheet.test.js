// The saved one-page copy (web passOnSheet.test.js parity): names of what is
// in the box and never contents; the screen and the file drawn from one
// structure; the closing line word for word.
import { buildSheet, sheetAsText, sheetFileName } from '../src/lib/passOnSheet';

const DATA = {
  ownerName: 'Margaret',
  preparedAt: '2026-08-02T12:00:00',
  items: [
    { id: 's1', label: 'Where the money is', kindHint: 'MONEY', body: 'MUST NEVER APPEAR' },
    { id: 's2', label: 'The blue folder', kindHint: 'PAPERS' },
  ],
  keyholders: [
    { id: 'k1', personName: 'Sarah', status: 'ACTIVE', respondedAt: '2026-06-02T14:00:00' },
    { id: 'k2', personName: 'David', status: 'INVITED' },
    { id: 'k3', personName: 'Old Uncle', status: 'REMOVED' },
  ],
  approvalsNeeded: 2,
  keyholderTarget: 3,
  releaseContactEmail: 'care@towinly.com',
};

test('the sheet carries names and chips, never a body', () => {
  const text = sheetAsText(buildSheet(DATA));
  expect(text).toContain('What Margaret passes on');
  expect(text).toContain('- Where the money is — Money');
  expect(text).toContain('- The blue folder — Papers');
  expect(text).not.toContain('MUST NEVER APPEAR');
});

test('keyholders appear in their real state; a key she took back is dropped', () => {
  const text = sheetAsText(buildSheet(DATA));
  expect(text).toContain('- Sarah said yes on 2 June');
  expect(text).toContain('- David has not answered yet');
  expect(text).not.toContain('Old Uncle');
  expect(text).toContain('2 of the 3 must agree.');
});

test('the release address is the server address or the plain truth', () => {
  expect(sheetAsText(buildSheet(DATA))).toContain('Write to Towinly at care@towinly.com.');
  const without = sheetAsText(buildSheet({ ...DATA, releaseContactEmail: null }));
  expect(without).toContain('Towinly has not set an address to write to yet.');
  expect(without).not.toContain('care@towinly.com');
});

test('no threshold is invented before she has chosen one', () => {
  const text = sheetAsText(
    buildSheet({ ...DATA, approvalsNeeded: null, keyholderTarget: null, keyholders: [] })
  );
  expect(text).not.toContain('must agree');
  expect(text).toContain('Nobody has been asked yet.');
});

test('the closing line is the design copy word for word', () => {
  const text = sheetAsText(buildSheet(DATA));
  expect(text.trimEnd().endsWith('This is not a will.')).toBe(true);
});

test('the file is named so a family can find it', () => {
  expect(sheetFileName('Margaret')).toBe('Towinly - what Margaret passes on.txt');
  expect(sheetFileName('A/B:C')).toBe('Towinly - what ABC passes on.txt');
});
