#!/usr/bin/env python3
"""Bake nine finished, pixel-registered title-pose illustrations OFFLINE.

The original APK menu supplies the exact character silhouette and ink;
individually hand-tuned materials from the supplied skin concepts are painted
inside that native pose. Every output PNG has identical registration.
The browser never estimates pose, samples source materials or recolors pixels.
"""
from pathlib import Path
from PIL import Image
import argparse, math
IDS=('crimson_bolt','frost_runner','toxic_lime','royal_gold','neon_synthwave',
     'obsidian_ember','deep_ocean','sunset_blaze','jungle_camo')
RECT=(327,134,155,187)
HEAD=(404.5,181.5,43,41)
BODY=(
 ((377,223),(393,217),(420,223),(430,240),(438,254),(440,286),(444,306),(387,307),(378,278),(370,253)),
 ((372,228),(382,237),(371,256),(366,278),(371,293),(363,306),(348,305),(343,291),(350,266),(357,242)),
 ((420,234),(432,239),(445,249),(459,259),(459,271),(448,274),(436,263),(422,248)),
)
PALETTE={
 'crimson_bolt':((52,0,8),(136,0,24),(243,18,44),(255,241,241)),
 'frost_runner':((4,53,128),(45,134,210),(178,234,255),(255,255,255)),
 'toxic_lime':((6,48,12),(18,170,16),(186,255,0),(243,255,143)),
 'royal_gold':((92,40,8),(184,121,8),(247,198,47),(255,249,223)),
 'neon_synthwave':((16,7,83),(76,11,157),(240,23,194),(255,240,250)),
 'obsidian_ember':((25,21,29),(52,36,43),(243,76,8),(255,234,114)),
 'deep_ocean':((0,24,53),(8,111,155),(32,196,213),(203,255,255)),
 'sunset_blaze':((165,44,8),(243,107,4),(255,204,17),(255,244,180)),
 'jungle_camo':((18,40,10),(78,103,45),(162,140,79),(223,210,161)),
}
def clamp(x,a=0,b=1):return max(a,min(b,x))
def blend(a,b,t):return tuple(a[i]*(1-t)+b[i]*t for i in range(3))
def within(x,y,points):
 inside=False
 for p,q in zip(points,points[-1:]+points[:-1]):
  if (p[1]>y)!=(q[1]>y) and x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0]):inside=not inside
 return inside
def zone(x,y):
 hx=(x-HEAD[0])/HEAD[2];hy=(y-HEAD[1])/HEAD[3]
 if hx*hx+hy*hy<.91:return 'head'
 for poly in BODY:
  if within(x,y,poly):return 'body'
 return None
def hash2(x,y,seed):
 n=(x*73856093^y*19349663^seed*83492791)&0xffffffff
 n=(n^(n>>13))*1274126177&0xffffffff
 return ((n^(n>>16))&65535)/65535
def noise(x,y,cell,seed):
 fx=x/cell;fy=y/cell;ix=math.floor(fx);iy=math.floor(fy)
 tx=fx-ix;ty=fy-iy;tx=tx*tx*(3-2*tx);ty=ty*ty*(3-2*ty)
 a=hash2(ix,iy,seed)*(1-tx)+hash2(ix+1,iy,seed)*tx
 b=hash2(ix,iy+1,seed)*(1-tx)+hash2(ix+1,iy+1,seed)*tx
 return a*(1-ty)+b*ty
