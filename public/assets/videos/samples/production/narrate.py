from pathlib import Path
import asyncio
import hashlib
import json
import math
import re
import subprocess
import sys
import textwrap
import wave

sys.path.insert(0, str(Path.home() / '.cache' / 'geopoliticalmedia-video-tools'))
import edge_tts
import imageio_ffmpeg
import numpy as np

PRODUCTION = Path(__file__).resolve().parent
AUDIO = PRODUCTION / 'audio'
CONCURRENCY = 3
PHRASES = {
    'sleep-paralysis': [
        'You wake up.', 'You sense someone in the room.', 'You try to move... nothing.',
        'That can be sleep paralysis.', 'Awareness returns while', "REM sleep's muscle stillness briefly continues.",
        'Dreamlike sights or chest pressure', 'can feel real.', 'Breathing continues.',
        'If you feel it starting,', 'remind yourself it passes.', 'Relax, and try',
        'one tiny finger movement.', 'It may help.', "There's no guaranteed off switch.",
        'Regular sleep may reduce episodes.', 'If it keeps happening', 'or leaves you very sleepy,', 'talk to a clinician.',
    ],
    'el-nino-2026': [
        "This year's El Niño", 'could break a record.', "NOAA's September tenth forecast",
        'gives it a seventy-five percent', 'chance this fall', 'of beating past events', 'since nineteen fifty.',
        'Why so strong?', 'Exceptional heat at the surface,', 'and deeper in the Pacific,', 'is helping it strengthen.',
        "For America's winter,", 'forecasts favor a wetter South', 'and warmer North.',
        'Elsewhere, shifting rain patterns', 'change flood and drought risks.', "But stronger doesn't mean",
        'worse everywhere.', 'El Niño changes the odds,', 'not the weather on your street.',
    ],
    'india-beneath-tibet': [
        "India's tectonic plate", 'is pushing under Tibet.', 'But the weird part', 'is what may be happening underneath.',
        'That slow collision helps', 'build the Himalayas.', 'Now, a twenty twenty-five seismic study',
        'suggests something deeper:', "parts of the plate's mantle layer", 'may be tearing and peeling away',
        'from its crust.', "That's inferred from seismic evidence,", 'not a surface split.', "The country isn't disappearing.",
        'Those enormous mountains', 'are just the surface', 'of a much bigger collision.',
    ],
    'light-sound-thought': [
        "What's faster:", 'light, sound, or a thought?', 'Light in a vacuum travels',
        'almost three hundred million', 'meters per second.', 'Sound in air', 'at twenty degrees Celsius?',
        'About three hundred forty-three.', 'Your nerve signals?', 'Roughly half a meter',
        'to over a hundred', 'meters per second,', 'depending on the fiber.', "But a thought doesn't have",
        'one travel speed.', "It's signals plus processing", 'across a network.', 'Imagining the Moon instantly',
        "doesn't send anything there.", 'Thinking time and travel speed', "aren't the same thing.",
    ],
    'handwashing-semmelweis': [
        'These hands look clean.', 'Under ultraviolet light?', "That's training lotion showing missed spots,", 'not germs.',
        'Now rewind to eighteen forty-seven.', 'Ignaz Semmelweis linked deadly childbed fever', 'to doctors coming from autopsies.',
        'He introduced chlorinated-lime hand cleaning.', 'Deaths fell.', 'Soap washing already existed.',
        'Today, scrub with soap', 'for at least twenty seconds.', 'Between fingers.', 'Around nails.',
        'Rinse with clean running water,', 'and dry.', 'This simulated before-and-after shows',
        'how a tracer can reveal residue.', "Less glow doesn't mean sterile hands.",
    ],
}


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def normalize(value):
    return ''.join(character.lower() for character in value if character.isalnum())


def timed_tokens(transcript, words):
    tokens = re.findall(r'\S+', transcript)
    normalized_script = ''.join(normalize(token) for token in tokens)
    normalized_words = ''.join(normalize(word['text']) for word in words)
    if normalized_script != normalized_words:
        raise ValueError('Word Boundaries Do Not Match The Full Transcript')
    boundaries = []
    cursor = 0
    for word in words:
        length = len(normalize(word['text']))
        boundaries.append((cursor, cursor + length, word))
        cursor += length
    cursor = 0
    output = []
    for token in tokens:
        token_end = cursor + len(normalize(token))
        matching = [word for start, end, word in boundaries if end > cursor and start < token_end]
        if not matching:
            raise ValueError(f'Missing Word Timing: {token}')
        output.append({'text': token, 'start': matching[0]['start'], 'end': matching[-1]['end']})
        cursor = token_end
    return output


