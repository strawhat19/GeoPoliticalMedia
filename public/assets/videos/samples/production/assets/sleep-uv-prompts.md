# Sleep And UV Visual Prompts

Generated September 11, 2026 using the built-in imagegen tool. No CLI/API fallback was used. Generated PNGs were copied from the tool's default generated_images directory into this assets folder. No text or labels are baked into the imagery; production overlays must identify the UV images as a tracer simulation, not actual germs.

Inspection: all four outputs were visually inspected. The bedroom image shows a safe, awake adult with face above center and caption space over the duvet. The fingertip image has natural anatomy and fabric detail. Both UV images show five digits and matching hand pose/framing; the after image retains small visible tracer remnants. These are generated illustrations, not a measured before/after experiment.

## sleep-bedroom.png

Method: new image, photorealistic-natural.

```text
Use case: photorealistic-natural
Asset type: vertical 9:16 image for an educational short video about sleep paralysis.
Primary request: cinematic, photorealistic adult lying awake in bed at night, worried but safe. The adult's eyes are open, the face and one hand are visible. Normal tasteful sleepwear, body comfortably covered by a duvet, no distressing injury.
Scene/backdrop: quiet ordinary bedroom, blue moonlight through a window, soft low contrast shadows.
Composition/framing: portrait 9:16, 1080 by 1920 pixels if possible. Slightly elevated bedside camera, face and visible hand composed in the upper half, leaving the bottom third mostly simple duvet texture for captions added later. Single person only, realistic anatomy and skin texture.
Lighting/mood: cinematic natural blue night lighting with enough light to read the eyes and hand; tense curiosity, physically safe and believable.
Constraints: no monster, no demon, no intruder, no other people, no restraints, no medical devices, no text, labels, letters, logos, watermark, collage, or split screen. This is an illustrative reenactment, not a clinical recording.
```

## sleep-finger.png

Method: new image, photorealistic-natural.

```text
Use case: photorealistic-natural
Asset type: vertical 9:16 macro image for an educational short video about sleep paralysis.
Primary request: calm tactile close-up of one adult index fingertip resting lightly on a soft duvet, connected naturally to the relaxed hand. Show the fingertip and part of the hand with anatomically correct visible finger shapes and no duplicated digits.
Scene/backdrop: softly rumpled cotton duvet in an ordinary dark bedroom. No other people or objects.
Composition/framing: portrait 9:16, 1080 by 1920 pixels if possible. Macro bedside camera with shallow depth of field, fingertip in focus above the center of frame, simple duvet filling the bottom third for captions added later.
Lighting/mood: blue nighttime moonlight with a very faint warm dawn reflection, natural skin texture and fabric weave, calm and reassuring.
Constraints: one hand only; resting naturally, no aggressive tension or motion blur; no text, labels, letters, logos, watermark, medical devices, collage, or split screen. A gentle still image, not proof of a treatment effect.
```

## uv-before.png

Method: new image, scientific-educational simulation. The output was inspected before editing.

```text
Use case: scientific-educational
Asset type: photorealistic vertical 9:16 UV training-lotion simulation for an educational short.
Primary request: one adult open palm facing the camera with exactly five anatomically correct digits, thumb plus four fingers, all naturally spaced and fully visible. A light coating of fluorescent training-lotion residue glows pale lime yellow-green in irregular fine smears across the palm, thumb pad, finger pads, fingertips, and natural creases.
Scene/backdrop: plain deep navy dark background and dark blue-violet educational UV viewing illumination. The skin remains visibly natural under the blue-violet light.
Composition/framing: portrait 9:16, 1080 by 1920 pixels if possible. Straight-on close view, one wrist enters from the lower edge, hand centered in the upper two thirds and fully within the frame, leaving lower space around the wrist for later captions.
Materials/textures: realistic skin creases and pores, fluorescence is thin lotion residue, not creatures, cells, particles, viruses, or visible germs. No outlines of bacteria.
Constraints: exactly one normal adult hand and five digits; no jewelry, gloves, nails with polish, additional hands, diagram panels, collage, text, labels, letters, logos, watermark, or X-ray look. This is a staged visual simulation of a tracer demonstration, never literal germ imaging. Preserve natural anatomy, realistic proportions, and simple repeatable lighting.
```

## uv-after.png

Method: built-in imagegen edit with uv-before.png as the sole referenced image. This is a visual simulation, not a laboratory measurement or evidence of washing effectiveness.