def paint(kind,x,y,luma,area):
 a,b,c,d=PALETTE[kind];n=noise(x,y,11,13)
 if kind=='crimson_bolt' and area=='head':
  return blend((216,216,232),(255,255,255),clamp(luma*.96))
 if kind=='obsidian_ember':
  vx=math.sin(x*.255+noise(x,y,17,9)*6.3)
  vy=math.sin(y*.31+noise(x,y,13,14)*5.4)
  crack=clamp((.31-abs(vx+vy*.72))/.31)**1.25
  rock=blend((20,17,23),(65,42,38),.3+.7*n)
  return blend(rock,blend((239,52,8),(255,232,54),crack),crack)
 if kind=='jungle_camo':
  v=.64*noise(x,y,13,21)+.36*noise(x,y,6,11)
  return ((25,57,17) if v<.29 else (66,105,38) if v<.43 else
          (123,117,65) if v<.59 else (197,179,114) if v<.70 else (38,67,29))
 if kind=='deep_ocean':
  v=math.sin(y*.235+x*.11+noise(x,y,15,15)*4.2)
  bubble=max(0,math.sin(x*.50+y*.13))**28*hash2(int(x/5),int(y/5),8)
  return blend(blend(b,c,clamp(.5+.42*v)),d,bubble*.70)
 if kind=='frost_runner':
  facet=hash2(int(x/13),int(y/14),3)
  edge=abs((x*.4+y*.6)%13-6.5)
  return blend(b,blend(c,d,.33+facet*.45),clamp(.3+facet*.65+(.21 if edge>5.8 else 0)))
 if kind=='royal_gold':
  glint=max(0,math.cos(x*.24+y*.13))**16
  return blend(blend(a,c,clamp((luma-.22)*1.45)),d,glint*.65)
 if kind=='neon_synthwave':
  streak=max(0,math.sin(x*.2-y*.14+noise(x,y,12,22)*1.4))**12
  return blend(blend(a,b,.35+.4*n),blend(c,d,.35),streak*.88)
 if kind=='sunset_blaze':
  tongues=math.sin(x*.16+y*.16+noise(x,y,10,5)*5)
  return blend(blend(a,b,.65),blend(c,d,.37),clamp(.40+.48*tongues))
 if kind=='toxic_lime':
  glint=max(0,math.sin(y*.25-x*.18))**12
  return blend(blend(b,c,.36+.38*n),d,.35*glint)
 if kind=='crimson_bolt':
  streak=max(0,math.sin(x*.14+y*.19))**13
  return blend(blend(a,c,clamp(.45+.53*luma)),d,.24*streak)
 raise ValueError(kind)
def acceptable(r,g,b,a,area):
 # Ink outlines, pistol metal, red burst and logo retain ORIGINAL pixels.
 return a>=45 and r>=78 and g>=100 and b>=119 and b>=r+5 and g>=r+3 and not(
  area=='body' and r>246 and g>247 and b>247)
def main(dist):
 master=Image.open(dist/'assets/Graphics/MMN_MainMenu/MMN_MainMenu_1.png').convert('RGBA')
 if master.size!=(1024,1024):raise RuntimeError('Unexpected original title sheet size')
 out=dist/'menu-portraits/prebuilt';out.mkdir(parents=True,exist_ok=True)
 x0,y0,w,h=RECT;original=master.load();selected=[]
 for yy in range(h):
  for xx in range(w):
   x=x0+xx;y=y0+yy;area=zone(x+.5,y+.5)
   if not area:continue
   r,g,b,a=original[x,y]
   if acceptable(r,g,b,a,area):
    selected.append((xx,yy,x,y,area,clamp((.21*r+.65*g+.14*b)/255),a))
 nhead=sum(p[4]=='head' for p in selected)
 print('Exact-pose source pixels:',len(selected),'head:',nhead,'body:',len(selected)-nhead,flush=True)
 if nhead<1300 or len(selected)-nhead<360:raise RuntimeError('Original title figure has changed: refusing to bake unaligned portraits')
 contact=Image.new('RGB',(w*3,h*3),'#f4f0e8')
 for i,kind in enumerate(IDS):
  canvas=Image.new('RGBA',(w,h));pixels=canvas.load()
  for xx,yy,x,y,area,lum,alpha in selected:
   rgb=paint(kind,x,y,lum,area);s=.86+.14*lum
   pixels[xx,yy]=(*(int(clamp(v*s,0,255)) for v in rgb),alpha)
  path=out/(kind+'.png');canvas.save(path,optimize=True)
  preview=master.crop((x0,y0,x0+w,y0+h)).copy();preview.alpha_composite(canvas)
  contact.paste(preview.convert('RGB'),((i%3)*w,(i//3)*h))
  print('Baked',path,path.stat().st_size,flush=True)
 contact.save(out/'contact.png',optimize=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--dist',type=Path,default=Path('dist'))
 main(p.parse_args().dist)
