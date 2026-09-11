import math
from PIL import ImageDraw
from common import background, ease, header, mix_color, text

ACCENT = '#FF435D'

def render(t):
    im = background(ACCENT, t)
    d = ImageDraw.Draw(im)
    header(d, 'GeoPoliticalMedia', ACCENT, 'THE ECONOMY / EXPLAINED')
    text(d, (40, 173), 'INFLATION DOWN.', size=52, bold=True)
    text(d, (40, 240), 'PRICES UP?', size=68, bold=True)
    d.rounded_rectangle((40, 355, 680, 462), radius=22, fill='#142334', outline='#2B3C4E')
    text(d, (65, 372), 'ANNUAL INFLATION', size=18, fill='#A0B0C1')
    text(d, (65, 399), '10%', size=39, fill=ACCENT, bold=True)
    text(d, (210, 399), '→', size=39, fill='#A0B0C1')
    text(d, (290, 399), '5%', size=39, fill='#50E3B5', bold=True)
    text(d, (640, 411), 'STILL POSITIVE', size=18, fill='#50E3B5', bold=True, anchor='ra')
    text(d, (40, 495), 'SAME EXAMPLE BASKET', size=18, fill='#A0B0C1')
    base = 947
    bars = [(82, 100, 0.1, '#718AA4', 'START'), (287, 110, 1.6, '#FF657B', 'YEAR 1'), (492, 115.5, 3.6, '#50E3B5', 'YEAR 2')]
    for x, value, start, color, label in bars:
        progress = ease((t-start)/0.85)
        height = int(value * 3.35 * progress)
        if height > 0:
            d.rounded_rectangle((x, base-height, x+145, base), radius=13, fill=color)
            text(d, (x+72, base-height-58), f'${value:.2f}', size=31, bold=True, anchor='ma')
        text(d, (x+72, 964), label, size=18, fill='#A0B0C1', bold=True, anchor='ma')
    d.line((62, 948, 657, 948), fill='#778CA3', width=2)
    text(d, (360, 1020), 'ILLUSTRATIVE PRICES · NOT A CURRENT REPORT', size=16, fill='#8C9CAE', anchor='ma')
    return im

