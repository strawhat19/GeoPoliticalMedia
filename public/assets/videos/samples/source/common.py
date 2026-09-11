import math
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 720, 1280
NAVY = '#071321'
WHITE = '#F4F7FB'
MUTED = '#8C9CAE'

@lru_cache(maxsize=100)
def font(size, bold=False, mono=False):
    name = 'consolab' if mono and bold else 'consola' if mono else 'segoeuib' if bold else 'segoeui'
    return ImageFont.truetype(f'C:/Windows/Fonts/{name}.ttf', int(size))

def text(draw, xy, value, size=24, fill=WHITE, bold=False, anchor=None, mono=False):
    draw.text(xy, str(value), font=font(size, bold, mono), fill=fill, anchor=anchor)

def ease(p):
    p = max(0, min(1, p))
    return p * p * (3 - 2 * p)

def rgb(value):
    if isinstance(value, str):
        return tuple(int(value.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    return value[:3]

def mix_color(a, b, p):
    a, b = rgb(a), rgb(b)
    return tuple(round(x + (y - x) * max(0, min(1, p))) for x, y in zip(a, b))

@lru_cache(maxsize=10)
def base_background(accent):
    im = Image.new('RGB', (WIDTH, HEIGHT), NAVY)
    draw = ImageDraw.Draw(im)
    for y in range(HEIGHT):
        amount = 0.11 * max(0, 1 - abs(y - 390) / 700)
        draw.line((0, y, WIDTH, y), fill=mix_color(NAVY, accent, amount))
    return im

def background(accent, t):
    im = base_background(accent).copy()
    draw = ImageDraw.Draw(im)
    for x in range(40, WIDTH, 40):
        for y in range(180, 1060, 40):
            draw.ellipse((x, y, x+1, y+1), fill=mix_color(NAVY, accent, 0.12))
    draw.line((40, 1233, 680, 1233), fill='#1F3145', width=3)
    draw.line((40, 1233, 40 + int(640 * t / 8), 1233), fill=accent, width=3)
    text(draw, (40, 1202), 'GEO / SAMPLE SERIES', size=15, fill=MUTED)
    text(draw, (680, 1202), f'{min(8, t):04.1f} / 08.0', size=15, fill=MUTED, anchor='ra', mono=True)
    return im

def header(draw, channel, accent, tag):
    draw.rounded_rectangle((40, 47, 52, 82), radius=5, fill=accent)
    text(draw, (68, 43), channel, size=27, bold=True)
    text(draw, (40, 105), tag, size=16, fill=accent, bold=True)

def subtitle(im, lines):
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle((35, 1072, 685, 1177), radius=20, fill='#101F30', outline='#25384D', width=1)
    for i, line in enumerate(lines):
        text(draw, (360, 1090 + i * 34), line, size=26, bold=True, anchor='ma')

