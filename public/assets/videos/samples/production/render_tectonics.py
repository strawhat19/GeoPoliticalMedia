from pathlib import Path
import argparse
import math
import sys
import subprocess

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

WIDTH, HEIGHT, FPS, SECONDS = 720, 1280, 30, 10
PRODUCTION = Path(__file__).resolve().parent
ASSETS = PRODUCTION / "assets"
CHECKS = PRODUCTION / "tectonics-checkframes"
FONT_REGULAR = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = "C:/Windows/Fonts/seguisb.ttf"
SURFACE_X = np.array([-80, 0, 80, 150, 180, 210, 235, 259, 279, 305, 328, 354, 380, 405, 435, 473, 530, 610, 720, 800])
SURFACE_Y = np.array([485, 480, 474, 467, 449, 419, 429, 357, 377, 310, 341, 371, 350, 383, 396, 379, 389, 375, 386, 382])
X_VALUES = np.arange(-80, 801, 3)
SURFACE = list(zip(X_VALUES, np.interp(X_VALUES, SURFACE_X, SURFACE_Y)))

def smoothstep(value):
    value = np.clip(value, 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)

def points(x_values, y_values):
    return [(int(round(x)), int(round(y))) for x, y in zip(x_values, y_values)]

def rock_texture(color, seed, band_spacing=31):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[:HEIGHT, :WIDTH]
    coarse = Image.fromarray(rng.integers(0, 255, (80, 48), dtype=np.uint8)).resize((WIDTH, HEIGHT), Image.Resampling.BICUBIC)
    noise = np.asarray(coarse, dtype=np.float32) / 255.0 - 0.5
    grain = rng.normal(0.0, 1.9, (HEIGHT, WIDTH))
    strata = np.sin((yy + 16 * np.sin(xx / 155.0) + xx * 0.045) / band_spacing * math.tau)
    light = 0.99 - yy / HEIGHT * 0.22 + xx / WIDTH * 0.055
    values = np.array(color, dtype=np.float32)[None, None, :] * light[:, :, None]
    values += (noise * 23 + grain + strata * 4.3)[:, :, None]
    return Image.fromarray(np.uint8(np.clip(values, 0, 255)), "RGB")

def paste_rock(frame, polygon, texture, shift=0, outline=(49, 39, 35)):
    mask = Image.new("L", (WIDTH, HEIGHT))
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    shifted = ImageChops.offset(texture, int(shift), 0)
    frame.paste(shifted, (0, 0), mask)
    ImageDraw.Draw(frame).line(polygon + [polygon[0]], fill=outline, width=3, joint="curve")
    return mask

def label(draw, position, message, size=24, color=(236, 229, 213), bold=False, anchor=None, opacity=1.0):
    font = ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)
    rgba = (*color, int(opacity * 255))
    draw.text(position, message, font=font, fill=rgba, anchor=anchor, stroke_width=2, stroke_fill=(10, 17, 25, int(opacity * 200)))

def arrow(draw, start, end, color):
    draw.line([start, end], fill=color, width=3)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    for delta in (-0.55, 0.55):
        endpoint = (end[0] - 12 * math.cos(angle + delta), end[1] - 12 * math.sin(angle + delta))
        draw.line([end, endpoint], fill=color, width=3)

def build_scene():
    yy, xx = np.mgrid[:HEIGHT, :WIDTH]
    top = np.array([19, 37, 51], dtype=np.float32)
    bottom = np.array([29, 33, 41], dtype=np.float32)
    mixture = np.clip(yy / HEIGHT, 0.0, 1.0)[:, :, None]
    base = np.broadcast_to(top * (1 - mixture) + bottom * mixture, (HEIGHT, WIDTH, 3)).copy()
    haze = np.exp(-((yy - 380) / 180) ** 2) * 9
    base += haze[:, :, None]
    background = Image.fromarray(np.uint8(np.clip(base, 0, 255)), "RGB")
    textures = {
        "upper": rock_texture((173, 135, 95), 31, 24),
        "crust": rock_texture((206, 158, 97), 12, 30),
        "mantle": rock_texture((118, 57, 61), 53, 41),
        "asthenosphere": rock_texture((53, 55, 65), 29, 117),
        "tibetan": rock_texture((93, 74, 74), 93, 53),
    }
    return background, textures

