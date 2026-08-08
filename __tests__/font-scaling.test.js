// UX-701 — elder-first font scaling. Towinly's users turn their phone's text
// size UP, so nothing may ever set allowFontScaling={false}; instead every
// shared primitive caps growth with maxFontSizeMultiplier so large text wraps
// and breathes rather than exploding the layout. The policy lives in ONE
// place (theme/tokens fontScaleCaps): generous for reading text and rows,
// tighter for chrome (tab labels, badges, wordmark) whose frames cannot grow.
//
// Two layers of guard, same convention as a11y-roles-and-refresh.test.js:
// render pins on the key primitives (the VALUES cannot silently drift) and a
// source scan over the ui kit + tab shell (a NEW Text cannot ship uncapped).
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { fontScaleCaps } from '../src/theme/tokens';
import ActionChip from '../src/components/ui/ActionChip';
import Avatar from '../src/components/ui/Avatar';
import Button from '../src/components/ui/Button';
import Chip from '../src/components/ui/Chip';
import Input from '../src/components/ui/Input';
import LoadError from '../src/components/ui/LoadError';
import NavRow from '../src/components/ui/NavRow';
import Screen from '../src/components/ui/Screen';
import SegmentedControl from '../src/components/ui/SegmentedControl';
import TextLink from '../src/components/ui/TextLink';
import TrustBadge from '../src/components/ui/TrustBadge';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <PaperProvider>{ui}</PaperProvider>
    </ThemeProvider>
  );

test('policy: generous cap for reading text, tighter cap for chrome', () => {
  expect(fontScaleCaps.body).toBe(1.5);
  expect(fontScaleCaps.chrome).toBe(1.2);
  expect(fontScaleCaps.chrome).toBeLessThan(fontScaleCaps.body);
});

// ---------- source scan: nothing disables scaling, every kit Text is capped ----------

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

// Comments stripped so prose about the rule can't satisfy (or trip) the scan.
function readCode(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

// Opening tag around an attribute index — enough to see sibling props.
function elementAround(code, index) {
  const start = code.lastIndexOf('<', index);
  let depth = 0;
  for (let i = start; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return code.slice(start, i + 1);
  }
  return code.slice(start);
}

test('no file ever disables font scaling (large text is who we serve)', () => {
  const offenders = [];
  for (const dir of ['app', 'src']) {
    for (const file of walk(path.join(ROOT, dir))) {
      if (/allowFontScaling\s*[=:]\s*\{?\s*false/.test(readCode(file))) {
        offenders.push(path.relative(ROOT, file));
      }
    }
  }
  expect(offenders).toEqual([]);
});

test('every Text in the ui kit and the tab shell carries an explicit cap', () => {
  const files = [
    ...walk(path.join(ROOT, 'src', 'components', 'ui')),
    path.join(ROOT, 'app', '(tabs)', '_layout.jsx'),
  ];
  const uncapped = [];
  for (const file of files) {
    const code = readCode(file);
    const re = /<(Text|PaperInput)[\s>]/g;
    let m;
    while ((m = re.exec(code))) {
      const tag = elementAround(code, m.index);
      if (!tag.includes('maxFontSizeMultiplier')) {
        uncapped.push(`${path.relative(ROOT, file)}: ${tag.slice(0, 60).replace(/\s+/g, ' ')}`);
      }
    }
  }
  expect(uncapped).toEqual([]);
});

// ---------- render pins: the exact cap on each primitive ----------

test('reading text primitives scale generously (body cap)', async () => {
  const { getByText, getByLabelText } = await wrap(
    <>
      <Button title="Log in" variant="primary" onPress={() => {}} />
      <Chip label="Shopping" onPress={() => {}} />
      <ActionChip label="Message" onPress={() => {}} />
      <TextLink label="Create Account" onPress={() => {}} />
      <Input label="Email" value="" onChangeText={() => {}} error="Please enter your email" />
      <LoadError what="your messages" onRetry={() => {}} />
    </>
  );
  expect(getByText('Log in').props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);
  expect(getByText('Shopping').props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);
  expect(getByText('Message').props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);
  expect(getByText('Create Account').props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);
  expect(getByLabelText('Email').props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);
  expect(getByText('Please enter your email').props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);
  expect(getByText(/We couldn't load your messages/).props.maxFontSizeMultiplier).toBe(
    fontScaleCaps.body
  );
});

test('screen titles scale generously (body cap)', async () => {
  const { getByText } = await wrap(<Screen title="Settings" scroll={false} />);
  expect(getByText('Settings').props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);
});

test('chrome primitives scale tighter so their frames never break', async () => {
  const { getByText, getAllByText } = await wrap(
    <>
      <SegmentedControl
        segments={[{ key: 'open', label: 'Looking for Help', count: 2 }]}
        value="open"
        onChange={() => {}}
      />
      <TrustBadge score={12} />
      <NavRow trustScore={24} onMenu={() => {}} onAddFriends={() => {}} />
      <Avatar name="Margaret Hall" />
    </>
  );
  expect(getByText('Looking for Help').props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
  expect(getByText('2').props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
  expect(getAllByText('12')[0].props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
  expect(getByText('Towinly').props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
  expect(getByText('Menu').props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
  expect(getByText('MH', { includeHiddenElements: true }).props.maxFontSizeMultiplier).toBe(
    fontScaleCaps.chrome
  );
});
