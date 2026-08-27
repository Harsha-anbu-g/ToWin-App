// The project lives under "ToWin App", a path with a space. Expo's template
// for the "Bundle React Native code and images" phase runs an unquoted
// backtick command, so local Xcode builds died with "…/ToWin: is a
// directory". plugins/withSpaceSafeBundleScript.js quotes that line; these
// tests pin the transformation and the plugin's registration.
const {
  quoteBundleScript,
  PHASE_NAME,
} = require('../plugins/withSpaceSafeBundleScript');

// Exactly what the xcode library stores for the template's last line
// (pbxproj-escaped: inner quotes as \", wrapped in backticks).
const TEMPLATE_CALL =
  '\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\"';
const TEMPLATE_LINE = '`' + TEMPLATE_CALL + '`';
const SCRIPT = '"export PROJECT_ROOT=\\"$PROJECT_DIR\\"/..\\n\\n' + TEMPLATE_LINE + '\\n"';

describe('withSpaceSafeBundleScript', () => {
  test('wraps the backtick call in a quoted $( ) so a spaced path stays one word', () => {
    const out = quoteBundleScript(SCRIPT);
    expect(out).toContain('\\"$(' + TEMPLATE_CALL + ')\\"');
    expect(out).not.toContain('`');
    // Everything before the call is untouched.
    expect(out.startsWith('"export PROJECT_ROOT=\\"$PROJECT_DIR\\"/..\\n\\n')).toBe(true);
  });

  test('is idempotent: running it twice changes nothing more', () => {
    const once = quoteBundleScript(SCRIPT);
    expect(quoteBundleScript(once)).toBe(once);
  });

  test('leaves a script without the backtick call untouched', () => {
    const other = '"echo hello\\n"';
    expect(quoteBundleScript(other)).toBe(other);
    expect(quoteBundleScript(undefined)).toBeUndefined();
  });

  test('the unescaped result is a single shell word even with a space in the path', () => {
    // Un-escape the pbxproj form the way Xcode does, then let bash count words
    // with a fake NODE_BINARY that prints a spaced path.
    const { execFileSync } = require('child_process');
    const line = quoteBundleScript(TEMPLATE_LINE).replace(/\\"/g, '"');
    const probe = `
      NODE_BINARY=printf_path
      printf_path() { printf '%s\\n' "/Users/x/My Project/node_modules/react-native/scripts/react-native-xcode.sh"; }
      set -- ${line.replace(/^"\$\((.*)\)"$/, '"$($1)"')}
      echo "$#"
    `;
    // The template line starts with the node call; substitute our shell function.
    const out = execFileSync('bash', ['-c', probe.replace('"$NODE_BINARY" --print', 'printf_path --print')], {
      encoding: 'utf8',
    }).trim();
    expect(out).toBe('1');
  });

  test('is registered in app.json so prebuild applies it', () => {
    const app = require('../app.json');
    expect(app.expo.plugins).toContain('./plugins/withSpaceSafeBundleScript');
  });

  test('names the phase Expo generates', () => {
    expect(PHASE_NAME).toBe('Bundle React Native code and images');
  });
});