def render_frame(index, background, textures):
    time = index / FPS
    progress = time / SECONDS
    advance = 38 * smoothstep(progress)
    peeling = smoothstep((time - 4.6) / 5.1)
    frame = background.copy()
    surface_polygon = [(int(x), int(y)) for x, y in SURFACE]
    deep_polygon = surface_polygon + [(800, HEIGHT + 30), (-80, HEIGHT + 30)]
    paste_rock(frame, deep_polygon, textures["asthenosphere"])
    tibetan_polygon = [(405, 625), (800, 590), (800, 867), (645, 859), (565, 786), (489, 727)]
    paste_rock(frame, tibetan_polygon, textures["tibetan"])

    slab_x = np.linspace(-80, 590 + advance, 210)
    crust_top = np.interp(slab_x - advance * 0.22, [-80, 95, 166, 230, 326, 430, 520, 640], [485, 476, 470, 505, 565, 615, 640, 651])
    crust_thickness = np.interp(slab_x, [-80, 200, 440, 640], [126, 122, 91, 72])
    crust_bottom = crust_top + crust_thickness
    peel_fraction = np.maximum((slab_x - 302) / (slab_x[-1] - 302), 0.0)
    mantle_top = crust_bottom + peeling * 408 * peel_fraction ** 1.6
    mantle_bottom = mantle_top + np.interp(slab_x, [-80, 220, 640], [176, 172, 154])
    mantle_polygon = points(slab_x, mantle_top) + points(slab_x[::-1], mantle_bottom[::-1])
    mantle_mask = paste_rock(frame, mantle_polygon, textures["mantle"], shift=advance)
    mantle_lines = Image.new("RGBA", (WIDTH, HEIGHT))
    mantle_draw = ImageDraw.Draw(mantle_lines)
    for stripe in (0.22, 0.49, 0.78):
        line_y = mantle_top + (mantle_bottom - mantle_top) * stripe
        mantle_draw.line(points(slab_x, line_y), fill=(153, 89, 87, 94), width=2)
    frame.paste(mantle_lines.convert("RGB"), (0, 0), ImageChops.multiply(mantle_lines.getchannel("A"), mantle_mask))

    upper_polygon = surface_polygon + [(800, 724), (660, 728), (567, 698), (448, 656), (319, 577), (176, 493), (-80, 491)]
    paste_rock(frame, upper_polygon, textures["upper"])
    crust_polygon = points(slab_x, crust_top) + points(slab_x[::-1], crust_bottom[::-1])
    crust_mask = paste_rock(frame, crust_polygon, textures["crust"], shift=advance)
    strata_layer = Image.new("RGBA", (WIDTH, HEIGHT))
    strata_draw = ImageDraw.Draw(strata_layer)
    for fraction in (0.22, 0.47, 0.72):
        strata_y = crust_top + crust_thickness * fraction + 2 * np.sin((slab_x - advance) / 49)
        strata_draw.line(points(slab_x, strata_y), fill=(239, 190, 122, 126), width=2)
    frame.paste(strata_layer.convert("RGB"), (0, 0), ImageChops.multiply(strata_layer.getchannel("A"), crust_mask))

    terrain_draw = ImageDraw.Draw(frame)
    terrain_draw.line(surface_polygon, fill=(165, 163, 144), width=6)
    for peak_x, peak_y, spread in ((259, 357, 18), (305, 310, 25), (380, 350, 18)):
        terrain_draw.polygon([(peak_x - spread, peak_y + 23), (peak_x, peak_y - 2), (peak_x + spread, peak_y + 25), (peak_x + 5, peak_y + 17), (peak_x, peak_y + 21), (peak_x - 6, peak_y + 15)], fill=(221, 224, 214))
    for ridge in range(12):
        start = 238 + ridge * 13
        ridge_y = np.interp(start, SURFACE_X, SURFACE_Y)
        terrain_draw.line([(start, ridge_y + 10), (start + 35, ridge_y + 75)], fill=(143, 110, 78), width=2)

    drift_x = 2.8 * math.sin(progress * 1.2)
    drift_y = 3.0 * math.sin(progress * 1.1)
    frame = frame.transform((WIDTH, HEIGHT), Image.Transform.AFFINE, (1, 0, drift_x, 0, 1, drift_y), resample=Image.Resampling.BICUBIC)
    overlay = Image.new("RGBA", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(overlay)
    label(draw, (WIDTH / 2, 72), "SCHEMATIC · NOT TO SCALE", 22, (188, 201, 204), anchor="mm")
    label(draw, (59, 423), "India · South", 24, bold=True)
    label(draw, (306, 273), "Himalayas", 27, bold=True, anchor="mm")
    label(draw, (558, 329), "Southern Tibet · North", 23, bold=True, anchor="mm")
    label(draw, (64, 534), "Indian crust", 23)
    label(draw, (58, 692), "Indian lithospheric", 22, (221, 177, 167))
    label(draw, (58, 719), "mantle", 22, (221, 177, 167))
    arrow(draw, (68, 581), (167, 600), (241, 207, 155, 225))
    label(draw, (48, 938), "Asthenosphere", 22, (166, 177, 181))
    if peeling > 0:
        label(draw, (WIDTH / 2, 1167), "2025 STUDY INTERPRETATION", 22, (229, 215, 191), anchor="mm")
    label(draw, (WIDTH / 2, 1220), "Motion and time greatly exaggerated", 19, (173, 182, 187), anchor="mm")
    frame = Image.alpha_composite(frame.convert("RGBA"), overlay).convert("RGB")
    return np.asarray(frame)

def encoder_path(override):
    if override:
        return override
    sys.path.insert(0, str(Path.home() / ".cache" / "geopoliticalmedia-video-tools"))
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg")
    parser.add_argument("--preview-only", action="store_true")
    arguments = parser.parse_args()
    ASSETS.mkdir(parents=True, exist_ok=True)
    CHECKS.mkdir(parents=True, exist_ok=True)
    background, textures = build_scene()
    ffmpeg = encoder_path(arguments.ffmpeg)
    clip = ASSETS / "india-underthrust.mp4"
    if arguments.preview_only:
        for index in (0, 150, 299):
            Image.fromarray(render_frame(index, background, textures)).save(CHECKS / f"india-underthrust-{index:03d}.png")
        print("Preview Frames Saved")
        return
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-vcodec", "rawvideo", "-s", f"{WIDTH}x{HEIGHT}", "-pix_fmt", "rgb24", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-crf", "19", "-preset", "fast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(clip)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    for index in range(FPS * SECONDS):
        process.stdin.write(render_frame(index, background, textures).tobytes())
        if index % 75 == 0:
            print(f"Rendered {index}/{FPS * SECONDS} Frames", flush=True)
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("Video Encoding Failed")
    for seconds, name in ((5.0, "midpoint"), (9.9666667, "end")):
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-ss", str(seconds), "-i", str(clip), "-frames:v", "1", str(CHECKS / f"india-underthrust-{name}.png")], check=True)
    result = subprocess.run([ffmpeg, "-hide_banner", "-i", str(clip), "-f", "null", "-"], capture_output=True, text=True, check=True)
    for line in result.stderr.splitlines():
        if any(marker in line for marker in ("Duration:", "Video:", "frame=")):
            print(line.strip())
    print(f"Saved {clip}", flush=True)

if __name__ == "__main__":
    main()
