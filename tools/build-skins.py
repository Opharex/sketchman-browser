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


# Frost Runner material: faceted, bright translucent-looking ice. The outline,
# the alpha channel, every trim offset and every pose come from the APK.
# Each source sprite is recolored ONLY for this one skin; the frost particles
# are a separate cosmetic effect rendered at the original actor anchor.
def paint_frost_frame(source: Image.Image, xoff: int, yoff: int, frame_name: str):
    source = source.convert("RGBA")
    w, h = source.size
    sp = source.load()
    out = Image.new("RGBA", source.size)
    dest = out.load()
    face = _crimson_face(source, xoff, yoff, frame_name)
    distances = _crimson_ink_distance(source)
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if not a:
                continue
            fx, fy = x + xoff, y + yoff
            lum = .2126 * r + .7152 * g + .0722 * b
            # Angular frosted facets at multiple scales. The sharp edges and
            # pale centers imitate fractured transparent ice, not a blue paint.
            cellx, celly = fx // 12, fy // 12
            fragment = hash2(cellx, celly, 93)
            offset = hash2(cellx, celly, 48) * 7.0
            u, v = (fx + offset) % 12, (fy + offset * .6) % 12
            ridge = abs(u * .82 + v * .65 - 10)
            diag = max(0., 1. - ridge / 2.2)
            crack = max(0., 1. - abs(u * .44 - v * .85 + 1.7) / .95)
            prism = max(0., math.sin(fx * .21 - fy * .16 + fragment * 4.6))
            center = distances[y * w + x]
            if lum < 86:
                # Crisp deep-cobalt ink is essential to the reference design.
                col = mix((1, 23, 99), (8, 54, 166), lum / 86)
            elif lum < 148:
                col = mix((11, 61, 166), (43, 151, 237), (lum - 86) / 62)
            else:
                shade = max(0., min(1., .44 + (lum - 148) / 107 * .29 + (fragment - .5) * .38))
                col = mix((36, 115, 214), (202, 242, 255), shade)
                col = mix(col, (247, 253, 255), min(.83, diag * .50 + crack * .27 + prism * .15))
                if center > 2:
                    col = mix(col, (236, 251, 255), min(.42, (center - 2) / 7.0))
            # The ice head is translucent-looking and full of bright facets.
            # Unlike Crimson, its original white face is NOT kept plain white.
            if face:
                dx = (x - face["cx"]) / max(1., face["rx"])
                dy = (y - face["cy"]) / max(1., face["ry"])
                radius = math.hypot(dx, dy)
                if radius < 1.08 and lum > 157:
                    upper = max(0., 1. - (dy + .25) * .54)
                    ice = mix((99, 190, 252), (250, 254, 255), min(1., upper * .67 + fragment * .23))
                    ice = mix(ice, (255, 255, 255), min(.67, diag * .43 + crack * .28))
                    col = ice
            dest[x, y] = (*col, a)
    return out


# Solar material: this is a separate Sunset Blaze rendering branch.
# Source pose, canvas size, trim offsets, transparency and animation order
# remain completely identical to the original APK frames.
def _solar_alpha_distance(source: Image.Image):
    """Distance to transparent backdrop; keeps the orange rim on silhouettes."""
    w, h = source.size
    px = source.load()
    far = w + h + 5
    distance = [far] * (w * h)
    for y in range(h):
        for x in range(w):
            if px[x, y][3] < 115:
                distance[y * w + x] = 0
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if x:
                distance[i] = min(distance[i], distance[i-1] + 1)
            if y:
                distance[i] = min(distance[i], distance[i-w] + 1)
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            i = y * w + x
            if x + 1 < w:
                distance[i] = min(distance[i], distance[i+1] + 1)
            if y + 1 < h:
                distance[i] = min(distance[i], distance[i+w] + 1)
    return distance


def _solar_smoothstep(low, high, value):
    t = max(0., min(1., (value - low) / (high - low)))
    return t*t*(3 - 2*t)


