from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import math
import re
import subprocess
import sys
import unicodedata

sys.path.insert(0, str(Path.home() / '.cache' / 'geopoliticalmedia-video-tools'))
import imageio_ffmpeg

PRODUCTION = Path(__file__).resolve().parent
SAMPLES = PRODUCTION.parent
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
QUALIFIERS = {
    'sleep-paralysis': {
        'script': ['can be sleep paralysis', 'Breathing continues', 'It may help', 'no guaranteed off switch', 'talk to a clinician'],
        'ass': ['Illustrative reenactment', 'NO GUARANTEED OFF SWITCH']},
    'el-nino-2026': {
        'script': ['could break a record', 'seventy-five percent chance', 'forecasts favor', "doesn't mean worse everywhere"],
        'ass': ['FORECAST', 'SEPTEMBER 10, 2026', 'OCT–DEC 2026', 'THREE-MONTH RONI', 'FAVORED, NOT GUARANTEED']},
    'india-beneath-tibet': {
        'script': ['may be tearing', 'inferred from seismic evidence', "country isn't disappearing"],
        'ass': ['Geological time compressed', '2025 SEISMIC STUDY', 'NOT A DISAPPEARING COUNTRY']},
    'light-sound-thought': {
        'script': ['Light in a vacuum', 'air at twenty degrees Celsius', 'depending on the fiber', "a thought doesn't have one travel speed"],
        'ass': ['Not a shared real-time scale', 'LIGHT IN VACUUM', 'SOUND IN AIR · 20°C', 'DEPENDS ON FIBER']},
    'handwashing-semmelweis': {
        'script': ['training lotion', 'not germs', 'chlorinated-lime', 'Soap washing already existed', 'twenty seconds', 'simulated before-and-after', "doesn't mean sterile hands"],
        'ass': ['UV TRACER SIMULATION', 'NOT ACTUAL GERMS', 'BEFORE', 'AFTER', 'LESS TRACER ≠ STERILE HANDS']}}


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def file_record(path):
    path = path.resolve()
    record = {'filename': str(path), 'exists': path.is_file()}
    if record['exists']:
        record.update(bytes=path.stat().st_size, sha256=sha256(path))
    return record


def normalized(text):
    text = unicodedata.normalize('NFKC', text).casefold()
    return ' '.join(re.findall(r'[^\W_]+', text, flags=re.UNICODE))


def clean_ass(text):
    return re.sub(r'\{[^}]*\}', '', text).replace(r'\N', ' ').replace(r'\n', ' ').replace(r'\h', ' ')


def ass_seconds(value):
    hours, minutes, seconds = value.split(':')
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def ass_events(path):
    events, fields = [], None
    in_events = False
    for raw in path.read_text(encoding='utf-8-sig').splitlines():
        if raw.startswith('['):
            in_events = raw.strip() == '[Events]'
        elif in_events and raw.startswith('Format:'):
            fields = [part.strip().lower() for part in raw.split(':', 1)[1].split(',')]
        elif in_events and raw.startswith('Dialogue:'):
            if not fields:
                raise ValueError('ASS Events Format Missing')
            values = raw.split(':', 1)[1].lstrip().split(',', len(fields) - 1)
            event = dict(zip(fields, values))
            event.update(start=ass_seconds(event['start']), end=ass_seconds(event['end']), text=clean_ass(event['text']))
            events.append(event)
    return events


def run_ffmpeg(arguments, timeout=240):
    return subprocess.run([FFMPEG, '-hide_banner', '-nostdin', *arguments], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout)


def add_check(report, name, passed, detail):
    report['checks'].append({'name': name, 'passed': bool(passed), 'detail': detail})


def source_records(episode, timeline):
    slug = episode['slug']
    paths = [PRODUCTION / 'episodes.json', PRODUCTION / 'audio' / 'manifest.json',
        PRODUCTION / 'render_shorts.py', PRODUCTION / 'edits' / slug / 'timeline.json',
        PRODUCTION / 'edits' / slug / 'captions.ass', SAMPLES / 'semmelweis' / 'source' / 'underscore.wav']
    paths.extend(PRODUCTION / 'audio' / f'{slug}.{suffix}' for suffix in ['wav', 'mp3', 'words.json', 'captions.json'])
    for scene in timeline['scenes']:
        names = ['uv-before.png', 'uv-after.png'] if scene['kind'] == 'comparison' else [scene['source']]
        paths.extend(PRODUCTION / 'assets' / name for name in names)
    return [file_record(path) for path in sorted({p.resolve() for p in paths})]


