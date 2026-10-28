"""Extract original artwork and audio from a user-supplied Sketchman 1.0.5 APK."""
import zipfile, struct, json, sys, re
from pathlib import Path
from PIL import Image
apk=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]/'dist'; sprites={}
with zipfile.ZipFile(apk) as z:
 for n in z.namelist():
  if n.startswith(('assets/Graphics/','assets/Sounds/')) and n.lower().endswith(('.png','.jpg','.mp3','.wav')):
   target=root/n;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(n))
  if n.startswith('assets/Graphics/') and n.endswith('.def'):
   b=z.read(n);p=0
   def string():
    global p
    size=b[p];p+=1;s=b[p:p+size].decode().rstrip('\0');p+=size;return s
   atlas=string();sheets,count=struct.unpack_from('<ii',b,p);p+=8
   for i in range(count):
    name=string();vals=struct.unpack_from('<15i',b,p);p+=60;sprites[name]={'atlas':atlas,'v':vals}
(root/'assets/sprites.json').write_text(json.dumps(sprites))
(root/'icons').mkdir(exist_ok=True)
for n,s in sprites.items():
 v=s['v'];a=s['atlas'];im=Image.open(root/f'assets/Graphics/{a}/{a}_{v[0]+1}.png').crop((v[1],v[2],v[3],v[4]));im.save(root/f'icons/{n}.png')
print(f'Extracted {len(sprites)} sprites.')
