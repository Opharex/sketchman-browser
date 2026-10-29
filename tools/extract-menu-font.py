"""Recover original menu/dialog glyph metrics from the user-supplied APK."""
import json,struct,sys,zipfile
from pathlib import Path
z=zipfile.ZipFile(sys.argv[1]);b=z.read('assets/Graphics/Fonts/ID2_Dialogs22.fd');p=0
for _ in range(2):p+=b[p]+1
height,dx,dy,space,count=struct.unpack_from('<5i',b,p);p+=20;glyphs={}
for _ in range(count):
 v=struct.unpack_from('<8i',b,p);p+=32;glyphs[chr(v[0])]=dict(x=v[2],y=v[3],w=v[4],h=v[5],advance=v[6])
assert p==len(b)
out=Path(__file__).resolve().parents[1]/'dist/menu-font-data.js';out.write_text('// Original APK ID2_Dialogs22.fd glyph metrics.\nexport const MENU_GLYPHS='+json.dumps(glyphs,separators=(',',':'))+';\n')
