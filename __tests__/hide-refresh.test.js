/**
 * @jest-environment jsdom
 */
/**
 * Guards the one rule that decides what a store screenshot has at the top of
 * it: how the web-only Refresh control is taken off the page before the shot.
 *
 * The rule exists because of a real failure. On 2026-08-29 the control was
 * hidden with `visibility: hidden`, which takes it out of sight and leaves its
 * box in the layout. Every check of that capture passed: 1320 x 2868, no
 * alpha, 157,799 bytes, and the frame carried 44 CSS px of empty white at the
 * top that the shipped iOS app never draws, because RefreshControl.jsx renders
 * that button on `Platform.OS === 'web'` only and native gets the pull gesture,
 * which occupies nothing. A screenshot that does not match the app is the
 * Guideline 2.3.3 problem this whole run exists to close.
 *
 * Measured on the live page, elder seat, 440 x 956 CSS:
 *   /checkin  first ink at 72 CSS px hidden, 28 with the box gone
 *   /messages first ink at 56 CSS px hidden, 12 with the box gone
 *   /profile  first ink at 64 CSS px hidden, 20 with the box gone
 * So the rule is: out of layout, not out of sight.
 */
const hideRefresh = require('../scripts/lib/hide-refresh');

/** Builds the shape react-native-web renders: a button wrapping a label. */
function refreshButton(label = 'Refresh') {
  const button = document.createElement('div');
  const text = document.createElement('div');
  text.textContent = label;
  button.appendChild(text);
  return button;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('hideRefresh', () => {
  test('takes the control out of layout, not merely out of sight', () => {
    const button = refreshButton();
    document.body.appendChild(button);

    hideRefresh(document);

    // display:none collapses the box. visibility:hidden would leave 44 CSS px
    // of white at the top of the frame, which is the bug this pins.
    expect(button.style.display).toBe('none');
    expect(button.style.visibility).not.toBe('hidden');
  });

  test('climbs to the outermost node whose whole text is Refresh', () => {
    const outer = document.createElement('div');
    const inner = refreshButton();
    outer.appendChild(inner);
    document.body.appendChild(outer);

    hideRefresh(document);

    // The box that holds the space is the outer one, so that is the box that
    // has to go. Hiding only the label leaves the padding behind.
    expect(outer.style.display).toBe('none');
  });

  test('leaves a screen that has no Refresh control untouched', () => {
    const heading = document.createElement('h1');
    heading.textContent = 'Posted Help';
    document.body.appendChild(heading);

    hideRefresh(document);

    expect(heading.style.display).toBe('');
  });

  test('does not touch a word that merely contains Refresh', () => {
    const row = document.createElement('div');
    row.textContent = 'Refreshing…';
    document.body.appendChild(row);

    hideRefresh(document);

    expect(row.style.display).toBe('');
  });

  test('hides every Refresh control on the page, not just the first', () => {
    const first = refreshButton();
    const second = refreshButton();
    document.body.append(first, second);

    hideRefresh(document);

    expect(first.style.display).toBe('none');
    expect(second.style.display).toBe('none');
  });
});

describe('hideRefresh, the body guard', () => {
  test('never hides the page itself when Refresh is the only text on it', () => {
    // A screen still loading can have nothing else drawn yet. Without this
    // guard the climb walks to <body>, the whole capture comes back blank,
    // and every mechanical check still passes.
    document.body.appendChild(refreshButton());

    hideRefresh(document);

    expect(document.body.style.display).toBe('');
    expect(document.documentElement.style.display).toBe('');
    expect(document.body.firstElementChild.style.display).toBe('none');
  });
});
