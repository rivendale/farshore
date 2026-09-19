#!/usr/bin/env python3
"""Chroma-key sprites, slice icons, resize tiles, write public/game assets."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ART = Path("/workspace/assets/raw")
OUT = Path("/workspace/public/game")

TILES = {
    "grass": "e4f3a2e9-8c3a-429c-a25c-eaea356a47ff.jpg",
    "water": "b6297d01-d3ba-4eb9-923e-77ca5d955e25.jpg",
    "sand": "1d1ffad2-479f-4c4c-8b74-a02aa71c0ff9.jpg",
    "forest": "b9ad65ae-15c3-490b-830b-a01d436dcceb.jpg",
    "hills": "19daf160-1fbd-433f-b36a-7805dd740154.jpg",
}

TILE_CROP = {
    "grass": 0.08,
    "water": 0.05,
    "sand": 0.05,
    "forest": 0.06,
    "hills": 0.06,
}

SPRITES = {
    "buildings/hut": "33654019-00c3-4705-80be-abc6705cf424.jpg",
    "buildings/farm": "690d6a16-c584-4051-b241-7f4dadc15777.jpg",
    "buildings/lumber": "39e7c0f4-86cd-42c6-bacc-c36d8e045974.jpg",
    "buildings/dock": "b244f951-38aa-4ed2-95ba-c369e4ff8837.jpg",
    "buildings/hall": "10717180-7fba-40d9-9d21-59bae37799a1.jpg",
    "buildings/sawmill": "5f4801a2-de1b-42c4-8cb0-1acd3c0d250c.jpg",
    "buildings/cotton": "3a3543dd-4bff-4cca-8778-89207e032d71.jpg",
    "buildings/weaver": "d20d30af-86e4-4dff-8be3-d95a5dbab0fe.jpg",
    "buildings/chapel": "c8b06190-daa8-4caa-a13d-9afb3ed38f8f.jpg",
    "buildings/barracks": "8d936ae1-6d52-4961-94f5-7b1573e45139.jpg",
    "buildings/cottage": "560927d2-9159-4dc1-927a-8ffb419a65a4.jpg",
    "buildings/townhouse": "a599cb80-c379-4f65-b964-de20343e0f54.jpg",
    "buildings/warehouse": "e32b3240-9333-43b1-9a55-813b75aa94ca.jpg",
    "buildings/distillery": "e75d83f6-4029-4e66-94b6-83cb97063419.jpg",
    "buildings/sugar": "321da9b5-5632-42a8-87d5-a125daef9088.jpg",
    "buildings/mine": "94d85fe9-3a8e-427b-b2d3-0d8898c5d3e2.jpg",
    "buildings/palace": "157a3a68-e633-401d-a8a9-3cdf976cd005.jpg",
    "buildings/fishery": "6484805c-423b-4d1d-b7a9-de2318674ace.jpg",
    "buildings/smithy": "d21ff688-16fb-4892-808d-0b348d4fa8de.jpg",
    "buildings/tobacco": "4b1afdec-bd6b-4b2b-97d2-7844064745a9.jpg",
    "buildings/manor": "f9eaf1d9-de4b-4b91-a443-e08d6fbd91de.jpg",
    "props/ship": "525db80e-17b6-47f8-afed-af20544bc9e0.jpg",
    "props/village": "8a7f68f2-9e1d-4990-8622-7c56f97158c9.jpg",
    "props/tree": "2466720a-d396-4a1c-9541-bffd903902e7.jpg",
}

SCENES = {
    "title": "0c58f851-a033-442f-9156-0afa27971601.jpg",
    "chart": "5dcd52c9-752a-4a7b-a4c3-450c525274ad.jpg",
}

ICON_SHEET = "142ee93d-66af-458f-a563-1f69133da3d8.jpg"
ICON_NAMES = [
    "food",
    "lumber",
    "planks",
    "cotton",
    "cloth",
    "tobacco",
    "cigars",
    "sugar",
    "rum",
    "furs",
    "coats",
    "ore",
    "tools",
    "muskets",
    "silver",
    "gold",
]


def chroma(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    dist = np.abs(r - 255) + np.abs(g - 0) + np.abs(b - 255)
    rb = r.astype(np.int32) + b.astype(np.int32) - 2 * g.astype(np.int32)
    mag = (dist < 110) | ((r > 150) & (b > 150) & (g < 110)) | ((rb > 160) & (g < 130) & (r > 120) & (b > 120))
    arr[mag, 3] = 0
    a = arr[:, :, 3]
    padded = np.pad(a, 1, mode="edge")
    neigh = np.stack(
        [
            padded[0:-2, 1:-1],
            padded[2:, 1:-1],
            padded[1:-1, 0:-2],
            padded[1:-1, 2:],
        ]
    )
    arr[:, :, 3] = np.minimum(a, neigh.min(axis=0))
    a = arr[:, :, 3]
    padded = np.pad(a, 1, mode="edge")
    neigh = np.stack(
        [
            padded[0:-2, 1:-1],
            padded[2:, 1:-1],
            padded[1:-1, 0:-2],
            padded[1:-1, 2:],
        ]
    )
    arr[:, :, 3] = np.minimum(a, neigh.min(axis=0))
    return Image.fromarray(arr)


def trim_transparent(im: Image.Image, pad: float = 0.06) -> Image.Image:
    arr = np.array(im)
    a = arr[:, :, 3]
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return im
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    w, h = x1 - x0 + 1, y1 - y0 + 1
    m = int(max(w, h) * pad)
    x0, y0 = max(0, x0 - m), max(0, y0 - m)
    x1, y1 = min(im.width - 1, x1 + m), min(im.height - 1, y1 + m)
    side = max(x1 - x0, y1 - y0)
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    half = side // 2
    l = max(0, cx - half)
    t = max(0, cy - half)
    r = min(im.width, l + side)
    btm = min(im.height, t + side)
    cropped = im.crop((l, t, r, btm))
    return cropped.resize((512, 512), Image.Resampling.LANCZOS)


def save_tile(name: str, filename: str) -> None:
    im = Image.open(ART / filename).convert("RGB")
    crop = TILE_CROP.get(name, 0.04)
    w, h = im.size
    m = int(min(w, h) * crop)
    im = im.crop((m, m, w - m, h - m)).resize((256, 256), Image.Resampling.LANCZOS)
    dest = OUT / "tiles" / f"{name}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")
    print("tile", name)


def save_sprite(rel: str, filename: str) -> None:
    src = ART / filename
    if not src.exists():
        print("missing", filename)
        return
    keyed = chroma(Image.open(src))
    trimmed = trim_transparent(keyed)
    dest = OUT / f"{rel}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    trimmed.save(dest, "PNG")
    print("sprite", rel)


def save_scene(name: str, filename: str) -> None:
    src = ART / filename
    if not src.exists():
        print("missing scene", filename)
        return
    im = Image.open(src).convert("RGB")
    dest = OUT / "scenes" / f"{name}.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=86)
    print("scene", name)


def save_icons() -> None:
    src = ART / ICON_SHEET
    if not src.exists():
        print("no icon sheet")
        return
    keyed = chroma(Image.open(src))
    w, h = keyed.size
    cols, rows = 4, 4
    cw, ch = w // cols, h // rows
    out_dir = OUT / "icons"
    out_dir.mkdir(parents=True, exist_ok=True)
    keyed.save(out_dir / "sheet.png", "PNG")
    for i, name in enumerate(ICON_NAMES):
        r, c = divmod(i, cols)
        cell = keyed.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
        cell = trim_transparent(cell, pad=0.08)
        cell.save(out_dir / f"{name}.png", "PNG")
        print("icon", name)


def main() -> None:
    for name, fn in TILES.items():
        save_tile(name, fn)
    for rel, fn in SPRITES.items():
        save_sprite(rel, fn)
    for name, fn in SCENES.items():
        save_scene(name, fn)
    save_icons()


if __name__ == "__main__":
    main()
