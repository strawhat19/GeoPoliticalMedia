# Verified Earth Texture Sources

Verified 2026-09-12. Downloaded assets are unchanged; no repository files were edited.

## Recommended Compatible 4K Set

All three files are 4096 x 2048 equirectangular textures, downloaded from the official Three.js repository. They are derived from Solar System Scope textures under CC BY 4.0. The Three.js Earth example explicitly credits Solar System Scope and describes its adaptations as resized and merged.

- earth_day_4096.jpg: 473093 bytes, color surface, sRGB
- earth_night_4096.jpg: 267061 bytes, night lights, sRGB
- earth_bump_roughness_clouds_4096.jpg: 1508389 bytes, non-color data; R = bump/elevation, G = roughness, B = cloud density

Official example: https://threejs.org/examples/webgpu_tsl_earth.html
Official source: https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_tsl_earth.html
Asset directory: https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets
Creator and license statement: https://www.solarsystemscope.com/textures/
License: https://creativecommons.org/licenses/by/4.0/
Source creation commit for day file: c795e463367abeb6928175e29e0ae8e2429c7970

Individual download pattern:
https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/FILE_NAME

Suggested attribution:
Earth textures by Solar System Scope / INOVE, licensed under CC BY 4.0; resized and merged by the Three.js contributors. Based on NASA imagery. Further rendering adaptations by GeoCorp.

Use a white cloud shell and sample the packed texture blue channel for its opacity; standard Three.js alphaMap uses green, so assigning this packed texture directly as alphaMap would accidentally use the land/ocean roughness mask. The example remaps clouds with smoothstep(0.2, 1.0, B). Use R for small bump perturbation; G distinguishes rough land from smooth ocean. Keep packed data in NoColorSpace and day/night in SRGBColorSpace.

## Additional Official Three.js Downloads

- earth_clouds_1024.png: 1024 x 512, 226113 bytes, RGBA legacy cloud texture
- earth_normal_2048.jpg: 2048 x 1024, 336774 bytes, legacy tangent normal map
- earth_specular_2048.jpg: 2048 x 1024, 223421 bytes, legacy specular mask

These legacy assets were downloaded as options. They are in the official Three.js repository, but their individual original creator/license provenance was not established in this time-bounded research. Prefer the credited 4K set above.

## Direct NASA Surface Alternative

nasa-world-200407-5400x2700.jpg: 5400 x 2700, 1617810 bytes. July 2004 Blue Marble Next Generation base map, without baked relief shading, suitable for relighting.

Official page: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
Direct download: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg
Product description: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/
Credit: NASA Earth Observatory, Reto Stockli / Robert Simmon
NASA media guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/

NASA material is generally not copyrighted in the U.S.; acknowledge NASA, follow third-party notices, and do not imply endorsement. NASA has specific commercial/promotional-use guidelines. No NASA logos or people appear in this texture.

Other researched primary source:
https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/
NASA Black Marble 2016 flat maps are available at 3600x1800 and 13500x6750, with larger tiles. Not downloaded because the compatible Three.js 4K night texture is smaller and ready to use.

Solar System Scope separate 2K clouds download returned HTTP 403, so it is not present. The downloaded packed 4K map already includes cloud density at higher resolution.
