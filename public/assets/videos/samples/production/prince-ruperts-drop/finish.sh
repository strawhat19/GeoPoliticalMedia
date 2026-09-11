#!/usr/bin/env bash
# Run inside the Higgsfield media sandbox after input download.
# The calling producer reserves/uploads outputs in the same sandbox command.
set -euo pipefail
cd "$(dirname "$0")"

python3 prepare_picture.py
python3 sound_design.py
higgsedit build edit.jsx

# Normalize narration first; mix modest effects; make the final track stereo AAC.
ffmpeg -y -hide_banner -loglevel error -i narration.wav \
  -af 'loudnorm=I=-16:TP=-2:LRA=5' -ar 48000 voice-normalized.wav
ffmpeg -y -hide_banner -loglevel error \
  -i edit/renders/picture.mp4 -i voice-normalized.wav -i effects.wav \
  -filter_complex '[1:a]aformat=sample_rates=48000:channel_layouts=stereo[v];[v][2:a]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-15.5:TP=-1.5:LRA=5,apad=whole_dur=22.2083333333,atrim=end=22.2083333333[a]' \
  -map 0:v:0 -map '[a]' -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -t 22.2083333333 -movflags +faststart clean-master.mp4

bash "${HF_WORKFLOWS}/subtitles/scripts/fetch_fonts.sh"
python3 "${HF_WORKFLOWS}/subtitles/scripts/audio_to_captions.py" \
  narration.wav --srt caps.srt --script script_manifest.json --language en \
  > caption-report.json

# Coverage is checked before any caption pixels are burned.
python3 - <<'PY'
from pathlib import Path
import re, json
report=json.loads(Path('caption-report.json').read_text())
assert report['similarity'] >= .90, report
assert report['timed_words'] == report['caption_words'] == 64, report
script=Path('narration.txt').read_text()
lines=Path('caps.srt').read_text().splitlines()
caption=' '.join(s for s in lines if s.strip() and not s.strip().isdigit() and '-->' not in s)
normalize=lambda s:re.sub(r'[^a-z0-9]','',s.lower())
assert normalize(script)==normalize(caption)
PY
python3 "${HF_WORKFLOWS}/subtitles/scripts/subtitle_paper_burn.py" \
  --in clean-master.mp4 --srt caps.srt --out prince-ruperts-drop.mp4 \
  --style bold --font-key montserrat --fontsize-frac .045 --stroke-frac .05

python3 verify_final.py
ffmpeg -y -hide_banner -loglevel error -ss 0.5 -i prince-ruperts-drop.mp4 \
  -frames:v 1 -update 1 prince-ruperts-drop-poster.jpg
zip -qr production-export.zip \
  edit prepared shots review narration.mp3 narration.wav narration.txt \
  voice-normalized.wav effects.wav sound_design.py sound-events.json \
  edit-events.json edit-receipt.json prepare_picture.py edit.jsx finish.sh \
  verify_final.py verification.json caps.srt caption-report.json \
  script_manifest.json clean-master.mp4 prince-ruperts-drop-poster.jpg
zip -q production-export.zip final-scene.blend render_native.py render_setup.py

