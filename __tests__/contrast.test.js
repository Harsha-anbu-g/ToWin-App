// Contrast floors, machine-checked (rulebook §7: 4.5:1 body text, 3:1 large
// text and non-text UI). The toast is the reason this file exists: its pill
// inverts with the theme, so a token that reads fine on white can land at
// 1.75:1 on the pill — a review by eye will not catch that, and did not.
import { light, dark } from '../src/theme/tokens';

const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

// Night tints are alpha washes (rgba), so they have no luminance of their own:
// composite them over the page before measuring anything on top of them.
const tintOver = (tint, base) => {
  if (typeof tint !== 'string' || !tint.startsWith('rgba')) return tint;
  const [r, g, b, a] = tint.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number);
  const h = base.replace('#', '');
  const [br, bg, bb] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (fg, back) => Math.round(fg * a + back * (1 - a));
  return `#${[mix(r, br), mix(g, bg), mix(b, bb)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

// Sanity-check the math itself before trusting its verdicts on the palette.
test('the ratio helper matches the two WCAG reference extremes', () => {
  expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 1);
  expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
});

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme — the toast pill', (name, t) => {
  // The pill paints t.ink and inverts per theme: a dark pill by day, a light
  // one at night. Both directions have to clear the floor.
  test('message text is readable on the pill', () => {
    expect(contrast(t.surface, t.ink)).toBeGreaterThanOrEqual(4.5);
  });

  test('the action label ("Undo") is readable on the pill', () => {
    // Regression guard: this shipped as blueDeep, which measures 3.69:1 by day
    // and 1.75:1 at night — the whole reason actionOnInk exists.
    expect(contrast(t.actionOnInk, t.ink)).toBeGreaterThanOrEqual(4.5);
  });

  test('the action label is not the plain link blue, which fails on ink', () => {
    expect(contrast(t.blueDeep, t.ink)).toBeLessThan(4.5);
    expect(t.actionOnInk).not.toBe(t.blueDeep);
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme — the unread count badge', (name, t) => {
  // The owner's fill waiver covers buttons; badges carry an 11-12px numeral and
  // were moved to their own deeper fill (2026-07-27) to earn the real floor.
  test('the numeral clears 4.5:1 on the badge fill', () => {
    expect(contrast(t.actionInk, t.badgeFill)).toBeGreaterThanOrEqual(4.5);
  });

  test('the badge itself stays visible against the page and the cards', () => {
    expect(contrast(t.badgeFill, t.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.badgeFill, t.canvas)).toBeGreaterThanOrEqual(3);
  });

  test('the badge fill does not invert between themes', () => {
    // blueDeep flips pale at night, which would strand the white numeral at
    // ~2:1 — the reason badges do not simply reuse it.
    expect(t.badgeFill).toBe(light.badgeFill);
  });

  // The red "new activity" badges (web b37420d) put a canvas-colored numeral
  // on the semantic red — the same 11px numeral, the same real floor.
  test('the new-activity numeral clears 4.5:1 on the red fill', () => {
    expect(contrast(t.canvas, t.red)).toBeGreaterThanOrEqual(4.5);
  });

  test('the red fill stays visible against the tab bar canvas', () => {
    expect(contrast(t.red, t.canvas)).toBeGreaterThanOrEqual(3);
  });

  test('the buttons keep the exact sky-blue fill the owner locked', () => {
    expect(t.actionFill).toBe('#4FA3CE');
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme — field boundaries (fieldLine)', (name, t) => {
  // Live-mobile bug 2026-08-02: every auth box (inputs, role cards, Google
  // pill) drew its edge with the decorative hairline, which measures ~1.3:1
  // on the white page — invisible on a real phone. Interactive boundaries
  // get their own token held to the 3:1 non-text floor (rulebook §7).
  test('fieldLine clears 3:1 on the page and on the parchment fill', () => {
    expect(contrast(t.fieldLine, t.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(t.fieldLine, t.canvas)).toBeGreaterThanOrEqual(3);
  });

  test('fieldLine is not the decorative hairline', () => {
    expect(t.fieldLine).toBeDefined();
    expect(t.fieldLine).not.toBe(t.border);
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme — body text on the app surfaces', (name, t) => {
  test.each(['ink', 'ink2', 'ink3', 'inkSlate', 'inkFaint2'])(
    '%s clears 4.5:1 on both the canvas and the parchment surface',
    (token) => {
      expect(contrast(t[token], t.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t[token], t.canvas)).toBeGreaterThanOrEqual(4.5);
    }
  );
});

// ---------------------------------------------------------------------------
// HARD-108. Three colours that carry the words a person most needs to read, and
// all three were under AA on at least one of the beds they are painted on.
// Every number below was computed with the formula at the top of this file, not
// eyeballed, and the replacements were chosen by search rather than by taste.
// ---------------------------------------------------------------------------

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme — the destructive label (redDeep)', (name, t) => {
  // Button.jsx renders the destructive variant at 14px, so the 3:1 large-text
  // allowance does not apply: this is 4.5 text. It carries "Log out" and
  // "Delete my account". At night it measured 2.91 on canvas, 2.75 on
  // surfaceFill and 3.30 on surface before this story.
  test.each(['canvas', 'surface', 'surfaceFill'])('clears 4.5:1 on %s', (bed) => {
    expect(contrast(t.redDeep, t[bed])).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme — the form error (redError)', (name, t) => {
  // redTint is the bed this colour is always painted on: FormError.jsx draws
  // the pair, and login.jsx, register.jsx, finish-setup.jsx and
  // emergency-contacts.jsx hand-roll the same pair. One assertion covers all
  // five call sites, because they all read these two tokens. By day it
  // measured 4.41 before this story.
  test('clears 4.5:1 on its own tint', () => {
    expect(contrast(t.redError, tintOver(t.redTint, t.surface))).toBeGreaterThanOrEqual(4.5);
  });

  test('clears 4.5:1 on the plain page too', () => {
    expect(contrast(t.redError, t.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme — the placeholder ink (ink4)', (name, t) => {
  // AskAiAssistant.jsx passes ink4 as placeholderTextColor over surfaceFill,
  // which is also every segmented track, neutral chip and search field. A
  // placeholder is reading text and gets the full 4.5, never the muted-gray
  // default. It measured 4.43 by day and 4.33 at night before this story.
  test('clears 4.5:1 on surfaceFill', () => {
    expect(contrast(t.ink4, t.surfaceFill)).toBeGreaterThanOrEqual(4.5);
  });
});
