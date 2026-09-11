"""Inspect the actual final video, including its spoken audio, before delivery."""
from pathlib import Path
import difflib
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
FINAL = ROOT / 'prince-ruperts-drop.mp4'
CLEAN = ROOT / 'clean-master.mp4'


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]).stdout)


def norm(text):
    return re.sub(r'[^a-z0-9]', '', text.lower())


def levels(path):
    log = run(['ffmpeg', '-hide_banner', '-i', str(path), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-']).stderr
    return json.loads(log[log.rfind('{'):log.rfind('}') + 1])


final = probe(FINAL)
clean = probe(CLEAN)
video = next(s for s in final['streams'] if s['codec_type'] == 'video')
audio = next(s for s in final['streams'] if s['codec_type'] == 'audio')
clean_audio = next(s for s in clean['streams'] if s['codec_type'] == 'audio')
assert video['width'] == 720 and video['height'] == 1280
assert video['r_frame_rate'] == '24/1' and int(video['nb_frames']) == 533
assert video['avg_frame_rate'] == '24/1'
assert video['pix_fmt'] == 'yuv420p' and video['codec_name'] == 'h264'
assert audio['codec_name'] == 'aac' and int(audio['sample_rate']) == 48000
assert int(audio['channels']) == 2
assert abs(float(video['duration']) - 533 / 24) < .08
assert abs(float(audio['duration']) - float(video['duration'])) < .2
assert abs(float(audio['duration']) - float(clean_audio['duration'])) < .2
run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(FINAL), '-f', 'null', '-'])

script = (ROOT / 'narration.txt').read_text().strip()
lines = (ROOT / 'caps.srt').read_text().splitlines()
caption_text = ' '.join(s for s in lines if s.strip() and not s.strip().isdigit() and '-->' not in s)
assert norm(caption_text) == norm(script), 'The burned caption text must cover every authored word.'

# This is an independent transcription of the finished mix, without substituting
# authored words. It tests that recognizable narration survived all edit stages.
from faster_whisper import WhisperModel
model = WhisperModel('small', device='cpu', compute_type='int8')
segments, info = model.transcribe(str(FINAL), language='en', vad_filter=True, condition_on_previous_text=False)
spoken = ' '.join(s.text.strip() for s in segments)
similarity = difflib.SequenceMatcher(None, norm(script), norm(spoken)).ratio()
assert similarity >= .90, f'Final audible speech differs from script: {similarity:.3f}: {spoken}'
mix_levels = levels(FINAL)
assert -18 <= float(mix_levels['input_i']) <= -13, mix_levels
assert float(mix_levels['input_tp']) <= -.8, mix_levels

review = ROOT / 'review'
review.mkdir(exist_ok=True)
review_times = [.5, 2.8, 5.9, 8.8, 11.8, 14.7, 16.5, 18.8, 19.8, 21.0]
review_frames = []
for index, at in enumerate(review_times, 1):
    image_path = review / f'{index:02d}-{at:04.1f}.jpg'
    run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', str(at), '-i', str(FINAL), '-frames:v', '1', '-update', '1', str(image_path)])
    review_frames.append((image_path, f'{at:.1f} s'))

# Review sheets use frames from the exported movie, including the final captions.
from PIL import Image, ImageDraw, ImageFont


def contact_sheet(output, rows, row_titles):
    tile_width, tile_height, gap, title_height, label_height = 180, 320, 12, 30, 26
    columns = max(len(row) for row in rows)
    row_height = title_height + tile_height + label_height + gap
    sheet = Image.new('RGB', (gap + columns * (tile_width + gap), gap + len(rows) * row_height), '#091624')
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('DejaVuSans.ttf', 15)
    except OSError:
        font = ImageFont.load_default()
    for row_index, (row, title) in enumerate(zip(rows, row_titles)):
        top = gap + row_index * row_height
        draw.text((gap, top + 4), title, font=font, fill='#e8f4ff')
        for column, (image_path, label) in enumerate(row):
            left = gap + column * (tile_width + gap)
            with Image.open(image_path) as source:
                thumb = source.convert('RGB')
                thumb.thumbnail((tile_width, tile_height), Image.Resampling.LANCZOS)
                sheet.paste(thumb, (left + (tile_width - thumb.width) // 2, top + title_height + (tile_height - thumb.height) // 2))
            draw.text((left + 3, top + title_height + tile_height + 5), label, font=font, fill='#d2dfeb')
    sheet.save(output, quality=92)


contact_sheet(review / 'contact-sheet.jpg', [review_frames[:5], review_frames[5:]], ['Overall review: first half', 'Overall review: second half'])

# Zero-based frame indices make the close transition checks exact at 24 fps.
# Quench brackets the hot/cool change; fracture follows the tail into head replacement.
motion_rows = [
    ('Quench: hot glass to cooled shell', [204, 207, 209, 210, 211, 216]),
    ('Fracture: tail travel and head replacement', [461, 462, 464, 465, 466, 468]),
]
motion_indices = [frame for _, frames in motion_rows for frame in frames]
selection = '+'.join(f'eq(n\\,{frame})' for frame in motion_indices)
run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-xerror', '-i', str(FINAL),
     '-vf', f'select={selection}', '-fps_mode', 'vfr', '-frames:v', str(len(motion_indices)),
     '-start_number', '0', str(review / 'motion-%02d.jpg')])
motion_frames = [(review / f'motion-{index:02d}.jpg', f'{frame / 24:.4f} s | f{frame}')
                 for index, frame in enumerate(motion_indices)]
contact_sheet(review / 'motion-check.jpg', [motion_frames[:6], motion_frames[6:]], [title for title, _ in motion_rows])

report = {
    'status': 'mechanical_and_audio_checks_passed',
    'visual_review': 'Review extracted frames separately before marking delivery complete.',
    'dimensions': [video['width'], video['height']],
    'fps': video['r_frame_rate'],
    'average_fps': video['avg_frame_rate'],
    'frame_count': int(video['nb_frames']),
    'duration': float(video['duration']),
    'audio_duration': float(audio['duration']),
    'audio_codec': audio['codec_name'],
    'sample_rate': int(audio['sample_rate']),
    'channels': audio['channels'],
    'loudness': mix_levels,
    'authored_script': script,
    'final_mix_transcription': spoken,
    'final_mix_transcript_similarity': similarity,
    'complete_caption_word_coverage': True,
    'full_decode': 'passed',
    'review_frame_times': review_times,
    'review_contact_sheet': 'review/contact-sheet.jpg',
    'motion_contact_sheet': 'review/motion-check.jpg',
    'motion_review_frames': [{'sequence': title, 'frames': frames, 'times': [frame / 24 for frame in frames]}
                             for title, frames in motion_rows],
}
(ROOT / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

