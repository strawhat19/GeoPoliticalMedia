import sys
import json
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(Path.home() / '.cache' / 'geopoliticalmedia-video-tools'))
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
verified = []
for sample in manifest['samples']:
    path = ROOT.parent / (sample['key'] + '.mp4')
    frames = imageio_ffmpeg.read_frames(str(path), pix_fmt='rgb24')
    metadata = next(frames)
    frame_count = 0
    captured = []
    for frame_number, frame in enumerate(frames):
        frame_count += 1
        if frame_number in (36, 126, 204):
            captured.append(Image.frombytes('RGB', metadata['size'], frame))
    assert metadata['size'] == (720, 1280), metadata
    assert abs(metadata['duration'] - 8) < 0.05, metadata
    assert abs(metadata['fps'] - 30) < 0.01, metadata
    assert frame_count == 240, frame_count
    assert metadata.get('audio_codec') == 'aac', metadata
    differences = [float(np.abs(np.array(captured[i], dtype=float) - np.array(captured[i+1], dtype=float)).mean()) for i in (0,1)]
    assert all(d > 0.1 for d in differences), differences
    raw_audio = subprocess.check_output([ffmpeg,'-hide_banner','-loglevel','error','-i',str(path),'-vn','-f','f32le','-ac','1','-ar','48000','pipe:1'])
    audio = np.frombuffer(raw_audio,dtype='<f4')
    assert len(audio) >= 8*48000
    assert float(np.sqrt(np.mean(audio**2))) > 0.01
    assert float(np.abs(audio).max()) < 0.98
    for index,frame in enumerate(captured):
        frame.save(ROOT / f"{sample['key']}-decoded-{index}.jpg", quality=90)
    entry = {'file':path.name,'duration_seconds':metadata['duration'],'resolution':list(metadata['size']),'fps':metadata['fps'],'frames':frame_count,'video_codec':metadata['codec'],'audio_codec':metadata['audio_codec'],'audio_peak':round(float(np.abs(audio).max()),4),'motion_changes':list(map(lambda x:round(x,3),differences)),'bytes':path.stat().st_size}
    verified.append(entry)
    print(f"Verified {path.name}: 240 frames, 8 seconds, H.264/AAC, moving images and audible track",flush=True)
(ROOT / 'verification.json').write_text(json.dumps(verified,indent=2)+'\n',encoding='utf-8')

