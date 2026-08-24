// The "from Towinly" line at the foot of the launch screen: the WhatsApp
// pattern (mark in the middle, a quiet brand line at the bottom) for our app.
//
// Expo's splash plugin draws exactly one centred image and nothing else, so
// this plugin adds the footer itself, natively on each platform:
//
//   iOS      two UILabels in SplashScreen.storyboard, pinned above the safe
//            area. Real system font — the same SF the in-app wordmark is set
//            in — crisp at every scale, and no extra image to ship.
//   Android  the platform's own branding slot on Android 12+
//            (android:windowSplashScreenBrandingImage): a 200×80dp drawable
//            the system draws at the bottom. Android 11 and older show the
//            icon alone; the compat library has no branding slot.
//
// ORDER MATTERS: list this plugin BEFORE "expo-splash-screen" in app.json.
// Two reasons, both from how config plugins compose. Expo registers the
// storyboard's provider mod last inside its own plugin and refuses any
// storyboard mod added after it (INVALID_MOD_ORDER). And mods run
// newest-registered first: Expo's storyboard mod clears every constraint
// before drawing its own, so ours must run after it — which means being
// registered before it. The Android styles mod throws a plain error if it
// finds itself running first, and launch-assets.test.js pins the order.
const fs = require('fs');
const path = require('path');
const { withMod, withDangerousMod, withAndroidStyles } = require('expo/config-plugins');

// expo-splash-screen's own mod name for the storyboard, and the ids its
// template uses for the root view (withIosSplashScreenStoryboard.js).
const STORYBOARD_MOD = 'splashScreenStoryboard';
const CONTAINER_ID = 'EXPO-ContainerView';
const SPLASH_STYLE = 'Theme.App.SplashScreen';
const EXPO_ICON_ATTR = 'windowSplashScreenAnimatedIcon';

const FROM_ID = 'TOWINLY-SplashFrom';
const BRAND_ID = 'TOWINLY-SplashBrand';
const DRAWABLE_NAME = 'splashscreen_branding';
const BRANDING_ATTR = 'android:windowSplashScreenBrandingImage';

// Android stretches the branding drawable to fill its slot, so every density
// gets exactly this box (dp × scale) and the artwork itself must be 5:2.
const BRANDING_DP = { width: 200, height: 80 };
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// Only the strings, sizes and colours are configurable; the placement is the
// platform convention and not a knob.
const DEFAULTS = {
  image: './assets/splash-branding.png',
  fromText: 'from',
  brandText: 'Towinly',
  fromColor: '#6b6b6b',
  brandColor: '#1a5c2e',
  fromSize: 13, // pt
  brandSize: 20, // pt — a touch above the nav wordmark (17), as WhatsApp's is
  bottomInset: 32, // pt from the wordmark to the bottom safe-area edge
};
const FROM_TO_BRAND_GAP = 2; // pt

/** "#rrggbb" → an Interface Builder <color> element. */
function ibColor(key, hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`withSplashBranding: "${hex}" is not a #rrggbb colour`);
  const [red, green, blue] = [0, 2, 4].map((i) => (parseInt(match[1].slice(i, i + 2), 16) / 255).toFixed(3));
  return { $: { key, red, green, blue, alpha: '1.000', colorSpace: 'custom', customColorSpace: 'sRGB' } };
}

/** A UILabel in storyboard XML (xml2js shape), system font, centred text. */
function ibLabel({ id, text, pointSize, weight, color, frame }) {
  return {
    $: {
      opaque: 'NO',
      userInteractionEnabled: 'NO',
      contentMode: 'left',
      horizontalHuggingPriority: '251',
      verticalHuggingPriority: '251',
      text,
      textAlignment: 'center',
      lineBreakMode: 'tailTruncation',
      baselineAdjustment: 'alignBaselines',
      adjustsFontSizeToFit: 'NO',
      translatesAutoresizingMaskIntoConstraints: 'NO',
      id,
      userLabel: id,
    },
    rect: [{ $: { key: 'frame', ...frame } }],
    fontDescription: [{ $: { key: 'fontDescription', type: 'system', ...(weight ? { weight } : {}), pointSize } }],
    color: [ibColor('textColor', color)],
    nil: [{ $: { key: 'highlightedColor' } }],
  };
}

function ibConstraint(id, [firstItem, firstAttribute], [secondItem, secondAttribute], constant) {
  return {
    $: { firstItem, firstAttribute, secondItem, secondAttribute, ...(constant != null ? { constant } : {}), id },
  };
}

// Interface Builder rejects two items with one id, so replace-by-id, never
// append blindly — the mod may run on a storyboard that already has the footer.
function upsertById(array, item) {
  const existing = array.findIndex((entry) => entry.$?.id === item.$.id);
  if (existing > -1) array.splice(existing, 1);
  array.push(item);
}

/**
 * Add the two footer labels and their constraints to the splash storyboard.
 * Pure over the xml2js object; exported for tests. Idempotent.
 */
