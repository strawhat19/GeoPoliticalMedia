# Prince Rupert's drop — original 3D scene

Editable source: `build_scene.py`. Committed scene: Higgsfield 3D Jutsu project
`52d999fe-c670-424f-bae3-313debd17908`, revision 3. Original geometry, animation,
materials and blue grid studio were authored specifically for this video.

The full scene is 720 × 1280 at 24 fps. It contains seven separately editable shot ranges:

| Clip | Source frames | Source seconds | Visible action |
|---|---:|---:|---|
| 01_hammer | 1–72 | 3.00 | Hammer lands at frame 16; intact bulb remains on the anvil |
| 02_tail | 73–144 | 3.00 | Camera tracks into the thin curved tail |
| 03_hero | 145–216 | 3.00 | Camera orbits around the intact drop |
| 04_quench | 217–312 | 4.00 | Hot drop descends into a water bath, exterior changes to cooled glass |
| 05_stress | 313–456 | 6.00 | Cyan shell, orange core shrinks radially; inward arrows 389–428, outward arrows 429–456 |
| 06_snip | 457–528 | 3.00 | Steel jaws approach and contact thin tail at frame 521 |
| 07_fracture | 529–672 | 6.00 | Bright fracture front travels tail to head; all shards replace intact surface at frame 539 |

The geometry is a scientific illustration, not a physically solved fracture simulation.
The rigid glass survives the initial hammer strike. The final payoff uses angular glass
fragments without flame or a blast cloud. Fragmentation is intentionally slowed for visibility.

Revision 3 fixes outward glass normals, a bath deep enough to cover the cooled drop,
core contraction around the curved longitudinal centerline, and continuous intact-to-shard
replacement. Source rebuilds remove all prior objects, including hidden animated objects.

## Render evidence

Higgsfield's native worker renders the scene using software graphics:

- Eevee 720 × 1280, 16 samples, ray tracing: first frame 98.86 s (including initial compilation).
- Eevee 540 × 960, 8 samples, ray tracing off: 62.96 s first frame, 33.67 s warm frame.
- Workbench 720 × 1280, studio light, 8 AA samples: 8.47 s first frame, 5.77 s second,
  3.71 s cutaway frame.

Native PNG previews are available in this directory. Workbench proves geometry and contact
but makes glass opaque and cannot render the water volume appropriately. The intended final
material path is Eevee or denoised Cycles. The parent editor owns faster sandbox renderer
benchmarking and final clip rendering.

## Final framing refinements

For the stress shot, a camera target around x = −0.25 and lens around 48 mm gives the
bulb's left edge more breathing room than the initial close framing. For Workbench only,
set the custom background color to dark blue; its World setting otherwise renders gray.
The renderer must visually verify the quench, stress arrows and fragment payoff before final use.

Suggested final destination cuts: 0–2.32 s hammer, 2.32–5.44 tail, 5.44–7.12 hero,
7.12–10.40 quench, 10.40–17.40 stress, 17.40–19.20 snip, 19.20–22.20 fracture.
