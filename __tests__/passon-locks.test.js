// The pass-on words are load-bearing: the dashboard card, the elder's page,
// the keyholder ask and the saved copy must say word-for-word the same thing
// as the website (ToWin/frontend/src/components/passOnLocks.js). These tests
// lock the sentences a person could later dispute.
import {
  AUDIENCES,
  FROM_PAGE,
  FROZEN,
  KEYHOLDER_ASK,
  LETTERS,
  MY_BOXES,
  NOT_A_WILL,
  PAGE_LEAD,
  RELEASE_CONTACT,
  SEALED_ITEMS,
  SETUP,
  SHEET,
  keyholderLine,
  listOfNames,
  onDay,
  onDayInFull,
} from '../src/lib/passOnLocks';

describe('the dashboard card summary', () => {
  test('spells out singulars — never "1 stories"', () => {
    expect(MY_BOXES.summary({ stories: 1 })).toBe('1 story');
    expect(MY_BOXES.summary({ letters: 1 })).toBe('1 letter');
    expect(MY_BOXES.summary({ stories: 3, letters: 2, shut: true })).toBe(
      '3 stories · 2 letters · your box is shut'
    );
  });

  test('says the empty state in words, never a row of zeros', () => {
    expect(MY_BOXES.summary()).toBe('Nothing in your boxes yet. Start whenever you like.');
    expect(MY_BOXES.summary({ stories: 0, letters: 0 })).toBe(MY_BOXES.empty);
  });

  test('the card and the page lead cannot drift apart', () => {
    expect(PAGE_LEAD).toBe(`${MY_BOXES.lead} You choose who sees each one.`);
  });
});

test('the not-a-will line is the exact reviewed sentence', () => {
  expect(NOT_A_WILL.short).toBe('This is not a will, and it does not replace one.');
  expect(SHEET.closing).toBe('This is not a will.');
});

test('audience keys are the server enum values', () => {
  expect(AUDIENCES.map((a) => a.key)).toEqual(['EVERYONE', 'FAMILY', 'HELPERS', 'PERSON']);
});

test('letter release keys are the server enum values', () => {
  expect(LETTERS.WHEN.map((w) => w.key)).toEqual(['NOW', 'AFTER']);
});

describe('a list of people, said out loud', () => {
  test('no serial comma — a sentence about her family, not a citation', () => {
    expect(listOfNames(['Sarah'])).toBe('Sarah');
    expect(listOfNames(['Sarah', 'David'])).toBe('Sarah and David');
    expect(listOfNames(['Sarah', 'David', 'Ruth'])).toBe('Sarah, David and Ruth');
    expect(listOfNames([])).toBe('');
  });
});

describe('the quorum said in real terms', () => {
  test('handles the one remaining dissenter grammatically', () => {
    expect(SETUP.howMany.inRealTerms(2, 'Sarah, David and Ruth', 3)).toBe(
      'So: any 2 of Sarah, David and Ruth. That means 2 of them can open it even if the other one says no.'
    );
    expect(SETUP.howMany.inRealTerms(2, 'Sarah, David, Ruth and Tom', 4)).toBe(
      'So: any 2 of Sarah, David, Ruth and Tom. That means 2 of them can open it even if the others say no.'
    );
  });
});

describe('what is in the box, counted out loud', () => {
  test('"1 thing is" and "3 things are"', () => {
    expect(SEALED_ITEMS.shut(1)).toBe(
      'Your box is shut. 1 thing is inside. Nobody can see them but you.'
    );
    expect(SEALED_ITEMS.shut(3)).toBe(
      'Your box is shut. 3 things are inside. Nobody can see them but you.'
    );
  });
});

describe('keyholder lines — her screen and the saved copy never disagree', () => {
  test('each status in her words', () => {
    expect(
      keyholderLine({ status: 'ACTIVE', personName: 'Sarah', respondedAt: '2026-06-02T14:30:00' })
    ).toBe('Sarah said yes on 2 June');
    expect(keyholderLine({ status: 'INVITED', personName: 'David' })).toBe(
      'David has not answered yet'
    );
    expect(keyholderLine({ status: 'DECLINED', personName: 'Ruth' })).toBe('Ruth said no');
    expect(keyholderLine({ status: 'RESIGNED', personName: 'Tom' })).toBe(
      'Tom is no longer holding a key'
    );
  });
});

describe('dates said out loud', () => {
  test('"6 August" on screen, "6 August 2026" on the saved copy', () => {
    expect(onDay('2026-08-06T12:00:00')).toBe('6 August');
    expect(onDayInFull('2026-08-06T12:00:00')).toBe('6 August 2026');
    expect(onDay('not a date')).toBe('');
  });
});

describe('the release address is deployment config, never local text', () => {
  test('with an address, one shared sentence', () => {
    expect(FROZEN.tellUs('care@towinly.com')).toBe('Write to Towinly at care@towinly.com.');
    expect(SHEET.howToAsk.writeTo('care@towinly.com')).toBe(
      'Write to Towinly at care@towinly.com.'
    );
  });

  test('without one, the truth — plus "save again later" only on the sheet', () => {
    expect(FROZEN.tellUs(null)).toBe(RELEASE_CONTACT.notSetYet);
    expect(SHEET.howToAsk.writeTo(null)).toBe(SHEET.howToAsk.noAddressYet);
    expect(SHEET.howToAsk.noAddressYet).toContain(RELEASE_CONTACT.notSetYet);
  });
});

test('the keyholder ask says they/their — gender is never assumed', () => {
  const body = KEYHOLDER_ASK.body('Margaret');
  expect(body).toContain('after they are gone');
  expect(body).not.toContain('she');
  expect(KEYHOLDER_ASK.threshold(2, 3)).toBe(
    '2 of the 3 of you would have to agree, and someone here at Towinly would check first.'
  );
});

test('the from-page speaks with the writer name, never "this person"', () => {
  expect(FROM_PAGE.title('Margaret')).toBe('From Margaret');
  expect(FROM_PAGE.empty('Margaret')).toBe('Margaret has not shared anything with you yet.');
});

test('the frozen refusal is recognised by the server sentence opening', () => {
  expect(FROZEN.prefix).toBe('You changed your password recently.');
});
