// CLAUDE.md rule 5, made machine-checkable: no em dash reaches a person's eyes.
//
// Audit finding V12. The rule was applied to one new file and not to its
// siblings, which the rule itself says counts as not doing it. A grep is the
// wrong instrument for that: it cannot tell a sentence a person reads from a
// comment a person never sees, so it either misses hits or drowns in them.
//
// This walks the syntax tree instead and looks only at what renders: string
// literals, template-literal text and JSX text. Comments never become those
// nodes, so they are excluded by construction rather than by a regex that
// pretends to know where a comment ends.
//
// There are no exceptions. A placeholder glyph and a label separator are not
// prose, but a check with no exceptions is worth more than a nuanced one, and
// the two sites that used a dash that way now use a hyphen and a comma.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOT = path.join(__dirname, '..');
const SEARCHED = ['app', 'src'];
const BANNED = { '—': 'em dash', '–': 'en dash' };

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
};

/** @returns {{file: string, line: number, character: string, text: string}[]} */
const renderedHits = () => {
  const hits = [];
  for (const file of SEARCHED.flatMap((d) => walk(path.join(ROOT, d)))) {
    const code = fs.readFileSync(file, 'utf8');
    if (!Object.keys(BANNED).some((c) => code.includes(c))) continue;
    const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
    const check = (node, value) => {
      for (const [character, name] of Object.entries(BANNED)) {
        if (value && value.includes(character)) {
          hits.push({
            file: path.relative(ROOT, file),
            line: node.loc.start.line,
            character: name,
            text: value.replace(/\s+/g, ' ').trim().slice(0, 120),
          });
        }
      }
    };
    (function visit(n) {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'StringLiteral') check(n, n.value);
      else if (n.type === 'TemplateElement') check(n, n.value.raw);
      else if (n.type === 'JSXText') check(n, n.value);
      for (const key of Object.keys(n)) {
        const v = n[key];
        if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && visit(c));
        else if (v && typeof v.type === 'string') visit(v);
      }
    })(ast.program);
  }
  return hits;
};

describe('words a stranger reads', () => {
  test('no em dash or en dash in anything the app renders', () => {
    // Arrange / Act
    const hits = renderedHits();

    // Assert - the message is the fix list, so a failure is actionable.
    expect(
      hits.map((h) => `${h.file}:${h.line} (${h.character}) ${h.text}`).join('\n')
    ).toBe('');
  });

  test('the scanner reads strings and not comments, so it can actually fail', () => {
    // Arrange - the guard above is worthless if it silently scans nothing. This
    // proves both halves against a file written for the purpose: the dash in a
    // comment is ignored, the identical dash in a rendered string is caught.
    const scratch = path.join(ROOT, 'src', '__emdash_probe__.js');
    fs.writeFileSync(
      scratch,
      "// a comment with an — em dash in it\nexport const A = 'a string with an — em dash';\n"
    );

    try {
      // Act
      const hits = renderedHits().filter((h) => h.file.includes('__emdash_probe__'));

      // Assert - exactly one hit, and it is the string, not the comment.
      expect(hits).toHaveLength(1);
      expect(hits[0].line).toBe(2);
      expect(hits[0].character).toBe('em dash');
    } finally {
      fs.unlinkSync(scratch);
    }
  });
});
