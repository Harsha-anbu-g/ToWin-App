// The "from Towinly" footer is drawn into the native launch screen by
// plugins/withSplashBranding at prebuild time — nothing in the running app can
// notice it going missing. So the plugin's two pure transforms are run here on
// Expo's own splash output, exactly as prebuild chains them.
const fs = require('fs');
const path = require('path');
const {
  getTemplateAsync,
} = require('@expo/prebuild-config/build/plugins/unversioned/expo-splash-screen/withIosSplashScreenStoryboard');
const {
  applySplashScreenStoryboard,
} = require('@expo/prebuild-config/build/plugins/unversioned/expo-splash-screen/withIosSplashScreenStoryboardImage');
const {
  toString: storyboardToString,
} = require('@expo/prebuild-config/build/plugins/unversioned/expo-splash-screen/InterfaceBuilder');
const { applyBrandingToStoryboard, addBrandingToStyles, ids } = require('../plugins/withSplashBranding');

const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));
const pluginProps = (name) =>
  appJson.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === name)[1];
const splashProps = pluginProps('expo-splash-screen');
const brandingProps = pluginProps('./plugins/withSplashBranding');

// What Expo hands the next mod: its template with the tortoise applied.
const expoStoryboard = async () => applySplashScreenStoryboard(await getTemplateAsync(), splashProps);
const mainViewOf = (xml) => xml.document.scenes[0].scene[0].objects[0].viewController[0].view[0];

describe('iOS storyboard', () => {
  test('adds "from" and "Towinly" as labels under the mark, pinned above the safe area', async () => {
    const view = mainViewOf(applyBrandingToStoryboard(await expoStoryboard(), brandingProps));

    const labels = view.subviews[0].label;
    expect(labels.map((label) => label.$.text)).toEqual(['from', 'Towinly']);
    const brand = labels.find((label) => label.$.id === ids.BRAND_ID);
    expect(brand.fontDescription[0].$).toMatchObject({ type: 'system', weight: 'semibold' });

    // Expo's tortoise is still there, still centred.
    expect(view.subviews[0].imageView.map((image) => image.$.id)).toEqual(['EXPO-SplashScreen']);
    const constraints = view.constraints[0].constraint.map((constraint) => constraint.$);
    expect(constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ firstItem: 'EXPO-SplashScreen', firstAttribute: 'centerY' }),
        expect.objectContaining({ firstItem: ids.BRAND_ID, firstAttribute: 'centerX', secondItem: ids.CONTAINER_ID }),
        expect.objectContaining({ firstItem: ids.FROM_ID, firstAttribute: 'centerX', secondItem: ids.CONTAINER_ID }),
        expect.objectContaining({ firstItem: ids.BRAND_ID, firstAttribute: 'top', secondItem: ids.FROM_ID }),
      ])
    );
    // The wordmark hangs off the safe-area guide, not the view edge, so it
    // clears the home indicator on every phone.
    const safeArea = view.viewLayoutGuide[0].$.id;
    const bottom = constraints.find(
      (constraint) => constraint.secondItem === ids.BRAND_ID && constraint.secondAttribute === 'bottom'
    );
    expect(bottom).toMatchObject({ firstItem: safeArea, firstAttribute: 'bottom' });
    expect(Number(bottom.constant)).toBeGreaterThan(0);
  });

  test('serialises to storyboard XML in the shape Xcode writes itself', async () => {
    const xml = storyboardToString(applyBrandingToStoryboard(await expoStoryboard(), brandingProps));
    expect(xml).toContain('text="from"');
    expect(xml).toContain('text="Towinly"');
    expect(xml).toContain('<fontDescription key="fontDescription" type="system" weight="semibold" pointSize="20"/>');
    expect(xml).toContain('<nil key="highlightedColor"/>');
    // greenDeep #1a5c2e as sRGB components, the way Interface Builder stores colour.
    expect(xml).toMatch(/<color key="textColor" red="0\.102" green="0\.361" blue="0\.180"/);
  });

  test('applied twice, the footer is still one footer', async () => {
    const once = applyBrandingToStoryboard(await expoStoryboard(), brandingProps);
    const view = mainViewOf(applyBrandingToStoryboard(once, brandingProps));
    expect(view.subviews[0].label).toHaveLength(2);
    // Expo's two (centre the mark) plus the footer's four.
    expect(view.constraints[0].constraint).toHaveLength(6);
  });

  test("why it is listed before expo-splash-screen: Expo's mod wipes constraints added ahead of it", async () => {
    // The mods the wrong way round — ours, then Expo's — which is what app.json
    // would do with the entries swapped. The labels survive but their
    // constraints do not, and an unconstrained label is nowhere.
    const swapped = applySplashScreenStoryboard(
      applyBrandingToStoryboard(await getTemplateAsync(), brandingProps),
      splashProps
    );
    const owners = mainViewOf(swapped).constraints[0].constraint.map((constraint) => constraint.$.firstItem);
    expect(owners).not.toContain(ids.BRAND_ID);
  });
});

describe('Android styles', () => {
  // styles.xml as expo-splash-screen leaves it (withAndroidSplashStyles.js).
  const expoStyles = () => ({
    resources: {
      style: [
        { $: { name: 'AppTheme', parent: 'Theme.AppCompat.DayNight.NoActionBar' }, item: [] },
        {
          $: { name: 'Theme.App.SplashScreen', parent: 'Theme.SplashScreen' },
          item: [
            { $: { name: 'windowSplashScreenBackground' }, _: '@color/splashscreen_background' },
            { $: { name: 'windowSplashScreenAnimatedIcon' }, _: '@drawable/splashscreen_logo' },
            { $: { name: 'postSplashScreenTheme' }, _: '@style/AppTheme' },
          ],
        },
      ],
    },
  });
  const splashStyleOf = (styles) => styles.resources.style.find((style) => style.$.name === ids.SPLASH_STYLE);

  test('points the Android 12 branding slot at the footer drawable', () => {
    const splash = splashStyleOf(addBrandingToStyles(expoStyles()));
    expect(splash.item).toContainEqual({ $: { name: ids.BRANDING_ATTR }, _: `@drawable/${ids.DRAWABLE_NAME}` });
    // Expo's own items are untouched.
    expect(splash.item.map((item) => item.$.name)).toEqual(
      expect.arrayContaining(['windowSplashScreenAnimatedIcon', 'postSplashScreenTheme'])
    );
  });

  test('applied twice, the attribute appears once', () => {
    const splash = splashStyleOf(addBrandingToStyles(addBrandingToStyles(expoStyles())));
    expect(splash.item.filter((item) => item.$.name === ids.BRANDING_ATTR)).toHaveLength(1);
  });

  test('fails loudly, naming the fix, if it runs before expo-splash-screen', () => {
    expect(() => addBrandingToStyles({ resources: { style: [] } })).toThrow(/BEFORE "expo-splash-screen"/);
  });
});