def paint_sunset_frame(source: Image.Image, xoff: int, yoff: int, frame_name: str):
    """Make the original stick-figure sprite resemble the approved solar art.

    1. Detect the actual white face from the original APK sprite.
    2. Paint its hot reflective solar orb WITHOUT re-drawing anatomy.
    3. Render multiscale molten ribbon patterns within the existing limbs,
       using their own interior-distance field for contour-flow.
    4. Keep a dark burnt-orange ink contour and a light orange exterior rim.
    No new alpha pixels, pose estimates, or runtime graphics are introduced.
    """
    source = source.convert("RGBA")
    width, height = source.size
    src = source.load()
    output = Image.new("RGBA", source.size)
    dst = output.load()
    face = _crimson_face(source, xoff, yoff, frame_name)
    ink_distance = _crimson_ink_distance(source)
    outside_distance = _solar_alpha_distance(source)

    for y in range(height):
        for x in range(width):
            r, g, b, alpha = src[x, y]
            if not alpha:
                continue
            luminance = .2126*r + .7152*g + .0722*b
            fx, fy = x + xoff, y + yoff
            edge = outside_distance[y*width + x]
            inside = ink_distance[y*width + x]

            if face:
                dx = (x - face["cx"]) / max(1., face["rx"])
                dy = (y - face["cy"]) / max(1., face["ry"])
                radius = math.hypot(dx, dy)
                if radius < 1.09 and luminance > 160:
                    # Upper-right white-hot glossy highlight, amber midlayer,
                    # and red-orange molten swirls around the lower-left.
                    hotspot = math.exp(-((dx-.34)**2 + (dy+.30)**2)/.25)
                    swirl = .5 + .5*math.sin(dx*4.5 + dy*3.7 +
                                             noise(fx, fy, 9, 4)*2.5)
                    heat = max(0., min(1., .52 + hotspot*.34 - dy*.16 +
                                       swirl*.13))
                    color = mix((255, 89, 14), (255, 202, 17),
                                _solar_smoothstep(.08, .68, heat))
                    color = mix(color, (255, 252, 148),
                                _solar_smoothstep(.54, .89, heat))
                    color = mix(color, (255, 255, 241),
                                _solar_smoothstep(.85, .99, heat)*.80)
                    if dx < -.12 and dy > .13:
                        flame = max(0., math.sin(dx*9 - dy*9 + swirl*4))*.42
                        color = mix(color, (245, 45, 19), flame)
                    dst[x, y] = (*color, alpha)
                    continue
                if radius < 1.50 and luminance < 165:
                    # Dark red inner head ring plus outer fiery orange lip.
                    inner_rim = max(0., 1. - abs(radius-1.13)/.28)
                    color = mix((134, 27, 0), (251, 88, 0),
                                inner_rim*.50)
                    if edge <= 2:
                        color = (255, 149, 13)
                    dst[x, y] = (*color, alpha)
                    continue

            # Fire ribbons follow the contours in each *actual* pose rather
            # than being stamped onto a single generic runner pose.
            small = noise(fx, fy, 9, 1)
            large = noise(fx, fy, 18, 17)
            flame1 = math.sin(inside*1.55 + large*4.1 + fx*.069 - fy*.083)
            flame2 = math.sin(inside*.85 - small*4.2 + fx*.19 + fy*.055)
            heat = max(0., min(1., .49 + .22*flame1 + .19*flame2 +
                                .13*(large-.5)))

            if luminance < 105 and edge <= 3:
                # Burnt-red inset contour, separate from the bright outer lip.
                color = mix((131, 24, 0), (180, 45, 0),
                            max(0., luminance/105))
            else:
                color = mix((247, 64, 33), (253, 131, 9),
                            _solar_smoothstep(.02, .44, heat))
                color = mix(color, (255, 199, 8),
                            _solar_smoothstep(.38, .80, heat))
                color = mix(color, (255, 243, 41),
                            _solar_smoothstep(.71, .92, heat))
                color = mix(color, (255, 253, 173),
                            _solar_smoothstep(.92, 1., heat)*.70)
                light = (luminance - 110)/145.
                color = mix((209, 59, 12), color,
                            .78 + .22*max(0., min(1., light)))
            if edge <= 1:
                color = (255, 151, 16)
            elif edge <= 2 and luminance < 115:
                color = mix(color, (237, 93, 0), .28)
            dst[x, y] = (*color, alpha)
    return output


