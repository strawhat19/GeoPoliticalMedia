# Video Samples

## Original 3D Science Short

[The Glass With a Self-Destruct Switch](prince-ruperts-drop.mp4) — a 22.21-second Geo Labs short about Prince Rupert's drops. Original 3D animation shows the hammer test, tail snap, rapid cooling, internal stress, and slow-motion fragmentation. Includes clear synthetic narration, synchronized effects, and burned-in captions.

720 × 1280 at 24 fps, H.264 video with stereo AAC audio. The final export passed full decoding, complete caption coverage, and independent speech recognition matching every narrated word; measured audio loudness is −15.77 LUFS.

[Poster](prince-ruperts-drop-poster.jpg) · [Script, research, and editable production](production/prince-ruperts-drop/README.md) · [Export verification](production/prince-ruperts-drop/verification.json)

## Science Shorts

Five vertical documentary shorts with conversational voiceover, full-frame imagery, animated explanations, and burned-in captions. Channel branding appears only in the final second. The visuals combine AI-generated scenes, camera moves, and original scientific animation; narration uses Microsoft's Andrew neural voice.

| Short | Channel | Length | Research |
| --- | --- | --- | --- |
| [Awake, But You Can't Move](sleep-paralysis.mp4) | Geo Labs | 32.33s | [Sleep paralysis](production/research/sleep-paralysis.md) |
| [The El Niño That Could Make History](el-nino-2026.mp4) | Geo Data | 31.37s | [September 2026 sources](production/research/el-nino.md) |
| [What's Happening Beneath Tibet?](india-beneath-tibet.mp4) | Geo Labs | 27.53s | [Plate tectonics](production/research/india-tibet.md) |
| [Can A Thought Outrun Thunder?](light-sound-thought.mp4) | Geo Data | 31.20s | [Signal speeds](production/research/light-sound-thought.md) |
| [The Doctor Who Changed Handwashing](handwashing-semmelweis.mp4) | Geo Labs | 34.83s | [Semmelweis and UV tracers](production/research/handwashing.md) |

The handwashing comparison is explicitly a simulated fluorescent-lotion demonstration. Its glow represents training tracer, not visible germs or an X-ray. The history uses Semmelweis's chlorinated-lime intervention and distinguishes it from modern soap washing.

El Niño claims use the NOAA forecast issued September 10, 2026. Its record-strength comparison is a probability for October–December 2026 using three-month RONI, not an already observed record. Recheck the dated outlook before publishing later.

[Final scripts](production/episodes.json) · [Production files and regeneration](production/README.md) · [Export verification](production/verification.json)

## Earlier Motion-Graphics Samples

Five **8-second vertical MP4s** with narration, captions, and original synthesized audio. 720 × 1280, 30 fps, H.264/AAC.

| Channel | Sample |
| --- | --- |
| GeoPoliticalMedia | [Inflation Down, Prices Up?](geopoliticalmedia.mp4) |
| Geo Studios | [One Screen, Better Design](geo-studios.mp4) |
| Geo Labs | [Same Numbers, Right Type](geo-labs.mp4) |
| Geo Data | [API To Answer](geo-data.mp4) |
| Geo Gaming | [One Jump, Clean Run](geo-gaming.mp4) |

![Three moments from each sample](preview.jpg)

These are locally rendered motion-graphics samples. The API response and game are original demos. The news example uses illustrative prices ($100 → $110 → $115.50), with the explanation checked against the [St. Louis Fed](https://www.stlouisfed.org/publications/page-one-economics/2024/03/01/the-inflation-rate-is-falling-but-prices-are-not).

Editable scenes, scripts, narration, and [verification results](source/verification.json) are in `source/`. To regenerate on Windows with Python and the listed dependencies:

```powershell
./source/narrate.ps1
python ./source/render_samples.py --replace
python ./source/verify_samples.py
```
