from functools import lru_cache
from math import cos, pi, sin

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 720, 1280
NAVY = (7, 19, 33)
CORAL = (255, 122, 145)
PAPER = (247, 243, 237)
INK = (24, 34, 47)


@lru_cache(maxsize=100)
def font(size, bold=False):
    return ImageFont.truetype(f"C:/Windows/Fonts/{'segoeuib' if bold else 'segoeui'}.ttf", max(1, int(size)))


def ease(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def lerp(start, end, progress):
    return start + (end - start) * progress


def label(draw, xy, value, size, color=INK, bold=False, anchor=None):
    draw.text(xy, value, font=font(size, bold), fill=color, anchor=anchor)


def background(t):
    image = Image.new("RGB", (WIDTH, HEIGHT), NAVY)
    draw = ImageDraw.Draw(image)
    for y in range(0, HEIGHT, 2):
        strength = max(0, 1 - abs(y - 390) / 700)
        color = tuple(int(lerp(a, b, strength * 0.32)) for a, b in zip(NAVY, (41, 31, 57)))
        draw.line((0, y, WIDTH, y), fill=color, width=2)
    for x in range(36, 720, 42):
        for y in range(330, 1050, 42):
            draw.ellipse((x, y, x + 1, y + 1), fill=(40, 43, 59))
    draw.rounded_rectangle((44, 52, 82, 90), radius=11, fill=CORAL)
    draw.rectangle((55, 63, 71, 79), outline=NAVY, width=3)
    label(draw, (97, 51), "GEO STUDIOS", 27, (239, 242, 249), True)
    label(draw, (676, 58), "DESIGN / 01", 16, (135, 147, 166), anchor="ra")
    label(draw, (43, 121), "ONE SCREEN.", 53, (244, 246, 252), True)
    label(draw, (43, 184), "BETTER DESIGN.", 53, CORAL, True)
    return image


def artwork(draw, cx, cy, scale, rotation):
    radius = 87 * scale
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(255, 135, 146))
    for index in range(7):
        angle = rotation + index * pi / 7
        x = cx + cos(angle) * radius * 0.45
        y = cy + sin(angle) * radius * 0.45
        inner = radius * 0.67
        draw.ellipse((x - inner, y - inner, x + inner, y + inner), outline=(153, 45, 81), width=max(1, int(2 * scale)))
    dot = 20 * scale
    draw.ellipse((cx - dot, cy - dot, cx + dot, cy + dot), fill=INK)


def render(t):
    image = background(t)
    draw = ImageDraw.Draw(image)
    progress = ease((t - 2.55) / 2.25)
    color = tuple(int(lerp(a, b, progress)) for a, b in zip((115, 133, 155), CORAL))
    state = "BEFORE" if progress < 0.5 else "AFTER"
    draw.rounded_rectangle((44, 282, 166, 317), radius=17, fill=color)
    label(draw, (105, 286), state, 19, NAVY, True, "ma")
    label(draw, (677, 289), "TYPE   /   SPACE   /   FOCUS", 17, (152, 163, 183), anchor="ra")
    draw.rounded_rectangle((44, 345, 676, 983), radius=26, fill=(1, 8, 17))
    draw.rounded_rectangle((44, 334, 676, 972), radius=26, fill=PAPER)
    draw.rounded_rectangle((44, 334, 676, 371), radius=24, fill=(225, 221, 215))
    draw.rectangle((44, 352, 676, 371), fill=(225, 221, 215))
    for x in (64, 80, 96):
        draw.ellipse((x, 348, x + 7, 355), fill=(160, 161, 162))
    label(draw, (360, 340), "studiojune.example", 15, (107, 111, 117), anchor="ma")
    inset = lerp(19, 43, progress)
    left = 44 + inset
    label(draw, (left, lerp(389, 398, progress)), "studio june.", lerp(24, 25, progress), INK, True)
    label(draw, (633, lerp(395, 403, progress)), "Work   About", lerp(14, 18, progress), INK, anchor="ra")
    label(draw, (left, lerp(443, 469, progress)), "Made to", lerp(36, 68, progress), INK, True)
    label(draw, (left, lerp(486, 543, progress)), "stand out.", lerp(29, 68, progress), INK, True)
    artwork(draw, lerp(535, 530, progress), lerp(538, 672, progress), lerp(0.80, 1.03, progress), 0.45 + t * 0.07)
    if progress < 1 / 3:
        opacity = 1 - ease(progress * 3)
        busy = tuple(int(lerp(a, b, opacity)) for a, b in zip(PAPER, (216, 166, 175)))
        draw.rounded_rectangle((left, 642, left + 226, 692), radius=9, outline=busy, width=2)
        label(draw, (left + 17, 651), "Explore Our Work", 23, busy, True)
        draw.rounded_rectangle((377, 740, 630, 796), radius=8, outline=busy, width=2)
        label(draw, (394, 751), "View Our Services", 23, busy, True)
        for y in (713, 724, 735, 746):
            draw.line((left, y, left + 245, y), fill=busy, width=2)
        label(draw, (left, 901), "CREATIVE / DIGITAL / BRAND", 17, busy)
    label(draw, (left, lerp(539, 751, progress)), "Websites, apps &", lerp(27, 23, progress), INK)
    label(draw, (left, lerp(571, 782, progress)), "visual identities.", lerp(20, 23, progress), INK)
    button_x = lerp(382, 87, progress)
    button_y = lerp(853, 846, progress)
    button_width = lerp(248, 263, progress)
    draw.rounded_rectangle((button_x, button_y, button_x + button_width, button_y + 67), radius=12, fill=INK)
    label(draw, (button_x + 25, button_y + 15), "Start A Project", 25, PAPER, True)
    label(draw, (button_x + button_width - 25, button_y + 14), "→", 27, PAPER, anchor="ra")
    if t > 5.15:
        fade = ease((t - 5.15) / 0.45)
        caption_color = tuple(int(lerp(a, b, fade)) for a, b in zip(NAVY, CORAL))
        label(draw, (360, 1001), "CLEAR TYPE. ROOM TO BREATHE. ONE CTA.", 18, caption_color, True, "ma")
    return image
