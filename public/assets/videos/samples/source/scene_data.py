from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 720, 1280
NAVY = (7, 19, 33)
CYAN = (65, 223, 232)
WHITE = (239, 246, 252)
MUTED = (144, 166, 188)
PANEL = (14, 33, 50)


@lru_cache(maxsize=100)
def font(size, bold=False, mono=False):
    name = "consola" if mono else "segoeuib" if bold else "segoeui"
    return ImageFont.truetype(f"C:/Windows/Fonts/{name}.ttf", max(1, int(size)))


def ease(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def label(draw, xy, value, size, color=WHITE, bold=False, anchor=None, mono=False):
    draw.text(xy, value, font=font(size, bold, mono), fill=color, anchor=anchor)


def background():
    image = Image.new("RGB", (WIDTH, HEIGHT), NAVY)
    draw = ImageDraw.Draw(image)
    for x in range(35, 721, 43):
        draw.line((x, 325, x, 1033), fill=(12, 28, 42))
    for y in range(345, 1034, 43):
        draw.line((35, y, 685, y), fill=(12, 28, 42))
    draw.rounded_rectangle((44, 52, 82, 90), radius=11, fill=CYAN)
    for x, top in ((54, 71), (62, 65), (70, 59)):
        draw.rectangle((x, top, x + 4, 79), fill=NAVY)
    label(draw, (97, 51), "GEO DATA", 27, WHITE, True)
    label(draw, (676, 58), "LOCAL DEMO", 16, MUTED, anchor="ra")
    label(draw, (43, 123), "API TO ANSWER.", 56, WHITE, True)
    label(draw, (46, 202), "REQUEST. RESPONSE. INSIGHT.", 22, CYAN, True)
    return image


def request_scene(t):
    scene = Image.new("RGB", (632, 620), PANEL)
    draw = ImageDraw.Draw(scene)
    label(draw, (316, 38), "YOUR APP", 21, MUTED, True, "ma")
    draw.rounded_rectangle((41, 106, 591, 263), radius=20, fill=(21, 49, 65), outline=(37, 83, 98), width=2)
    draw.rounded_rectangle((65, 134, 166, 184), radius=9, fill=CYAN)
    label(draw, (115, 140), "GET", 28, NAVY, True, "ma", True)
    label(draw, (190, 137), "/sales", 41, WHITE, True, mono=True)
    label(draw, (67, 209), "Request sales totals", 24, MUTED)
    for y in range(289, 398, 20):
        draw.line((316, y, 316, y + 9), fill=(47, 88, 105), width=3)
    packet_y = 285 + ((t * 1.2) % 1) * 104
    draw.rounded_rectangle((304, packet_y, 328, packet_y + 10), radius=4, fill=CYAN)
    draw.polygon(((305, 390), (327, 390), (316, 405)), fill=CYAN)
    draw.rounded_rectangle((194, 422, 438, 502), radius=18, fill=(20, 54, 68), outline=CYAN, width=2)
    label(draw, (316, 439), "SALES API", 30, CYAN, True, "ma")
    label(draw, (316, 546), "A clear question for the server.", 23, MUTED, anchor="ma")
    return scene


def response_scene(t):
    scene = Image.new("RGB", (632, 620), PANEL)
    draw = ImageDraw.Draw(scene)
    label(draw, (39, 38), "RESPONSE", 21, MUTED, True)
    draw.rounded_rectangle((435, 33, 590, 72), radius=11, fill=(23, 76, 73))
    label(draw, (513, 37), "200 OK", 23, (119, 245, 193), True, "ma", True)
    draw.rounded_rectangle((36, 108, 596, 486), radius=18, fill=(7, 23, 37))
    rows = ["{", '  "Mon": 12,', '  "Tue": 24,', '  "Wed": 36', "}"]
    for index, value in enumerate(rows):
        shown = ease((t - 2.5 - max(0, index - 1) * 0.14) / 0.25)
        color = tuple(int(a + (b - a) * shown) for a, b in zip((39, 57, 72), CYAN if index in (1, 2, 3) else WHITE))
        label(draw, (67, 136 + index * 63), value, 42, color, mono=True)
    label(draw, (316, 533), "JSON = structured data", 25, WHITE, True, "ma")
    label(draw, (316, 574), "Three labels. Three matching values.", 21, MUTED, anchor="ma")
    return scene


def chart_scene(t):
    scene = Image.new("RGB", (632, 620), PANEL)
    draw = ImageDraw.Draw(scene)
    label(draw, (39, 32), "Sales by day", 35, WHITE, True)
    label(draw, (39, 91), "UNITS", 17, MUTED, True)
    baseline = 468
    for value in (0, 12, 24, 36):
        y = baseline - value / 36 * 312
        draw.line((99, y, 588, y), fill=(41, 61, 79), width=2)
        label(draw, (77, y - 15), str(value), 22, MUTED, anchor="ra", mono=True)
    for index, (day, value) in enumerate((('Mon', 12), ('Tue', 24), ('Wed', 36))):
        progress = ease((t - 5.08 - index * 0.10) / 0.6)
        center = 179 + index * 158
        top = baseline - value / 36 * 312 * progress
        if progress > 0:
            draw.rounded_rectangle((center - 45, top, center + 45, baseline), radius=min(12, int((baseline - top) / 2)), fill=CYAN)
            draw.rectangle((center - 45, max(top, baseline - 12), center + 45, baseline), fill=CYAN)
        label(draw, (center, top - 45), str(value), 31, WHITE, True, "ma", True)
        label(draw, (center, baseline + 18), day, 27, WHITE, True, "ma")
    label(draw, (316, 565), "12  →  24  →  36", 26, CYAN, True, "ma", True)
    return scene


def render(t):
    image = background()
    draw = ImageDraw.Draw(image)
    stage = 0 if t < 2.5 else 1 if t < 5 else 2
    centers = (137, 360, 583)
    for index, title in enumerate(("REQUEST", "JSON", "CHART")):
        center = centers[index]
        color = CYAN if index <= stage else (66, 88, 108)
        if index < 2:
            draw.line((center + 25, 294, centers[index + 1] - 25, 294), fill=(35, 70, 84), width=3)
        draw.ellipse((center - 19, 275, center + 19, 313), fill=color)
        label(draw, (center, 277), str(index + 1), 23, NAVY, True, "ma")
        label(draw, (center, 327), title, 18, color, True, "ma")
    draw.rounded_rectangle((44, 388, 676, 1008), radius=25, fill=PANEL, outline=(28, 64, 80), width=2)
    if t < 2.38:
        scene = request_scene(t)
    elif t < 2.72:
        scene = Image.blend(request_scene(t), response_scene(t), ease((t - 2.38) / 0.34))
    elif t < 4.88:
        scene = response_scene(t)
    elif t < 5.22:
        scene = Image.blend(response_scene(t), chart_scene(t), ease((t - 4.88) / 0.34))
    else:
        scene = chart_scene(t)
    image.paste(scene.crop((2, 2, 630, 618)), (46, 390))
    return image
