// Towinly design tokens — 1:1 port of Towinly/frontend/src/index.css (user-approved 2026-07-05),
// updated 2026-07-11 to the Claude Design mobile redesign handoff
// (towin-app-mobile-redesign/project/design_handoff_towin_mobile/README.md), which
// supersedes website parity where they conflict: pages are WHITE (user decision),
// parchment survives only on the check-in hero card, and the SF type ramp + shape
// scale below are locked. Dark block mirrors the CSS cascade; palette otherwise
// unchanged. Last website sync: commit 494fa79 (dark --sky-bar-from added).

export const light = {
  // Brand blue — sky-blue scale
  blue: '#4FA3CE', // primary action
  blueFocus: '#0071e3',
  blueDark: '#004499',
  blueOnDark: '#4FA3CE',
  blueDeep: '#2E7DA6', // text/icons on light
  blueTeal: '#3D8AB0',
  blueMid: '#7BB8D6', // loading / disabled
  blueSoft: '#BFD9EA', // soft borders
  blueTint: '#E6F2FA', // light fills
  blueWash: '#EAF5FB', // lighter fills
  skyBarFrom: '#7FC0E0', // trust-ladder bar gradient start (user-locked)

  // Filled action controls — the fill that carries button text. The owner's
  // explicit call (2026-07-06): the sky-blue brand fill stays, white text on
  // it included, accepting the 2.8:1 ratio on these fills. Do NOT swap in a
  // darker blue "for contrast" — that was tried and rejected as off-brand.
  actionFill: '#4FA3CE', // web: var(--blue)
  actionInk: '#ffffff',
  // Action color for text sitting ON the inverted ink pill (the toast). The
  // fill waiver above covers filled buttons only — unfilled text on ink has no
  // waiver, so this is the blue that clears 4.5:1 there.
  actionOnInk: '#7ec0e4', // 8.46:1 on ink #1d1d1f
  // Informational count badges (unread inbox, tab bar). The owner's call
  // (2026-07-27): the fill waiver above is for buttons — a badge is not an
  // action, and its 11-12px numeral needs the real 4.5:1, so badges alone go
  // deeper while every button keeps the sky-blue fill untouched. Deliberately
  // NOT blueDeep: that token flips pale at night and would strand white text.
  badgeFill: '#2E7DA6', // 4.60:1 with white; ≥3:1 on every surface, both themes

  // Neutral slate — avatars & trust badge
  slateTint: '#EEF1F4',
  slateSoft: '#D7DCE2',

  // Typography colors
  ink: '#1d1d1f',
  ink2: '#333333',
  ink3: '#676767', // ≥4.5:1 on white AND the parchment surface
  ink4: '#707070', // muted text + placeholders — still ≥4.5:1 on --surface
  inkFaint: '#c8c8cd', // disabled text ONLY (contrast-exempt) — never running text
  inkFaint2: '#646b76', // faint meta text — ≥4.5:1 on white, parchment, and tracks (handoff's #8a919c failed AA)
  inkDeep: '#2d3748', // heavy slate headings
  inkSlate: '#5a6470', // common secondary text
  inkSlate2: '#5a6b75',
  inkSlateDark: '#3a4450',
  slate: '#5d6b7e',
  leaf: '#3d8b5a', // success text accent
  redMild: '#cf6a66', // soft error text

  // Surfaces
  // Cards/boxes are warm parchment on the white page (user decision
  // 2026-07-12: "the colour used in daily check-in — all boxes use it").
  // Elevation stays surface contrast + hairline, never shadow.
  canvas: '#f6f4ef',
  surface: '#ffffff', // page canvas — plain white (2026-07-11 redesign, user decision)
  surfaceFill: '#f2f2f5', // segmented tracks, neutral chips, search fields
  heroParchment: '#f6f4ef', // check-in hero card — same warm family as canvas
  surface2: '#f1eee8',
  surfacePearl: '#fbfaf6',
  surfaceDark: '#272729',
  surfaceBlack: '#000000',

  // Borders — warm hairlines (ink-on-paper feel)
  border: '#e5e1d9',
  borderSoft: '#efebe3',

  // Semantic
  red: '#cc0000',
  redError: '#dc2626', // form-field errors
  redTint: '#fef2f2', // error background
  redSoft: '#fca5a5', // error border
  redDeep: '#9b3535', // destructive (end connection)
  greenDeep: '#1a5c2e', // trusted / success text
  // Success FILL is neutral, not green (user call 2026-07-26: "remove the
  // green background … remove it all over the app"). Green now lives only in
  // text and marks. Token name kept so in-flight screens don't churn — same
  // convention as trustGold below.
  greenTint: '#f1eee8', // success background — warm neutral, no hue
  // Trust accent — deep green (user call 2026-07-12: the gold family clashed
  // with the white pages). Token name kept so in-flight screens don't churn;
  // rename to trustAccent once the redesign wave settles.
  trustGold: '#1a5c2e',

  // Alias tokens — role names, not hues
  hairline: '#f0f0f0', // menu/list row separators
  hairline2: '#e0e0e0',
  skyLine: '#dcebf4', // borders on sky-tinted chips
  skyLine2: '#d8eaf4',
  skyGhost: '#f4fafd', // faintest sky fill
  greenWash: '#faf9f6', // was green; neutralised with greenTint
  greenLine: '#e5e1d9', // success border — warm hairline, no hue
  redLine: '#fecaca',
  greyFill: '#f5f5f7',
  greyFill2: '#f3f4f6',
  greyFill3: '#f0f0f3', // segmented-control track
  greyLine: '#e5e7eb',
  tortoiseBed: '#ffffff', // light circle behind the tortoise — light in BOTH themes
  logoGreen: '#025E32', // the mark's own stroke, sampled from the artwork — NOT greenDeep
  segActive: '#ffffff', // active chip on a segmented-control track
  btnDisabled: '#94a3b8',
  shadowMenu: '0 8px 24px rgba(0,0,0,0.12)', // dropdowns/drawers (web string; RN uses elevation)
  scrim: 'rgba(0,0,0,0.2)', // drawer backdrop

  // One-off role aliases
  dotIdle: '#dfe6ec',
  chipNeutral: '#f2f4f7',
  redLineSoft: '#fee2e2',
  ringIdle: '#c8ccd2',
  idleGrey: '#d0d0d5', // empty stars / idle dots
  trackEmpty: '#d8d8de', // trust-ladder empty segments
  skyLine3: '#a8d4ec',
  skyLine4: '#dbe7ef',
  skyHairline: '#e2eef5',
  greyLine2: '#d1d5db',
  greyText: '#646b76', // chip/label text — ≥4.5:1 on its grey fills
  greyText2: '#c0c0c8',
  hairline3: '#f0f0f2',
  greyFill4: '#ededf0',
  cardIdle: '#fafafa', // not-yet-earned trust cards
  inputLine: '#d8dce2',
  redWash2: '#fff5f5',
  redMid: '#cc3333',
  avatarGrey: '#e8e8ed',
  bubbleIn: '#f0f0f5', // incoming chat bubble
  greenVerified: '#1a7a3a',
  inkSoft: '#3a3a3c',
  inkMid: '#5a5a5a',
  steelText: '#666a72', // greeting subtext — ≥4.5:1
  lineIdle: '#e6e8ec',
  hoverWash: '#fafbfc',
  steel2: '#6b7280',
  steel3: '#7a8490',
  footerText: '#6c6c71', // footer links/text — ≥4.5:1
  railLine: '#ececef', // segmented-tab rail
  lineIdle2: '#d8d8d8',
  infoWash: '#f0f7ff', // linked-account panel
  infoLine: '#bfdbfe',
};

