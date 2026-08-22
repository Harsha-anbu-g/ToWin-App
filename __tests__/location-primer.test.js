// What the Add Friends screen says at each location state.
//
// The rule these hold: a person must never meet a dead end. Every state either
// offers a button that can actually work, or explains where to go instead. A
// card that offers "Use my location" after iOS has been told never to ask
// again is a button that does nothing, which is the worst of the options.
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import LocationPrimer from '../src/components/location/LocationPrimer';
import { STATUS } from '../src/lib/deviceLocation';

// The card never calls the library; it only needs the import to resolve.
jest.mock('expo-location', () => ({}));

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('the location card', () => {
  test('before anyone is asked, it explains why and offers the button', async () => {
    const r = await wrap(<LocationPrimer status={STATUS.unknown} onEnable={() => {}} />);
    r.getByRole('button', { name: 'Use my location' });
    // The promise the privacy policy makes must be on screen at the moment of
    // asking, not only buried in the policy.
    expect(r.getByText(/two kilometre area/)).toBeOnTheScreen();
    expect(r.getByText(/never your address/)).toBeOnTheScreen();
    expect(r.getByText(/Never while the app is closed/)).toBeOnTheScreen();
  });

  test('after a soft no, it still offers the button', async () => {
    const r = await wrap(<LocationPrimer status={STATUS.refused} onEnable={() => {}} />);
    r.getByRole('button', { name: 'Use my location' });
  });

  test('after a final no, it stops offering a button that cannot work', async () => {
    const r = await wrap(<LocationPrimer status={STATUS.blocked} onEnable={() => {}} />);
    expect(r.queryByRole('button', { name: 'Use my location' })).toBeNull();
    // and says where to go instead
    expect(r.getByText(/open Settings on your phone/)).toBeOnTheScreen();
  });

  test('when the phone has location switched off, it says so plainly', async () => {
    const r = await wrap(<LocationPrimer status={STATUS.off} onEnable={() => {}} />);
    expect(r.queryByRole('button', { name: 'Use my location' })).toBeNull();
    expect(r.getByText(/turned off on this phone/)).toBeOnTheScreen();
  });

  test('every refusal state promises the list still works', async () => {
    for (const status of [STATUS.refused, STATUS.blocked, STATUS.off]) {
      const r = await wrap(<LocationPrimer status={status} onEnable={() => {}} />);
      expect(r.getByText(/still/)).toBeOnTheScreen();
    }
  });

  test('nothing is shown once location is working, or where it cannot exist', async () => {
    for (const status of [STATUS.allowed, STATUS.unsupported]) {
      const r = await wrap(<LocationPrimer status={status} onEnable={() => {}} />);
      expect(r.toJSON()).toBeNull();
    }
  });

  test('the busy state says something is happening and cannot be tapped twice', async () => {
    const r = await wrap(<LocationPrimer status={STATUS.unknown} busy onEnable={() => {}} />);
    const btn = r.getByRole('button', { name: /Just a moment/ });
    expect(btn.props.accessibilityState.disabled).toBe(true);
  });

  test('"Not now" appears only where saying no later is still possible', async () => {
    const dismissible = await wrap(
      <LocationPrimer status={STATUS.unknown} onEnable={() => {}} onDismiss={() => {}} />
    );
    dismissible.getByRole('button', { name: 'Not now' });

    const noDismiss = await wrap(<LocationPrimer status={STATUS.unknown} onEnable={() => {}} />);
    expect(noDismiss.queryByRole('button', { name: 'Not now' })).toBeNull();
  });
});

