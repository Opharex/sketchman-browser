#!/usr/bin/env python3
"""Build complete, pre-rendered one-to-one Sketchman skin atlases.

Input: original mobile APK character atlases + sprites.json.
Output: nine PNG atlases, thumbnails sourced from their actual CHR_Run_01
        frames, and one manifest preserving original frame trim metadata.

No new character poses are invented; every source pixel keeps its original
alpha and its position inside the original 132x143 coordinate system.
"""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
INPUT = DIST / "assets"
OUTPUT = DIST / "skins" / "generated"

SKINS = {
    "crimson_bolt": ("#320008", "#8a0018", "#f51530", "#fff2f2"),
    "frost_runner": ("#043580", "#2d86d2", "#b2eaff", "#ffffff"),
    "toxic_lime": ("#06300c", "#12aa10", "#baff00", "#f3ff8f"),
    "royal_gold": ("#5c2808", "#b87908", "#f7c62f", "#fff9df"),
    "neon_synthwave": ("#100753", "#4c0b9d", "#f017c2", "#fff0fa"),
    "obsidian_ember": ("#19151d", "#34242b", "#f34c08", "#ffea72"),
    "deep_ocean": ("#001835", "#086f9b", "#20c4d5", "#cbffff"),
    "jungle_camo": ("#12280a", "#4e672d", "#a28c4f", "#dfd2a1"),
    "sunset_blaze": ("#a52c08", "#f36b04", "#ffcc11", "#fff4b4"),
}
ATLAS_WIDTH = 2048
POSE_FRAME = "CHR_Run_01"


def rgb(hexa: str) -> tuple[int, int, int]:
    return tuple(bytes.fromhex(hexa.lstrip("#")))


def mix(a, b, n):
    n = max(0.0, min(1.0, n))
    return tuple(round(a[i] * (1.0 - n) + b[i] * n) for i in range(3))


def hash2(x: int, y: int, seed: int = 0) -> float:
    n = (x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)
    n = (n ^ (n >> 13)) * 1274126177 & 0xffffffff
    return ((n ^ (n >> 16)) & 0xffff) / 65535.0


def noise(x: float, y: float, cell: int, seed: int) -> float:
    fx = x / cell
    fy = y / cell
    ix, iy = math.floor(fx), math.floor(fy)
    tx, ty = fx - ix, fy - iy
    tx = tx * tx * (3 - 2 * tx)
    ty = ty * ty * (3 - 2 * ty)
    aa = hash2(ix, iy, seed)
    ba = hash2(ix + 1, iy, seed)
    ab = hash2(ix, iy + 1, seed)
    bb = hash2(ix + 1, iy + 1, seed)
    return (aa * (1 - tx) + ba * tx) * (1 - ty) + (ab * (1 - tx) + bb * tx) * ty


