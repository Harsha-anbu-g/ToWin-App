"""Bake store screenshots: raw app capture + caption band on parchment.

Two outputs per shot, because the stores disagree on shape:
  ios  1320 x 2868  one of the three iPhone 6.9 inch portrait sizes Apple
                    accepts (Apple: "1320 x 2868 pixels (portrait)")
  play 1080 x 1920  Play refuses any image whose long side is more than twice
                    the short side. The Apple render is 1 to 2.17 and would be
                    refused; 1080 x 1920 is 1 to 1.78 and passes.

Neither store publishes a per-file byte cap for phone screenshots. Both refuse
an alpha channel: Apple says "Images can't include alpha channels or
transparencies", Play asks for "JPEG or 24-bit PNG (no alpha)". PIL writes an
RGB canvas here, which is a 24-bit PNG with no alpha.

House rules enforced here and not left to the eye: parchment #f6f4ef behind
every band, ink #1a1a1a type, Newsreader 400 only (never a bold serif), no
drop shadow anywhere, no sky blue in the band because blue is reserved for
actions inside the app, and no em dash in any caption or sub-caption.

The shot is fitted whole, never cropped. An earlier version scaled each
capture to the full canvas width and cut whatever overflowed the bottom, which
removed the tab bar from every shot and would have removed the messages and
the composer from the chat shot, whose content sits at the bottom of the
screen. Fitting the whole screen costs some width and keeps every screen
truthful and consistent across all eight.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "docs/store/screenshots"
OUT = RAW / "final"
MANIFEST = RAW / "manifest.json"
FONT = ROOT / "node_modules/@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf"

PARCHMENT = (246, 244, 239)
INK = (26, 26, 26)
SUB_INK = (90, 90, 90)
HAIRLINE = (229, 225, 217)

EM_DASH = "—"

# The slot number, the raw file and the caption all live in manifest.json, so
# this script and __tests__/store-screenshots.test.js read one source. The slot
# is the upload order and is baked into the filename, because the stores show
# roughly the first three shots in search results and a folder that sorted by
# raw capture number would upload them in the wrong order.
_manifest = json.loads(MANIFEST.read_text())
SIZES = {store: tuple(wh) for store, wh in _manifest["sizes"].items()}
SHOTS = [(s["slot"], s["raw"], s["caption"], s["sub"]) for s in _manifest["shots"]]


def slug(raw_name):
    """raw-13-landing-trust-ladder.png -> landing-trust-ladder"""
    return raw_name.replace("raw-", "", 1).split("-", 1)[1].replace(".png", "")


def wrap(draw, text, font, max_w):
    """Wrap on spaces, honouring newlines the caption already carries."""
    lines = []
    for para in text.split("\n"):
        words, line = para.split(), ""
        for w in words:
            trial = f"{line} {w}".strip()
            if draw.textlength(trial, font=font) <= max_w:
                line = trial
            else:
                if line:
                    lines.append(line)
                line = w
        lines.append(line)
    return lines


def bake(raw_path, caption, sub, store):
    W, H = SIZES[store]
    shot = Image.open(raw_path).convert("RGB")

    canvas = Image.new("RGB", (W, H), PARCHMENT)
    draw = ImageDraw.Draw(canvas)

    # Caption block sits at the top and takes what it needs; the shot gets the
    # rest. Type scales with canvas width so ios and play read identically.
    size = int(W * 0.042)
    sub_size = int(W * 0.030)
    font = ImageFont.truetype(str(FONT), size)
    sub_font = ImageFont.truetype(str(FONT), sub_size)

    pad = int(W * 0.07)
    lines = wrap(draw, caption, font, W - pad * 2)
    line_h = int(size * 1.35)
    y = int(H * 0.045)
    for ln in lines:
        draw.text((W / 2, y), ln, font=font, fill=INK, anchor="ma")
        y += line_h
    if sub:
        y += int(size * 0.3)
        for ln in wrap(draw, sub, sub_font, W - pad * 2):
            draw.text((W / 2, y), ln, font=sub_font, fill=SUB_INK, anchor="ma")
            y += int(sub_size * 1.35)

    band_bottom = y + int(H * 0.022)
    draw.line([(pad, band_bottom), (W - pad, band_bottom)], fill=HAIRLINE, width=2)

    # The whole screen is fitted into what is left, keeping its aspect and
    # centred on the parchment. Nothing is cropped and nothing is squashed.
    top = band_bottom + int(H * 0.030)
    box_w = W - int(W * 0.06) * 2
    box_h = H - top - int(H * 0.030)
    scale = min(box_w / shot.width, box_h / shot.height)
    new_w, new_h = int(shot.width * scale), int(shot.height * scale)
    resized = shot.resize((new_w, new_h), Image.LANCZOS)
    canvas.paste(resized, ((W - new_w) // 2, top + (box_h - new_h) // 2))

    return canvas


def main():
    missing = 0
    for slot, f, caption, sub in SHOTS:
        raw = RAW / f
        if not raw.exists():
            print(f"MISSING {f}", file=sys.stderr)
            missing += 1
            continue
        assert EM_DASH not in caption, f"em dash in caption for {f}"
        assert sub is None or EM_DASH not in sub, f"em dash in sub-caption for {f}"
        for store in SIZES:
            out_dir = OUT / store
            out_dir.mkdir(parents=True, exist_ok=True)
            name = f"{slot:02d}-{slug(f)}-{store}.png"
            img = bake(raw, caption, sub, store)
            img.save(out_dir / name, "PNG")
            print(f"{store}: {name}  {img.size[0]}x{img.size[1]}")
    if missing:
        sys.exit(1)


if __name__ == "__main__":
    main()
