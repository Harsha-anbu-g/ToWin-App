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