def material_variant(skin: str, x: int, y: int) -> tuple[float, float]:
    """Return color/brightness offsets representing approved material details."""
    n = noise(x, y, 12, 4)
    if skin == "crimson_bolt":
        gloss = max(0, math.sin((x + y * .21) * .29)) ** 16
        return (-.07 + .20 * gloss + (n - .5) * .16, .20 * gloss)
    if skin == "frost_runner":
        # Angular facets, pale fractured edges and blue crystalline shadows.
        fx = (x // 13) * 13
        fy = (y // 13) * 13
        facet = hash2(x // 13, y // 13, 12)
        fissure = 1.0 if abs((x - fx) - (y - fy) * .67) < .85 else 0.0
        return ((facet - .5) * .56 + fissure * .36, fissure * .45)
    if skin == "toxic_lime":
        shine = max(0, math.sin(y * .23 + x * .17)) ** 10
        return (.08 + .15 * n + .19 * shine, .24 * shine)
    if skin == "royal_gold":
        reflection = math.sin(x * .18 + y * .13 + n * 2.2)
        faceted = hash2(x // 17, y // 11, 18)
        sparkle = max(0, math.sin(x * .31 - y * .27)) ** 22
        return (.16 * reflection + (faceted - .5) * .19, .26 * sparkle)
    if skin == "neon_synthwave":
        neon = max(0, math.sin(y * .26 + x * .13)) ** 14
        edge = max(0, math.sin(x * .46 - y * .28)) ** 18
        return (.27 * neon + .20 * edge, .35 * max(neon, edge))
    if skin == "obsidian_ember":
        wave = math.sin(x * .27 + noise(x, y, 15, 8) * 6)
        vein = math.sin(y * .34 + noise(x, y, 19, 5) * 6)
        crack = max(0, 1 - abs(wave + vein * .8) * 2.7)
        return (-.25 + crack * .98, crack * .48)
    if skin == "deep_ocean":
        swirl = math.sin(x * .13 + y * .14 + noise(x, y, 23, 16) * 5)
        bubble = (hash2(x // 17, y // 17, 7) > .86 and
                  abs(x % 17 - 8) < 1.8 and abs(y % 17 - 9) < 1.8)
        return (.23 * swirl + (.40 if bubble else 0), .23 if bubble else 0)
    if skin == "jungle_camo":
        broad = noise(x, y, 15, 10) * .75 + noise(x, y, 7, 23) * .25
        tone = (-.35 if broad < .38 else .03 if broad < .55 else
                .42 if broad < .69 else .72)
        return (tone, .0)
    if skin == "sunset_blaze":
        flames = math.sin(x * .16 + y * .07 + noise(x, y, 12, 23) * 6.4)
        tip = math.sin(y * .25 + x * .11) ** 2
        return (.32 * flames + .18 * tip, .19 * tip)
    raise KeyError(skin)


def palette(skin: str) -> list[tuple[int, int, int]]:
    return [rgb(code) for code in SKINS[skin]]


def create_material(skin: str, width: int = 220, height: int = 170):
    colors = palette(skin)
    output = []
    for y in range(height):
        row = []
        for x in range(width):
            v, glow = material_variant(skin, x, y)
            # Material does not depend on which animation is being played.
            grade = max(0.0, min(1.0, .46 + v))
            if skin == "obsidian_ember" and grade < .53:
                grade *= .52
            idx = min(2, int(grade * 3))
            frac = grade * 3 - idx
            c = mix(colors[idx], colors[idx + 1], frac)
            if glow:
                c = mix(c, colors[3], glow * .50)
            row.append(c)
        output.append(row)
    return output


def paint_frame(source: Image.Image, xoffset: int, yoffset: int, skin: str, mat):
    source = source.convert("RGBA")
    out = Image.new("RGBA", source.size)
    px = source.load()
    dst = out.load()
    cols = palette(skin)
    for y in range(source.height):
        material_y = min(len(mat) - 1, max(0, y + yoffset))
        for x in range(source.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            material_x = min(len(mat[0]) - 1, max(0, x + xoffset))
            core = mat[material_y][material_x]
            # Use original pixel luminance as shade/contour information.
            # Dark blue ink becomes the new contrasting material outline.
            luma = .2126 * r + .7152 * g + .0722 * b
            if luma < 65:
                col = mix(cols[0], cols[1], max(0, luma / 65) * .18)
            elif luma < 125:
                col = mix(cols[0], core, .30 + (luma - 65) / 60 * .38)
            else:
                col = mix(core, cols[3], .06 + (luma - 125) / 130 * .54)
            dst[x, y] = (*col, a)
    return out



# Crimson Bolt is intentionally a separate material pipeline. Do not modify
# the other eight skin algorithms while tuning this one. Its approved concept:
# dark burgundy ink, a vivid ruby-red candy-metal body, elongated brilliant
# specular highlights, and a completely blank ivory-white head interior.
def _crimson_face(source: Image.Image, xoff: int, yoff: int, frame_name: str):
    """Find the enclosed white face in the ORIGINAL PNG, not an invented head.

    Original APK player sprites have a bright white circular face bounded by
    dark-blue ink. We select the most round, substantial white connected area,
    then render that area ivory instead of incorrectly painting it ruby.
    """
    w, h = source.size
    px = source.load()
    mask = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 178 and min(r, g, b) > 188 and max(r, g, b) - min(r, g, b) < 40:
                mask[y * w + x] = 1
    seen = bytearray(w * h)
    best = None
    hints = (("Run", (80, 27)), ("Jump", (84, 37)),
             ("Glide", (105, 63)), ("SuperSketchman", (104, 60)))
    hint = next((point for prefix, point in hints if frame_name.startswith("CHR_" + prefix)), None)
    for i in range(w * h):
        if not mask[i] or seen[i]:
            continue
        stack = [i]
        seen[i] = 1
        count = 0
        sx = sy = 0
        minx = w
        miny = h
        maxx = maxy = -1
        while stack:
            v = stack.pop()
            y, x = divmod(v, w)
            count += 1
            sx += x
            sy += y
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)
            for j in (v - 1, v + 1, v - w, v + w):
                if j < 0 or j >= w * h:
                    continue
                yy, xx = divmod(j, w)
                if abs(xx - x) + abs(yy - y) != 1:
                    continue
                if mask[j] and not seen[j]:
                    seen[j] = 1
                    stack.append(j)
        dx, dy = maxx - minx + 1, maxy - miny + 1
        if count < 28 or dx < 9 or dy < 9 or dx > 40 or dy > 40:
            continue
        aspect = min(dx, dy) / max(dx, dy)
        density = count / (dx * dy)
        if aspect < .60 or density < .36:
            continue
        cx, cy = sx / count, sy / count
        score = count * aspect ** 2 * density
        if hint:
            distance = math.hypot(cx + xoff - hint[0], cy + yoff - hint[1])
            score -= distance * .38
        if best is None or score > best["score"]:
            best = dict(score=score, cx=cx, cy=cy, rx=dx / 2, ry=dy / 2, size=count)
    return best


def _crimson_ink_distance(source: Image.Image):
    """Distance from pale interior pixels to original dark navy outlines.

    This creates long specular strokes that follow the original body contours,
    instead of arbitrary geometric light stripes unrelated to the animation.
    """
    w, h = source.size
    px = source.load()
    far = w + h + 5
    distance = [far] * (w * h)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 160 or (.21 * r + .72 * g + .07 * b) < 105:
                distance[y * w + x] = 0
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if x:
                distance[i] = min(distance[i], distance[i - 1] + 1)
            if y:
                distance[i] = min(distance[i], distance[i - w] + 1)
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            i = y * w + x
            if x + 1 < w:
                distance[i] = min(distance[i], distance[i + 1] + 1)
            if y + 1 < h:
                distance[i] = min(distance[i], distance[i + w] + 1)
    return distance


def paint_crimson_frame(source: Image.Image, xoff: int, yoff: int, frame_name: str):
    """Paint glossy metallic red, preserving exact original alpha and pose."""
    source = source.convert("RGBA")
    w, h = source.size
    original = source.load()
    out = Image.new("RGBA", source.size)
    dst = out.load()
    face = _crimson_face(source, xoff, yoff, frame_name)
    dist = _crimson_ink_distance(source)
    for y in range(h):
        for x in range(w):
            r, g, b, a = original[x, y]
            if not a:
                continue
            luma = .2126 * r + .7152 * g + .0722 * b
            fullx, fully = x + xoff, y + yoff
            # The original blank white face is the identifying feature of
            # Crimson Bolt. Keep its elliptical volume and subtle cool shade.
            if face:
                dx = (x - face["cx"]) / max(1, face["rx"] + .2)
                dy = (y - face["cy"]) / max(1, face["ry"] + .2)
                radial = math.hypot(dx, dy)
                if radial < 1.12 and luma > 172:
                    right = max(0., min(1., dx * .65 + radial * .16))
                    shade = max(0., min(.65, right * .51))
                    col = mix((255, 255, 255), (214, 213, 231), shade)
                    dst[x, y] = (*col, a)
                    continue
                if radial < 1.52 and luma <= 172:
                    # Dark burgundy outside; narrow cherry-red inner rim.
                    inner_edge = max(0., 1.0 - abs(radial - 1.13) / .29)
                    col = mix((69, 0, 12), (243, 7, 37), inner_edge * .76)
                    dst[x, y] = (*col, a)
                    continue

            if luma <= 80:
                # Rich near-black red ink defines the precise original outline.
                col = mix((56, 0, 9), (97, 0, 15), luma / 80)
            elif luma <= 165:
                # Volume under the glossy surface stays deep, saturated ruby.
                col = mix((96, 0, 15), (208, 0, 26), (luma - 80) / 85)
            else:
                t = (luma - 165) / 90
                col = mix((208, 0, 26), (253, 11, 40), t)
                # The white hot reflections follow the limb's *own* centerline.
                d = dist[y * w + x]
                streak = max(0., 1.0 - abs(d - 3.2) / 1.7)
                # Soft highlight breaks add the elongated liquid-metal facets
                # from the approved example without changing any silhouette.
                shimmer = .76 + .24 * math.sin(fullx * .17 + fully * .085) ** 2
                streak *= shimmer
                if streak > .24:
                    col = mix(col, (255, 229, 233), min(.78, (streak - .24) * 1.03))
                # Small concentrated white glints on the brightest surfaces.
                glint = max(0., 1. - abs(d - 3.9) / .8)
                if glint > .72 and math.sin(fullx * .20 - fully * .13) > .62:
                    col = mix(col, (255, 250, 250), (glint - .72) * .81)
            dst[x, y] = (*col, a)
    return out, face

def pack(frames, width=ATLAS_WIDTH):
    # Same packing for all nine variants, based on ORIGINAL trim sizes.
    # The original 132x143 frame-space positions remain in sprites.json.
    order = sorted(frames, key=lambda k: (-frames[k][1].height, k))
    regions = {}
    x = 2
    y = 2
    row_height = 0
    for name in order:
        im = frames[name][1]
        if x + im.width + 2 > width:
            y += row_height + 2
            row_height = 0
            x = 2
        regions[name] = (x, y, im.width, im.height)
        x += im.width + 2
        row_height = max(row_height, im.height)
    height = y + row_height + 2
    height = 2 ** math.ceil(math.log2(max(64, height)))
    return regions, height


def build(root=DIST, output=OUTPUT):
    output.mkdir(parents=True, exist_ok=True)
    metadata = json.loads((root / "assets" / "sprites.json").read_text())
    names = sorted(name for name in metadata if name.startswith("CHR_"))
    if len(names) != len(set(names)) or not names:
        raise ValueError("Invalid original player-frame inventory")
    cache = {}
    frames = {}
    for name in names:
        info = metadata[name]
        v = info["v"]
        filename = root / "assets" / "Graphics" / info["atlas"] / f"{info['atlas']}_{v[0]+1}.png"
        if filename not in cache:
            cache[filename] = Image.open(filename).convert("RGBA")
        original = cache[filename].crop((v[1], v[2], v[3], v[4]))
        if original.size != (v[7], v[8]):
            raise AssertionError(f"Original trim mismatch: {name}")
        frames[name] = (v, original)
    regions, height = pack(frames)
    manifest = {"version": 1, "frameCount": len(names), "width": ATLAS_WIDTH,
                "height": height, "frames": {key: list(box) for key, box in regions.items()},
                "skins": sorted(SKINS)}
    (output / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":"), sort_keys=True))
    for skin in SKINS:
        material = create_material(skin)
        atlas = Image.new("RGBA", (ATLAS_WIDTH, height))
        total = 0
        for name in names:
            v, src = frames[name]
            if skin == "crimson_bolt":
                paint, head = paint_crimson_frame(src, v[11], v[12], name)
                if name == POSE_FRAME:
                    print("Crimson face registration:", head, flush=True)
            else:
                paint = paint_frame(src, v[11], v[12], skin, material)
            # Exact alpha-preservation, including antialiased edges.
            if paint.getchannel("A").tobytes() != src.getchannel("A").tobytes():
                raise AssertionError(f"Alpha and silhouette changed: {skin} {name}")
            region = regions[name]
            atlas.paste(paint, region[:2])
            total += 1
        atlas.save(output / f"{skin}.png", optimize=True, compress_level=9)
        # Thumbnail uses the ACTUAL painted CHR_Run_01 pixels, not concept art.
        frame = frames[POSE_FRAME]
        region = regions[POSE_FRAME]
        original_v = frame[0]
        painted = atlas.crop((region[0], region[1], region[0]+region[2], region[1]+region[3]))
        canvas = Image.new("RGBA", (original_v[5], original_v[6]))
        canvas.paste(painted, (original_v[11], original_v[12]))
        thumb = Image.new("RGBA", (128, 128))
        # Center and scale consistently; never crop the character.
        canvas.thumbnail((115, 118), Image.Resampling.LANCZOS)
        thumb.alpha_composite(canvas, ((128-canvas.width)//2, (128-canvas.height)//2))
        thumb.save(output / f"{skin}-thumb.png", optimize=True)
        if total != len(names):
            raise AssertionError(f"Incomplete skin {skin}: {total}/{len(names)}")
        print(f"{skin}: {total} / {len(names)} frames, {ATLAS_WIDTH}x{height} atlas")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", type=Path, default=DIST)
    parser.add_argument("--out", type=Path, default=OUTPUT)
    args = parser.parse_args()
    manifest = build(args.dist, args.out)
    print(f"SUCCESS: {len(manifest['skins']) * manifest['frameCount']} one-to-one sprite frames")
