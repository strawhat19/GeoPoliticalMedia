# Narration

21.312 seconds. Synthetic English narration using `en-US-ChristopherNeural`, rate `+8%`, pitch `-2Hz`, through the public Edge speech endpoint via [edge-tts 7.2.8](https://github.com/rany2/edge-tts). No API key, paid account, voice cloning, or service workaround was used.

- `narration.txt`: exact approved script.
- `narration.mp3`: generated 24 kHz mono speech.
- `narration.wav`: the same speech decoded to 48 kHz, 16-bit mono PCM for editing; no time stretching or loudness processing.
- `narration.srt`: word-level subtitle timings returned by the service.
- `narration-words.json`: the same timings in seconds for caption editing.
- `generate_narration.py`: generation and WAV conversion script. Requires `edge-tts` and `imageio-ffmpeg` in the local video-tools cache referenced by the script.

The WAV decoded successfully and its duration was measured from the PCM frame count. The 44 returned timing events are ordered, start at 0.096 seconds, and finish at 20.509 seconds. The spoken-word metadata matches the transcript apart from punctuation. Leave the remaining pause at the end for the edit.