# Obsidian Ember: independent, pre-baked material. No other skin renderer,
# sprite alpha or animation pose is touched by this implementation.
def _ember_smoothstep(lo, hi, v):
    t = max(0., min(1., (v-lo)/(hi-lo)))
    return t*t*(3-2*t)


def _ember_voronoi(x, y, period, seed):
    """Rugged volcanic plates separated by connected molten fault lines."""
    gx = int(math.floor(x/period))
    gy = int(math.floor(y/period))
    nearest, runner_up = 1e8, 1e8
    winning_tile = (0, 0)
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            xx = gx+ox
            yy = gy+oy
            # Jitter produces irregular basalt slabs, not a square grid.
            cx = (xx+.5+(hash2(xx, yy, seed)-.5)*.82)*period
            cy = (yy+.5+(hash2(xx, yy, seed+33)-.5)*.82)*period
            dx, dy = x-cx, y-cy
            d = dx*dx + dy*dy
            if d < nearest:
                runner_up = nearest
                nearest = d
                winning_tile = (xx, yy)
            elif d < runner_up:
                runner_up = d
    # Difference of nearest distances is zero on plate boundaries.
    seam = max(0., math.sqrt(runner_up)-math.sqrt(nearest))
    return seam, hash2(winning_tile[0], winning_tile[1], seed+63)


def _ember_mix(a, b, strength):
    return mix(a, b, max(0., min(1., strength)))


def _ember_shade(rock, heat):
    """Black volcanic chunks around yellow-hot cracks and red ember halos."""
    # Heat is zero on cooled rock and close to one along molten fissures.
    if heat <= .085:
        return rock
    if heat <= .25:
        return _ember_mix(rock, (109, 17, 6), _ember_smoothstep(.075, .25, heat))
    if heat <= .44:
        return _ember_mix((109, 17, 6), (216, 43, 2),
                          _ember_smoothstep(.25, .44, heat))
    if heat <= .65:
        return _ember_mix((216, 43, 2), (255, 98, 4),
                          _ember_smoothstep(.44, .65, heat))
    if heat <= .82:
        return _ember_mix((255, 98, 4), (255, 194, 16),
                          _ember_smoothstep(.65, .82, heat))
    return _ember_mix((255, 194, 16), (255, 252, 108),
                      _ember_smoothstep(.82, 1., heat))


def build_obsidian_material(width=220, height=170):
    """Generate a coherent multiscale 2D lava-crust texture once at build time.

    Cracked basalt plates (Voronoi cells) make branching connected fissures;
    finer fractures and noise add irregularity. This is baked into PNGs, never
    evaluated during gameplay. Local light catches the raised rock surfaces.
    """
    image = []
    for y in range(height):
        row = []
        for x in range(width):
            # Distortion of plate edges prevents artificial straight segments.
            warp_x = (noise(x, y, 14, 41)-.5)*7.2
            warp_y = (noise(x, y, 15, 65)-.5)*7.2
            xx, yy = x+warp_x, y+warp_y
            large, tile = _ember_voronoi(xx, yy, 18, 17)
            small, grain = _ember_voronoi(xx+6.5, yy-3.6, 9, 91)
            rough = noise(x, y, 6, 72)
            pits = noise(x, y, 3, 8)

            # Mostly charcoal-black rock with uneven sculpted plates, not
            # a plain black fill or an orange gradient.
            gray = round(18 + tile*24 + rough*13 + pits*5)
            rock = (gray+2, max(0,gray-2), gray+1)

            # Broad molten channels with thinner branching networks.
            vein1 = 1.0-_ember_smoothstep(.20, 3.6, large)
            vein2 = (1.0-_ember_smoothstep(.12, 1.55, small))*.88
            # Fine faults are intermittent to avoid making every pixel lava.
            if grain < .25:
                vein2 *= .37
            lava = max(vein1, vein2)
            lava = max(0., min(1., lava + (noise(x,y,7,117)-.5)*.16))

            # Bright glints around heated stone edges help sell hot cracks.
            near_seam = 1.0-_ember_smoothstep(1.4, 5.3, large)
            if lava < .25 and near_seam > .18:
                rock = _ember_mix(rock, (85, 34, 22), near_seam*.33)
            row.append(_ember_shade(rock, lava))
        image.append(row)
    return image


