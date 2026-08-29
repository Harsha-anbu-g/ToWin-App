// Expo's implicit config, written down. DEEP-24 asked for
// react-native-paper/babel here so a production web bundle would carry only the
// Paper components this app uses. It was added, measured, and removed again:
// the plugin ran (the entry hash changed and the bundle grew 54 bytes from the
// longer import paths) but dropped nothing, because app/_layout.jsx:6 imports
// MD3LightTheme and MD3DarkTheme, which the plugin's mappings.json does not
// cover. Unmapped names keep importing from react-native-paper/lib/module/index,
// the whole barrel, so every component still lands in the graph. Numbers and the
// route to a real saving are in ralph/progress.txt under US-007.
// This file therefore states today's behaviour and nothing more.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
