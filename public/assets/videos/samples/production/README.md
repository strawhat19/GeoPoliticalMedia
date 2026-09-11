# Science Short Production

The five final MP4s and poster JPGs live one folder above this directory. The earlier video samples and all their source files were moved from `videos/samples` into `public/assets/videos/samples`; the original filenames were preserved.

## Files

- `episodes.json`: final spoken scripts, opening hooks, channel choices, and format
- `research/`: primary and clinical sources, claim limits, and original research briefs
- `assets/`: generated scene images, the historical video shot, and scientific animation clips
- `assets/*prompts.md`: exact imagegen prompts and reference/edit notes
- `audio/`: MP3 and 48 kHz PCM voiceovers, measured word boundaries, phrase captions, and voice/script verification
- `edits/`: shot timelines, rendered picture segments, ASS overlays, and render records
- `review/`: frames extracted from the final MP4s for visual inspection
- `verification.json`: actual export decoding, dimensions, timing, audio levels, caption, and branding checks

Voice: `en-US-AndrewMultilingualNeural`, +7% rate, normal pitch, generated through edge-tts 7.2.8. It is synthetic narration, not a recording of a human presenter. All scripts are original wording. The low documentary underscore is original synthesized audio, stretched from the earlier 22-second piece in `../semmelweis/source/` and mixed beneath narration.

The image scenes were created with the built-in imagegen tool. The historical handwashing shot was generated with Minimax Hailuo 2.3 through Higgsfield's text-to-video interface. It is an illustrative reconstruction, not archival footage. Ocean heat and tectonic motion are explanatory schematics, with their limits labeled on screen. The UV before/after is an AI-generated training-tracer simulation; it is not a measurement of washing performance.

## Regenerate

Run from the samples directory with Python, numpy, Pillow, edge-tts, and imageio-ffmpeg available. Scripts also look in the project's existing local video-tools cache for the speech and FFmpeg packages.

```powershell
python production/narrate.py
python production/render_ocean.py
python production/render_tectonics.py
python production/render_shorts.py --replace --workers 2
python production/verify_exports.py
```

To revise caption layout without regenerating speech, run `python production/narrate.py --captions-only`. To remux updated overlays while reusing unchanged picture segments, run `python production/render_shorts.py --replace --reuse-scenes`. A specific edit can be selected with `--episode handwashing-semmelweis`; repeat `--episode` to select several.

These are locally saved review examples. Nothing has been posted to a social account. The El Niño forecast is dated September 10, 2026 and needs a fresh check before later publication.