function applyBrandingToStoryboard(xml, props = {}) {
  const p = { ...DEFAULTS, ...props };
  const mainView = xml.document.scenes[0].scene[0].objects[0].viewController[0].view[0];
  const canvas = mainView.rect[0].$;
  const width = Number(canvas.width);
  const height = Number(canvas.height);
  // Expo's template declares the safe-area guide; pin to it so the footer
  // clears the home indicator. Fall back to the view edge if it ever goes.
  const safeAreaId = mainView.viewLayoutGuide?.[0]?.$?.id ?? CONTAINER_ID;

  // Frames are Interface Builder's design-time preview only; Auto Layout
  // positions the real thing. Approximate a 34pt home-indicator inset.
  const brandHeight = Math.round(p.brandSize * 1.2);
  const fromHeight = Math.round(p.fromSize * 1.2);
  const brandY = height - 34 - p.bottomInset - brandHeight;
  const fromY = brandY - FROM_TO_BRAND_GAP - fromHeight;

  const subviews = mainView.subviews[0];
  subviews.label = subviews.label ?? [];
  upsertById(
    subviews.label,
    ibLabel({
      id: FROM_ID,
      text: p.fromText,
      pointSize: p.fromSize,
      color: p.fromColor,
      frame: { x: 0, y: fromY, width, height: fromHeight },
    })
  );
  upsertById(
    subviews.label,
    ibLabel({
      id: BRAND_ID,
      text: p.brandText,
      pointSize: p.brandSize,
      weight: 'semibold',
      color: p.brandColor,
      frame: { x: 0, y: brandY, width, height: brandHeight },
    })
  );

  mainView.constraints = mainView.constraints ?? [{}];
  const constraints = mainView.constraints[0];
  constraints.constraint = constraints.constraint ?? [];
  [
    ibConstraint(`${BRAND_ID}-centerX`, [BRAND_ID, 'centerX'], [CONTAINER_ID, 'centerX']),
    ibConstraint(`${FROM_ID}-centerX`, [FROM_ID, 'centerX'], [CONTAINER_ID, 'centerX']),
    // safeArea.bottom = brand.bottom + inset
    ibConstraint(`${BRAND_ID}-bottom`, [safeAreaId, 'bottom'], [BRAND_ID, 'bottom'], p.bottomInset),
    // brand.top = from.bottom + gap
    ibConstraint(`${BRAND_ID}-top`, [BRAND_ID, 'top'], [FROM_ID, 'bottom'], FROM_TO_BRAND_GAP),
  ].forEach((constraint) => upsertById(constraints.constraint, constraint));

  return xml;
}

/**
 * Point Android 12+'s branding slot at the footer drawable. Pure over the
 * styles.xml object; exported for tests. Idempotent. Throws if
 * expo-splash-screen has not written its style yet — the order problem
 * described at the top of this file — rather than letting the footer vanish.
 */
function addBrandingToStyles(styles) {
  const style = styles.resources?.style?.find((entry) => entry.$?.name === SPLASH_STYLE);
  const hasExpoIcon = style?.item?.some((item) => item.$?.name === EXPO_ICON_ATTR);
  if (!hasExpoIcon) {
    throw new Error(
      `withSplashBranding: ${SPLASH_STYLE} has no ${EXPO_ICON_ATTR} yet, so expo-splash-screen has not run. ` +
        'List "./plugins/withSplashBranding" BEFORE "expo-splash-screen" in app.json plugins.'
    );
  }
  style.item = [
    ...style.item.filter((item) => item.$?.name !== BRANDING_ATTR),
    { $: { name: BRANDING_ATTR }, _: `@drawable/${DRAWABLE_NAME}` },
  ];
  return styles;
}

/** Write the footer PNG at every density, sized to the 200×80dp slot. */
function withAndroidBrandingDrawables(config, image) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { projectRoot, platformProjectRoot } = config.modRequest;
      const src = path.resolve(projectRoot, image);
      if (!fs.existsSync(src)) {
        throw new Error(`withSplashBranding: footer image not found at ${image}`);
      }
      // The same resizer Expo's own splash and icon plugins use.
      const { generateImageAsync } = require('@expo/image-utils');
      const resDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'res');
      await Promise.all(
        Object.entries(DENSITIES).map(async ([density, scale]) => {
          const { source } = await generateImageAsync(
            { projectRoot, cacheType: 'splash-branding' },
            {
              src,
              resizeMode: 'contain',
              width: BRANDING_DP.width * scale,
              height: BRANDING_DP.height * scale,
            }
          );
          const dir = path.join(resDir, `drawable-${density}`);
          await fs.promises.mkdir(dir, { recursive: true });
          await fs.promises.writeFile(path.join(dir, `${DRAWABLE_NAME}.png`), source);
        })
      );
      return config;
    },
  ]);
}

/**
 * Expo config plugin: draw "from Towinly" at the foot of the native splash.
 * @param {object} props  image, fromText, brandText, fromColor, brandColor,
 *                        fromSize, brandSize, bottomInset — see DEFAULTS.
 */
const withSplashBranding = (config, props = {}) => {
  const p = { ...DEFAULTS, ...props };
  config = withMod(config, {
    platform: 'ios',
    mod: STORYBOARD_MOD,
    action: (config) => {
      config.modResults = applyBrandingToStoryboard(config.modResults, p);
      return config;
    },
  });
  config = withAndroidStyles(config, (config) => {
    config.modResults = addBrandingToStyles(config.modResults);
    return config;
  });
  config = withAndroidBrandingDrawables(config, p.image);
  return config;
};

module.exports = withSplashBranding;
module.exports.applyBrandingToStoryboard = applyBrandingToStoryboard;
module.exports.addBrandingToStyles = addBrandingToStyles;
module.exports.DEFAULTS = DEFAULTS;
module.exports.BRANDING_DP = BRANDING_DP;
module.exports.DENSITIES = DENSITIES;
module.exports.ids = { FROM_ID, BRAND_ID, CONTAINER_ID, DRAWABLE_NAME, BRANDING_ATTR, SPLASH_STYLE };
