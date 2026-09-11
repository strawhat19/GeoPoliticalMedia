from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse
import subprocess
import unicodedata
import hashlib
import json
import math
import wave
import sys
import re

sys.path.insert(0, str(Path.home() / '.cache' / 'geopoliticalmedia-video-tools'))
import imageio_ffmpeg

PRODUCTION = Path(__file__).resolve().parent
ASSETS = PRODUCTION / 'assets'
SAMPLES = PRODUCTION.parent
WORK = PRODUCTION / 'edits'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
WIDTH, HEIGHT, FPS = 720, 1280, 30


def run(arguments):
    result = subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', *arguments], cwd=PRODUCTION, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-6000:])


def relative(path):
    return str(path.relative_to(PRODUCTION)).replace('\\', '/')


def normalize(text):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower())


def anchor(words, phrase):
    joined = ''.join(normalize(word['text']) for word in words)
    position = joined.find(normalize(phrase))
    if position < 0:
        raise ValueError(f'Missing narration anchor: {phrase}')
    cursor = 0
    for word in words:
        cursor += len(normalize(word['text']))
        if cursor > position:
            return round(word['start'] * FPS) / FPS
    raise ValueError(phrase)


def duration(path):
    with wave.open(str(path), 'rb') as audio:
        return audio.getnframes() / audio.getframerate()


def timecode(seconds):
    centiseconds = max(0, round(seconds * 100))
    hours, remainder = divmod(centiseconds, 360000)
    minutes, remainder = divmod(remainder, 6000)
    whole, fraction = divmod(remainder, 100)
    return f'{hours}:{minutes:02}:{whole:02}.{fraction:02}'


def plan_episode(episode, words, total):
    at = lambda text: anchor(words, text)
    image = lambda name, start, end, zoom=1.02, focus=.45: dict(kind='image', source=name, start=start, end=end, zoom=zoom, focus=focus)
    video = lambda name, start, end, source_start=0, source_length=None: dict(kind='video', source=name, start=start, end=end, source_start=source_start, source_length=source_length)
    slug = episode['slug']
    if slug == 'sleep-paralysis':
        return [
            image('sleep-bedroom.png', 0, at('That can be'), 1.02, .30),
            image('sleep-bedroom.png', at('That can be'), at('If you feel'), 1.18, .27),
            image('sleep-finger.png', at('If you feel'), at('Regular sleep'), 1.04, .45),
            image('sleep-morning.png', at('Regular sleep'), total, 1.02, .32),
        ]
    if slug == 'el-nino-2026':
        return [
            image('el-nino-ocean.png', 0, at("NOAA's"), 1.02, .35),
            image('el-nino-ocean.png', at("NOAA's"), at('Why so strong'), 1.16, .55),
            video('el-nino-heat.mp4', at('Why so strong'), at("For America's winter"), source_length=8),
            image('el-nino-rain.png', at("For America's winter"), at('Elsewhere'), 1.03, .40),
            image('el-nino-rain.png', at('Elsewhere'), at('But stronger'), 1.15, .55),
            image('el-nino-ocean.png', at('But stronger'), total, 1.03, .35),
        ]
    if slug == 'india-beneath-tibet':
        return [
            image('india-himalaya.png', 0, at('That slow collision'), 1.02, .40),
            video('india-underthrust.mp4', at('That slow collision'), at('Now'), source_length=4.2),
            image('india-himalaya.png', at('Now'), at('parts of the plate'), 1.17, .55),
            video('india-underthrust.mp4', at('parts of the plate'), at("The country isn't"), source_start=4.0, source_length=6.0),
            image('india-himalaya.png', at("The country isn't"), total, 1.04, .38),
        ]
    if slug == 'light-sound-thought':
        return [
            image('speed-lightning.png', 0, at('Light in a vacuum'), 1.02, .30),
            image('el-nino-ocean.png', at('Light in a vacuum'), at('Sound in air'), 1.03, .28),
            image('speed-lightning.png', at('Sound in air'), at('Your nerve signals'), 1.15, .45),
            image('speed-neuron.png', at('Your nerve signals'), at('But a thought'), 1.04, .45),
            image('speed-neuron.png', at('But a thought'), at('Imagining the Moon'), 1.16, .26),
            image('el-nino-ocean.png', at('Imagining the Moon'), at('Thinking time'), 1.15, .22),
            image('speed-neuron.png', at('Thinking time'), total, 1.02, .35),
        ]
    if slug == 'handwashing-semmelweis':
        return [
            image('hand-normal.png', 0, at('Under ultraviolet'), 1.0, .50),
            image('uv-before.png', at('Under ultraviolet'), at('Now rewind'), 1.0, .50),
            image('../../semmelweis/source/ward.png', at('Now rewind'), at('Ignaz Semmelweis'), 1.03, .40),
            image('../../semmelweis/source/physician.png', at('Ignaz Semmelweis'), at('He introduced'), 1.03, .33),
            video('handwashing-historical.mp4', at('He introduced'), at('Today'), source_length=5.875),
            image('modern-handwash.png', at('Today'), at('Between fingers'), 1.02, .40),
            image('modern-handwash.png', at('Between fingers'), at('Rinse with'), 1.16, .40),
            image('modern-handwash.png', at('Rinse with'), at('This simulated'), 1.05, .40),
            dict(kind='comparison', start=at('This simulated'), end=total),
        ]
    raise ValueError(slug)


