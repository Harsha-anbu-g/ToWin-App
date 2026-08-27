// Local iOS builds run Expo's "Bundle React Native code and images" script
// phase. Its last line executes the OUTPUT of a backtick command as the
// command itself:
//
//   `"$NODE_BINARY" --print "…/scripts/react-native-xcode.sh"`
//
// The output is a path inside node_modules, and it is unquoted, so a project
// that lives under a folder with a space ("ToWin App") splits into two words
// and bash stops with "…/ToWin: is a directory". This plugin rewrites that
// line to a quoted "$( … )" so the path stays one word. EAS builds never hit
// the bug (their checkout path has no spaces) and are unaffected by the fix.
//
// Prebuild regenerates the Xcode project from Expo's template, so this has to
// be a config plugin rather than a hand edit of ios/ (which is gitignored).
const { withXcodeProject } = require('expo/config-plugins');

const PHASE_NAME = 'Bundle React Native code and images';

// The xcode library hands us the script in its pbxproj-escaped form: inner
// quotes are written as \" and the whole value is wrapped in quotes.
const BACKTICK_CALL = /`(\\"\$NODE_BINARY\\" --print [^`]*)`/;

/** Return the script with the backtick call wrapped as "$( … )". Idempotent. */
function quoteBundleScript(shellScript) {
  if (typeof shellScript !== 'string') return shellScript;
  return shellScript.replace(BACKTICK_CALL, (_match, call) => `\\"$(${call})\\"`);
}

function withSpaceSafeBundleScript(config) {
  return withXcodeProject(config, (cfg) => {
    const objects = cfg.modResults.hash.project.objects;
    const phases = objects.PBXShellScriptBuildPhase || {};
    for (const key of Object.keys(phases)) {
      const phase = phases[key];
      if (!phase || typeof phase !== 'object') continue; // "_comment" entries are strings
      const name = String(phase.name || '').replace(/"/g, '');
      if (name !== PHASE_NAME) continue;
      phase.shellScript = quoteBundleScript(phase.shellScript);
    }
    return cfg;
  });
}

module.exports = withSpaceSafeBundleScript;
module.exports.quoteBundleScript = quoteBundleScript;
module.exports.PHASE_NAME = PHASE_NAME;
