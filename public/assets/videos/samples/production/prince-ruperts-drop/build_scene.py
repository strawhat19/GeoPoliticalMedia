"""Editable Blender 5.2 scene for the Prince Rupert's drop science short.
Original procedural 3-D illustration. Dimensions are metres, timing is 24 fps.
Render separate shot ranges for narration-led editing.
"""
import bpy, math, random, time
from mathutils import Vector
from math import sin, cos, pi

for old_object in list(bpy.data.objects):bpy.data.objects.remove(old_object,do_unlink=True)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=720
scene.render.resolution_y=1280
scene.render.resolution_percentage=100
scene.render.fps=24
scene.frame_start=1
scene.frame_end=672
scene.eevee.taa_render_samples=16
scene.eevee.use_raytracing=True
if scene.world is None:scene.world=bpy.data.worlds.new('Blue studio ambient')
scene.world.color=(0.18,0.18,0.18)
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.022,.07,.16,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.5
scene.view_settings.view_transform='AgX'
scene.render.film_transparent=False

def material(name,color,metal=0,rough=.3,trans=0,emit=0):
 m=bpy.data.materials.new(name); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Metallic'].default_value=metal
 p.inputs['Roughness'].default_value=rough
 p.inputs['Transmission Weight'].default_value=trans
 p.inputs['IOR'].default_value=1.52
 p.inputs['Coat Weight'].default_value=.28
 p.inputs['Emission Color'].default_value=(*color,1)
 p.inputs['Emission Strength'].default_value=emit
 m.diffuse_color=(*color,1)
 return m

glass=material('Clear aqua glass',(0.22,.69,.82),.12,.10,.80)
steel=material('Brushed hammer steel',(.19,.24,.28),.87,.23)
edge=material('Machined chrome',(.58,.7,.8),.85,.14)
rubber=material('Charcoal rubber grip',(.027,.039,.055),.08,.6)
rubber.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=0
floor=material('Deep studio blue',(.016,.058,.125),.15,.38)
grid=material('Blue measurement grid',(.065,.28,.5),.1,.4,.0,.14)
cyan=material('Compression shell',(.025,.5,.83),.28,.2,0,.10)
orange=material('Tension core',(.98,.22,.045),.15,.28,0,.20)
white=material('Stress arrows ice',(.56,.93,1),.15,.22,0,.6)
amber=material('Stress arrows warm',(1,.53,.11),.2,.22,0,.5)
hot=material('Molten glass',(.92,.13,.018),.12,.16,.25,2)
water=material('Cold water',(.018,.34,.63),.1,.12,.6)

def smooth(o):
 if o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 return o

def cube(name,loc,scale,mat,bevel=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o

def cylinder(name,a,b,r,mat,vertices=48):
 d=Vector(b)-Vector(a); mid=(Vector(a)+Vector(b))*.5
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=mid)
 o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat);smooth(o)
 return o

def curve(name,pts,rad,mat):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16;c.bevel_depth=rad;c.bevel_resolution=3
 s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,v in zip(s.points,pts):p.co=(*v,1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.data.materials.append(mat);return o

def vis(o,start,end):
 for f,hidden in [(1,True),(max(1,start-1),True),(start,False),(end,False),(end+1,True)]:
  o.hide_render=hidden;o.keyframe_insert(data_path='hide_render',frame=f)
  o.hide_viewport=hidden;o.keyframe_insert(data_path='hide_viewport',frame=f)

def keys(o,prop,vals):
 for f,v in vals:setattr(o,prop,v);o.keyframe_insert(data_path=prop,frame=f)

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()

def camera_key(f,loc,target,lens):
 cam.location=loc;aim(cam,target);cam.data.lens=lens
 cam.keyframe_insert(data_path='location',frame=f);cam.keyframe_insert(data_path='rotation_euler',frame=f);cam.data.keyframe_insert(data_path='lens',frame=f)

profiles=[(-1.5,.002),(-1.45,.22),(-1.30,.44),(-1.1,.58),(-.85,.625),(-.6,.585),(-.35,.46),(-.1,.30),(.18,.17),(.48,.095),(.8,.056),(1.15,.035),(1.5,.023),(1.85,.014),(2.15,.006),(2.32,.001)]
def center(x):return Vector((x,.06*sin((x+.5)*1.4),1.08+(max(x+.5,0)**2)*.11))

def drop(name,mat,half=False,scale=1):
 vs=[]; fs=[]; n=40;angles=[pi*i/n for i in range(n+1)] if half else [2*pi*i/n for i in range(n)]
 # In the cutaway the near-facing half is absent: the warm cross section is visible.
 for x,r in profiles:
  c=center(x)
  for a in angles:vs.append((c.x,c.y+r*scale*sin(a),c.z+r*scale*cos(a)))
 cols=len(angles)
 for j in range(len(profiles)-1):
  for k in range(cols-1 if half else cols):
   k2=(k+1)%cols;fs.append((j*cols+k,j*cols+k2,(j+1)*cols+k2,(j+1)*cols+k))
 if not half:fs.extend([tuple(range(cols-1,-1,-1)),tuple((len(profiles)-1)*cols+k for k in range(cols))])
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],[tuple(reversed(face)) for face in fs]);me.update()
 o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);o.data.materials.append(mat);smooth(o)
 sub=o.modifiers.new('Silky glass surface','SUBSURF');sub.levels=2;sub.render_levels=2
 return o

