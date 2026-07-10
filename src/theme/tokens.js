// ToWin Mobile theme — CLAUDE DESIGN (owner's pivot, 2026-07-10): Anthropic's
// official brand palette replaces the website's parchment/sky-blue system.
// Ivory #faf9f5 canvas, dark #141413 ink, orange #d97757 as THE action color,
// blue #6a9bcc / green #788c5d as secondary accents. Trust stays gold (product
// semantics), reds stay semantic. Token KEYS are unchanged so every screen
// reskins from this one file. ("blue*" keys now carry the ACTION hue = orange;
// "sky*" keys carry the secondary blue accent.)

export const light = {
  // ACTION hue (Claude orange) — key names kept for compatibility
  blue: '#d97757', // primary action
  blueFocus: '#d97757',
  blueDark: '#8f4a2e',
  blueOnDark: '#d97757',
  blueDeep: '#a04f2d', // action text/icons on light (readable orange)
  blueTeal: '#b05e3a', // wordmark
  blueMid: '#e6ab93', // loading / disabled
  blueSoft: '#eccab7', // soft borders on tinted surfaces
  blueTint: '#f7e7de', // light fills
  blueWash: '#faf0e9', // lighter fills
  skyBarFrom: '#e0997c', // trust-ladder bar gradient start (action family)

  // Filled action controls — Claude orange with white ink
  actionFill: '#d97757',
  actionInk: '#ffffff',

  // Neutral — warm Anthropic grays
  slateTint: '#f0eee6',
  slateSoft: '#d9d7cc',

  // Typography colors — warm dark ramp
  ink: '#141413',
  ink2: '#3d3d3a',
  ink3: '#6e6d66',
  ink4: '#91908a',
  inkFaint: '#b0aea5', // mid gray — faint hints / disabled text
  inkDeep: '#33322e',
  inkSlate: '#5f5e58', // common secondary text
  inkSlate2: '#6a6963',
  inkSlateDark: '#454440',
  slate: '#7c7b74',
  leaf: '#788c5d', // success accent (Anthropic green)
  redMild: '#cf6a66',

  // Surfaces — ivory world
  canvas: '#ffffff', // cards
  surface: '#faf9f5', // page background (Anthropic Light)
  surface2: '#f0eee6',
  surfacePearl: '#fcfbf8',
  surfaceDark: '#262624',
  surfaceBlack: '#141413',

  // Borders — the Anthropic light gray as hairlines
  border: '#e8e6dc',
  borderSoft: '#f0eee6',

  // Semantic
  red: '#cc0000',
  redError: '#dc2626',
  redTint: '#fef2f2',
  redSoft: '#fca5a5',
  redDeep: '#9b3535',
  amber: '#b05000',
  greenDeep: '#4f6338', // achieved / success text (Anthropic green, darkened)
  greenTint: '#eef0e7', // success background
  trustGold: '#9C7A3C', // trust stays gold — product semantics

  // Alias tokens — role names, not hues
  hairline: '#f0efe9',
  hairline2: '#e3e1d7',
  skyLine: '#d6e2ee', // secondary-blue chip borders (Anthropic blue family)
  skyLine2: '#cfdeec',
  skyGhost: '#f4f8fb',
  greenWash: '#f2f4ec',
  greenLine: '#c9d3b6',
  redLine: '#fecaca',
  goldWash: '#f7efdd',
  goldLine: '#e7d3a5',
  goldDeep: '#7a5b1e',
  greyFill: '#f0eee6',
  greyFill2: '#eeece3',
  greyFill3: '#eae8de', // segmented-control track
  greyLine: '#e0ded3',
  starGold: '#f5b400', // rating stars — stays lit in both themes
  tortoiseBed: '#ffffff',
  logoGreen: '#025E32', // the tortoise mark keeps its own stroke
  segActive: '#ffffff',
  btnDisabled: '#b0aea5',
  shadowMenu: '0 8px 24px rgba(20,20,19,0.12)',
  scrim: 'rgba(20,20,19,0.3)',

  // One-off role aliases
  dotIdle: '#dfddd2',
  chipNeutral: '#efede4',
  redLineSoft: '#fee2e2',
  ringIdle: '#c8c6bb',
  idleGrey: '#d3d1c6',
  trackEmpty: '#dcdacf',
  goldWash2: '#f9f2e0',
  skyLine3: '#a9c4de', // Anthropic blue mid
  skyLine4: '#dbe5ee',
  skyHairline: '#e4ecf3',
  greyLine2: '#d4d2c7',
  greyText: '#98978f',
  greyText2: '#c0beb4',
  hairline3: '#efede7',
  greyFill4: '#e9e7dd',
  cardIdle: '#fbfaf7',
  inputLine: '#d8d6cb',
  redWash2: '#fff5f5',
  redMid: '#cc3333',
  avatarGrey: '#e8e6dc',
  bubbleIn: '#f0eee6', // incoming chat bubble
  amberWash: '#fef3c7',
  amberDeep: '#92400e',
  greenVerified: '#5a7040',
  inkSoft: '#3a3a37',
  inkMid: '#5a5a55',
  steelText: '#8a897f',
  lineIdle: '#e6e4d9',
  hoverWash: '#f6f5f0',
  steel2: '#6b6a63',
  steel3: '#7a7970',
  footerText: '#8e8d85',
  railLine: '#eceade',
  lineIdle2: '#d8d6cb',
  infoWash: '#eff5fa', // secondary-blue info fills
  infoLine: '#b9d0e4',
};

