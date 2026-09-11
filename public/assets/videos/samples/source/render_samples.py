import os
import sys
import json
import math
import wave
import argparse
import subprocess
import importlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent
CACHE = Path.home() / '.cache' / 'geopoliticalmedia-video-tools'
if CACHE.exists():
    sys.path.insert(0, str(CACHE))
import imageio_ffmpeg
from common import subtitle, font

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
MANIFEST = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8-sig'))
RATE, FPS, SECONDS = 48000, 30, 8
TIMES = [(0.3, 2.45), (2.65, 4.85), (5.1, 7.55)]

def compose_frame(item, module, t):
    frame = module.render(t)
    for (start, end), caption in zip(TIMES, item['captions']):
        if start <= t <= end:
            subtitle(frame, caption)
    return frame

def make_audio(item, index):
    count = RATE * SECONDS
    timeline = np.arange(count, dtype=np.float64) / RATE
    track = np.zeros(count)
    random = np.random.default_rng(100 + index)
    notes = [220, 261.6256, 329.6276, 391.9954]
    for beat in range(16):
        local = timeline - beat * 0.5
        active = (local >= 0) & (local < 0.48)
        frequency = notes[(beat + index) % len(notes)]
        track += np.where(active, np.sin(2*np.pi*frequency*local) * np.exp(-np.maximum(local, 0)*11) * 0.025, 0)
        track += np.where(active, np.sin(2*np.pi*55*local) * np.exp(-np.maximum(local, 0)*24) * 0.012, 0)
    for moment in (2.6, 5.0, 6.55):
        local = timeline - moment
        envelope = np.exp(-((local - 0.045) / 0.032)**2)
        track += random.normal(0, 0.008, count) * envelope
    durations = []
    for segment, (start, end) in enumerate(TIMES):
        source = ROOT / 'narration' / f"{item['key']}-{segment}.wav"
        with wave.open(str(source), 'rb') as wav:
            duration = wav.getnframes() / wav.getframerate()
        tempo = max(1, duration / (end-start-0.08))
        command = [FFMPEG, '-hide_banner', '-loglevel', 'error', '-i', str(source), '-af', f'atempo={tempo:.5f}', '-f', 'f32le', '-ac', '1', '-ar', str(RATE), 'pipe:1']
        voice = np.frombuffer(subprocess.check_output(command), dtype='<f4').copy()
        target = int(start * RATE)
        length = min(len(voice), count-target)
        track[target:target+length] *= 0.3
        voice_peak = max(0.01, float(np.abs(voice).max()))
        track[target:target+length] += voice[:length] * (0.67 / voice_peak)
        durations.append(round(length/RATE, 3))
    track *= np.minimum(1, timeline/0.06) * np.minimum(1, (SECONDS-timeline)/0.24)
    track = np.clip(track, -0.94, 0.94)
    output = ROOT / 'narration' / f"{item['key']}-mix.wav"
    with wave.open(str(output), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes((track * 32767).astype('<i2').tobytes())
    return output, durations

def render_video(index, item, replace):
    target = OUT / f"{item['key']}.mp4"
    if target.exists() and not replace:
        raise FileExistsError(f'{target.name} already exists; use --replace to regenerate')
    module = importlib.import_module(item['module'])
    audio, speech_lengths = make_audio(item, index)
    command = [FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '720x1280', '-r', str(FPS), '-i', 'pipe:0', '-i', str(audio), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-t', str(SECONDS), '-movflags', '+faststart', str(target)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    try:
        for frame_number in range(FPS*SECONDS):
            frame = compose_frame(item, module, frame_number/FPS)
            process.stdin.write(frame.tobytes())
        process.stdin.close()
        errors = process.stderr.read().decode('utf-8', errors='replace')
        code = process.wait()
        if code:
            raise RuntimeError(errors)
    except Exception:
        process.kill()
        raise
    compose_frame(item, module, 6.8).save(OUT / f"{item['key']}-poster.jpg", quality=92)
    for frame_number, second in enumerate((1.2, 4.2, 6.8)):
        preview = compose_frame(item, module, second)
        preview.save(ROOT / f"{item['key']}-check-{frame_number}.jpg", quality=87)
    print(f"Saved {target.name}: 8s, {target.stat().st_size:,} bytes, speech {speech_lengths}", flush=True)
    return target

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='*')
    parser.add_argument('--replace', action='store_true')
    args = parser.parse_args()
    selected = [(i,item) for i,item in enumerate(MANIFEST['samples']) if not args.only or item['key'] in args.only]
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(render_video, index, item, args.replace) for index,item in selected]
        for future in futures:
            future.result()
    all_items = MANIFEST['samples']
    if all((ROOT / f"{item['key']}-check-0.jpg").exists() for item in all_items):
        contact = Image.new('RGB', (360*5, 640*3), '#071321')
        for column, item in enumerate(all_items):
            for row in range(3):
                with Image.open(ROOT / f"{item['key']}-check-{row}.jpg") as frame:
                    contact.paste(frame.resize((360,640), Image.Resampling.LANCZOS), (column*360,row*640))
        contact.save(OUT / 'preview.jpg', quality=94)
    print('Rendering Complete', flush=True)

if __name__ == '__main__':
    main()
