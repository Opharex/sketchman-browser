"""Restore original trim offsets for DOM shop art from extracted APK atlases."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'dist'; sprites=json.loads((root/'assets/sprites.json').read_text());out=root/'shop-art';out.mkdir(exist_ok=True)
for name,s in sprites.items():
 if not(name.startswith('STR_') or name in ['IMM_BackButton_01','IMM_MenuBack_01']):continue
 v=s['v'];sheet=Image.open(root/f"assets/Graphics/{s['atlas']}/{s['atlas']}_{v[0]+1}.png")
 canvas=Image.new('RGBA',(v[5],v[6]));canvas.paste(sheet.crop((v[1],v[2],v[3],v[4])),(v[11],v[12]));canvas.save(out/f'{name}.png')
