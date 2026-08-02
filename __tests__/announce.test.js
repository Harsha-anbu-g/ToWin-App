// announceForAccessibility is `static announceForAccessibility() {}` in
// react-native-web — an empty function. Every announcement the app makes
// ("Saved.", "Thinking…", "You're offline") is silently dropped in a browser
// for exactly the people who depend on hearing it.
const loadOn = (os) => {
  let loaded;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      Platform: { OS: os },
      AccessibilityInfo: { announceForAccessibility: jest.fn() },
    }));
    loaded = require('../src/lib/announce');
  });
  return loaded;
};

afterEach(() => jest.dontMock('react-native'));

test('web announcements go to the live region, never to the RN no-op', () => {
  const announceMod = loadOn('web');
  const heard = [];
  const off = announceMod.setAnnouncer((m) => heard.push(m));

  announceMod.announce('Saved.');
  expect(heard).toEqual(['Saved.']);

  off();
  announceMod.announce('Dropped — nobody is listening.');
  expect(heard).toEqual(['Saved.']);
});

test('deregistering only clears your own announcer, never a newer one', () => {
  const announceMod = loadOn('web');
  const first = [];
  const second = [];
  const offFirst = announceMod.setAnnouncer((m) => first.push(m));
  announceMod.setAnnouncer((m) => second.push(m));

  offFirst(); // a stale unmount must not silence the live region
  announceMod.announce('Saved.');

  expect(first).toEqual([]);
  expect(second).toEqual(['Saved.']);
});

test('an empty message is never announced', () => {
  const announceMod = loadOn('web');
  const heard = [];
  announceMod.setAnnouncer((m) => heard.push(m));
  announceMod.announce('');
  announceMod.announce(undefined);
  expect(heard).toEqual([]);
});

test('nothing throws before the live region is mounted', () => {
  const announceMod = loadOn('web');
  expect(() => announceMod.announce('Too early.')).not.toThrow();
});

test('a phone still uses the platform announcement', () => {
  let announceMod;
  const spy = jest.fn();
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      AccessibilityInfo: { announceForAccessibility: spy },
    }));
    announceMod = require('../src/lib/announce');
  });
  announceMod.announce('Saved.');
  expect(spy).toHaveBeenCalledWith('Saved.');
});
