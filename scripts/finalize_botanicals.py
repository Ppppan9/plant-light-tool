"""Premultiplied-alpha supersampling/PNG optimization for Blender botanic sprites.

Run after render_botanicals.py using the project Python with Pillow installed.
The 2x render originals stay in ref/analysis/polished/raw-2x for inspection.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse,colorsys,json,shutil

ap=argparse.ArgumentParser();ap.add_argument('--only',default='');ARGS=ap.parse_args()
ONLY=set(ARGS.only.split(',')) if ARGS.only else None

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def polish_orange(im):
    """Raise petal saturation by 14%, preserving HSV value and original alpha.

    Hue limits exclude the green leaves and golden yellow flower heart. Soft
    limits protect nearly white specular highlights. The value channel stays
    fixed, retaining the original soft lighting and highlight/shadow pattern.
    """
    rgba=bytearray(im.tobytes())
    for i in range(0,len(rgba),4):
        if rgba[i+3]<2:continue
        r,g,b=[rgba[i+j]/255 for j in range(3)];h,s,v=colorsys.rgb_to_hsv(r,g,b)
        weight=smooth(.022,.046,h)*(1-smooth(.103,.125,h))*smooth(.09,.20,s)
        if weight<=0:continue
        rgb=colorsys.hsv_to_rgb(h,min(1,s*(1+.14*weight)),v)
        for j,x in enumerate(rgb):rgba[i+j]=round(x*255)
    return Image.frombytes('RGBA',im.size,bytes(rgba))

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'src/art-assets/polished'
RAW=ROOT/'ref/analysis/polished/raw-2x';RAW.mkdir(parents=True,exist_ok=True)
manifest=json.loads((OUT/'manifest-render.json').read_text())
if ONLY and (OUT/'manifest.json').exists():manifest.update(json.loads((OUT/'manifest.json').read_text()))
if 'leaf-cluster' in manifest and 'leaf-root' in manifest:manifest.pop('leaf-cluster')
for key,spec in manifest.items():
    if ONLY and key not in ONLY:continue
    path=OUT/spec['file'];im=Image.open(path).convert('RGBA')
    target=(spec['width'],spec['height'])
    if im.size!=target:
        shutil.copy2(path,RAW/path.name)
    elif (RAW/path.name).exists():
        # Always restart from the canonical 2x render, making color finishing
        # idempotent rather than increasing saturation on every invocation.
        im=Image.open(RAW/path.name).convert('RGBA')
    if im.size!=target:
        # Premultiplication stops RGB from transparent pixels making gray or
        # white fringe colors during Lanczos reconstruction.
        im=im.convert('RGBa').resize(target,Image.Resampling.LANCZOS).convert('RGBA')
    # Below 1/255 alpha there is no visible information to preserve.
    rgba=bytearray(im.tobytes())
    for i in range(0,len(rgba),4):
        if rgba[i+3]<2:rgba[i:i+4]=bytes(4)
    im=Image.frombytes('RGBA',target,bytes(rgba))
    if key in {'bud-orange','flower-orange'}:im=polish_orange(im);spec['colorFinish']='orange petals: +14% HSV saturation, value and alpha fixed'
    im.save(path,optimize=True,compress_level=9)
    spec['renderScale']=1;spec['sourceRenderScale']=2;spec['bounds']=list(im.getchannel('A').getbbox());spec['bytes']=path.stat().st_size
    webp=path.with_suffix('.webp');im.save(webp,'WEBP',quality=95,method=6,alpha_quality=100,exact=True)
    spec['runtimeFile']=webp.name;spec['runtimeBytes']=webp.stat().st_size
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))

keys=list(manifest);cols=5;cw,ch=220,330;rows=(len(keys)+cols-1)//cols
sheet=Image.new('RGB',(cols*cw,rows*ch),'#9abe7d');d=ImageDraw.Draw(sheet)
for i,key in enumerate(keys):
    im=Image.open(OUT/(key+'.png')).convert('RGBA');im.thumbnail((190,270),Image.Resampling.LANCZOS)
    x=(i%cols)*cw+(cw-im.width)//2;y=(i//cols)*ch+15+(270-im.height)//2;sheet.paste(im,(x,y),im)
    d.text(((i%cols)*cw+12,(i//cols)*ch+300),key,fill='#173d28')
sheet.save(ROOT/'ref/analysis/polished/botanical-atlas.jpg',quality=94)
print(json.dumps({'sprites':len(manifest),'totalBytes':sum(s['bytes'] for s in manifest.values()),'runtimeBytes':sum(s['runtimeBytes'] for s in manifest.values()),'manifest':str(OUT/'manifest.json')},indent=2))
