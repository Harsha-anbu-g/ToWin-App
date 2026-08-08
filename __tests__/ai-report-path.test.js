// Google Play's AI-Generated Content policy requires an in-app way to flag
// offensive AI output. The app's /reports endpoint needs a reportedUserId and
// there is no user behind a Groq answer, so the AI helper routes the answer into
// the feedback form instead. These tests pin both ends of that path, and the
// consent copy that promises it.
// See docs/audit/2026-08-07-presubmission-audit.md finding B5.
import fs from 'fs';
import path from 'path';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const ASSISTANT = read('src/components/AskAiAssistant.jsx');
const FEEDBACK = read('app/feedback.jsx');

describe('reporting a bad answer from the AI helper', () => {
  test('every assistant answer offers a report control', () => {
    // Assert — the visible label and the screen-reader label both exist.
    expect(ASSISTANT).toContain('Report this answer');
    expect(ASSISTANT).toContain('accessibilityLabel="Report this answer"');
  });

  test('the control carries the answer into the feedback form', () => {
    // Assert — routed, not silently dropped.
    expect(ASSISTANT).toContain("pathname: '/feedback'");
    expect(ASSISTANT).toContain('reportedAnswer: content');
  });

  test('the sheet closes before navigating, so it cannot cover the form', () => {
    const handler = ASSISTANT.slice(
      ASSISTANT.indexOf('const reportAnswer'),
      ASSISTANT.indexOf('const speak'),
    );

    // Assert — setOpen(false) must come before the push.
    expect(handler).toContain('setOpen(false)');
    expect(handler.indexOf('setOpen(false)')).toBeLessThan(handler.indexOf('router.push'));
  });

  test('the feedback form reads the parameter and quotes the answer', () => {
    // Assert
    expect(FEEDBACK).toContain('useLocalSearchParams');
    expect(FEEDBACK).toContain('reportedAnswer');
    expect(FEEDBACK).toContain('report an answer from the Towinly helper');
  });

  test('the consent gate warns answers are machine-written and names the report button', () => {
    // Assert — consent that omits the caveat is the thing Play objects to.
    expect(ASSISTANT).toContain('written by a machine');
    expect(ASSISTANT).toMatch(/Report this answer" button/);
  });
});

describe('nothing tells a reviewer the shipped app is unfinished', () => {
  // Apple guideline 2.2 keeps betas on TestFlight. See finding B2.
  const SURFACES = [
    ['app/feedback.jsx', FEEDBACK],
    ['src/data/legalContent.js', read('src/data/legalContent.js')],
  ];

  test.each(SURFACES)('%s avoids beta and prototype wording', (_name, source) => {
    // Strip comments: the explanatory notes name the banned words on purpose.
    const prose = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    // Assert
    expect(prose).not.toMatch(/prototype/i);
    expect(prose).not.toMatch(/\bbeta\b/i);
    expect(prose).not.toMatch(/work in progress/i);
  });
});
