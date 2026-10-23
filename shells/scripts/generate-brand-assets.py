"""Regenerate Android launcher and splash PNGs from simple, original shapes.

Requires Pillow only when regenerating assets; Android builds use committed PNGs.
"""

from pathlib import Path
from PIL import Image, ImageDraw


RES = Path(__file__).resolve().parents[1] / "android" / "app" / "src" / "main" / "res"
INK = "#173c3b"
PAPER = "#f3f6f5"
WHITE = "#f7fbf8"
MINT = "#8fd6bc"
SCALE = 4


def mark(draw, cx, cy, diameter, color, accent):
    r = diameter / 2
    width = max(3, round(diameter * .085))
    box = (cx-r, cy-r, cx+r, cy+r)
    draw.ellipse(box, outline=color, width=width)
    draw.line((cx, cy, cx, cy-r*.55), fill=color, width=width, joint="curve")
    draw.line((cx, cy, cx+r*.48, cy+r*.19), fill=color, width=width, joint="curve")
    dot = diameter * .075
    draw.ellipse((cx-dot, cy-dot, cx+dot, cy+dot), fill=accent)


def render(path, kind):
    original = Image.open(path)
    w, h = original.size
    W, H = w*SCALE, h*SCALE
    if kind == "foreground":
        image = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(image)
        mark(d, W/2, H/2, min(W, H)*.47, WHITE, MINT)
    elif kind == "round":
        image = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(image)
        d.ellipse((0, 0, W-1, H-1), fill=INK)
        mark(d, W/2, H/2, min(W, H)*.55, WHITE, MINT)
    elif kind == "icon":
        image = Image.new("RGB", (W, H), INK)
        d = ImageDraw.Draw(image)
        mark(d, W/2, H/2, min(W, H)*.55, WHITE, MINT)
    else:
        image = Image.new("RGB", (W, H), PAPER)
        d = ImageDraw.Draw(image)
        mark(d, W/2, H/2, min(W, H)*.2, INK, MINT)
    image.resize((w, h), Image.Resampling.LANCZOS).save(path, optimize=True)


if __name__ == "__main__":
    for path in RES.rglob("*.png"):
        if path.name == "splash.png":
            render(path, "splash")
        elif path.name == "ic_launcher_foreground.png":
            render(path, "foreground")
        elif path.name == "ic_launcher_round.png":
            render(path, "round")
        elif path.name == "ic_launcher.png":
            render(path, "icon")