// Night mode — Claude dark: near-black warm charcoal, cards sit LIGHTER than
// the page (elevation grammar kept); orange stays the action; text-role hues
// lighten only as far as contrast requires.
export const dark = {
  ...light,

  blueFocus: '#d97757',
  blueDark: '#b05e3a',
  blueDeep: '#e69673', // action text on dark
  blueTeal: '#e08b66',
  blueSoft: 'rgba(217, 119, 87, 0.42)',
  blueTint: 'rgba(217, 119, 87, 0.16)',
  blueWash: 'rgba(217, 119, 87, 0.10)',
  skyBarFrom: '#c97b58',

  slateTint: '#34332f',
  slateSoft: '#4b4a45',

  ink: '#faf9f5',
  ink2: '#e3e1da',
  ink3: '#aeada4',
  ink4: '#94938b',
  inkFaint: '#6f6e67',
  inkDeep: '#d2d0c8',
  inkSlate: '#b3b2a9',
  inkSlate2: '#a9a8a0',
  inkSlateDark: '#c9c8c0',
  slate: '#9c9b93',
  leaf: '#9db27f',
  redMild: '#e89490',

  canvas: '#262624', // cards — lighter than the page
  surface: '#1b1a19', // page — Claude dark
  surface2: '#232220',
  surfacePearl: '#21201e',

  border: '#3a3934',
  borderSoft: '#33322d',

  red: '#ff6b5e',
  redError: '#f87171',
  redTint: 'rgba(220, 38, 38, 0.16)',
  redSoft: 'rgba(248, 113, 113, 0.45)',
  redDeep: '#c26a5a',
  amber: '#e0954e',
  greenDeep: '#a3b884',
  greenTint: 'rgba(120, 140, 93, 0.18)',
  trustGold: '#c9a468',

  hairline: '#33322d',
  hairline2: '#3a3934',
  skyLine: 'rgba(106, 155, 204, 0.30)',
  skyLine2: 'rgba(106, 155, 204, 0.26)',
  skyGhost: 'rgba(106, 155, 204, 0.07)',
  greenWash: 'rgba(120, 140, 93, 0.12)',
  greenLine: 'rgba(157, 178, 127, 0.38)',
  redLine: 'rgba(248, 113, 113, 0.35)',
  goldWash: 'rgba(201, 164, 104, 0.14)',
  goldLine: 'rgba(201, 164, 104, 0.40)',
  goldDeep: '#d4b478',
  greyFill: '#2e2d2a',
  greyFill2: '#2e2d2a',
  greyFill3: '#2e2d2a',
  greyLine: '#3a3934',
  tortoiseBed: '#f0eee6',
  segActive: '#403f3a',
  btnDisabled: '#55544f',
  shadowMenu: '0 8px 24px rgba(0, 0, 0, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.45)',

  dotIdle: '#4b4a45',
  chipNeutral: '#34332f',
  redLineSoft: 'rgba(248, 113, 113, 0.25)',
  ringIdle: '#5a5951',
  idleGrey: '#55544f',
  trackEmpty: '#3a3934',
  goldWash2: 'rgba(201, 164, 104, 0.16)',
  skyLine3: 'rgba(106, 155, 204, 0.45)',
  skyLine4: 'rgba(106, 155, 204, 0.30)',
  skyHairline: 'rgba(106, 155, 204, 0.22)',
  greyLine2: '#3f3e38',
  greyText: '#94938b',
  greyText2: '#6f6e67',
  hairline3: '#33322d',
  greyFill4: '#33322f',
  cardIdle: '#252421',
  inputLine: '#4b4a45',
  redWash2: 'rgba(220, 38, 38, 0.10)',
  redMid: '#ef8080',
  avatarGrey: '#33322f',
  bubbleIn: '#333230',
  amberWash: 'rgba(224, 149, 78, 0.15)',
  amberDeep: '#e5b083',
  greenVerified: '#9db27f',
  inkSoft: '#e3e1da',
  inkMid: '#b5b4ab',
  steelText: '#aeada4',
  lineIdle: '#3a3934',
  hoverWash: '#2e2d2a',
  steel2: '#a4a39a',
  steel3: '#8b8a81',
  footerText: '#94938b',
  railLine: '#33322d',
  lineIdle2: '#3f3e38',
  infoWash: 'rgba(106, 155, 204, 0.10)',
  infoLine: 'rgba(106, 155, 204, 0.35)',
};

// 8px spacing scale — adopt instead of raw px
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48, 16: 64 };

export const radius = { sm: 8, md: 11, lg: 14, xl: 18, '2xl': 20, pill: 9999 };

// Base body is 18 for elderly readability; never below 16 for content
export const text = { xs: 13, sm: 15, base: 18, lg: 22, xl: 28, '2xl': 34, '3xl': 40 };

export const fontFamily = {
  display: 'Poppins_500Medium', // headings — Anthropic brand (Poppins)
  displayItalic: 'Poppins_500Medium_Italic',
  body: undefined, // system font: SF Pro on iOS, Roboto on Android
  sans: undefined,
};
