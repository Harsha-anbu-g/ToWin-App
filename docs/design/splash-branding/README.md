# Launch-screen footer source ("from Towinly", added 2026-08-24)

The launch screen is the tortoise in the middle and a quiet "from Towinly" at
the foot, the way WhatsApp signs off with "from Meta". Both are drawn natively
by `plugins/withSplashBranding.js` at prebuild time:

- iOS: two system-font labels in `SplashScreen.storyboard`. No image.
- Android 12+: the platform's 200x80dp branding slot, fed by
  `assets/splash-branding.png` at every density. Android 11 and older show
  the icon alone (the compat library has no slot for it).

`build-branding.py` bakes that PNG. It reads the words and colours from the
plugin's entry in `app.json`, sets them in Roboto (OFL) at the plugin's sizes,
and writes 800x320 (4x of the slot, so xxxhdpi is pixel-for-pixel). Run it
again after changing the words, the colours or the sizes; the font is fetched,
not committed (see the docstring).
