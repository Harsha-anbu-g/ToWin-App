// The WhatsApp bottom edge (owner call 2026-08-30: "the bottom bar — after
// that, it will blur — i need the same"): on the floating-bar platforms,
// every tab scene ends in a progressive blur band, so rows soften as they
// slide into the bar's band instead of running knife-sharp to the home
// indicator. The band is stacked BlurViews — each shorter layer blurs
// harder, compounding toward the screen edge — rendered under the tab bar
// so the capsule's rim and labels stay crisp.
// jest-expo runs with Platform.OS === 'ios', the seat the band is for.
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import BottomEdgeBlur from '../src/components/ui/BottomEdgeBlur';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { TAB_BAR_HEIGHT } from '../src/lib/tabBarMetrics';

const fs = require('fs');
const path = require('path');

test('the band is a progressive ramp: shorter layers blur harder, all pinned to the bottom', async () => {
  const { getByTestId, getAllByTestId } = await render(
    <ThemeProvider>
      <BottomEdgeBlur />
    </ThemeProvider>
  );

  // includeHiddenElements: the band hides itself from assistive tech on
  // purpose, and RNTL's queries skip a11y-hidden subtrees by default.
  const hidden = { includeHiddenElements: true };
  const wrapper = getByTestId('bottom-edge-blur', hidden);
  // Purely visual: taps must fall through to the rows beneath, and screen
  // readers must never land on it.
  expect(wrapper.props.pointerEvents).toBe('none');
  expect(wrapper.props.accessibilityElementsHidden).toBe(true);
  // The band covers the bar's whole vertical band (bar + its lift + fade
  // headroom), so the blur reaches from the screen edge past the capsule.
  expect(wrapper.props.style.height).toBeGreaterThan(TAB_BAR_HEIGHT);

  const layers = getAllByTestId('bottom-edge-blur-layer', hidden);
  // BlurView folds its own base style in, so read through a flatten; the
  // blur props (intensity, tint) ride on its inner native view.
  const flat = (el) => StyleSheet.flatten(el.props.style);
  const blur = (el) => el.children[0].props;
  expect(layers.length).toBeGreaterThanOrEqual(3);
  // The tallest layer spans the full band; each next one is shorter and
  // blurs harder — the compounding that fakes one gradient-masked blur.
  expect(flat(layers[0]).height).toBe(wrapper.props.style.height);
  for (let i = 1; i < layers.length; i += 1) {
    expect(flat(layers[i]).height).toBeLessThan(flat(layers[i - 1]).height);
    expect(blur(layers[i]).intensity).toBeGreaterThan(blur(layers[i - 1]).intensity);
  }
  for (const layer of layers) {
    expect(flat(layer).bottom).toBe(0);
    // Day theme wears the light material; night mode flips it (the app's
    // night mode is opt-in, never OS-driven).
    expect(blur(layer).tint).toBe('light');
  }
});

test('on a solid edge-to-edge bar (Android) the band draws nothing', () => {
  // Source pin (re-requiring the module under a mocked Platform forks React
  // in this harness): the component's first act is the isFloatingTabBar
  // gate — Android's bar is opaque, nothing scrolls behind it to soften.
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'ui', 'BottomEdgeBlur.jsx'),
    'utf8'
  );
  expect(src).toMatch(/if \(!isFloatingTabBar\) return null;/);
});

test('the tab shell wires the band into every scene via screenLayout', () => {
  // Source pin, same convention as tab-bar-capsule.test.js: the band lives in
  // the navigator's screenLayout so it renders UNDER the tab bar — a sibling
  // rendered after <Tabs> would blur the capsule itself.
  const layout = fs.readFileSync(
    path.join(__dirname, '..', 'app', '(tabs)', '_layout.jsx'),
    'utf8'
  );
  expect(layout).toMatch(/screenLayout=\{sceneWithBottomEdge\}/);
  expect(layout).toMatch(/<BottomEdgeBlur \/>/);
});
