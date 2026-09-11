"""Validate narration-timed shots and record the final nine-cut edit."""
from pathlib import Path
import subprocess
import json
import shutil

ROOT = Path(__file__).resolve().parent
SHOTS = [
    ('01_hammer', 56, 0),
    ('02_tail', 75, 0),
    ('03_hero', 40, 0),
    ('04_quench', 79, 0),
    ('05_stress', 168, 0),
    ('06_snip', 43, 1.5),
    ('07_fracture', 72, 0),
]
(ROOT / 'prepared').mkdir(exist_ok=True)
receipt = []
for name, frames, source_start in SHOTS:
    source = ROOT / 'shots' / f'{name}.mp4'
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=duration,width,height,r_frame_rate,nb_frames',
        '-of', 'json', str(source),
    ]))['streams'][0]
    source_duration = float(probe['duration'])
    target_duration = frames / 24
    metadata_file = source.with_suffix('.json')
    metadata = json.loads(metadata_file.read_text()) if metadata_file.exists() else {}
    native = metadata.get('mode') == 'narration_timed'
    if native:
        assert metadata['frames'] == frames and int(probe['nb_frames']) == frames
        assert probe['r_frame_rate'] == '24/1'
        assert probe['width'] == 720 and probe['height'] == 1280
        ratio = 1
        source_start = 0
        shutil.copy2(source, ROOT / 'prepared' / f'{name}.mp4')
    else:
        ratio = target_duration / (source_duration - source_start)
        vf = f'trim=start={source_start},setpts=(PTS-STARTPTS)*{ratio},fps=24,tpad=stop_mode=clone:stop_duration=0.1,format=yuv420p'
        subprocess.run([
            'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source),
            '-vf', vf, '-frames:v', str(frames), '-an', '-c:v', 'libx264',
            '-crf', '16', '-preset', 'fast', '-movflags', '+faststart',
            str(ROOT / 'prepared' / f'{name}.mp4'),
        ], check=True)
    receipt.append({
        'name': name, 'source_duration': source_duration,
        'source_start': source_start, 'frames': frames,
        'duration': target_duration,
        'speed': 1 / ratio, 'probe': probe, 'native_narration_timing': native,
    })
cuts = [
    ('01_hammer', 0, 56, 0),
    ('02_tail', 30, 24, 56),
    ('06_snip', 31, 9, 80),
    ('07_fracture', 0, 42, 89),
    ('03_hero', 0, 40, 131),
    ('04_quench', 0, 79, 171),
    ('05_stress', 0, 168, 250),
    ('06_snip', 0, 43, 418),
    ('07_fracture', 0, 72, 461),
]
cursor = 0
for name, source_frame, frames, at_frame in cuts:
    assert at_frame == cursor
    assert source_frame + frames <= next(s['frames'] for s in receipt if s['name'] == name)
    cursor += frames
assert cursor == 533
(ROOT / 'edit-receipt.json').write_text(json.dumps({
    'fps': 24, 'frames': cursor, 'duration': cursor / 24, 'shots': receipt,
    'cuts': [dict(name=n, source_frame=f, frames=d, at_frame=a)
             for n, f, d, a in cuts],
}, indent=2) + '\n')
events = {
    'hammer': 15 / 71 * 55 / 24,
    'tail_tease': 56 / 24 + .12,
    'teaser_snap': 3.46,
    'teaser_fracture': 3.92,
    'quench': 171 / 24 + 24 / 95 * 78 / 24,
    'cutaway': 250 / 24,
    'compression': 14.0,
    'tension': 16.0,
    'tail_snap': 418 / 24 + 28 / 35 * 42 / 24,
    'fracture': 461 / 24 + 10 / 143 * 71 / 24,
}
(ROOT / 'edit-events.json').write_text(json.dumps(events, indent=2) + '\n')

