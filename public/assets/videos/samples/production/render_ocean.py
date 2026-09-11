from pathlib import Path
import json
import math
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path.home() / '.cache' / 'geopoliticalmedia-video-tools'))
import imageio_ffmpeg


WIDTH, HEIGHT, FPS, DURATION = 720, 1280, 30, 8
ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'assets' / 'el-nino-heat.mp4'
CHECKS = ROOT / 'assets' / 'el-nino-heat-checkframes'
FONT_ROOT = Path('C:/Windows/Fonts')
Y, X = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
RNG = np.random.default_rng(260911)
PARTICLES = RNG.uniform(0, 1, (60, 4))


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_ROOT / ('seguisb.ttf' if bold else 'segoeui.ttf')), size)


def centered(draw, y, text, size, color, bold=False):
    face = font(size, bold)
    bounds = draw.textbbox((0, 0), text, font=face)
    draw.text(((WIDTH - bounds[2]) / 2, y), text, font=face, fill=color)


def frame_at(seconds):
    phase = seconds / DURATION
    surface = 314 + 3.0 * np.sin(X / 74 - seconds * 0.6) + 1.4 * np.sin(X / 27 + seconds * 0.8)
    depth = np.maximum(0, Y - surface)
    under = Y >= surface
    sky_mix = np.clip(Y / 340, 0, 1)[..., None]
    sky = np.array([12, 22, 33]) * (1 - sky_mix) + np.array([39, 60, 72]) * sky_mix
    water_mix = np.minimum(depth / 960, 1)[..., None]
    water = np.array([13, 45, 65]) * (1 - water_mix) + np.array([4, 12, 23]) * water_mix
    cx = 270 + 185 * (0.5 - 0.5 * math.cos(math.pi * phase))
    spread = 165 + phase * 115
    plume = np.exp(-((X - cx) / spread) ** 2 - ((depth - 155) / (94 + 30 * phase)) ** 2)
    shallow = np.exp(-((X - (cx + 20)) / (spread + 60)) ** 2 - ((depth - 36) / 65) ** 2)
    heat = np.minimum(0.52, 0.45 * plume + 0.25 * shallow) * under
    warmth = np.array([183, 126, 65], dtype=np.float32)
    water = water * (1 - heat[..., None]) + warmth * heat[..., None]
    column_light = 1.0 + 0.023 * np.sin(X / 43 + Y / 380 + seconds * 0.12) * np.exp(-depth / 430)
    water *= column_light[..., None]
    rgb = np.where(under[..., None], water, sky)
    edge_shade = np.clip(1 - 0.16 * ((X - WIDTH / 2) / (WIDTH / 2)) ** 2, 0, 1)
    rgb *= edge_shade[..., None]
    image = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')

    clouds = Image.new('RGBA', (WIDTH, HEIGHT))
    cloud_draw = ImageDraw.Draw(clouds)
    for i, (x, y, w, h) in enumerate([(40, 241, 180, 23), (223, 208, 175, 30), (458, 236, 215, 25), (608, 183, 154, 20)]):
        dx = seconds * (1.0 + i * 0.22)
        cloud_draw.ellipse((x + dx - w / 2, y - h, x + dx + w / 2, y + h), fill=(144, 158, 164, 30))
        cloud_draw.ellipse((x + dx - w / 4, y - h * 1.5, x + dx + w / 3, y + h / 2), fill=(146, 160, 168, 21))
    image = Image.alpha_composite(image.convert('RGBA'), clouds.filter(ImageFilter.GaussianBlur(15)))

    detail = Image.new('RGBA', (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(detail)
    for offset, alpha in [(0, 110), (4, 24), (-4, 20)]:
        points = [(x, 314 + 3 * math.sin(x / 74 - seconds * 0.6) + 1.4 * math.sin(x / 27 + seconds * 0.8) + offset) for x in range(-5, WIDTH + 6, 3)]
        draw.line(points, fill=(149, 192, 201, alpha), width=2)
    for line in range(5):
        y0 = 421 + line * 68
        points = []
        for x in range(30, WIDTH - 20, 5):
            wave = math.sin(x / 165 + line * 0.8 - seconds * 0.15)
            points.append((x, y0 + wave * 15 + math.sin(x / 330 + seconds * 0.1) * 7))
        draw.line(points, fill=(144, 174, 177, 12 if line < 3 else 8), width=1)
    for px, py, speed, brightness in PARTICLES:
        x = (px * WIDTH + seconds * (2 + speed * 5)) % WIDTH
        y = 370 + py * 550 + math.sin(seconds * 0.6 + px * 8) * 2
        radius = 0.6 + speed * 0.8
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(157, 186, 187, int(11 + brightness * 19)))
    centered(draw, 90, 'PACIFIC OCEAN', 30, (208, 220, 224, 228), True)
    centered(draw, 366, 'SURFACE + SUBSURFACE HEAT', 25, (228, 215, 191, 224), True)
    centered(draw, 1210, 'EXPLANATORY SCHEMATIC · NOT MEASURED DATA', 17, (169, 185, 195, 215))
    return np.asarray(Image.alpha_composite(image, detail).convert('RGB'))


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    CHECKS.mkdir(parents=True, exist_ok=True)
    command = [imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{WIDTH}x{HEIGHT}',
        '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUTPUT)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    for frame_number in range(FPS * DURATION):
        process.stdin.write(frame_at(frame_number / FPS).tobytes())
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError('Ocean Animation Encoding Failed')
    decoder = imageio_ffmpeg.read_frames(str(OUTPUT), pix_fmt='rgb24')
    metadata = next(decoder)
    count = 0
    for index, raw in enumerate(decoder):
        count += 1
        if index in (0, 120, 239):
            Image.frombytes('RGB', (WIDTH, HEIGHT), raw).save(CHECKS / f'frame-{index:03}.png')
    if count != FPS * DURATION or tuple(metadata['size']) != (WIDTH, HEIGHT):
        raise RuntimeError(f'Ocean Decode Verification Failed: {count}, {metadata}')
    result = {'file': str(OUTPUT), 'decoded_frames': count, 'width': WIDTH, 'height': HEIGHT,
        'fps': metadata['fps'], 'duration': metadata['duration'], 'codec': metadata['codec'],
        'audio': False, 'checkframes': str(CHECKS)}
    (CHECKS / 'verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
