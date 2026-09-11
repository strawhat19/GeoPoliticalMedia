"""Original animated runner sample for Geo Gaming."""

import math
from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT = 720, 1280
NAVY = (7, 19, 33)
MINT = (80, 227, 181)
VIOLET = (155, 122, 255)
WHITE = (239, 247, 255)


def font(size, bold=False, mono=False):
    name = "consola.ttf" if mono else "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype("C:/Windows/Fonts/" + name, size)


def text(draw, xy, value, size=24, fill=WHITE, bold=False, anchor=None, mono=False):
    draw.text(xy, value, font=font(size, bold, mono), fill=fill, anchor=anchor)


def ease(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def blend(first, second, amount):
    return tuple(round(a + (b - a) * amount) for a, b in zip(first, second))


def diamond(draw, cx, cy, radius, fill, outline=None):
    points = [(cx, cy - radius), (cx + radius, cy), (cx, cy + radius), (cx - radius, cy)]
    draw.polygon(points, fill=fill)
    if outline:
        draw.line(points + [points[0]], fill=outline, width=2)


def render(t):
    image = Image.new("RGB", (WIDTH, HEIGHT), NAVY)
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):
        color = blend(NAVY, (20, 24, 49), max(0, 1 - abs(y - 620) / 700) * 0.65)
        draw.line((0, y, WIDTH, y), fill=color)

    draw.rounded_rectangle((42, 51, 68, 77), 6, fill=MINT)
    draw.line((49, 64, 61, 64), fill=NAVY, width=3)
    draw.line((55, 58, 55, 70), fill=NAVY, width=3)
    text(draw, (82, 47), "GEO GAMING", 25, bold=True)
    text(draw, (678, 61), "PLAY / 05", 17, (143, 162, 183), anchor="rm", mono=True)
    draw.line((42, 110, 678, 110), fill=(44, 57, 78), width=1)

    text(draw, (42, 146), "ONE JUMP.", 66, bold=True)
    text(draw, (42, 218), "THREE OBSTACLES.", 42, MINT, bold=True)
    text(draw, (43, 285), "Can you time the gap?", 23, (162, 178, 197))

    panel = (40, 348, 680, 948)
    draw.rounded_rectangle(panel, 26, fill=(11, 22, 39), outline=(51, 64, 86), width=2)
    draw.rounded_rectangle((62, 369, 185, 406), 10, fill=(28, 37, 58))
    text(draw, (123, 387), "LEVEL 01", 18, MINT, anchor="mm", mono=True)
    text(draw, (654, 387), "NEON RUN", 18, (169, 152, 228), anchor="rm", mono=True)

    scene = Image.new("RGB", (600, 446), (11, 22, 39))
    play = ImageDraw.Draw(scene)
    scroll = 220 * min(t, 6.55)
    floor = 375
    runner_x = 140
    jump_start, jump_end = 3.1, 5.1
    jump_progress = (t - jump_start) / (jump_end - jump_start)
    jump = 218 * math.sin(math.pi * jump_progress) if 0 <= jump_progress <= 1 else 0
    runner_y = floor - jump

    # Layered skyline gives the runner a distinct moving game world.
    for layer, base, speed, color in [(0, 275, 0.12, (23, 30, 53)), (1, 310, 0.24, (29, 34, 62))]:
        for index in range(-2, 13):
            x = index * 75 - (scroll * speed) % 75
            height = 50 + ((index * 31 + layer * 23) % 95)
            play.rounded_rectangle((x, base - height, x + 47, base + 25), 3, fill=color)
            if layer:
                for window_y in range(int(base - height + 13), int(base), 24):
                    play.rectangle((x + 11, window_y, x + 16, window_y + 4), fill=(72, 55, 102))

    for row in range(4):
        grid_y = 310 + row * 20
        play.line((0, grid_y, 600, grid_y), fill=(31, 41, 61))
    for index in range(-2, 13):
        grid_x = index * 75 - (scroll * 0.6) % 75
        play.line((300 + (grid_x - 300) * 0.58, 310, grid_x, floor), fill=(31, 41, 61))

    play.rectangle((0, floor, 600, 446), fill=(20, 36, 50))
    play.rectangle((0, floor, 600, floor + 4), fill=MINT)
    for index in range(-2, 14):
        x = index * 70 - scroll % 70
        play.line((x, floor + 27, x + 30, floor + 27), fill=(49, 75, 85), width=4)

    obstacles = [970, 1050, 1130]
    passed = sum(1 for world_x in obstacles if world_x - scroll + 36 < runner_x)
    collected = sum(1 for world_x in obstacles if world_x - scroll + 18 < runner_x)
    for index, world_x in enumerate(obstacles):
        x = world_x - scroll
        if -60 < x < 640:
            play.rounded_rectangle((x - 4, floor - 57, x + 40, floor), 5, fill=(70, 42, 96))
            play.rounded_rectangle((x, floor - 61, x + 36, floor - 4), 5, fill=VIOLET)
            play.line((x + 7, floor - 48, x + 29, floor - 26), fill=(221, 209, 255), width=4)
            play.line((x + 7, floor - 30, x + 22, floor - 15), fill=(221, 209, 255), width=4)
            coin_y = [150, 122, 154][index]
            collected_at = (world_x + 18 - runner_x) / 220
            if t < collected_at:
                diamond(play, x + 18, coin_y, 14, MINT)
                diamond(play, x + 18, coin_y, 6, (183, 255, 231))
            elif t - collected_at < 0.5:
                burst = (t - collected_at) / 0.5
                burst_x = runner_x - (t - collected_at) * 50
                for ray in range(8):
                    angle = ray * math.pi / 4
                    radius = 12 + burst * 30
                    cx = burst_x + math.cos(angle) * radius
                    cy = coin_y + math.sin(angle) * radius
                    play.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=blend(MINT, (11, 22, 39), burst))

    finish_x = 1580 - scroll
    if -70 < finish_x < 670:
        play.line((finish_x, 198, finish_x, floor), fill=(220, 236, 245), width=4)
        for row in range(4):
            for col in range(5):
                color = WHITE if (row + col) % 2 == 0 else (33, 45, 66)
                play.rectangle((finish_x + col * 10, 198 + row * 10, finish_x + (col + 1) * 10, 198 + (row + 1) * 10), fill=color)

    shadow_width = 26 - jump * 0.025
    play.ellipse((runner_x - shadow_width, floor - 5, runner_x + shadow_width, floor + 7), fill=(6, 22, 29))
    if jump > 0:
        for trail in range(4, 0, -1):
            tx = runner_x - trail * 14
            ty = runner_y + trail * 3
            color = blend((11, 22, 39), MINT, 0.05 + (4 - trail) * 0.05)
            play.rounded_rectangle((tx - 19, ty - 61, tx + 19, ty - 13), 10, fill=color)

    leg_phase = math.sin(t * 22) * 12 if not jump and t < 6.55 else 0
    for side in [-1, 1]:
        foot_x = runner_x + side * 14 + side * leg_phase
        foot_y = runner_y - (6 if jump else max(0, side * leg_phase * 0.3))
        play.line((runner_x + side * 9, runner_y - 22, foot_x, foot_y - 5), fill=(117, 238, 205), width=8)
        play.rounded_rectangle((foot_x - 7, foot_y - 8, foot_x + 12, foot_y), 3, fill=MINT)
    play.rounded_rectangle((runner_x - 21, runner_y - 67, runner_x + 21, runner_y - 22), 11, fill=MINT)
    play.rounded_rectangle((runner_x - 3, runner_y - 57, runner_x + 24, runner_y - 40), 6, fill=(10, 42, 50))
    play.line((runner_x + 12, runner_y - 52, runner_x + 19, runner_y - 52), fill=(229, 255, 249), width=3)
    play.line((runner_x - 22, runner_y - 42, runner_x - 30, runner_y - 28), fill=(139, 247, 216), width=7)
    play.rounded_rectangle((runner_x - 33, runner_y - 53, runner_x - 23, runner_y - 30), 4, fill=(80, 160, 146))

    if 2.65 < t < 3.1:
        cue = ease((t - 2.65) / 0.25)
        play.rounded_rectangle((runner_x - 51, runner_y - 114, runner_x + 53, runner_y - 80), 9, fill=blend((11, 22, 39), MINT, cue))
        text(play, (runner_x + 1, runner_y - 97), "JUMP!", 22, NAVY, bold=True, anchor="mm")
    if 3.1 <= t < 3.65:
        text(play, (runner_x, max(30, runner_y - 95)), "PERFECT", 20, MINT, bold=True, anchor="mm")

    image.paste(scene, (60, 425))
    draw = ImageDraw.Draw(image)
    finished = t >= 6.55
    status = "CLEAN RUN" if finished else "PERFECT JUMP" if 3.1 <= t < 5.1 else "ALL CLEAR" if t >= 5.1 else "WAIT FOR THE GAP"
    text(draw, (68, 914), status, 21, MINT if t >= 3.1 else WHITE, bold=True, anchor="lm")
    text(draw, (650, 914), f"{min(passed, 3)} / 3", 23, MINT, anchor="rm", mono=True)

    if finished:
        reveal = ease((t - 6.55) / 0.3)
        overlay = Image.new("RGBA", image.size)
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rounded_rectangle((106, 487, 614, 683), 22, fill=(8, 27, 37, round(249 * reveal)), outline=(80, 227, 181, round(255 * reveal)), width=2)
        overlay_draw.text((360, 536), "LEVEL COMPLETE", font=font(36, True), fill=(239, 247, 255, round(255 * reveal)), anchor="mm")
        overlay_draw.text((360, 586), "3 / 3  •  NO HITS", font=font(24, True), fill=(80, 227, 181, round(255 * reveal)), anchor="mm")
        overlay_draw.text((360, 636), "PERFECT TIMING", font=font(19, False, True), fill=(168, 188, 199, round(255 * reveal)), anchor="mm")
        image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(image)
        for index in range(20):
            phase = t - 6.55
            x = 135 + (index * 97 % 450) + math.sin(index * 3.1 + phase) * 17
            y = 437 + (index * 43 % 330) + phase * 75
            if y < 860:
                diamond(draw, x, y, 3 + index % 3, MINT if index % 2 else VIOLET)

    text(draw, (42, 985), "ORIGINAL GAME DEMO", 17, (118, 143, 162), mono=True)
    for index in range(3):
        diamond(draw, 595 + index * 28, 996, 7, MINT if index < collected else (58, 68, 84))
    return image