def cross_section(name,mat,shrink=.77):
 vs=[]
 for x,r in profiles:
  c=center(x);vs.append((x,c.y-.012,c.z+r*shrink))
 for x,r in reversed(profiles):
  c=center(x);vs.append((x,c.y-.012,c.z-r*shrink))
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],[tuple(range(len(vs)))]);me.update()
 o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);o.data.materials.append(mat)
 return o

# An expansive physical blue grid avoids flat title-card framing.
cube('Blue cyclorama floor',(0,0,-.07),(200,200,.1),floor,0)
for i in range(-30,31):
 curve('Floor grid X %d'%i,[(-30,i*.6,-.013),(30,i*.6,-.013)],.005,grid)
 curve('Floor grid Y %d'%i,[(i*.6,-30,-.013),(i*.6,30,-.013)],.005,grid)

bpy.ops.object.camera_add(location=(3,-8,5));cam=bpy.context.object;cam.name='Delivery portrait camera';scene.camera=cam;cam.data.lens=48
cam.data.clip_end=250
for name,loc,power,col,size in [('Key softbox',(-3,-4,7),1500,(.73,.88,1),5),('Warm rim',(4,3,6),1900,(.68,.88,1),4),('Front fill',(1,-5,3),700,(.58,.78,1),3),('Glass strip',(-4,2,3),1100,(1,1,1),2)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=col
 o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;aim(o,(0,0,1))

intact=drop('Intact Prince Rupert drop',glass)
vis(intact,1,216)

# Shot one: a machined hammer face lands on the thick bulb and recoils.
anvil=cube('Steel anvil block',(-.85,0,.25),(1.6,1.1,.48),steel,.08);vis(anvil,1,72)
plate=cube('Polished anvil face',(-.85,0,.49),(1.65,1.15,.07),edge,.025);vis(plate,1,72)
hammer=bpy.data.objects.new('Hammer animated pivot',None);scene.collection.objects.link(hammer);hammer.location=(-.85,0,1.67)
head=cube('Hammer striking head',(0,0,.35),(.88,.7,.70),steel,.065);head.parent=hammer
face=cube('Flat steel contact face',(0,0,.012),(.78,.62,.025),edge,.02);face.parent=hammer
shaft=cylinder('Hammer shaft',(.1,0,.5),(.1,0,2.2),.095,edge);shaft.parent=hammer
grip=cylinder('Hammer black grip',(.1,0,1.2),(.1,0,2.15),.15,rubber);grip.parent=hammer
for o in [head,face,shaft,grip]:vis(o,1,72)
keys(hammer,'location',[(1,(-.85,0,3.7)),(10,(-.85,0,2.9)),(16,(-.85,0,1.69)),(19,(-.85,0,1.69)),(28,(-.85,0,2.55)),(44,(-.85,0,2.2)),(72,(-.85,0,2.7))])
camera_key(1,(3.6,-9.2,5.3),(.12,0,1.8),47)
camera_key(16,(3.2,-8.2,4.9),(.02,0,1.65),47)
camera_key(18,(3.24,-8.2,4.92),(.02,0,1.65),47)
camera_key(72,(2.9,-8.2,4.5),(.0,0,1.7),49)

# Shot two: track from the thick bulb down the hairlike curved tail.
camera_key(73,(2.9,-7,4.5),(.35,0,1.28),50)
camera_key(144,(3.15,-3.4,3.0),(1.5,0,1.65),60)
camera_key(145,(3.8,-8.7,5.2),(.25,0,1.25),54)
camera_key(216,(-1.8,-8.8,4.4),(.25,0,1.3),54)

# Quenching: hot drop enters a cold, transparent bath; its skin cools first.
bath=cylinder('Water bath',(-.1,0,.0),(-.1,0,2.1),2.05,water,80);vis(bath,217,312)
rim=curve('Water bath rim',[(-.1+2.07*cos(2*pi*i/120),2.07*sin(2*pi*i/120),2.12) for i in range(121)],.026,edge);vis(rim,217,312)
quench=drop('Quenched molten drop',hot);vis(quench,217,264)
cool=drop('Cooled outside shell',glass);vis(cool,265,312)
keys(quench,'location',[(217,(0,0,2.0)),(246,(0,0,.14)),(264,(0,0,.0))])
keys(cool,'location',[(265,(0,0,0)),(282,(0,0,0)),(312,(0,0,0))])
for j in range(3):
 ring=curve('Quench ripple %d'%j,[(1.0*cos(2*pi*i/90)-.1,1.0*sin(2*pi*i/90),2.125+j*.004) for i in range(91)],.011,white);vis(ring,230+j*6,290+j*6)
 keys(ring,'scale',[(246+j*6,(.15,.15,1)),(290+j*6,(1.8,1.8,1))])
camera_key(217,(4.3,-10,6.8),(.0,0,1.8),49)
camera_key(312,(3.8,-8.5,5.8),(.0,0,1.5),51)

# Technical half-cut shell, contrasting stressed core and animated pressure arrows.
shell=drop('Cutaway compression shell',cyan,True);vis(shell,313,456)
section=cross_section('Core under tensile stress',orange,.75);vis(section,313,456)
section.shape_key_add(name='Cooled core')
warmshape=section.shape_key_add(name='Warm expanded core')
for v in warmshape.data:v.co.z=center(v.co.x).z+(v.co.z-center(v.co.x).z)*1.15
for f,val in [(313,1),(373,0),(456,0)]:warmshape.value=val;warmshape.keyframe_insert(data_path='value',frame=f)
outline=cross_section('Cutaway blue rim',cyan,1);outline.location.y=.015;vis(outline,313,456)
def arrow(name,a,b,mat,start,end):
 d=Vector(b)-Vector(a);n=d.normalized();shaft=cylinder(name+' shaft',a,Vector(b)-n*.10,.025,mat,16)
 bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.085,radius2=0,depth=.18,location=Vector(b)-n*.065)
 tip=bpy.context.object;tip.name=name+' arrowhead';tip.rotation_euler=d.to_track_quat('Z','Y').to_euler();tip.data.materials.append(mat)
 for o in [shaft,tip]:
  vis(o,start,end)
  keys(o,'location',[(start,tuple(o.location)),(start+18,tuple(o.location+d*.12)),(start+36,tuple(o.location)),(end,tuple(o.location))])
