#!/usr/bin/env python3
"""Resize, chroma-key, and emit Farshore runtime PNGs."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
OUT_B = ROOT / "public/game/buildings"
OUT_P = ROOT / "public/game/props"
OUT_T = ROOT / "public/game/tiles"
OUT_I = ROOT / "public/game/islands"
OUT_I.mkdir(parents=True, exist_ok=True)

IMG = ROOT / "artifacts/imagine_images"

BUILDINGS = {
    "trapper.png": "36261025-e71f-4d9b-bca6-f49893297be0.jpg",
    "cigarmaker.png": "c8d75910-fdb9-4253-b963-8d59fc8ac8de.jpg",
    "furrier.png": "3a06679e-1c06-4a38-9ac7-9e8f1ae272ea.jpg",
    "silver.png": "9c001593-18c5-4e22-a56b-f91100f1774a.jpg",
    "armory.png": "faa549a0-9756-450f-a4ab-c8c2c6461710.jpg",
    "school.png": "708df236-edae-49ae-95c3-f6ff38e11bfc.jpg",
    "market.png": "c4aa6f1b-9fd1-4764-a836-8944057e2b77.jpg",
    "patriot.png": "0dfb7155-34c8-4e8d-ae2b-f98ba54da219.jpg",
}

PEOPLE = {
    "laborer.png": "5e877185-1897-45c3-8730-bbce55b95a5c.jpg",
    "farmer.png": "12b81b9e-c459-47a3-b27f-a29670b1cec6.jpg",
    "artisan.png": "fac442cc-ae02-4cdd-b54f-3ffdd5a26cca.jpg",
}

ISLANDS = {
    "haven.jpg": "a3c742da-0607-4cc8-a267-d92c960dce1e.jpg",
    "kaneska.jpg": "707a8c09-8332-4d94-9d75-1e28851230c6.jpg",
    "iron.jpg": "8b29098a-7ade-4fbf-b620-3ad36bc12f9f.jpg",
    "cinder.jpg": "da2670ef-43bc-4669-8ff4-11ff70c39a76.jpg",
}


def save_png(img: Image.Image, dest: Path, size: int | None = None) -> None:
    out = img.convert("RGBA")
    if size:
        out = out.resize((size, size), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG", optimize=True)


def save_jpg(img: Image.Image, dest: Path, size: int) -> None:
    out = img.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "JPEG", quality=82, optimize=True)


def chroma_magenta(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert("RGBA"))
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    mag = (r > 130) & (b > 130) & (g < 140) & ((r + b - 2 * g) > 70)
    dist = np.abs(r - 255) + np.abs(g - 0) + np.abs(b - 255)
    mag = mag | (dist < 200)
    arr[:, :, 3] = np.where(mag, 0, arr[:, :, 3])
    # soften fringe
    alpha = arr[:, :, 3].astype(np.float32)
    near = mag
    # dilate magenta a bit via shift
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        shifted = np.roll(np.roll(near, dy, 0), dx, 1)
        alpha = np.where(shifted & ~near, alpha * 0.35, alpha)
    arr[:, :, 3] = alpha.astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def crop_content(img: Image.Image, pad: float = 0.12) -> Image.Image:
    arr = np.array(img)
    ys, xs = np.where(arr[:, :, 3] > 12)
    if len(xs) == 0:
        return img
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    w, h = x1 - x0, y1 - y0
    px, py = int(w * pad), int(h * pad)
    x0, y0 = max(0, x0 - px), max(0, y0 - py)
    x1, y1 = min(img.width, x1 + px), min(img.height, y1 + py)
    side = max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    x0, y0 = max(0, cx - side // 2), max(0, cy - side // 2)
    return img.crop((x0, y0, min(img.width, x0 + side), min(img.height, y0 + side)))


def wrap_blend(img: Image.Image, blend: int = 48) -> Image.Image:
    arr = np.array(img.convert("RGB")).astype(np.float32)
    h, w = arr.shape[:2]
    for i in range(blend):
        t = i / blend
        arr[i] = arr[i] * t + arr[h - blend + i] * (1 - t)
        arr[h - blend + i] = arr[i]
        arr[:, i] = arr[:, i] * t + arr[:, w - blend + i] * (1 - t)
        arr[:, w - blend + i] = arr[:, i]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def main() -> None:
    for name, src in BUILDINGS.items():
        im = Image.open(IMG / src)
        save_png(im, OUT_B / name, 512)
        print("building", name)

    water = Image.open(IMG / "07323503-7523-4513-8d5a-39eeb7efad51.jpg")
    water = wrap_blend(water.resize((512, 512), Image.Resampling.LANCZOS), 64)
    save_png(water, OUT_T / "water.png", 256)
    tile = Image.open(OUT_T / "water.png")
    check = Image.new("RGB", (512, 512))
    t = tile.convert("RGB")
    check.paste(t, (0, 0))
    check.paste(t, (256, 0))
    check.paste(t, (0, 256))
    check.paste(t, (256, 256))
    check.save(ROOT / "screenshots/water-2x2.png")
    print("water")

    for name, src in PEOPLE.items():
        im = chroma_magenta(Image.open(IMG / src))
        im = crop_content(im)
        save_png(im, OUT_P / name, 192)
        print("person", name)

    for name, src in ISLANDS.items():
        save_jpg(Image.open(IMG / src), OUT_I / name, 384)
        print("island", name)

    ship = chroma_magenta(Image.open(IMG / "eea7c57c-6111-4898-ad32-01584614d084.jpg"))
    # ship may not be magenta; fall back to original if almost opaque
    alpha = np.array(ship)[:, :, 3]
    if alpha.mean() > 240:
        save_png(Image.open(IMG / "eea7c57c-6111-4898-ad32-01584614d084.jpg"), OUT_P / "sloop.png", 384)
        print("sloop (no chroma)")
    else:
        ship = crop_content(ship)
        save_png(ship, OUT_P / "sloop.png", 256)
        print("sloop")


if __name__ == "__main__":
    main()
