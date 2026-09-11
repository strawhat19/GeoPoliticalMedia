"""Render narration-timed shots from the authored Blender scene at native 720p/24fps.

Usage: blender -b final-scene.blend -t 8 --python render_native.py -- 01_hammer
One shot per invocation keeps every completed clip recoverable.
"""
import bpy
import json
import math
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
PLAN = {
    '01_hammer': (1, 72, 56),
    '02_tail': (73, 144, 75),
    '03_hero': (145, 216, 40),
    '04_quench': (217, 312, 79),
    '05_stress': (313, 456, 168),
    '06_snip': (493, 528, 43),
    '07_fracture': (529, 672, 72),
}
name = sys.argv[sys.argv.index('--') + 1]
start, end, count = PLAN[name]
s = bpy.context.scene
s.render.engine = 'CYCLES'
s.cycles.device = 'CPU'
s.cycles.samples = 8
s.cycles.use_denoising = True
s.cycles.max_bounces = 8
s.cycles.transmission_bounces = 6
s.render.use_persistent_data = True
s.render.resolution_x = 720
s.render.resolution_y = 1280
s.render.resolution_percentage = 100
s.render.fps = 24
s.render.threads_mode = 'FIXED'
s.render.threads = 8
s.view_settings.view_transform = 'AgX'
s.render.image_settings.media_type = 'IMAGE'
s.render.image_settings.file_format = 'PNG'
frames = ROOT / 'frames' / name
frames.mkdir(parents=True, exist_ok=True)
shots = ROOT / 'shots'
shots.mkdir(exist_ok=True)
started = time.time()
for i in range(count):
    original_frame = start + (end - start) * i / (count - 1)
    whole = math.floor(original_frame)
    s.frame_set(whole, subframe=original_frame - whole)
    s.render.filepath = str(frames / f'{i:04d}.png')
    if not Path(s.render.filepath).exists():
        bpy.ops.render.render(write_still=True)
    print(json.dumps({'shot': name, 'done': i + 1, 'total': count, 'elapsed': round(time.time() - started, 2)}), flush=True)

subprocess.run([
    'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', '24', '-i', str(frames / '%04d.png'),
    '-frames:v', str(count), '-an', '-c:v', 'libx264', '-preset', 'fast',
    '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    str(shots / f'{name}.mp4'),
], check=True)
receipt = {
    'shot': name, 'mode': 'narration_timed', 'source_frame_start': start,
    'source_frame_end': end, 'frames': count, 'fps': 24,
    'duration': count / 24, 'native_dimensions': [720, 1280],
    'engine': 'CYCLES', 'samples': 8, 'denoising': True,
    'max_bounces': s.cycles.max_bounces, 'transmission_bounces': s.cycles.transmission_bounces,
    'elapsed': round(time.time() - started, 2),
}
(shots / f'{name}.json').write_text(json.dumps(receipt, indent=2) + '\n')
print('SHOT_COMPLETE ' + json.dumps(receipt), flush=True)

