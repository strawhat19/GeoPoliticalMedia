from pathlib import Path
import asyncio
import json
import subprocess
import sys

sys.path.insert(0, 'C:/Users/massa/.cache/geopoliticalmedia-video-tools')
import edge_tts
import imageio_ffmpeg

source = Path(__file__).resolve().parent

async def main():
    transcript = (source / 'narration.txt').read_text(encoding='utf-8').strip()
    narrator = edge_tts.Communicate(transcript, 'en-US-ChristopherNeural', rate='+8%', pitch='-2Hz', boundary='WordBoundary')
    subtitles = edge_tts.SubMaker()
    words = []
    with (source / 'narration.mp3').open('wb') as audio:
        async for chunk in narrator.stream():
            if chunk['type'] == 'audio':
                audio.write(chunk['data'])
            elif chunk['type'] == 'WordBoundary':
                subtitles.feed(chunk)
                words.append({'text': chunk['text'], 'start': chunk['offset'] / 10000000, 'end': (chunk['offset'] + chunk['duration']) / 10000000})
    (source / 'narration.srt').write_text(subtitles.get_srt(), encoding='utf-8')
    (source / 'narration-words.json').write_text(json.dumps(words, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source / 'narration.mp3'), '-ar', '48000', '-c:a', 'pcm_s16le', str(source / 'narration.wav')], check=True)

asyncio.run(main())