def verify_episode(episode, audio_entries):
    slug = episode['slug']
    report = {'slug': slug, 'checks': [], 'review_required': True}
    final = SAMPLES / f'{slug}.mp4'
    report['export'] = file_record(final)
    add_check(report, 'Export Exists And Nonempty', final.is_file() and final.stat().st_size > 0, report['export'])
    if not report['checks'][-1]['passed']:
        return report
    initial_stat = final.stat()
    timeline = read_json(PRODUCTION / 'edits' / slug / 'timeline.json')
    expected_duration = float(timeline['duration'])
    report['timeline_duration'] = expected_duration
    report['sources'] = source_records(episode, timeline)
    missing = [record['filename'] for record in report['sources'] if not record['exists'] or not record.get('bytes')]
    add_check(report, 'Source Files Available', not missing, missing)

    decoder = imageio_ffmpeg.read_frames(str(final), pix_fmt='rgb24')
    try:
        metadata = next(decoder)
    finally:
        decoder.close()
    report['metadata'] = metadata
    duration = float(metadata['duration'])
    add_check(report, 'Video Format', tuple(metadata.get('size', ())) == (720, 1280) and abs(float(metadata.get('fps', 0)) - 30) < .01 and metadata.get('codec') == 'h264',
        {'expected': '720x1280, 30 fps, H.264', 'size': metadata.get('size'), 'fps': metadata.get('fps'), 'codec': metadata.get('codec')})
    add_check(report, 'Timeline Duration', abs(duration - expected_duration) <= .12,
        {'actual': duration, 'expected': expected_duration, 'difference': round(duration - expected_duration, 6), 'tolerance': .12})
    decoded = run_ffmpeg(['-loglevel', 'info', '-xerror', '-err_detect', 'explode', '-i', str(final), '-map', '0:v:0', '-map', '0:a:0', '-progress', 'pipe:1', '-nostats', '-f', 'null', '-'])
    frames = [int(value) for value in re.findall(r'^frame=(\d+)\s*$', decoded.stdout, flags=re.MULTILINE)]
    input_header = decoded.stderr.split('Stream mapping:', 1)[0]
    audio_streams = re.findall(r'Stream #0:\d+[^\n]*Audio:[^\n]*', input_header)
    report['full_decode'] = {'returncode': decoded.returncode, 'decoded_frames': max(frames, default=0), 'audio_streams': audio_streams,
        'completed': 'progress=end' in decoded.stdout, 'stderr_tail': decoded.stderr[-1800:]}
    add_check(report, 'Full Audio And Video Decode', decoded.returncode == 0 and 'progress=end' in decoded.stdout and bool(audio_streams), report['full_decode'])
    actual_frames = max(frames, default=0)
    add_check(report, 'Decoded Frame Count', actual_frames == round(expected_duration * 30), {'actual': actual_frames, 'expected': round(expected_duration * 30)})

    loudness = run_ffmpeg(['-loglevel', 'info', '-i', str(final), '-map', '0:a:0', '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'])
    measurements = re.findall(r'\{\s*"input_i".*?\}', loudness.stderr, flags=re.DOTALL)
    if loudness.returncode == 0 and measurements:
        values = json.loads(measurements[-1])
        integrated, peak = float(values['input_i']), float(values['input_tp'])
        report['loudness'] = {'integrated_lufs': integrated, 'true_peak_dbtp': peak, 'measurement': values}
        add_check(report, 'Integrated Loudness', math.isfinite(integrated) and -18 <= integrated <= -14, {'actual_lufs': integrated, 'allowed_lufs': [-18, -14]})
        add_check(report, 'True Peak', math.isfinite(peak) and peak <= -.8, {'actual_dbtp': peak, 'maximum_dbtp': -.8})
    else:
        add_check(report, 'Loudness Analysis', False, loudness.stderr[-1800:])

    audio_entry = audio_entries.get(slug, {})
    script_digest = hashlib.sha256(episode['script'].encode('utf-8')).hexdigest()
    report['script_sha256'] = script_digest
    add_check(report, 'Narration Script Hash', script_digest == audio_entry.get('script_sha256'), {'script': script_digest, 'audio_manifest': audio_entry.get('script_sha256')})
    captions = read_json(PRODUCTION / 'audio' / f'{slug}.captions.json')
    events = ass_events(PRODUCTION / 'edits' / slug / 'captions.ass')
    caption_events = [event for event in events if event['style'].casefold() == 'caption']
    caption_text = ' '.join(caption['text'] for caption in captions)
    ass_text = ' '.join(event['text'] for event in caption_events)
    canonical = normalized(episode['script'])
    add_check(report, 'Caption JSON Transcript Complete', normalized(caption_text) == canonical, {'script_tokens': len(canonical.split()), 'caption_tokens': len(normalized(caption_text).split())})
    add_check(report, 'ASS Caption Transcript Complete', normalized(ass_text) == canonical, {'script_tokens': len(canonical.split()), 'ass_tokens': len(normalized(ass_text).split())})
    timing_issues = []
    for index, event in enumerate(caption_events):
        if not 0 <= event['start'] < event['end'] <= duration + .02:
            timing_issues.append({'index': index, 'reason': 'Outside Export Duration', 'event': event})
        if index and event['start'] < caption_events[index - 1]['end'] - .011:
            timing_issues.append({'index': index, 'reason': 'Overlapping Captions'})
    if len(captions) != len(caption_events):
        timing_issues.append({'reason': 'Caption Count Mismatch'})
    else:
        for index, (caption, event) in enumerate(zip(captions, caption_events)):
            if abs(caption['start'] - event['start']) > .12 or abs(caption['end'] - event['end']) > .12:
                timing_issues.append({'index': index, 'reason': 'Measured Timing Mismatch', 'json': caption, 'ass': event})
    add_check(report, 'Caption Timing', not timing_issues, timing_issues)

    brands = [event for event in events if event['style'].casefold() == 'brand']
    brand_early = [event for event in brands if event['start'] < duration - 1 - .02 or event['end'] > duration + .02]
    stray_brands = [event for event in events if event['style'].casefold() != 'brand' and normalized(episode['channel']) in normalized(event['text'])]
    add_check(report, 'Branding Only In Final Second', not brand_early and not stray_brands, {'events': brands, 'early_or_late': brand_early, 'outside_brand_style': stray_brands, 'reference_duration': duration})
    qualifier_results = []
    all_ass = normalized(' '.join(event['text'] for event in events))
    for location, phrases in QUALIFIERS[slug].items():
        haystack = canonical if location == 'script' else all_ass
        for phrase in phrases:
            qualifier_results.append({'location': location, 'phrase': phrase, 'present': normalized(phrase) in haystack})
    report['qualifiers'] = qualifier_results
    add_check(report, 'Topic Qualifiers In Script And Subtitle Sources', all(item['present'] for item in qualifier_results), qualifier_results)

    review_dir = PRODUCTION / 'review' / slug
    review_dir.mkdir(parents=True, exist_ok=True)
    points = [('01-opening', min(.65, duration * .1)), ('02-quarter', duration * .25), ('03-middle', duration * .5),
        ('04-three-quarter', duration * .75), ('05-late', duration * .9), ('06-brand', max(0, duration - .55))]
    extracted = []
    for name, seconds in points:
        path = review_dir / f'{name}.jpg'
        capture = run_ffmpeg(['-loglevel', 'error', '-i', str(final), '-ss', f'{seconds:.6f}', '-map', '0:v:0', '-frames:v', '1', '-q:v', '2', '-y', str(path)])
        record = file_record(path)
        record.update(time_seconds=round(seconds, 6), command_passed=capture.returncode == 0)
        extracted.append(record)
    report['review_frames'] = extracted
    add_check(report, 'Review Frames Extracted', all(frame['command_passed'] and frame['exists'] and frame.get('bytes', 0) > 0 for frame in extracted), len(extracted))
    final_stat = final.stat()
    add_check(report, 'Export Unchanged During Verification', initial_stat.st_size == final_stat.st_size and initial_stat.st_mtime_ns == final_stat.st_mtime_ns,
        {'before_bytes': initial_stat.st_size, 'after_bytes': final_stat.st_size})
    return report