def obsidian_surface_mask(source: Image.Image):
    """Recover the FULL solid character body, not just its dark line art.

    The mobile APK figure contains dark navy ink with wide pale highlights
    inside the limbs and shoes. The previous mask discarded the pale interior
    pixels, causing an almost-white lava-rock character. Build a morphological
    closing of the ORIGINAL navy anatomy instead, filling narrow interior
    highlights without painting into the rectangular sprite background.
    """
    from PIL import ImageFilter
    source = source.convert("RGBA")
    w, h = source.size
    ink = Image.new("L", (w,h), 0)
    px, out = source.load(), ink.load()
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if a < 150:
                continue
            lum=.2126*r+.7152*g+.0722*b
            if (lum < 176 and b-r > 35 and b-g > 30):
                out[x,y]=255
    # Seven-pixel closing fills white interior slivers and highlights of the
    # original limbs, but does not fill the large gaps between limbs.
    # Union with original navy pixels so border strokes aren't dropped.
    closed=ink.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    op=closed.load()
    for y in range(h):
        for x in range(w):
            if out[x,y]>0:
                op[x,y]=255
    return closed


def obsidian_head_mask(x,y,face):
    """Confine head lava and dark basalt to the detected circular white face."""
    if not face:
        return 0.
    dx=(x-face["cx"])/max(1.,face["rx"]+.25)
    dy=(y-face["cy"])/max(1.,face["ry"]+.25)
    return 1.0-_ember_smoothstep(.95,1.08,math.hypot(dx,dy))


