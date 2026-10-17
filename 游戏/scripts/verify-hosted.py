"""Independently inspect every built web asset and every font partition's actual cmap."""
from pathlib import Path
from hashlib import sha256
import json,os,re,sys
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,os.environ.get('FONT_TOOLS_MODULES',str(root/'tmp/font-tools')))
from fontTools.ttLib import TTFont
out=Path(os.environ.get('GAME_HOSTED_OUTPUT',str(root/'build/hosted'))).resolve()
manifest=json.loads((out/'hosting-manifest.json').read_text(encoding='utf-8'))
fonts=json.loads((out/'web-fonts.json').read_text(encoding='utf-8'))
source=root/'public/assets/fonts/workshop-hand.woff2'
assert sha256(source.read_bytes()).hexdigest()==fonts['source_sha256']
coverage=json.loads((source.parent/'coverage.json').read_text(encoding='utf-8'))
assert coverage['sha256']==fonts['source_sha256']
expected={c for a,b in coverage['ranges'] for c in range(a,b+1)}
assert sha256((out/'index.html').read_bytes()).hexdigest()==manifest['index_sha256']
for asset in manifest['assets']:
    file=(out/asset['file']).resolve()
    assert file.is_relative_to(out)
    binary=file.read_bytes()
    assert len(binary)==asset['bytes'] and sha256(binary).hexdigest()==asset['sha256'],asset['file']
actual=set()
for part in fonts['parts']:
    codes=set(TTFont(out/part['file']).getBestCmap())
    declared={c for a,b in part['ranges'] for c in range(a,b+1)}
    assert codes==declared and len(codes)==part['codepoints']
    assert not codes.intersection(actual)
    actual.update(codes)
assert actual==expected,'Published font partitions must preserve all source mappings'
text=(root/'offline/技术红利去了哪里.html').read_text(encoding='utf-8')
text=re.sub(r'\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})',lambda m:chr(int(m[1] or m[2],16)),text,flags=re.I)
used=set(map(ord,re.findall(r'[\u3400-\u9fff]',text)))
assert used<=actual,'Some game text is missing from the published font set'
core={c for a,b in fonts['parts'][0]['ranges'] for c in range(a,b+1)}
assert used<=core,'Canvas text must be in the eagerly loaded core font'
report={'date':'2026-10-17','index_sha256':manifest['index_sha256'],'assets_checked':len(manifest['assets']),
    'source_font_sha256':fonts['source_sha256'],'source_mappings':len(expected),'published_mappings':len(actual),
    'actual_font_files_inspected':len(fonts['parts']),'used_han_checked':len(used),'missing_han':[],
    'all_font_mappings_preserved':True,'current_han_in_core':True,'canonical_font_unchanged':True}
(out/'verification.json').write_bytes((json.dumps(report,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print(json.dumps(report,ensure_ascii=False))