def wrap_caption(phrase):
    if len(phrase) <= 32:
        return phrase
    words = phrase.split()
    candidates = [(' '.join(words[:index]), ' '.join(words[index:])) for index in range(1, len(words))]
    candidates = [lines for lines in candidates if max(map(len, lines)) <= 32]
    if not candidates:
        raise ValueError(f'Caption Lines Exceed 32 Characters: {phrase}')
    return '\n'.join(min(candidates, key=lambda lines: abs(len(lines[0]) - len(lines[1]))))


def make_captions(transcript, words, slug=None):
    tokens = timed_tokens(transcript, words)
    count = len(tokens)
    costs = [math.inf] * (count + 1)
    choices = {}
    costs[count] = 0.0
    weak_endings = {'a', 'an', 'the', 'to', 'of', 'and', 'or', 'with', 'your', 'their', 'its', 'this'}
    for start in range(count - 1, -1, -1):
        for end in range(start + 2, min(start + 6, count) + 1):
            phrase = ' '.join(token['text'] for token in tokens[start:end])
            lines = textwrap.wrap(phrase, width=32, break_long_words=False, break_on_hyphens=False)
            if len(lines) > 2 or max(map(len, lines)) > 36:
                continue
            if end < count and tokens[end]['start'] < tokens[end - 1]['end'] - 0.000001:
                continue
            duration = tokens[end - 1]['end'] - tokens[start]['start']
            sentence_end = bool(re.search(r'[.!?]$', tokens[end - 1]['text']))
            internal_sentences = sum(bool(re.search(r'[.!?]$', token['text'])) for token in tokens[start:end - 1])
            score = 0.10 * abs(4 - (end - start)) + (0.0 if sentence_end else 0.9)
            score += internal_sentences * 2.6
            score += 1.0 if normalize(tokens[end - 1]['text']) in weak_endings else 0.0
            score += max(0.0, 0.75 - duration) * 2.0
            score += max(0.0, len(phrase) / max(duration, 0.1) - 24.0) * 0.03
            if len(lines) == 2:
                score += abs(len(lines[0]) - len(lines[1])) * 0.007
            if score + costs[end] < costs[start]:
                costs[start] = score + costs[end]
                choices[start] = (end, '\n'.join(lines))
    preferred = PHRASES.get(slug)
    if preferred and ' '.join(preferred) == transcript:
        cursor = 0
        choices = {}
        for phrase in preferred:
            end = cursor + len(phrase.split())
            choices[cursor] = (end, wrap_caption(phrase))
            cursor = end
    if 0 not in choices:
        raise ValueError('Could Not Build Complete 2–6 Word Captions')
    captions = []
    cursor = 0
    while cursor < count:
        end, text = choices[cursor]
        next_start = tokens[end]['start'] if end < count else math.inf
        captions.append({
            'text': text,
            'start': round(tokens[cursor]['start'], 6),
            'end': round(min(tokens[end - 1]['end'] + 0.12, next_start), 6),
        })
        cursor = end
    combined = ' '.join(' '.join(caption['text'].split()) for caption in captions)
    assert combined == ' '.join(transcript.split()), 'Caption Transcript Mismatch'
    for index, caption in enumerate(captions):
        assert 2 <= len(caption['text'].split()) <= 6
        assert caption['start'] < caption['end']
        assert index == 0 or caption['start'] >= captions[index - 1]['end']
        assert all(len(line) <= 36 for line in caption['text'].splitlines())
    return captions


def inspect_wav(path):
    with wave.open(str(path), 'rb') as audio:
        sample_rate = audio.getframerate()
        channels = audio.getnchannels()
        frames = audio.getnframes()
        assert sample_rate == 48_000 and audio.getsampwidth() == 2
        pcm = np.frombuffer(audio.readframes(frames), dtype='<i2').astype(np.float64) / 32768.0
    assert np.isfinite(pcm).all() and np.max(np.abs(pcm)) > 0.01
    return {
        'duration': round(frames / sample_rate, 6),
        'sample_rate': sample_rate,
        'channels': channels,
        'pcm_bits': 16,
        'rms_dbfs': round(20.0 * np.log10(np.sqrt(np.mean(pcm ** 2))), 3),
        'peak_dbfs': round(20.0 * np.log10(np.max(np.abs(pcm))), 3),
    }


