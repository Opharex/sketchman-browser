"""Recover the actual SketchMan001.xma spawn patterns from a supplied APK.
Usage: python3 tools/extract-patterns.py /path/to/sketchman-1-0-5.apk
The markers use event=5555; tutorial state is separate from the normal selector.
"""
import json, struct, sys, zipfile
from pathlib import Path
with zipfile.ZipFile(sys.argv[1]) as apk:
    rows=list(struct.iter_unpack('<10i',apk.read('assets/SketchMan001.xma')))
markers=[i for i,row in enumerate(rows) if row[1]==5555]
patterns=[]
for j,i in enumerate(markers[:-1]):
    row=rows[i];end=markers[j+1]
    patterns.append({'id':row[2],'duration':rows[end][0]-row[0],
      'events':[{'at':e[0]-row[0],'type':e[2],'args':e[3:]}
                for e in rows[i+1:end] if e[1]==1]})
out=Path(__file__).resolve().parents[1]/'dist/assets/normal-patterns.json'
out.write_text(json.dumps({'source':'SketchMan001.xma, ten little-endian int32 fields per event','patterns':patterns},separators=(',',':')))
print(f'{len(patterns)} patterns recovered to {out}')
