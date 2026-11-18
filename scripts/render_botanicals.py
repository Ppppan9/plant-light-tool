"""Reproducible sculpted botanical sprites. Run with Blender 5.1+ in background.

No video pixels are used in these assets. Geometry, vertex gradients, softbox
lights and a transparent orthographic camera generate real antialiased RGBA.
"""
import argparse, json, math, os, sys
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

TAIL = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
ap=argparse.ArgumentParser();ap.add_argument('--out',default='src/art-assets/polished');ap.add_argument('--preview',action='store_true');ap.add_argument('--samples',type=int,default=48);ap.add_argument('--only',default='')
ARGS=ap.parse_args(TAIL);OUT=Path(ARGS.out).resolve();OUT.mkdir(parents=True,exist_ok=True)
PI=math.pi;TAU=PI*2
PALETTE={'pink':'#ed68aa','purple':'#9273ee','blue':'#55c4e9','orange':'#ff9c66','white':'#fff9ed'}

def linear(v): return v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4
def color(hex): return tuple(linear(int(hex[i:i+2],16)/255) for i in (1,3,5))
def blend(a,b,t): return tuple(a[i]*(1-t)+b[i]*t for i in range(3))
def mat(name,hex,rough=.43):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color(hex),1);p.inputs['Roughness'].default_value=rough;p.inputs['IOR'].default_value=1.42
    p.inputs['Subsurface Weight'].default_value=.045;p.inputs['Subsurface Radius'].default_value=(.8,.45,.2);p.inputs['Coat Weight'].default_value=.05;p.inputs['Coat Roughness'].default_value=.42
    return m