async def generate_episode(episode, voice, settings, semaphore):
    slug = episode['slug']
    transcript = episode['script']
    mp3 = AUDIO / f'{slug}.mp3'
    wav = AUDIO / f'{slug}.wav'
    words_path = AUDIO / f'{slug}.words.json'
    captions_path = AUDIO / f'{slug}.captions.json'
    async with semaphore:
        print(f'Generating Narration: {slug}', flush=True)
        for attempt in range(1, 4):
            try:
                words = []
                narrator = edge_tts.Communicate(transcript, voice, rate=settings['rate'], pitch=settings['pitch'], boundary='WordBoundary')
                temporary_mp3 = mp3.with_suffix('.mp3.part')
                with temporary_mp3.open('wb') as output:
                    async for chunk in narrator.stream():
                        if chunk['type'] == 'audio':
                            output.write(chunk['data'])
                        elif chunk['type'] == 'WordBoundary':
                            words.append({
                                'text': chunk['text'],
                                'start': round(chunk['offset'] / 10_000_000, 6),
                                'end': round((chunk['offset'] + chunk['duration']) / 10_000_000, 6),
                            })
                assert words and temporary_mp3.stat().st_size > 1_000
                for index, word in enumerate(words):
                    assert 0.0 <= word['start'] < word['end']
                    assert index == 0 or word['start'] >= words[index - 1]['end'] - 0.000001
                captions = make_captions(transcript, words, slug)
                temporary_wav = wav.with_suffix('.part.wav')
                command = [imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-hide_banner', '-loglevel', 'error', '-i', str(temporary_mp3), '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', str(temporary_wav)]
                await asyncio.to_thread(subprocess.run, command, check=True, capture_output=True)
                levels = inspect_wav(temporary_wav)
                assert words[-1]['end'] <= levels['duration'] + 0.05
                assert captions[-1]['end'] <= levels['duration']
                temporary_mp3.replace(mp3)
                temporary_wav.replace(wav)
                write_json(words_path, words)
                write_json(captions_path, captions)
                record = {
                    'slug': slug,
                    'voice': voice,
                    'rate': settings['rate'],
                    'pitch': settings['pitch'],
                    'script_sha256': hashlib.sha256(transcript.encode('utf-8')).hexdigest(),
                    'method': 'Microsoft Edge neural TTS through edge-tts 7.2.8; FFmpeg decoding to 48 kHz mono PCM',
                    'files': {'mp3': mp3.name, 'wav': wav.name, 'words': words_path.name, 'captions': captions_path.name},
                    'word_boundaries': len(words),
                    'captions': len(captions),
                    'last_spoken_word_end': words[-1]['end'],
                    'validation': 'Decoded WAV verified; ordered measured word timestamps; exact complete caption transcript; no caption overlaps',
                    **levels,
                }
                print(f'Narration Complete: {slug} | {levels["duration"]:.3f}s | Peak {levels["peak_dbfs"]:.2f} dBFS | {len(captions)} Captions', flush=True)
                return record
            except Exception as error:
                print(f'Narration Attempt {attempt} Failed: {slug} | {type(error).__name__}: {error}', flush=True)
                if attempt == 3:
                    raise
                await asyncio.sleep(2 ** attempt)


async def main():
    manifest = json.loads((PRODUCTION / 'episodes.json').read_text(encoding='utf-8-sig'))
    if '--captions-only' in sys.argv:
        audio_manifest = json.loads((AUDIO / 'manifest.json').read_text(encoding='utf-8'))
        for episode, record in zip(manifest['episodes'], audio_manifest['episodes'], strict=True):
            assert episode['slug'] == record['slug']
            assert record['script_sha256'] == hashlib.sha256(episode['script'].encode('utf-8')).hexdigest()
            words = json.loads((AUDIO / record['files']['words']).read_text(encoding='utf-8'))
            captions = make_captions(episode['script'], words, episode['slug'])
            levels = inspect_wav(AUDIO / record['files']['wav'])
            assert captions[-1]['end'] <= levels['duration']
            write_json(AUDIO / record['files']['captions'], captions)
            record['captions'] = len(captions)
            print(f'Captions Verified: {episode["slug"]} | {len(captions)} Phrases', flush=True)
        write_json(AUDIO / 'manifest.json', audio_manifest)
        return
    available = {voice['ShortName'] for voice in await edge_tts.list_voices()}
    preferred = manifest['voice']['name']
    voice = preferred if preferred in available else 'en-US-AndrewNeural'
    if voice not in available:
        raise RuntimeError('Neither Requested Andrew Voice Is Available')
    print(f'Verified Voice: {voice}', flush=True)
    AUDIO.mkdir(exist_ok=True)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    records = await asyncio.gather(*(generate_episode(episode, voice, manifest['voice'], semaphore) for episode in manifest['episodes']))
    write_json(AUDIO / 'manifest.json', {
        'voice': voice,
        'preferred_voice_available': preferred in available,
        'method_source': 'https://github.com/rany2/edge-tts',
        'sample_rate': 48_000,
        'episodes': records,
    })
    print(f'All Narrations Verified: {len(records)}', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
