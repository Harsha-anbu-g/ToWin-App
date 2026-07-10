import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import TortoiseMark from '../src/components/TortoiseMark';
import { CELLS, DRAW, STROKE, VIEWBOX } from '../src/components/tortoiseMarkPaths';

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

test('geometry: 7 drawn parts + 7 cells, measured lengths, artwork window', () => {
  expect(DRAW).toHaveLength(7);
  expect(CELLS).toHaveLength(7);
  expect(VIEWBOX).toBe('187 196 876 876');
  expect(STROKE).toBe(27);
  for (const [id, length] of DRAW) {
    expect(typeof id).toBe('string');
    expect(length).toBeGreaterThan(100); // real measured lengths, not fractions
  }
  // mirrored halves must measure identical (the mark is exactly symmetric)
  const len = Object.fromEntries(DRAW.map(([id, l]) => [id, l]));
  expect(len['head-l']).toBe(len['head-r']);
  expect(len['leg-tl']).toBe(len['leg-tr']);
  expect(len['leg-bl']).toBe(len['leg-br']);
});

test('static mark renders with an accessible title', async () => {
  const { getByLabelText } = await wrap(<TortoiseMark title="ToWin tortoise logo" />);
  expect(getByLabelText('ToWin tortoise logo')).toBeOnTheScreen();
});