for i,x in enumerate([-1.13,-.8,-.46]):
 c=center(x)
 arrow('Surface compressed top %d'%i,(x,-.10,c.z+.95),(x,-.10,c.z+.64),white,389,428)
 arrow('Surface compressed bottom %d'%i,(x,-.10,c.z-.95),(x,-.10,c.z-.64),white,389,428)
arrow('Core pulls left',(-.74,-.04,1.08),(-1.24,-.04,1.08),amber,429,456)
arrow('Core pulls right',(-.62,-.04,1.08),(-.13,-.04,1.08),amber,429,456)
camera_key(313,(2.8,-8.2,3.3),(.2,0,1.3),51)
camera_key(336,(1.6,-7.4,2.8),(.13,0,1.27),52)
camera_key(400,(1.2,-7.0,2.6),(.02,0,1.22),52)
camera_key(456,(1.0,-6.7,2.55),(.0,0,1.22),53)

# Tail snip: two steel jaws contact and sever only the hair-thin tip.
snap=drop('Intact before tail snip',glass);vis(snap,457,538)
tailpos=center(1.86)
upper=cube('Upper precision cutter jaw',(tailpos.x,tailpos.y,tailpos.z+.6),(.35,.36,.35),steel,.035)
lower=cube('Lower precision cutter jaw',(tailpos.x,tailpos.y,tailpos.z-.6),(.35,.36,.35),steel,.035)
for o in [upper,lower]:vis(o,457,538)
keys(upper,'location',[(457,(tailpos.x,tailpos.y,tailpos.z+.6)),(506,(tailpos.x,tailpos.y,tailpos.z+.35)),(521,(tailpos.x,tailpos.y,tailpos.z+.18)),(538,(tailpos.x,tailpos.y,tailpos.z+.18))])
keys(lower,'location',[(457,(tailpos.x,tailpos.y,tailpos.z-.6)),(506,(tailpos.x,tailpos.y,tailpos.z-.35)),(521,(tailpos.x,tailpos.y,tailpos.z-.18)),(538,(tailpos.x,tailpos.y,tailpos.z-.18))])
camera_key(457,(3.2,-4.5,3.6),(1.45,0,1.7),61)
camera_key(528,(2.7,-3.8,3.05),(1.6,0,1.75),64)

