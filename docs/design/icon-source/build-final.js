// Bakes the chosen icon (1C3: flat #067A41, white tortoise, thin 26-unit
// lines, limbs tucked with a natural small gap) into the four asset SVGs.
//   final-ios.svg      full-bleed field + mark at 0.88 (Apple masks corners)
//   final-and-bg.svg   solid field layer
//   final-and-fg.svg   mark alone at 52% for the 66% adaptive safe zone
//   final-and-mono.svg alpha-only glyph: silhouette with the lines punched out
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const { fills, strokes } = JSON.parse(fs.readFileSync(path.join(DIR, 'geometry.json'), 'utf8'));

const FLAT = '#067A41';
const LINE = 26;

const FILL_KIND = ['head', 'fl', 'fr', 'rl', 'rr'];
const TUCK = {
  head: [0, 30],
  fl: [22, 18],
  fr: [-22, 18],
  rl: [20, -18],
  rr: [-20, -18],
};
const tf = (kind) => `transform="translate(${TUCK[kind][0]} ${TUCK[kind][1]})"`;

const shellFills = fills.slice(5);
const limbFills = fills.slice(0, 5);
const paneStrokes = strokes.slice(7);

const CX = 625;
const CY = 633.3;
// mark height in path units is ~804.6; scale 0.88 ≈ 69% of the tile (iOS),
// scale 0.66 ≈ 52% (Android adaptive safe zone, same share as the last set)
const IOS_SCALE = 0.88;
const AND_SCALE = 0.66;

const markPaths = (lineColor) =>
  [
    `<g fill="#fff">${limbFills.map((d, i) => `<path d="${d}" ${tf(FILL_KIND[i])}/>`).join('')}</g>`,
    `<g fill="#fff">${shellFills.map((d) => `<path d="${d}"/>`).join('')}</g>`,
    `<g fill="none" stroke="${lineColor}" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round">${paneStrokes
      .map((d) => `<path d="${d}"/>`)
      .join('')}</g>`,
  ].join('\n');

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">\n${inner}\n</svg>`;

const placed = (scale, inner) =>
  `<g transform="translate(512 512) scale(${scale}) translate(${-CX} ${-CY})">\n${inner}\n</g>`;

// iOS: full-bleed, no alpha anywhere that matters (flattened at render time)
fs.writeFileSync(
  path.join(DIR, 'bake-ios.svg'),
  wrap(`<rect width="1024" height="1024" fill="${FLAT}"/>\n${placed(IOS_SCALE, markPaths(FLAT))}`)
);

// Android background layer: the flat field
fs.writeFileSync(
  path.join(DIR, 'bake-and-bg.svg'),
  wrap(`<rect width="1024" height="1024" fill="${FLAT}"/>`)
);

// Android foreground: mark only, transparent around it; lines baked in the
// field green so they read as cutouts on the background layer
fs.writeFileSync(path.join(DIR, 'bake-and-fg.svg'), wrap(placed(AND_SCALE, markPaths(FLAT))));

// Android monochrome: launchers tint it and only alpha counts, so the lines
// must be TRANSPARENT, not colored — punch them out with a mask
const monoMask =
  `<mask id="punch">` +
  `<g fill="#fff">${limbFills.map((d, i) => `<path d="${d}" ${tf(FILL_KIND[i])}/>`).join('')}` +
  `${shellFills.map((d) => `<path d="${d}"/>`).join('')}</g>` +
  `<g fill="none" stroke="#000" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round">${paneStrokes
    .map((d) => `<path d="${d}"/>`)
    .join('')}</g>` +
  `</mask>`;
fs.writeFileSync(
  path.join(DIR, 'bake-and-mono.svg'),
  wrap(`<defs>${monoMask}</defs>\n${placed(AND_SCALE, `<rect x="-200" y="-200" width="1700" height="1700" fill="#fff" mask="url(#punch)"/>`)}`)
);

console.log('bake-ios/and-bg/and-fg/and-mono.svg written');
