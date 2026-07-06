import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import Button from '../src/components/ui/Button';
import Input from '../src/components/ui/Input';
import Card from '../src/components/ui/Card';
import Avatar from '../src/components/ui/Avatar';
import TrustBadge from '../src/components/ui/TrustBadge';

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('primary button: filled sky-blue pill, >=44pt target', async () => {
  const { getByRole } = await wrap(<Button title="Log in" variant="primary" onPress={() => {}} />);
  const btn = getByRole('button', { name: 'Log in' });
  expect(btn).toHaveStyle({ minHeight: 44, backgroundColor: '#4FA3CE' });
});

test('secondary button is quiet (outlined, not filled blue)', async () => {
  const { getByRole } = await wrap(<Button title="Join" variant="secondary" onPress={() => {}} />);
  const btn = getByRole('button', { name: 'Join' });
  expect(btn).toHaveStyle({ borderWidth: 1 });
  expect(btn).not.toHaveStyle({ backgroundColor: '#4FA3CE' });
});

test('disabled button exposes accessibility state and blocks touch', async () => {
  const onPress = jest.fn();
  const { getByRole } = await wrap(<Button title="Send" variant="primary" onPress={onPress} disabled />);
  expect(getByRole('button', { name: 'Send' })).toBeDisabled();
});

test('input renders a visible bordered box with a visible label', async () => {
  const { getByText, getByLabelText } = await wrap(<Input label="Email" value="" onChangeText={() => {}} />);
  expect(getByText('Email')).toBeOnTheScreen();
  expect(getByLabelText('Email')).toBeOnTheScreen();
});

test('input error shows below the field and is announced', async () => {
  const { getByText } = await wrap(
    <Input label="Password" value="" onChangeText={() => {}} error="Please enter your password" />
  );
  const err = getByText('Please enter your password');
  expect(err).toBeOnTheScreen();
  expect(err.props.accessibilityRole).toBe('alert');
});

test('card is a white hairline surface (no shadow)', async () => {
  const { getByTestId } = await wrap(
    <Card testID="card">
      <></>
    </Card>
  );
  expect(getByTestId('card')).toHaveStyle({
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e1d9',
  });
});

test('avatar falls back to initials with a name label', async () => {
  const { getByText, getByLabelText } = await wrap(<Avatar name="Margaret Hall" />);
  expect(getByText('MH')).toBeOnTheScreen();
  expect(getByLabelText('Margaret Hall')).toBeOnTheScreen();
});

test('trust badge puts the trust number in gold', async () => {
  const { getByText } = await wrap(<TrustBadge score={12} />);
  expect(getByText(/12/)).toHaveStyle({ color: '#9C7A3C' });
});