```text
Use case: precise-object-edit
Asset type: photorealistic vertical 9:16 after-washing version of the supplied UV training-lotion demonstration.
Input images: Image 1 is the edit target, the BEFORE hand image; preserve it precisely.
Primary request: change only the visible fluorescent training-lotion residue. Remove most of its glowing yellow-green smears from the skin, leaving a few small faint residual tracer specks in one or two creases near a finger base and the thumb pad.
Invariants: retain the exact same adult hand identity, all five digits, pose, contours, finger spacing, wrist, framing, camera angle, perspective, background, dark blue-violet illumination, skin texture, nails, exposure, resolution, and portrait 9:16 composition. Do not reposition, redraw, crop, rescale, brighten, or relight the hand.
Constraints: residue is simulated training lotion, not real germs. No pristine sterile glow, added microbes, organisms, text, labels, logos, watermark, arrows, diagrams, collage, or split screen. The only change is substantially reduced visible fluorescent tracer residue.
```


## hand-normal.png

Method: built-in imagegen edit of inspected uv-after.png using its exact local path as the sole reference. Inspection confirmed matching five-digit open-palm pose and framing, with ordinary neutral illumination and no tracer glow.

```text
Use case: lighting-weather
Asset type: vertical 9:16 ordinary-light counterpart to a UV training-lotion demonstration.
Input images: Image 1 is the edit target, uv-after.png.
Primary request: change only the illumination and the consequent appearance of fluorescence. Show this exact same open adult palm under neutral ordinary soft white illumination. Natural normal skin color, lifelike skin detail, no visible fluorescent glow.
Invariants: preserve the exact same hand identity, five digits, finger lengths and spacing, open-palm pose, wrist, all hand contours, skin creases, nails, camera position, angle, perspective, composition, image dimensions, and plain dark background. Do not crop, resize, reposition, or add objects.
Lighting/mood: softly lit ordinary demonstration photograph with a natural adult skin tone; neutral white illumination replacing blue-violet UV light.
Constraints: no visible yellow-green glow, no microbes, no X-ray effect, no text, labels, letters, arrows, logos, watermark, additional hands, gloves, or jewelry. This is an ordinary-light view of the same staged tracer demonstration, not a claim of sterile hands.
```

## sleep-morning.png

Method: built-in imagegen edit of inspected sleep-bedroom.png using its exact local path as the sole reference. Inspection confirmed the same adult and recognizable room, comfortable side-sleeping pose, gentle dawn light, and no text.

```text
Use case: identity-preserve
Asset type: vertical 9:16 cinematic dawn image for a reassuring educational short closing.
Input images: Image 1 is the edit target, sleep-bedroom.png; use it to preserve the same adult woman and bedroom.
Primary request: the same adult woman is now resting comfortably on her side in the same bed and room in gentle dawn light. Her eyes are closed naturally, face relaxed, no posed smile. Keep the same dark hair, recognizable facial identity, tasteful sleepwear, duvet, pillow, upholstered headboard, window, bedside lamp, and plants.
Composition/framing: preserve the same slightly elevated bedside camera and portrait dimensions, with her head above center and simple duvet texture in the bottom third for captions added later. Adapt only her pose naturally to side sleeping.
Lighting/mood: soft gentle warm dawn and pale blue ambient light from the same window, quiet and reassuring natural cinematic photograph, realistic skin and fabric. The night moon is no longer visible in the dawn sky.
Constraints: one adult only, natural side-sleeping anatomy, no monster, no intruder, no medical devices, no restraints, no text, labels, logos, watermark, collage, or split screen. This is an illustrative restful-sleep scene, not proof of a guaranteed prevention technique.
```

## modern-handwash.png

Method: new built-in imagegen image. Inspection confirmed a modern sink, soap lather, interlaced adult hands, and visible running water. This is a simulated illustration; it does not demonstrate an actual twenty-second scrub.

```text
Use case: photorealistic-natural
Asset type: vertical 9:16 modern handwashing demonstration image for an educational short.
Primary request: cinematic realistic close-up of an adult's two hands scrubbing with soap lather at an ordinary modern sink. Show natural interlaced finger contact as the hands rub gently together above the sink basin, with a narrow stream of clean running water visible beside the hands.
Scene/backdrop: simple unbranded contemporary bathroom sink, ordinary faucet and light neutral background. Crop out the face and body.
Composition/framing: portrait 9:16, realistic close-up camera slightly above sink height, hands composed in upper center, sink basin providing uncluttered space toward the bottom for captions added later. Soap foam is visible but does not obscure all finger anatomy.
Lighting/mood: natural soft daylight, clean and approachable cinematic documentary photograph, genuine skin texture, reflective running water, neutral white sink.
Constraints: exactly two adult hands with anatomically correct digit count and natural proportions, no extra fingers or fused hands; no jewelry, gloves, historical chlorine equipment, bleach, labels, text, branding, logo, watermark, collage, diagram, UV glow, or visible germs. This is an illustrative modern soap-and-water scene, not a clinical experiment.
```