def mesh_obj(name,verts,faces,material,colors=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(material)
    for p in me.polygons:p.use_smooth=True
    if colors:
        a=me.color_attributes.new(name='Botanical gradient',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(colors):a.data[i].color=(*c,1)
        nodes=material.node_tree.nodes
        if not nodes.get('Botanical gradient'):
            n=nodes.new('ShaderNodeVertexColor');n.name='Botanical gradient';n.layer_name='Botanical gradient';material.node_tree.links.new(n.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
    return o
def curve(name,points,depth,material,res=16,radii=None):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=res;cu.bevel_depth=depth;cu.bevel_resolution=5
    sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for i,(p,co) in enumerate(zip(sp.bezier_points,points)):
        p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
        if radii:p.radius=radii[i]
    o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o
def sphere(name,location,scale,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40,location=location);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    return o

def setup(w,h,span,anchor=(.5,.5),anchor_point=(0,0,0)):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=ARGS.samples;scene.cycles.use_denoising=True
    scene.cycles.max_bounces=6;scene.cycles.diffuse_bounces=4;scene.cycles.glossy_bounces=4
    scene.render.resolution_x=w*2;scene.render.resolution_y=h*2;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8';scene.render.film_transparent=True
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(*color('#e0ebdf'),1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
    def light(name,loc,power,size,hex):
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=tuple(int(hex[i:i+2],16)/255 for i in (1,3,5));o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.8))-o.location).to_track_quat('-Z','Y').to_euler()
    light('Broad warm key',(-3.5,-4.0,6),460,4.0,'#fff5e6');light('Gentle cool fill',(3,-2,3),235,4,'#e4f7ff');light('Golden rim',(1.2,3,4.5),280,3,'#fff1c8')
    d=bpy.data.cameras.new('Botanical camera');cam=bpy.data.objects.new('Botanical camera',d);bpy.context.collection.objects.link(cam);scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=span
    target=Vector((0,0,.75));cam.location=target+Vector((0,-8,2.3));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.view_layer.update()
    # Numerically translate the camera in its local screen plane to place the
    # semantic anchor exactly, independent of Blender's sensor-fit convention.
    target_screen=(anchor[0],1-anchor[1]);p=Vector(anchor_point)
    for axis,want in [(0,target_screen[0]),(1,target_screen[1])]:
        at=world_to_camera_view(scene,cam,p)[axis];local=cam.rotation_euler.to_quaternion()@Vector((1,0,0) if axis==0 else (0,1,0));cam.location+=local;bpy.context.view_layer.update();moved=world_to_camera_view(scene,cam,p)[axis];rate=moved-at;cam.location+=local*((want-at)/rate-1);bpy.context.view_layer.update()
    return scene

def make_leaf(name,start,end,width=.24,mat_hex='#6ab846',roll=0,veins=True):
    start=Vector(start);end=Vector(end);axis=end-start;length=axis.length;axis.normalize();front=Vector((0,-1,0));side=axis.cross(front).normalized();front=side.cross(axis).normalized()
    if roll:side,front=side*math.cos(roll)+front*math.sin(roll),front*math.cos(roll)-side*math.sin(roll)
    material=mat(name+' waxy leaf',mat_hex,.45);base=color(mat_hex);light=color('#b4dc6c');dark=color('#32843c');verts=[];faces=[];cols=[];nu=48;nv=32
    def center(u):return start+axis*length*u+front*(math.sin(PI*u)*.055+u*u*.06)
    for i in range(nu+1):
        u=i/nu;s=math.sin(PI*u);w=max(.001,width*s**.76*(.78+.22*u));th=max(.001,.065*s**.68)
        for j in range(nv):
            a=j/nv*TAU;c=math.cos(a);lat=math.sin(a);frontness=max(0,c);ridge=math.exp(-(lat/.16)**2)*frontness
            v=center(u)+side*w*lat+front*(th*c+.009*ridge*s)
            verts.append(tuple(v));tone=blend(blend(dark,base,.5+.5*frontness),light,.1+.2*u+.075*frontness+.04*ridge)
            # A broad, soft fold makes the two leaf halves read at game size.
            tone=tuple(x*(1-.035*frontness*max(0,lat)) for x in tone);cols.append(tone)
    for i in range(nu):
        for j in range(nv):a=i*nv+j;b=i*nv+(j+1)%nv;faces.append((a,b,b+nv,a+nv))
    o=mesh_obj(name,verts,faces,material,cols)
    if veins:
        mid=mat(name+' midrib','#a2ce63',.5)
        pts=[center(u)+front*(.066*math.sin(PI*u)**.68+.011*math.sin(PI*u)+.002) for u in [.04,.2,.4,.6,.8,.97]];curve(name+' soft midrib',pts,.0105,mid,radii=[.65,1,1,.85,.55,.08])
        # Only three softened vein pairs; they disappear gracefully at game size.
        for u in [.29,.46,.63]:
            for sign in [-1,1]:
                p0=center(u)+front*(.066*math.sin(PI*u)**.68+.012);v=u+.16;p1=center(v)+side*(sign*width*math.sin(PI*v)**.76*.62)+front*(.043*math.sin(PI*v)**.68);curve(name+' side vein',[p0,(p0+p1)*.5+axis*.018,p1],.0048,mid,radii=[.85,.60,.08])
    return o

def roots(kind='bud'):
    stem=mat('stem smooth green','#65b340',.48);curve('Slightly curved short stem',[(0,0,.02),(-.015,.015,.36),(.01,.015,.69),(0,.0,1.02)],.07,stem)
    make_leaf('Left fleshy leaf',(-.01,-.02,.2),(-.61,.015,.69),.235,'#70bd44',-.18)
    make_leaf('Right fleshy leaf',(.01,-.05,.3),(.62,-.02,.83),.245,'#79c34b',.2)
    if kind=='root':
        make_leaf('Small upper left',(-.01,.05,.53),(-.37,.1,1.05),.17,'#8bc957',-.15)
        make_leaf('Small upper right',(.01,.08,.62),(.31,.15,1.12),.16,'#7ac049',.14)

def bud(hex):
    roots();material=mat('Velvety closed petals',hex,.43);base=color(hex);dark=blend(base,color('#8c3678'),.18);highlight=blend(base,color('#fff3de'),.25);crease=tuple(c*.76 for c in base);verts=[];faces=[];cols=[];nu=100;nv=160
    for i in range(nu+1):
        u=i/nu;s=max(0,math.sin(PI*u));r=max(.0005,.405*s**.69*(1-.22*u));z=.84+.95*u
        for j in range(nv):
            a=j/nv*TAU;phase=a*3+.45+.90*(1-u);dist=math.atan2(math.sin(phase),math.cos(phase));seam=math.exp(-(dist/.17)**2);lip=math.exp(-((dist-.24)/.22)**2);fade=s**.42
            rad=r*(1-.065*seam*fade+.025*lip*fade);x=rad*math.cos(a);y=rad*.88*math.sin(a)
            # Curved wrapped edges have a shallow recess and a rounded outer lip.
            # Both are actual geometry, so the softbox supplies the contact shade.
            verts.append((x,y,z+.014*math.sin(phase)*s));c=blend(dark,base,min(1,.30+u*.9));c=blend(c,highlight,u*.24+max(0,-math.sin(a))*.04+lip*.065*fade);cols.append(blend(c,crease,seam*.24*fade))
    for i in range(nu):
        for j in range(nv):a=i*nv+j;b=i*nv+(j+1)%nv;faces.append((a,b,b+nv,a+nv))
    mesh_obj('Closed three-petal teardrop',verts,faces,material,cols)
    sphere('Soft calyx cup',(0,0,.85),(.215,.19,.13),mat('Calyx green cup','#68ac3d',.49))
    for i in range(5):
        a=-PI/2+i*TAU/5;tip=1.13+[.015,-.02,.01,-.01,.02][i]
        make_leaf('Wrapped pointed calyx '+str(i),(.09*math.cos(a),.08*math.sin(a),.77),(.30*math.cos(a),.27*math.sin(a),tip),.084,'#68ac3d',0,True)

def flower(hex):
    N=Vector((0,-.985,.172)).normalized();U=Vector((1,0,0));V=N.cross(U).normalized();origin=Vector((0,0,0));base=color(hex);highlight=blend(base,color('#fff6e9'),.34);deep=blend(base,color('#9c367b'),.18)
    # Small deterministic variations keep the five lobes natural while retaining
    # the same overall silhouette, anchor and color palette as the first pass.
    rotations=[0,.014,-.018,.012,-.012];lengths=[1,.993,1.008,.996,1.002];widths=[1,.98,1.025,.985,1.01];layers=[.014,-.008,.012,-.010,.006]
    for k in range(5):
        a=PI/2+k*TAU/5+rotations[k];radial=U*math.cos(a)+V*math.sin(a);side=-U*math.sin(a)+V*math.cos(a);verts=[];faces=[];cols=[];nu=80;nv=80
        material=mat('Petal '+str(k+1),hex,.46)
        for i in range(nu+1):
            u=i/nu;s=max(0,math.sin(PI*u));r=.12+1.04*u*lengths[k];w=max(.0001,.50*s**.61*(.75+.25*u)*widths[k]);th=max(.0001,.205*s**.63)
            # Low arch in the longitudinal axis makes each petal feel fleshy,
            # rather than five flat discs or a ring of identical spheres.
            center=origin+radial*r+N*(.045+.10*math.sin(PI*u)-.045*u+layers[k]*s)+side*(.014*math.sin(PI*u)*math.sin(k*1.7))
            for j in range(nv):
                t=j/nv*TAU;c=math.cos(t);lat=math.sin(t);front=max(0,c);fold=math.exp(-(lat/.16)**2)*front*s**.7;shoulder=math.exp(-((abs(lat)-.28)/.19)**2)*front*s
                v=center+side*(w*lat)+N*(th*c-.028*fold+.009*shoulder);verts.append(tuple(v))
                tone=blend(deep,base,.50+.50*u);tone=blend(tone,highlight,(.06+.16*u)*front+.045*shoulder)
                # The middle furrow fades at both ends; wider color layers on
                # either side stay quiet enough to read cleanly around 100 px.
                tone=blend(tone,tuple(v*.78 for v in base),.19*fold);tone=blend(tone,deep,.045*front*s*max(0,-lat));cols.append(tone)
        for i in range(nu):
            for j in range(nv):a0=i*nv+j;b=i*nv+(j+1)%nv;faces.append((a0,b,b+nv,a0+nv))
        mesh_obj('Rounded fleshy petal '+str(k+1),verts,faces,material,cols)
    center=sphere('Honey gold domed flower heart',N*.29,(.255,.255,.145),mat('Soft golden pollen','#efbf47',.53));center.rotation_euler=N.to_track_quat('Z','Y').to_euler()
    # Delicate center edge under the dome adds contact depth, no tiny noisy dots.
    collar=sphere('Warm petal contact center',N*.19,(.273,.273,.095),mat('Pollen warm contact','#dc9c32',.55));collar.rotation_euler=N.to_track_quat('Z','Y').to_euler()

def seed():
    material=mat('Golden seed satin','#d8a43f',.35);verts=[];faces=[];cols=[];nu=80;nv=96
    for i in range(nu+1):
        u=i/nu;s=max(0,math.sin(PI*u));r=max(.0005,.38*s**.67*(1-.30*u));z=-.55+u*1.20
        for j in range(nv):
            a=j/nv*TAU;verts.append((r*math.cos(a),r*.75*math.sin(a),z));cols.append(blend(color('#bc8328'),color('#efd082'),.12+.77*u))
    for i in range(nu):
        for j in range(nv):a=i*nv+j;b=i*nv+(j+1)%nv;faces.append((a,b,b+nv,a+nv))
    mesh_obj('Smooth golden teardrop seed',verts,faces,material,cols)

MANIFEST=json.loads((OUT/'manifest-render.json').read_text()) if ARGS.only and (OUT/'manifest-render.json').exists() else {}
def render(name,w,h,anchor):
    p=OUT/(name+'.png');bpy.context.scene.render.filepath=str(p);bpy.ops.render.render(write_still=True)
    MANIFEST[name]={'file':name+'.png','width':w,'height':h,'anchor':list(anchor),'renderScale':2}
    print('BOTANICAL_RENDER '+str(p),flush=True)

for name,hex in PALETTE.items():
    if ARGS.preview and name!='pink':continue
    if not ARGS.only or ARGS.only=='bud-'+name:setup(256,320,2.6,(.5,290/320));bud(hex);render('bud-'+name,256,320,(128,290))
    if not ARGS.only or ARGS.only=='flower-'+name:setup(320,320,2.8,(.5,.5));flower(hex);render('flower-'+name,320,320,(160,160))
if not ARGS.preview:
    if not ARGS.only or ARGS.only=='leaf-root':setup(320,180,2.8,(.5,145/180));roots('root');render('leaf-root',320,180,(160,145))
    if not ARGS.only or ARGS.only=='leaf':setup(128,192,1.6,(.5,176/192));make_leaf('Standalone waxy leaf',(0,0,0),(.04,.02,1.25),.31,'#78bf48',0);render('leaf',128,192,(64,176))
    if not ARGS.only or ARGS.only=='leaf-b':setup(128,192,1.6,(.5,176/192));make_leaf('Second waxy leaf',(0,0,0),(-.06,.03,1.20),.34,'#8bc957',.05);render('leaf-b',128,192,(64,176))
    if not ARGS.only or ARGS.only=='seed':setup(128,160,1.6,(.5,.5));seed();render('seed',128,160,(64,80))
(OUT/'manifest-render.json').write_text(json.dumps(MANIFEST,indent=2))