def paint_obsidian_frame(source: Image.Image, xoff: int, yoff: int,
                         frame_name: str, material):
    """Black volcanic character, molten fissures ONLY inside solid body/head.

    The complete body and head are painted from original blue strokes and
    enclosed internal highlights, instead of preserving a white character.
    The *outside* white halo/cyan shadow receives a subdued warm outline,
    never any crack pattern. The original alpha channel, frame shape,
    animation and trim metadata are never changed.
    """
    source=source.convert("RGBA")
    w,h=source.size
    px=source.load()
    rock_mask=obsidian_surface_mask(source).load()
    result=Image.new("RGBA",source.size)
    dest=result.load()
    face=_crimson_face(source,xoff,yoff,frame_name)
    molten_count=0
    head_count=0
    protected_count=0
    rock_count=0
    white_count=0
    alpha_count=0
    for y in range(h):
        fy=min(len(material)-1,max(0,y+yoff))
        for x in range(w):
            r,g,b,alpha=px[x,y]
            if not alpha:
                continue
            alpha_count+=1
            fx=min(len(material[0])-1,max(0,x+xoff))
            body=rock_mask[x,y]>127 and alpha>=45
            head=obsidian_head_mask(x,y,face)>.42 and alpha>=45
            if body or head:
                # Dark basalt replaces both the blue ink AND its formerly
                # white highlights, including shoes and head.
                rock=material[fy][fx]
                if head and not body:
                    dx=(x-face["cx"])/max(1.,face["rx"])
                    dy=(y-face["cy"])/max(1.,face["ry"])
                    rough=noise(x+xoff,y+yoff,5,151)
                    stone=round(19+rough*24)
                    basalt=(stone+4,max(0,stone-2),stone+2)
                    fault1=1.-_ember_smoothstep(.035,.29,
                        abs(dx+.17-.29*math.sin(dy*4.+rough*2.8)))
                    fault2=(1.-_ember_smoothstep(.02,.14,
                        abs(dy+.26-.21*math.sin(dx*5.1+rough*2.5))))*.85
                    hot=max(fault1,fault2)
                    if rock[0]>130 and rock[0]-rock[1]>65:
                        hot=max(hot,.50)
                    rock=_ember_shade(basalt,hot)
                    head_count+=1
                elif head:
                    head_count+=1
                rock_count+=1
                # Keep cracks completely confined to these solid material
                # pixels. The outer silhouette uses a different color branch.
                dest[x,y]=(*rock,alpha)
                if rock[0]>185 and rock[1]>45 and rock[0]>rock[1]+65:
                    molten_count+=1
            else:
                # Original opaque WHITE outline was the reported regression.
                # Paint its cosmetic border warm burnt umber; translucent
                # shadows become orange-red edge light. Never sample cracks.
                if alpha < 85:
                    border=(204,73,15)
                else:
                    lum=.2126*r+.7152*g+.0722*b
                    border=(111,34,14) if lum>105 else (48,26,24)
                dest[x,y]=(*border,alpha)
                protected_count+=1
            rr,gg,bb,aa=dest[x,y]
            if aa>150 and min(rr,gg,bb)>190:
                white_count+=1

    # Regression protection: no near-white painted body or unmasked lava,
    # while the independent outer glow and fire trail remain unchanged.
    if alpha_count and white_count>max(6,round(alpha_count*.015)):
        raise AssertionError(
            f"White Obsidian skin regression: {frame_name}: {white_count}/{alpha_count}")
    if rock_count == 0:
        raise AssertionError(f"Empty Obsidian body mask: {frame_name}")
    for y in range(h):
        for x in range(w):
            r,g,b,a=dest[x,y]
            if not a or (rock_mask[x,y]>127 and a>=45) or (
                    obsidian_head_mask(x,y,face)>.42 and a>=45):
                continue
            if r>180 and g>100 and b<100:
                raise AssertionError(
                    f"Lava escaped solid body mask: {frame_name} ({x},{y})")
    return result,head_count,molten_count


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
        material = build_obsidian_material() if skin == "obsidian_ember" else create_material(skin)
        atlas = Image.new("RGBA", (ATLAS_WIDTH, height))
        total = 0
        for name in names:
            v, src = frames[name]
            if skin == "crimson_bolt":
                paint, head = paint_crimson_frame(src, v[11], v[12], name)
                if name == POSE_FRAME:
                    print("Crimson face registration:", head, flush=True)
                    if head is None:
                        raise AssertionError("Could not identify the original running-frame face")
            elif skin == "frost_runner":
                paint = paint_frost_frame(src, v[11], v[12], name)
            elif skin == "obsidian_ember":
                paint, rock_head_pixels, lava_pixels = paint_obsidian_frame(
                    src, v[11], v[12], name, material)
                if name == POSE_FRAME:
                    if rock_head_pixels < 90:
                        raise AssertionError("Missing cracked volcanic head interior in running frame")
                    if lava_pixels < 70:
                        raise AssertionError("Missing bright lava cracks in running frame")
                    print("Obsidian Ember head pixels:",rock_head_pixels,
                          "molten pixels:",lava_pixels,flush=True)
            elif skin == "sunset_blaze":
                paint = paint_sunset_frame(src, v[11], v[12], name)
                if name == POSE_FRAME:
                    head = _crimson_face(src, v[11], v[12], name)
                    if head is None:
                        raise AssertionError("Sunset Blaze's original running-frame solar head was not found")
                    # Require both a golden hot region and red-orange material.
                    colored = [px for px in paint.getdata() if px[3] > 128]
                    if not any(px[0] >= 245 and px[1] >= 195 and 10 < px[2] < 220 for px in colored):
                        raise AssertionError("Missing solar hot-yellow core in the Run_01 skin")
                    if not any(px[0] > 185 and 30 <= px[1] < 145 and px[2] < 95 for px in colored):
                        raise AssertionError("Missing warm molten-orange ribbons in the Run_01 skin")
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