// Night mode — warm charcoal, never blue-black. Cards sit LIGHTER than the page
// (elevation grammar preserved); brand action blue unchanged; text-role hues
// lightened only as far as contrast on dark requires, same families.
export const dark = {
  ...light,

  blueFocus: '#4FA3CE',
  blueDark: '#2E7DA6',
  blueDeep: '#7ec0e4',
  blueTeal: '#6fb4d8',
  blueSoft: 'rgba(79, 163, 206, 0.42)',
  blueTint: 'rgba(79, 163, 206, 0.16)',
  blueWash: 'rgba(79, 163, 206, 0.10)',
  // Ladder waiting-half (website 494fa79): earned fill is the BRIGHT blue at night,
  // so the pending half dims instead of lightens (light value collides with #7ec0e4).
  skyBarFrom: 'rgba(126, 192, 228, 0.55)',
  // Ink flips light at night, so the pill's action text has to flip dark with it.
  actionOnInk: '#1F5E80', // 6.21:1 on ink #f2f0ec

  slateTint: '#33363b',
  slateSoft: '#4a4e55',

  ink: '#f2f0ec',
  ink2: '#ddd9d2',
  ink3: '#a8a49c',
  ink4: '#949089',
  inkFaint: '#6f6c66',
  // 4.94:1 on the card canvas — #8f8b84 measured 4.29 there and failed AA,
  // the night twin of the light palette's same fix.
  inkFaint2: '#9a968f',
  inkDeep: '#ccd3da',
  inkSlate: '#aeb6bf',
  inkSlate2: '#a7b1b9',
  inkSlateDark: '#c6ccd4',
  slate: '#98a4b2',
  leaf: '#7cc28f',
  redMild: '#e89490',

  canvas: '#2a2927', // cards — lighter than the page (elevation)
  surface: '#201f1d', // page canvas — warm charcoal
  surfaceFill: '#2e2d2b', // tracks/chips — lighter than the page (elevation grammar)
  heroParchment: '#2a2927', // hero card sits lighter than the page, like every card
  surface2: '#262523',
  surfacePearl: '#232220',

  border: '#3a3833',
  borderSoft: '#33312d',

  red: '#ff6b5e',
  redError: '#f87171',
  redTint: 'rgba(220, 38, 38, 0.16)',
  redSoft: 'rgba(248, 113, 113, 0.45)',
  redDeep: '#b45050',
  greenDeep: '#7cc28f',
  greenTint: 'rgba(255, 255, 255, 0.07)', // neutral fill at night (see light theme note)
  trustGold: '#7cc28f', // trust accent at night — same green family as greenDeep

  hairline: '#33312d',
  hairline2: '#3a3833',
  skyLine: 'rgba(79, 163, 206, 0.30)',
  skyLine2: 'rgba(79, 163, 206, 0.26)',
  skyGhost: 'rgba(79, 163, 206, 0.07)',
  greenWash: 'rgba(255, 255, 255, 0.05)',
  greenLine: '#3a3833',
  redLine: 'rgba(248, 113, 113, 0.35)',
  greyFill: '#2e2d2b',
  greyFill2: '#2e2d2b',
  greyFill3: '#2e2d2b',
  greyLine: '#3a3833',
  tortoiseBed: '#f2efe9', // warm pearl — the mascot keeps a lit face at night
  segActive: '#403e3a', // lighter than the track — same elevation grammar
  btnDisabled: '#55534f',
  shadowMenu: '0 8px 24px rgba(0, 0, 0, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.45)',

  dotIdle: '#4a4e55',
  chipNeutral: '#33363b',
  redLineSoft: 'rgba(248, 113, 113, 0.25)',
  ringIdle: '#5a5751',
  idleGrey: '#55534f',
  trackEmpty: '#3a3833',
  skyLine3: 'rgba(79, 163, 206, 0.45)',
  skyLine4: 'rgba(79, 163, 206, 0.30)',
  skyHairline: 'rgba(79, 163, 206, 0.22)',
  greyLine2: '#3f3d38',
  greyText: '#949089',
  greyText2: '#6f6c66',
  hairline3: '#33312d',
  greyFill4: '#33322f',
  cardIdle: '#252422',
  inputLine: '#4a4e55',
  redWash2: 'rgba(220, 38, 38, 0.10)',
  redMid: '#ef8080',
  avatarGrey: '#33322f',
  bubbleIn: '#333230',
  greenVerified: '#7cc28f',
  inkSoft: '#ddd9d2',
  inkMid: '#b5b1a9',
  steelText: '#a8a49c',
  lineIdle: '#3a3833',
  hoverWash: '#2e2d2b',
  steel2: '#a4adb8',
  steel3: '#8b8781',
  footerText: '#949089',
  railLine: '#33312d',
  lineIdle2: '#3f3d38',
  infoWash: 'rgba(79, 163, 206, 0.10)',
  infoLine: 'rgba(79, 163, 206, 0.35)',
};