# Fracture payoff: a fast front travels down the tail, followed by angular shards.
camera_key(529,(3.0,-8.6,4.8),(.3,0,1.25),51)
camera_key(565,(2.0,-8.3,4.5),(.1,0,1.35),49)
camera_key(672,(-1.0,-10.0,5.2),(.0,0,1.25),49)
random.seed(42)
for j in range(22):
 x=2.1-j*.165;c=center(x)
 r=max(.03,.60*(1-abs(x+.85)/1.2))
 pts=[]
 for i in range(9):
  a=i*2*pi/8;pts.append((x+random.uniform(-.035,.035),c.y-r*sin(a),c.z+r*cos(a)))
 line=curve('Racing fracture ring %02d'%j,pts,.009,white);vis(line,529+j//3,535+j//3)
for i in range(230):
 # Distribution fills the bulb and tapers along the tail, avoiding unrelated particles.
 x=random.uniform(-1.4,.3) if i<195 else random.uniform(.3,2.2)
 c=center(x);r= .58*max(0.05,1-((x+.8)/1.15)**2)**.5 if x<.3 else .08
 a=random.uniform(0,2*pi); rr=r*random.random()**.5
 pos=c+Vector((0,rr*cos(a),rr*sin(a)))
 size=random.uniform(.035,.13) if x<.3 else random.uniform(.015,.035)
 verts=[(-size,-size*.5,-size*.3),(size,-size*.3,0),(-size*.1,size*.8,size*.2),(size*.15,size*.1,-size*.75)]
 me=bpy.data.meshes.new('Angular glass shard geometry %03d'%i);me.from_pydata(verts,[],[(0,2,1),(0,1,3),(1,2,3),(2,0,3)]);me.update()
 o=bpy.data.objects.new('Fractured glass shard %03d'%i,me);scene.collection.objects.link(o);o.data.materials.append(glass);o.location=pos
 begin=539
 vis(o,begin,672)
 v=Vector((random.uniform(-.9,.9),random.uniform(-1.2,1.2),random.uniform(-.25,1.7)))
 keys(o,'location',[(begin,tuple(pos)),(begin+14,tuple(pos+v*.40)),(begin+70,tuple(pos+v*1.5+Vector((0,0,-.35)))),(672,tuple(pos+v*2.0+Vector((0,0,-.85))))])
 keys(o,'rotation_euler',[(begin,(0,0,0)),(672,(random.uniform(-8,8),random.uniform(-8,8),random.uniform(-8,8)))])

# Explicit linear camera and object timing makes shot retiming predictable.
for action in bpy.data.actions:
 for layer in action.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for fc in bag.fcurves:
     for kp in fc.keyframe_points:kp.interpolation='CONSTANT' if 'hide_' in fc.data_path else 'LINEAR'
scene.frame_set(16)
scene['shot_ranges']={'01_hammer':[1,72],'02_tail':[73,144],'03_hero':[145,216],'04_quench':[217,312],'05_stress':[313,456],'06_snip':[457,528],'07_fracture':[529,672]}
scene.render.image_settings.media_type='IMAGE'
scene.render.image_settings.file_format='PNG'
target=artifacts.file(name='hammer_preview.png',media_type='image/png')
scene.render.filepath=target.path
t=time.time();bpy.ops.render.render(write_still=True);target.publish()
result={'objects':len(bpy.data.objects),'frame':scene.frame_current,'seconds_to_render':time.time()-t,'shots':{k:list(v) for k,v in scene['shot_ranges'].items()}}
