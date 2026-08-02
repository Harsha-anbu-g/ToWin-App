// Regression for the collapsed first ladder node on the phone web build
// (2026-08-02): `flex: 0` on node 0's wrapper becomes flex-basis: 0% under
// react-native-web, the wrapper collapses, and the whole ladder piles onto
// the first circle. The wrapper must carry NO flex property at all; only the
// connector-bearing nodes (1..6) stretch.
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import TrustLadder from '../src/components/trust/TrustLadder';

const flatten = (style) =>
  (Array.isArray(style) ? style : [style]).filter(Boolean).reduce((acc, s) => ({ ...acc, ...s }), {});

test('node 0 has no flex; nodes 1..6 stretch to share the connectors', async () => {
  const { root } = await render(
    <ThemeProvider>
      <TrustLadder stageIndex={5} />
    </ThemeProvider>
  );

  const nodes = root.children;
  expect(nodes).toHaveLength(7);

  expect(flatten(nodes[0].props.style).flex).toBeUndefined();
  for (let i = 1; i < 7; i += 1) {
    expect(flatten(nodes[i].props.style).flex).toBe(1);
  }
});

test('five climbed steps show five checks at stage index 5', async () => {
  const { getByLabelText } = await render(
    <ThemeProvider>
      <TrustLadder stageIndex={5} />
    </ThemeProvider>
  );
  getByLabelText('Trust ladder: Stage 6 of 7');
});
