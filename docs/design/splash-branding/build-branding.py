#!/usr/bin/env python3
"""Bakes assets/splash-branding.png: the "from Towinly" footer Android draws
at the foot of the launch screen. (iOS sets the same words as native labels in
the storyboard, via plugins/withSplashBranding, so it needs no image.)

Android's branding slot is 200x80dp and the drawable is stretched to fill it,
so the canvas is exactly 5:2, drawn at 4x (800x320) so xxxhdpi is 1:1.

Words and colours come from the plugin's entry in app.json (one source;
launch-assets.test.js pins those colours to the theme tokens). Sizes mirror
the plugin's DEFAULTS so both platforms set the same type.

Type is Roboto (OFL), the face the in-app wordmark falls back to on Android.
The SF the iOS labels use is Apple's and may not ship inside an Android app.
Fetch the variable font and pass its path:

  curl -L -o Roboto.ttf 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto%5Bwdth,wght%5D.ttf'
  python3 build-branding.py Roboto.ttf
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
APP = HERE.parents[2]  # docs/design/splash-branding -> App
PLUGIN = './plugins/withSplashBranding'

SCALE = 4
WIDTH, HEIGHT = 200 * SCALE, 80 * SCALE
FROM_DP, BRAND_DP, GAP_DP = 13, 20, 2  # the plugin's DEFAULTS
WEIGHT_FROM, WEIGHT_BRAND = 400, 600  # the wordmark is fontWeight 600 in-app
TRACK_DP = -0.4  # the wordmark's letterSpacing (NavRow)


def plugin_props():
    app_json = json.loads((APP / 'app.json').read_text())
    for entry in app_json['expo']['plugins']:
        if isinstance(entry, list) and entry[0] == PLUGIN:
            return entry[1]
    sys.exit(f'app.json has no {PLUGIN} entry')


def face(font_path, dp, weight):
    font = ImageFont.truetype(str(font_path), dp * SCALE)
    axes = [axis['name'] for axis in font.get_variation_axes()]
    # Width 100 is the normal cut; only the weight moves.
    font.set_variation_by_axes([weight if name == b'Weight' else 100 for name in axes])
    return font


def draw_tracked(draw, x_center, baseline, text, font, fill, track_px):
    """Centred text with letter-spacing, which PIL has no option for."""
    widths = [draw.textlength(char, font=font) for char in text]
    total = sum(widths) + track_px * (len(text) - 1)
    x = x_center - total / 2
    for char, width in zip(text, widths):
        draw.text((x, baseline), char, font=font, fill=fill, anchor='ls')
        x += width + track_px


def main(font_path):
    props = plugin_props()
    from_font = face(font_path, FROM_DP, WEIGHT_FROM)
    brand_font = face(font_path, BRAND_DP, WEIGHT_BRAND)

    image = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Two lines on their baselines, the stack centred in the slot.
    from_ascent, from_descent = from_font.getmetrics()
    brand_ascent, brand_descent = brand_font.getmetrics()
    gap = GAP_DP * SCALE
    block = from_ascent + from_descent + gap + brand_ascent + brand_descent
    top = (HEIGHT - block) / 2
    from_baseline = top + from_ascent
    brand_baseline = from_baseline + from_descent + gap + brand_ascent

    draw.text((WIDTH / 2, from_baseline), props['fromText'], font=from_font, fill=props['fromColor'], anchor='ms')
    draw_tracked(draw, WIDTH / 2, brand_baseline, props['brandText'], brand_font, props['brandColor'], TRACK_DP * SCALE)

    out = APP / 'assets' / 'splash-branding.png'
    image.save(out, optimize=True)
    print(f'wrote {out.relative_to(APP)} {image.size[0]}x{image.size[1]}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
