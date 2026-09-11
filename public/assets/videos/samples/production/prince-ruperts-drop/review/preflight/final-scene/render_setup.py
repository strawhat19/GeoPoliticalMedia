"""Apply final render fixes to quality/final-scene.blend.

Root renderer should preview frames 250 and 280 with WATER_MODE=clear first.
WATER_MODE=cutaway is the explicit open-front technical illustration alternative.
This script configures the scene only; it does not start or save a render.
"""
import bpy
import math
import os
from mathutils import Vector

s = bpy.context.scene
s.render.engine = 'CYCLES'
s.cycles.device = 'CPU'
s.cycles.samples = 8
s.cycles.use_denoising = True
s.cycles.max_bounces = 8
s.cycles.transmission_bounces = 6
s.render.use_persistent_data = True
s.render.resolution_x = 720
s.render.resolution_y = 1280
s.render.resolution_percentage = 100
s.render.fps = 24
s.render.threads_mode = 'FIXED'
s.render.threads = 8
s.view_settings.view_transform = 'AgX'

# The initial water was blue, metallic, partially transmissive and clear-coated.
# These physically transparent settings let the hot and cooled glass read through it.
water = bpy.data.materials['Cold water']
p = water.node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value = (.91, .98, 1.0, 1)
p.inputs['Metallic'].default_value = 0
p.inputs['Roughness'].default_value = .025
p.inputs['Transmission Weight'].default_value = 1
p.inputs['IOR'].default_value = 1.333
p.inputs['Coat Weight'].default_value = 0
p.inputs['Emission Strength'].default_value = 0
water.diffuse_color = (.91, .98, 1.0, 1)

# Optional second preview: omit the front and top of the water volume, keeping the
# full metal rim and animated water ripples. This is deliberately a section view.
mode = os.environ.get('WATER_MODE', 'clear')
if mode not in {'clear', 'cutaway'}:
    raise ValueError('WATER_MODE must be clear or cutaway')
if mode == 'cutaway':
    bath = bpy.data.objects['Water bath']
    radius, half_height, steps = 2.05, 1.05, 64
    vertices, faces = [], []
    for i in range(steps + 1):
        a = math.pi * i / steps
        x, y = radius * math.cos(a), radius * math.sin(a)
        vertices.extend([(x, y, -half_height), (x, y, half_height)])
    for i in range(steps):
        k = i * 2
        faces.append((k, k + 2, k + 3, k + 1))
    mesh = bpy.data.meshes.new('Open-front water cutaway')
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(water)
    mesh.update()
    for face in mesh.polygons:
        face.use_smooth = True
    bath.data = mesh

# Give the actual fracture cloud room on both sides, particularly at onset.
cam = s.camera
for frame in (529, 565, 672):
    s.frame_set(frame)
    cam.data.lens = 43
    cam.data.keyframe_insert(data_path='lens', frame=frame)
    cam.rotation_euler = (Vector((-.3, 0, 1.25)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.keyframe_insert(data_path='rotation_euler', frame=frame)

# Two deliberate shot changes turn the stress explanation into three views:
# whole drop, compressed shell close-up, then the tensile core.
for frame, location, target, lens in [
    (388, (1.3, -7.0, 2.65), (-.2, 0, 1.25), 46),
    (389, (1.2, -6.2, 2.5), (-.7, 0, 1.10), 56),
    (427, (1.0, -6.0, 2.4), (-.7, 0, 1.10), 56),
    (428, (.1, -5.7, 1.9), (-.85, 0, 1.08), 63),
    (456, (.05, -5.5, 1.85), (-.8, 0, 1.10), 63),
]:
    cam.location = location
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens
    cam.keyframe_insert(data_path='location', frame=frame)
    cam.keyframe_insert(data_path='rotation_euler', frame=frame)
    cam.data.keyframe_insert(data_path='lens', frame=frame)

s['water_render_mode'] = mode
s.frame_set(16)
print('RENDER_SETUP: 720x1280, 24 fps, Cycles 8 samples; water=' + mode, flush=True)