// 8px spacing scale — adopt instead of raw px
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48, 16: 64 };

// Shape scale — redesign handoff adds role-named radii (12 inputs · 16 cards ·
// 18 hero cards · 999 pills); legacy size keys stay until every screen is re-skinned.
export const radius = {
  sm: 8, md: 11, lg: 14, xl: 18, '2xl': 20, pill: 9999,
  input: 12, card: 16, hero: 18,
};

// Legacy web-parity scale — superseded per-screen by `type` as the redesign lands.
// sm raised 15 → 16 (rulebook pass 2026-07-27): it carries Input errors/helpers,
// secondary Button labels, toast messages, and the legal body — all reading text,
// all under the elder floor at 15.
export const text = { xs: 13, sm: 16, base: 18, lg: 22, xl: 28, '2xl': 34, '3xl': 40 };

// Redesign SF type ramp (handoff, locked): body/UI on the system stack; scores,
// streaks, and times ALWAYS render with tabular numerals (fontVariant:
// ['tabular-nums']). Display sizes stay Newsreader 400 via fontFamily.display —
// titles 27–30, card titles 17–21, big numbers 42–56; these are the midpoints.
export const type = {
  title: 28, // screen titles (Newsreader)
  cardTitle: 19, // card titles (Newsreader)
  bigNumber: 48, // serif streaks/scores
  body: 16, // elder rule: running text never below 16 (handoff's 15 was under the floor)
  // Floors raised (rulebook pass 2026-07-27): meta carries actionable/meaningful
  // secondary text (chip labels, status lines, ladder legends) — 13 was under the
  // important-secondary floor; tabLabel sat below the hard 11pt platform minimum.
  meta: 14,
  caption: 12,
  segCount: 12, // segmented-control counts
  tabLabel: 11, // tab bar labels — the absolute HIG floor, never lower
  wordmark: 19, // 'Towinly' SF 600, color blueTeal
};

export const fontFamily = {
  display: 'Newsreader_400Regular', // headings + tagline — weight 400 ONLY
  displayItalic: 'Newsreader_400Regular_Italic', // the italic "two" in the tagline
  body: undefined, // system font: SF Pro on iOS, Roboto on Android
  sans: undefined, // system UI sans — wordmark, chips, tabular numerals
};