// One card now serves four moments (LOC-201). "See who is nearby" means
// nothing to somebody who has just posted a help request, so `context` picks
// what THIS screen loses without a position. Two things must hold for all of
// them: the find wording never moves, and every context makes the same three
// promises at the moment of asking.
describe('the card in each moment', () => {
  const CONTEXTS = ['find', 'post', 'offer', 'profile'];

  test('the find wording is byte-identical to the owner-reviewed original', async () => {
    // Transcribed from src/components/needs/LocationPrimer.jsx as it stood at
    // 89b3d5e, before the card moved. If a rewrite is ever wanted, the owner
    // asks for it; a refactor does not get to drift it.
    const EXPECTED = {
      [STATUS.unknown]: [
        'See who is nearby',
        'Towinly can use your location to show how far away each person is, and to show only people within the distance you choose. We save a rounded position, about a two kilometre area, never your address. Never while the app is closed.',
      ],
      [STATUS.refused]: [
        'Distances are hidden',
        'Without your location we cannot tell you how far away anyone is. You can still see everyone below, and you can turn this on whenever you like.',
      ],
      [STATUS.blocked]: [
        'Location is turned off for Towinly',
        'To show distances again, open Settings on your phone, find Towinly, and turn Location on. Everyone below still shows without it.',
      ],
      [STATUS.off]: [
        'Location is turned off on this phone',
        'Turn Location on in your phone settings and Towinly can show how far away each person is. Everyone below still shows without it.',
      ],
    };
    for (const [status, [title, body]] of Object.entries(EXPECTED)) {
      const r = await wrap(<LocationPrimer status={status} onEnable={() => {}} />);
      expect(r.getByText(title)).toBeOnTheScreen();
      expect(r.getByText(body)).toBeOnTheScreen();
    }
  });

  test('every context makes the same three promises before anyone taps', async () => {
    for (const context of CONTEXTS) {
      const r = await wrap(
        <LocationPrimer status={STATUS.unknown} context={context} onEnable={() => {}} />
      );
      expect(r.getByText(/two kilometre area/)).toBeOnTheScreen();
      expect(r.getByText(/never your address/)).toBeOnTheScreen();
      expect(r.getByText(/Never while the app is closed/)).toBeOnTheScreen();
    }
  });

  test('every context says what still works after a no', async () => {
    for (const context of CONTEXTS) {
      for (const status of [STATUS.refused, STATUS.blocked, STATUS.off]) {
        const r = await wrap(
          <LocationPrimer status={status} context={context} onEnable={() => {}} />
        );
        expect(r.getByText(/still/)).toBeOnTheScreen();
      }
    }
  });

  test('each context asks about its own screen, not about Add Friends', async () => {
    const asked = {};
    for (const context of CONTEXTS) {
      const r = await wrap(
        <LocationPrimer status={STATUS.unknown} context={context} onEnable={() => {}} />
      );
      asked[context] = r.getByRole('header').props.children;
    }
    expect(new Set(Object.values(asked)).size).toBe(CONTEXTS.length);
    expect(asked.find).toBe('See who is nearby');
  });

  test('an unknown context falls back to the find wording rather than a blank card', async () => {
    const r = await wrap(
      <LocationPrimer status={STATUS.unknown} context="nonsense" onEnable={() => {}} />
    );
    expect(r.getByText('See who is nearby')).toBeOnTheScreen();
  });

  test('a screen that already owns a filled primary gets the quiet variant', async () => {
    // The locked rule is one filled sky-blue button per screen. Post Help and
    // Profile Edit already spend theirs, so the card must not add a second.
    const secondary = await wrap(
      <LocationPrimer
        status={STATUS.unknown}
        context="post"
        actionVariant="secondary"
        onEnable={() => {}}
      />
    );
    const quiet = secondary.getByRole('button', { name: 'Use my location' });
    const filled = (
      await wrap(<LocationPrimer status={STATUS.unknown} onEnable={() => {}} />)
    ).getByRole('button', { name: 'Use my location' });

    const bg = (node) =>
      [].concat(node.props.style ?? []).flat().find((s) => s?.backgroundColor)?.backgroundColor;
    expect(bg(quiet)).not.toBe(bg(filled));
  });
});
