// Web-parity one-offs — colors the WEBSITE hardcodes outside its token system
// (Register.jsx strength meter + match text). Kept identical here, in one
// documented place, so the hex-literal scan stays clean elsewhere.
export const STRENGTH_WEAK = '#ff3b30'; // web Register.jsx strength bar step 1
export const STRENGTH_FAIR = '#ff9500'; // web Register.jsx strength bar step 2
export const MATCH_GREEN = '#5FA670'; // web "Passwords match" text
// Shell-cell line tone sampled from the website's tortoise artwork
// (tortoise-logo-alpha.png) — the cells sit lighter than the outline, so the
// shell doesn't read darker than the web mark (user feedback 2026-07-10).
export const TORTOISE_CELL_GREEN = '#306F50';

// Peekaboo board artwork (redesign canvas 3j) — the game tortoise is an
// illustration, not themed UI: its colors stay literal in night mode too,
// exactly like the brand mark. Values are verbatim from the canvas SVG.
export const PEEKABOO_BODY = '#1a5c2e'; // body + hidden cells
export const PEEKABOO_SHELL = '#3D8B5A'; // shell + cell strokes
export const PEEKABOO_CELL_FLIPPED = '#ebf6ee'; // flipped cell fill + eye whites
export const PEEKABOO_EYE = '#1d1d1f'; // pupils
export const PEEKABOO_MATCHED = '#4FA3CE'; // matched cells (brand blue)
export const PEEKABOO_WHITE = '#ffffff'; // matched check + shell sheen

// Google's four-color "G" (login button, web build) — a third-party brand
// mark, never themed: these are Google's own colors, identical on the website.
export const GOOGLE_G_YELLOW = '#FFC107';
export const GOOGLE_G_RED = '#FF3D00';
export const GOOGLE_G_GREEN = '#4CAF50';
export const GOOGLE_G_BLUE = '#1976D2';