def source_path(scene):
    return (ASSETS / scene['source']).resolve()


def render_scene(scene, path):
    frames = round((scene['end'] - scene['start']) * FPS)
    if frames <= 0:
        raise ValueError(f'Empty scene: {scene}')
    seconds = frames / FPS
    common = ['-frames:v', str(frames), '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-threads', '2', '-movflags', '+faststart', '-y', str(path)]
    if scene['kind'] == 'comparison':
        filters = '[0:v]scale=348:618,setsar=1[a];[1:v]scale=348:618,setsar=1[b];[a][b]hstack=inputs=2,pad=720:1280:12:265:color=0x030719,setsar=1[v]'
        run(['-loop', '1', '-framerate', str(FPS), '-i', str(ASSETS / 'uv-before.png'), '-loop', '1', '-framerate', str(FPS), '-i', str(ASSETS / 'uv-after.png'), '-filter_complex', filters, '-map', '[v]', *common])
    elif scene['kind'] == 'image':
        source = source_path(scene)
        if not source.exists():
            raise FileNotFoundError(source)
        zoom = scene['zoom']
        growth = 0 if source.name in ('hand-normal.png', 'uv-before.png', 'uv-after.png') else .055
        focus = scene['focus']
        filters = f"scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560,zoompan=z='{zoom}+{growth}*on/{frames}':x='iw/2-iw/zoom/2':y='ih*{focus}-ih/zoom*{focus}':d={frames}:s=720x1280:fps=30,setsar=1,eq=saturation=0.94:contrast=1.025:brightness=-0.007"
        run(['-i', str(source), '-vf', filters, *common])
    else:
        source = source_path(scene)
        if not source.exists():
            raise FileNotFoundError(source)
        start = scene.get('source_start', 0)
        length = scene.get('source_length') or seconds
        ratio = seconds / length
        filters = f'trim=start={start}:duration={length},setpts={ratio}*(PTS-STARTPTS),scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=1'
        run(['-i', str(source), '-vf', filters, *common])
    return path


