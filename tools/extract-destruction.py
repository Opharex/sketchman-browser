"""Recover destruction particle definitions from the supplied APK (framework.all.c/d)."""
from pathlib import Path
import zipfile,struct,json,sys
z=zipfile.ZipFile(sys.argv[1]); root=Path(__file__).resolve().parents[1]
groups=['G_BoxDest','G_SpikesVDest','G_SpikesHDest','G_SawDest','G_AirMineDest','G_BarrelExplodeDest','G_BarrelCrashDest','G_JunkDest','G_LandMineDest','G_RayDest','G_EnFireExplode','G_EnBlood']
out={}
for group in groups:
 prefix='assets/Graphics/Particles/'+group+'/'+group
 b=z.read(prefix+'.pag'); p=1+b[0]; count,gx,gy=struct.unpack_from('<iii',b,p)
 layers=[]
 for i in range(1,count+1):
  b=z.read(prefix+str(i)+'.par'); p=0
  def read(fmt):
   global p
   val=struct.unpack_from('<'+fmt,b,p);p+=struct.calcsize('<'+fmt);return val[0] if len(val)==1 else list(val)
  def string():
   global p
   n=read('B');s=b[p:p+n].decode();p+=n;return s
  name=string(); texture=string(); frame=read('ii'); image=read('ii')
  def state(): return dict(angle=read('f'),color=read('ffff'),scale=read('f'),velocity=read('ff'))
  start=state();end=state();variance=dict(angle=read('f'),scale=read('f'),velocity=read('ff'),life=read('i'),delay=read('i'),spread=read('ii'))
  frameMs,frames,firstFrame,blend,life,delay,number,mode=read('8i');loop=bool(read('B'));x,y=read('ii');prewarm=bool(read('B'));midAlpha=read('f');direction=read('f');bounds=read('5i')
  assert p==len(b),(name,p,len(b))
  layers.append(dict(name=name,texture=texture,frame=frame,image=image,start=start,end=end,variance=variance,frameMs=frameMs,frames=frames,firstFrame=firstFrame,blend=blend,life=life,delay=delay,count=number,mode=mode,loop=loop,offset=[x-gx,y-gy],midAlpha=midAlpha,direction=direction))
 out[group]=layers
(root/'dist/destruction-data.js').write_text('// Generated from original APK .pag/.par files by tools/extract-destruction.py.\nexport const DESTRUCTION_GROUPS='+json.dumps(out,separators=(',',':'))+';\n')
print({g:[(l['texture'],l['count'],l['offset']) for l in v] for g,v in out.items()})
