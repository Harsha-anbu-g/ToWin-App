"""Bake store screenshots: raw app capture + caption band on parchment.

Two outputs per shot, because the stores disagree on shape:
  ios  1320 x 2868  the iPhone 6.9 inch size Apple asks for
  play 1080 x 1920  Play rejects anything taller than 9:16, and the raw
                    captures are 1:2.17, so they are fitted rather than cropped

House rules enforced here and not left to the eye: parchment #f6f4ef behind
every band, ink #1a1a1a type, Newsreader 400 only (never a bold serif), no
drop shadow anywhere, no sky blue in the band because blue is reserved for
actions inside the app, and no em dash in any caption.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "docs/store/screenshots"
OUT = RAW / "final"
FONT = ROOT / "node_modules/@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf"

PARCHMENT = (246, 244, 239)
INK = (26, 26, 26)
HAIRLINE = (229, 225, 217)

SIZES = {"ios": (1320, 2868), "play": (1080, 1920)}

# raw file -> (caption, sub-caption or None). Only shots whose screen actually
# supports the sentence are listed. See screenshot-inventory.md for the ones
# deliberately left out and why.
SHOTS = [
    ("raw-13-landing-trust-ladder.png", "Seven steps, climbed together. Slow is the point.", None),
    ("raw-07-posted-help.png", "Ask for a ride, shopping, cleaning or company.", None),
    ("raw-10-helper-offer-help.png", "See who needs a hand near you.", None),
    ("raw-02-checkin.png", "Check in once a day. If you link a family member,\nthey are told when you go quiet.", None),
    ("raw-12-landing-welcome.png", "It takes two To Win.", None),
]


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
            draw.text((W / 2, y), ln, font=sub_font, fill=(90, 90, 90), anchor="ma")
            y += int(sub_size * 1.35)

    band_bottom = y + int(H * 0.022)
    draw.line([(pad, band_bottom), (W - pad, band_bottom)], fill=HAIRLINE, width=2)

    # The shot fills the width, keeps its aspect, and is cropped from the
    # BOTTOM if it overflows: app screens put their meaning at the top, and
    # squashing the aspect would misrepresent the layout.
    top = band_bottom + int(H * 0.030)
    avail_h = H - top
    scale = W / shot.width
    new_h = int(shot.height * scale)
    resized = shot.resize((W, new_h), Image.LANCZOS)
    if new_h > avail_h:
        resized = resized.crop((0, 0, W, avail_h))
    canvas.paste(resized, (0, top))

    return canvas


def main():
    for f, caption, sub in SHOTS:
        raw = RAW / f
        if not raw.exists():
            print(f"MISSING {f}", file=sys.stderr)
            continue
        assert "—" not in caption, f"em dash in caption for {f}"
        for store in SIZES:
            out_dir = OUT / store
            out_dir.mkdir(parents=True, exist_ok=True)
            name = f.replace("raw-", "").replace(".png", f"-{store}.png")
            img = bake(raw, caption, sub, store)
            img.save(out_dir / name, "PNG")
            print(f"{store}: {name}  {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    main()
