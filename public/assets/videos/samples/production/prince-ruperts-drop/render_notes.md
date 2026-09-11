# Original 3D production

`final-scene.blend` is the editable final scene. It began as revision 3 of
[the Higgsfield 3D Jutsu project](https://higgsfield.ai/3d-jutsu/52d999fe-c670-424f-bae3-313debd17908).
The saved Blender file includes the later transparent-water correction, stress
close-ups, and wider fracture framing. The hosted revision predates these refinements.

`build_scene.py` records the original geometry and animation. `render_setup.py`
records the finishing refinements. The scene is an explanatory illustration;
fracture motion is choreographed, not a physical fracture simulation.

## Render and edit

Official Blender 5.2.1 Linux rendered native 720 × 1280 frames in the Higgsfield
media sandbox, using Cycles, eight samples, denoising, and 24 fps. The renderer
evaluates fractional source frames to fit narration timing, without interpolating
finished images. Each clip has a JSON render receipt beside it in `shots/`.

| Shot | Source frames | Exported frames | Action |
| --- | --- | ---: | --- |
| 01_hammer | 1–72 | 56 | Hammer contact; head stays intact |
| 02_tail | 73–144 | 75 | Track along the fragile tail |
| 03_hero | 145–216 | 40 | Identify the complete drop |
| 04_quench | 217–312 | 79 | Hot glass submerges and cools |
| 05_stress | 313–456 | 168 | Core contraction, shell compression, internal tension |
| 06_snip | 493–528 | 43 | Jaws contact the tail |
| 07_fracture | 529–672 | 72 | Fracture travels into the head; angular fragments disperse |

`edit.jsx` assembles nine cuts in native Higgsedit. The opening reuses short
sections of the snap and fracture to reveal the paradox within five seconds.
The full timeline is 533 frames, or 22.208 seconds. `prepare_picture.py` validates
source clips and writes the cut list and sound timing receipts.

`finish.sh` builds the picture, normalizes the narration, mixes the original
effects from `sound_design.py`, and uses the bundled Whisper caption workflow.
`verify_final.py` checks the actual exported streams, full decoding, caption
coverage, loudness, and an independent transcription of the finished audio.

To reproduce, place the narration files and rendered `shots/` beside these
scripts inside a Higgsfield media sandbox and run `bash finish.sh`. To rerender
geometry, run Blender with `final-scene.blend --python render_native.py -- SHOT_NAME`
for each shot first. Higgsedit and the bundled subtitle workflows are required.

`review/preflight/` holds earlier renderer comparisons and corrected composition
checks. Only the final export review and `verification.json` describe delivery.
