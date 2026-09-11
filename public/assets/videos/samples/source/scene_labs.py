import math
from PIL import ImageDraw
from common import background, ease, header, mix_color, text

ACCENT = '#AD8BFA'

def render(t):
    im = background(ACCENT, t)
    d = ImageDraw.Draw(im)
    header(d, 'Geo Labs', ACCENT, 'CODE / ONE SMALL FIX')
    text(d, (40, 175), 'SAME NUMBERS.', size=56, bold=True)
    text(d, (40, 242), 'RIGHT TYPE.', size=63, bold=True)
    fixed = t >= 3.0
    border = mix_color('#FA6B7B', '#50E3B5', ease((t-2.7)/0.7))
    d.rounded_rectangle((40, 373, 680, 799), radius=23, fill='#0B1727', outline=border, width=2)
    for i, c in enumerate(['#FA6B7B','#FFD47B','#50E3B5']):
        d.ellipse((63+i*26,397,77+i*26,411), fill=c)
    text(d, (650, 391), 'PYTHON', size=16, fill='#8C9CAE', mono=True, anchor='ra')
    d.line((40, 435, 680, 435), fill='#24364B')
    text(d, (70, 467), "a = '2'", size=34, fill='#CBB8FF', mono=True)
    text(d, (70, 520), "b = '3'", size=34, fill='#CBB8FF', mono=True)
    if fixed:
        text(d, (70, 595), 'int(a) + int(b)', size=39, fill='#50E3B5', mono=True, bold=True)
    else:
        text(d, (70, 595), 'a + b', size=39, fill='#FA6B7B', mono=True, bold=True)
    d.rounded_rectangle((65, 677, 655, 769), radius=13, fill='#13253A')
    text(d, (86, 690), 'RESULT', size=15, fill='#8C9CAE', mono=True)
    text(d, (624, 695), '5' if fixed else "'23'", size=45, fill=border, mono=True, bold=True, anchor='ra')
    if fixed:
        text(d, (360, 857), 'TEXT → NUMBERS', size=35, fill='#50E3B5', bold=True, anchor='ma')
        text(d, (360, 913), 'Convert, then add.', size=26, fill='#A0B0C1', anchor='ma')
    else:
        text(d, (360, 857), 'WHY DID IT JOIN?', size=35, fill='#FA6B7B', bold=True, anchor='ma')
        text(d, (360, 913), 'These values are text.', size=26, fill='#A0B0C1', anchor='ma')
    return im

