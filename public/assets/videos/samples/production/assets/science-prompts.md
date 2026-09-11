# Science Image Prompts And Method

Created September 11, 2026 with the built-in imagegen tool, following the imagegen skill. Three independent generation calls, one per requested image; no references and no CLI/API fallback. No image edits, audio generation, or research changes.

## Deliverables And Inspection

All three selected outputs were copied byte-for-byte into this folder from the built-in generated image directory, preserving the originals. Native dimensions are **941 × 1672 pixels** each, approximately 9:16. For the final exact 1080 × 1920 video frame, a cover-fit requires only negligible horizontal cropping; no resampling or cropping was applied to these source assets.

| Asset | Visual Inspection |
| --- | --- |
| [india-himalaya.png](india-himalaya.png) | Snow-covered foreground peaks and a central glacier valley lead toward a broad dry high plateau. Natural golden sunlight, cool shadows, and no map/UI/text. This is a generated illustrative landscape, not a verified photograph of a particular location. |
| [speed-lightning.png](speed-lightning.png) | One dominant centrally framed cloud-to-ground lightning channel with natural subsidiary branches, distant horizon and quiet open fields at dusk. No people, damage or text. The still alone does not encode sound timing or storm distance. |
| [speed-neuron.png](speed-neuron.png) | One branching soma and a continuous central axon with visibly separated myelin segments; warm small highlights mark nodes. Deliberate cinematic scientific illustration, not microscopy. Colors and highlights are explanatory conventions rather than literal tissue color or emitted light. |

The three images fill their portrait frames without borders, embedded text, logos, captions, labels, numbers or UI. They are visual background material. Accurate scientific diagrams, scale comparisons, measurements, and qualifications should be added by the video compositor using the research briefs.

## Exact Prompts

### india-himalaya.png

Method: new generation, built-in imagegen. Original output basename: `exec-484fcb72-e0be-477a-a0bf-257fe24d1e95.png`.

```text
Use case: photorealistic-natural. Asset type: a cinematic scientific documentary background still for a vertical video. Generate ONE full-frame vertical portrait image, 9:16 aspect ratio, ideally 1152 by 2048 pixels. Primary request: a spectacular, geologically plausible oblique aerial view looking north across the Himalayas toward the enormous Tibetan Plateau. High jagged snow-covered Himalayan peaks and deeply incised glacier valleys occupy the foreground and middle, transitioning to a broad high dry plateau extending toward the horizon. Natural topographic complexity and realistic scale: the plateau is elevated land behind the mountain front, not a flat tabletop above it. Documentary photographic realism, warm late-afternoon sunlight grazing rock and snow, cool blue shadows, thin high-altitude atmosphere, subdued natural browns and whites, distant subtle haze. A restrained premium natural-history film frame, not fantasy terrain. Composition follows a central valley toward layered mountain ridges and plateau, dramatic depth, some clear upper sky, no graphic framing. Fill the entire portrait canvas edge to edge. This is an illustrative generated landscape, not a claimed photograph of any exact named peak. No maps, cutaway, tectonic arrows, charts, captions, text, letters, typography, labels, logos, watermarks, UI, borders, people, buildings, flags, flying objects, giant fissures, lava, or impossible floating mountains.
```

### speed-lightning.png

Method: new generation, built-in imagegen. Original output basename: `exec-9b3e3ddb-1c1d-42db-95b3-c71043fb57dd.png`.

```text
Use case: photorealistic-natural. Asset type: a cinematic scientific documentary background still for a vertical video. Generate ONE full-frame vertical portrait image, 9:16 aspect ratio, ideally 1152 by 2048 pixels. Primary request: a distant single cloud-to-ground lightning strike at dusk over quiet open countryside. Put the brilliant main lightning channel in the upper-central portion of the image, branching naturally down from a towering dark thundercloud to a distant low horizon, with realistic fine subsidiary branches and a small bright distant ground contact. Main bolt begins around upper quarter and stays within the central half of the width, fully visible and safely framed. Vast layered storm clouds occupy most of the image, restrained indigo and slate-blue evening sky with faint warm dusk near the horizon. The lower quarter contains dark green rolling fields and a gently receding empty country track; no buildings, vehicles or people. High-end natural documentary photography, realistic exposure and natural atmospheric light, dramatic but credible storm, sharp illuminated lightning contrasted against soft cloud depth. No damage, fires, explosions, overly thick fantasy energy beam, multiple unrelated bolts, close foreground strike, text, labels, arrows, measurements, captions, typography, logos, watermarks, UI, borders or letterboxing. Entire portrait canvas edge to edge.
```

### speed-neuron.png

Method: new generation, built-in imagegen. Original output basename: `exec-b50e75f4-4240-47db-b4c1-a12f53724b7b.png`.

```text
Use case: scientific-educational. Asset type: a cinematic explanatory scientific illustration background still for a vertical video. Generate ONE full-frame vertical portrait image, 9:16 aspect ratio, ideally 1152 by 2048 pixels. Primary request: a high-end scientific visualization of one branching neuron with a clearly visible central myelinated axon. Explicitly an illustrative three-dimensional scientific rendering, not a microscope photograph and not a scan of a real brain. A recognizable neuron soma sits in the upper-middle, with delicate dendrites branching into surrounding dark deep-blue tissue. One single main axon emerges from the soma and travels clearly down through the middle and lower frame in a gentle vertical curve. Several realistically segmented pale blue myelin sheaths surround this axon, with clear short gaps at the nodes of Ranvier, and fine axon visible through the gaps. A few restrained small amber activation points appear along the axon and at nodes as a visualization convention; they are small warm highlights, not flames, electrical arcs or literal bright light shooting down a wire. Restrained cinematic depth of field, biologically inspired organic surfaces, elegant deep navy and cool cyan palette, clear central axon silhouette against softly blurred background branching. Keep the number of foreground neuronal structures limited for scientific legibility; no tangles obscuring the axon. No text, numbers, labels, diagrams, legend, pointers, arrows, decorative circuitry, UI, logos, watermark, frame or border. Fill the vertical canvas edge to edge.
```