ASS_HEADER = '''[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,36,&H00F7F5EE,&H00F7F5EE,&H00140F0A,&H80000000,-1,0,0,0,100,100,0,0,1,1.6,1.1,2,52,52,155,1
Style: Hook,Arial,58,&H00F7F5EE,&H00F7F5EE,&H00312011,&H80000000,-1,0,0,0,100,100,-1,0,1,1,1,8,38,38,112,1
Style: Key,Arial,33,&H00F7F5EE,&H00F7F5EE,&H00140F0A,&H80000000,-1,0,0,0,100,100,0,0,1,1,1,5,46,46,0,1
Style: Number,Arial,80,&H008FD3FF,&H008FD3FF,&H00140F0A,&H80000000,-1,0,0,0,100,100,-1,0,1,1,1,5,38,38,0,1
Style: Note,Arial,17,&H00ECE5DA,&H00ECE5DA,&H00140F0A,&H80000000,0,0,0,0,100,100,.8,0,1,.8,.7,7,40,40,48,1
Style: Brand,Arial,22,&H00F7F5EE,&H00F7F5EE,&H00140F0A,&H80000000,-1,0,0,0,100,100,3,0,1,1,0,2,40,40,110,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''


def write_subtitles(episode, words, captions, total, path):
    events = []
    at = lambda text: anchor(words, text)

    def event(start, end, text, style='Key', tags='', layer=2):
        if end <= start:
            return
        clean = text.replace('\n', r'\N')
        events.append(f'Dialogue: {layer},{timecode(start)},{timecode(end)},{style},,0,0,0,,{{\\fad(100,90){tags}}}{clean}')

    for caption in captions:
        event(caption['start'], min(caption['end'], total - .40), caption['text'], 'Caption', layer=5)
    event(.05, min(2.95, captions[1]['end'] if episode['slug'] == 'handwashing-semmelweis' else 2.95), episode['hook'], 'Hook')
    note = 'AI illustrations · Explanatory visuals'
    if episode['slug'] == 'sleep-paralysis':
        note = 'Illustrative reenactment'
        event(at('Awareness returns'), at('Dreamlike sights'), 'AWARENESS RETURNS\nREM STILLNESS LINGERS', tags=r'\pos(360,800)')
        event(at('If you feel'), at('Relax'), 'TEMPORARY. IT PASSES.', tags=r'\pos(360,200)')
        event(at('It may help'), at('Regular sleep'), 'MAY HELP\nNO GUARANTEED OFF SWITCH', tags=r'\pos(360,220)')
        event(at('Regular sleep'), at('If it keeps'), 'REGULAR SLEEP', tags=r'\pos(360,185)')
    elif episode['slug'] == 'el-nino-2026':
        note = 'FORECAST · NOAA · SEPTEMBER 10, 2026'
        event(at("NOAA's"), at('Why so strong'), '75%', 'Number', r'\pos(360,380)')
        event(at("NOAA's"), at('Why so strong'), 'CHANCE OF EXCEEDING\nPAST EVENTS SINCE 1950', tags=r'\pos(360,480)')
        event(at("NOAA's"), at('Why so strong'), 'OCT–DEC 2026 · THREE-MONTH RONI', 'Note', r'\an5\pos(360,565)')
        event(at("For America's winter"), at('Elsewhere'), 'U.S. WINTER OUTLOOK\nWETTER SOUTH · WARMER NORTH', tags=r'\pos(360,200)')
        event(at("For America's winter"), at('Elsewhere'), 'FAVORED, NOT GUARANTEED · CPC AUG 20', 'Note', r'\an5\pos(360,295)')
        event(at('But stronger'), total - 1, 'CHANGES THE ODDS', tags=r'\pos(360,210)')
    elif episode['slug'] == 'india-beneath-tibet':
        note = 'Illustrative imagery · Geological time compressed'
        event(at('Now'), at('parts of the plate'), '2025 SEISMIC STUDY', tags=r'\pos(360,190)')
        event(at("The country isn't"), total - 1, 'A PLATE COLLISION\nNOT A DISAPPEARING COUNTRY', tags=r'\pos(360,210)')
    elif episode['slug'] == 'light-sound-thought':
        note = 'Illustrative timing · Not a shared real-time scale'
        event(at('Light in a vacuum'), at('Sound in air'), '≈300,000,000', 'Number', r'\fs66\pos(360,380)')
        event(at('Light in a vacuum'), at('Sound in air'), 'METERS / SECOND\nLIGHT IN VACUUM', tags=r'\pos(360,475)')
        event(at('Sound in air'), at('Your nerve signals'), '≈343 m/s', 'Number', r'\pos(360,370)')
        event(at('Sound in air'), at('Your nerve signals'), 'SOUND IN AIR · 20°C', tags=r'\pos(360,460)')
        event(at('Your nerve signals'), at('But a thought'), '≈0.5 TO >100 m/s', 'Number', r'\fs52\pos(360,190)')
        event(at('Your nerve signals'), at('But a thought'), 'AXON SIGNALS · DEPENDS ON FIBER', 'Note', r'\an5\pos(360,250)')
        event(at('But a thought'), at('Imagining the Moon'), 'THOUGHT HAS\nNO SINGLE TRAVEL SPEED', tags=r'\pos(360,790)')
        event(at('Thinking time'), total - 1, 'THINKING TIME\n≠\nTRAVEL SPEED', tags=r'\fs42\pos(360,780)')
        circle = 'm -45 0 b -45 -25 -25 -45 0 -45 b 25 -45 45 -25 45 0 b 45 25 25 45 0 45 b -25 45 -45 25 -45 0'
        for offset in (0, .7, 1.4):
            begin = at('Sound in air') + offset
            event(begin, min(begin + 2, at('Your nerve signals')), circle, tags=r'\an5\pos(360,665)\p1\bord1.3\shad0\1a&HFF&\3c&HD6EFFF&\fscx50\fscy50\t(0,1950,\fscx650\fscy650\3a&HFF&)', layer=1)
    else:
        note = 'UV TRACER SIMULATION · NOT ACTUAL GERMS'
        event(at('Under ultraviolet'), at('Now rewind'), 'BEFORE WASHING\nFLUORESCENT TRAINING LOTION', tags=r'\fs27\pos(360,195)')
        event(at('Now rewind'), at('Ignaz Semmelweis'), 'VIENNA · 1847', tags=r'\pos(360,200)')
        event(at('Ignaz Semmelweis'), at('He introduced'), 'IGNAZ SEMMELWEIS', tags=r'\fs28\pos(360,170)')
        event(at('He introduced'), at('Today'), 'HISTORICAL RECONSTRUCTION', 'Note', r'\an5\pos(360,85)')
        event(at('Today'), at('Between fingers'), 'SCRUB FOR AT LEAST\n20 SECONDS', tags=r'\fs38\pos(360,195)')
        event(at('Today'), at('This simulated'), 'MODERN SOAP + WATER · CONDENSED ILLUSTRATION', 'Note', r'\an5\fs15\pos(360,325)')
        event(at('This simulated'), total - .7, 'BEFORE', tags=r'\fs27\pos(185,220)')
        event(at('This simulated'), total - .7, 'AFTER', tags=r'\fs27\pos(535,220)')
        event(at('This simulated'), total - .7, 'LESS TRACER ≠ STERILE HANDS', tags=r'\fs27\pos(360,930)')
    note_end = total - .75
    if episode['slug'] == 'india-beneath-tibet':
        event(.1, at('That slow collision'), note, 'Note')
        event(at('Now'), at('parts of the plate'), note, 'Note')
        event(at("The country isn't"), note_end, note, 'Note')
    elif episode['slug'] == 'el-nino-2026':
        event(.1, at('Why so strong'), note, 'Note')
        event(at("For America's winter"), note_end, note, 'Note')
    else:
        event(.1, note_end, note, 'Note')
    event(total - .85, total - .08, episode['channel'].upper(), 'Brand')
    path.write_text(ASS_HEADER + '\n'.join(events) + '\n', encoding='utf-8')


def render_episode(episode, replace=False, reuse_scenes=False):
    slug = episode['slug']
    final = SAMPLES / f'{slug}.mp4'
    if final.exists() and not replace:
        raise FileExistsError(f'Use --replace to replace {final.name}')
    audio = PRODUCTION / 'audio' / f'{slug}.wav'
    words = json.loads(audio.with_suffix('.words.json').read_text(encoding='utf-8'))
    captions = json.loads(audio.with_suffix('.captions.json').read_text(encoding='utf-8'))
    total = math.ceil((duration(audio) + .55) * FPS) / FPS
    folder = WORK / slug
    folder.mkdir(parents=True, exist_ok=True)
    scenes = plan_episode(episode, words, total)
    timeline_path = folder / 'timeline.json'
    timeline = {'duration': total, 'scenes': scenes}
    previous_timeline = json.loads(timeline_path.read_text(encoding='utf-8')) if timeline_path.exists() else None
    can_reuse = reuse_scenes and previous_timeline == timeline
    timeline_path.write_text(json.dumps(timeline, indent=2) + '\n', encoding='utf-8')
    print(f'Rendering {slug}: {total:.2f}s, {len(scenes)} scenes', flush=True)
    clips = []
    for index, scene in enumerate(scenes):
        path = folder / f'{index:02}.mp4'
        sources = [ASSETS / 'uv-before.png', ASSETS / 'uv-after.png'] if scene['kind'] == 'comparison' else [source_path(scene)]
        source_modified = max(source.stat().st_mtime for source in sources)
        if not (can_reuse and path.exists() and path.stat().st_mtime > source_modified):
            render_scene(scene, path)
        clips.append(path)
    concat = folder / 'shots.txt'
    concat.write_text('\n'.join(f"file '{path.name}'" for path in clips) + '\n', encoding='utf-8')
    picture = folder / 'picture.mp4'
    run(['-f', 'concat', '-safe', '0', '-i', str(concat), '-c', 'copy', '-y', str(picture)])
    ass = folder / 'captions.ass'
    write_subtitles(episode, words, captions, total, ass)
    underscore = SAMPLES / 'semmelweis' / 'source' / 'underscore.wav'
    music_ratio = duration(underscore) / total
    filters = f'[0:v]ass={relative(ass)},fade=t=out:st={total-.4}:d=0.4[v];[1:a]highpass=f=65,acompressor=threshold=0.12:ratio=1.7:attack=8:release=100,apad=pad_dur=1[voice];[2:a]atempo={music_ratio},volume=0.7,apad=pad_dur=1[music];[voice][music]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=7,atrim=duration={total},afade=t=out:st={total-.5}:d=0.5,aresample=48000[a]'
    run(['-i', str(picture), '-i', str(audio), '-i', str(underscore), '-filter_complex', filters, '-map', '[v]', '-map', '[a]', '-t', str(total), '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-threads', '2', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', str(final)])
    poster = SAMPLES / f'{slug}-poster.jpg'
    run(['-ss', '0.65', '-i', str(final), '-frames:v', '1', '-q:v', '2', '-y', str(poster)])
    report = {'slug': slug, 'duration': total, 'size': [WIDTH, HEIGHT], 'fps': FPS, 'output': final.name, 'poster': poster.name, 'scene_count': len(scenes), 'audio_source': relative(audio), 'script_sha256': hashlib.sha256(episode['script'].encode()).hexdigest(), 'synthetic_voice': True, 'visuals': 'AI-generated scenes, cinematic camera moves, and explanatory animation'}
    (folder / 'render.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Exported {final.name}', flush=True)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', action='append')
    parser.add_argument('--replace', action='store_true')
    parser.add_argument('--reuse-scenes', action='store_true')
    parser.add_argument('--workers', type=int, default=2)
    options = parser.parse_args()
    episodes = json.loads((PRODUCTION / 'episodes.json').read_text(encoding='utf-8'))['episodes']
    if options.episode:
        episodes = [episode for episode in episodes if episode['slug'] in options.episode]
        if not episodes:
            raise ValueError(options.episode)
    with ThreadPoolExecutor(max_workers=max(1, min(options.workers, 3))) as executor:
        futures = [executor.submit(render_episode, episode, options.replace, options.reuse_scenes) for episode in episodes]
        reports = [future.result() for future in futures]
    (WORK / 'render-manifest.json').write_text(json.dumps(reports, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
