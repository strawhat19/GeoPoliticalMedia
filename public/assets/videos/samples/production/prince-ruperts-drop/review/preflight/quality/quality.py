import bpy,time,json
from pathlib import Path
from mathutils import Vector
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=8;s.cycles.use_denoising=True;s.cycles.max_bounces=6;s.cycles.transmission_bounces=4;s.render.use_persistent_data=True
s.render.resolution_x=720;s.render.resolution_y=1280;s.render.resolution_percentage=100;s.render.threads_mode='FIXED';s.render.threads=8;s.render.image_settings.media_type='IMAGE';s.render.image_settings.file_format='PNG';s.view_settings.view_transform='AgX';s.world.color=(.025,.06,.13)
# Widen the cutaway to retain the complete rounded head.
cam=s.camera
for f in [313,336,400,456]:
    s.frame_set(f);cam.data.lens=46;cam.data.keyframe_insert(data_path='lens',frame=f)
    target=Vector((-.2,0,1.25));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert(data_path='rotation_euler',frame=f)
results=[]
for f in [16,120,180,250,280,360,405,440,521,539,555,625]:
    s.frame_set(f);s.render.filepath=f'/home/user/glass-quality/frame-{f}.png';t=time.time();bpy.ops.render.render(write_still=True)
    results.append({'frame':f,'seconds':time.time()-t});print('QUALITY_RENDER '+json.dumps(results[-1]),flush=True)
Path('/home/user/glass-quality/timings.json').write_text(json.dumps(results,indent=2))
bpy.ops.wm.save_as_mainfile(filepath='/home/user/glass-quality/final-scene.blend')