def main():
    episodes_file = PRODUCTION / 'episodes.json'
    manifest_file = PRODUCTION / 'audio' / 'manifest.json'
    episodes = read_json(episodes_file)['episodes']
    audio_entries = {episode['slug']: episode for episode in read_json(manifest_file)['episodes']}
    version = run_ffmpeg(['-version']).stdout.splitlines()[0]
    report = {'verified_at_utc': datetime.now(timezone.utc).isoformat(), 'ffmpeg_version': version,
        'utility': file_record(Path(__file__)), 'episodes_source': file_record(episodes_file), 'audio_manifest': file_record(manifest_file),
        'scope': 'Actual exported MP4 decode, format, duration, measured mixed-audio loudness, source hashes, caption transcript/timing, and source-level qualifiers/branding.',
        'limitations': ['No aesthetic or narration-naturalness judgment is automated.', 'Subtitle-source checks require review of extracted frames to confirm final rendered placement and appearance.',
            'Script hashes establish agreement with the narration manifest; they are not independent speech recognition of the mixed soundtrack.'], 'episodes': []}
    for episode in episodes:
        print(f"Verifying {episode['slug']}", flush=True)
        try:
            result = verify_episode(episode, audio_entries)
        except Exception as error:
            result = {'slug': episode['slug'], 'checks': [{'name': 'Verification Exception', 'passed': False, 'detail': str(error)}], 'review_required': True}
        result['automated_passed'] = bool(result['checks']) and all(check['passed'] for check in result['checks'])
        report['episodes'].append(result)
        failed = [check['name'] for check in result['checks'] if not check['passed']]
        print(json.dumps({'slug': episode['slug'], 'passed': result['automated_passed'], 'failed': failed}), flush=True)
        report['automated_passed'] = len(report['episodes']) == len(episodes) and all(item['automated_passed'] for item in report['episodes'])
        (PRODUCTION / 'verification.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'report': str(PRODUCTION / 'verification.json'), 'automated_passed': report['automated_passed']}), flush=True)
    return 0 if report['automated_passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
