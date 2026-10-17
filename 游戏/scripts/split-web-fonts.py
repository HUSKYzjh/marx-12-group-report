"""Partition the complete font for HTTP unicode-range loading; never replace the source font."""
from pathlib import Path
from io import BytesIO
from hashlib import sha256
import argparse,base64,copy,json,os,re,sys

root=Path(__file__).resolve().parents[1]
sys.path.insert(0,os.environ.get('FONT_TOOLS_MODULES',str(root/'tmp/font-tools')))
from fontTools.ttLib import TTFont,woff2
from fontTools import subset,__version__

def ranges(codes):
    result=[]
    for code in sorted(codes):
        if result and result[-1][1]+1==code:result[-1][1]=code
        else:result.append([code,code])
    return result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',default=str(root/'build/hosted'))
    args=parser.parse_args()
    out=Path(args.output).resolve();assets=out/'runtime-assets';assets.mkdir(parents=True,exist_ok=True)
    source=root/'public/assets/fonts/workshop-hand.woff2'
    source_bytes=source.read_bytes();source_digest=sha256(source_bytes).hexdigest()
    coverage=json.loads((source.parent/'coverage.json').read_text(encoding='utf-8'))
    assert coverage['sha256']==source_digest,'Canonical font coverage is stale'
    all_codes={code for a,b in coverage['ranges'] for code in range(a,b+1)}
    assert len(all_codes)==coverage['codepoints']
    text=(root/'offline/技术红利去了哪里.html').read_text(encoding='utf-8')
    svg_text=''.join(base64.b64decode(m).decode('utf-8') for m in re.findall(r'data:image/svg\+xml;base64,([A-Za-z0-9+/=]+)',text))
    text=re.sub(r'data:[a-z0-9/+.-]+;base64,[A-Za-z0-9+/=]+','',text)+svg_text
    # Include esbuild strings and nested srcdoc strings, not just literal Han text.
    text=re.sub(r'\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})',lambda m:chr(int(m[1] or m[2],16)),text,flags=re.I)
    common=set(map(ord,text))|set(range(0x20,0x100))|set(range(0x2000,0x2070))|set(range(0x2190,0x2300))
    core=sorted(common&all_codes)
    remaining=sorted(all_codes-set(core))
    groups=[core]+[remaining[i:i+2048] for i in range(0,len(remaining),2048)]
    key=sha256(source_bytes+json.dumps(core).encode()+b'complete-web-font-partition-v1').hexdigest()
    cache=out/'web-fonts.json'
    if cache.exists():
        saved=json.loads(cache.read_text(encoding='utf-8'))
        if saved.get('build_key')==key and all((out/row['file']).is_file() and sha256((out/row['file']).read_bytes()).hexdigest()==row['sha256'] for row in saved['parts']):
            print(json.dumps({'cached':True,'parts':len(saved['parts']),'core_bytes':saved['parts'][0]['bytes']}));return
    print(f'Preparing {len(groups)} font partitions: {len(core)} current-text characters; all {len(all_codes)} mappings retained.',flush=True)
    # Unchanged builds return above without decoding the large font at all.
    # A pinned original TTF can also avoid WOFF2 reconstruction on a new build.
    ttf_cache=root/'build/font-cache';ttf_cache.mkdir(parents=True,exist_ok=True)
    ttf_path=ttf_cache/(source_digest+'.ttf');ttf_hash=ttf_path.with_suffix('.sha256')
    if ttf_path.exists() and ttf_hash.exists() and sha256(ttf_path.read_bytes()).hexdigest()==ttf_hash.read_text().strip():
        ttf_bytes=ttf_path.read_bytes()
    else:
        original=TTFont(source,recalcTimestamp=False)
        original_ttf=os.environ.get('GAME_FONT_TTF')
        if original_ttf:
            binary=Path(original_ttf).read_bytes()
            provenance=json.loads((source.parent/'provenance.json').read_text(encoding='utf-8'))
            assert sha256(binary).hexdigest()==provenance['upstream_sha256'],'Unexpected original TTF'
            base=TTFont(BytesIO(binary),recalcTimestamp=False)
            assert set(base.getBestCmap())==all_codes
            base['name']=copy.deepcopy(original['name'])
        else:base=original
        base.flavor=None;ttf=BytesIO();base.save(ttf);ttf_bytes=ttf.getvalue()
        ttf_path.write_bytes(ttf_bytes);ttf_hash.write_text(sha256(ttf_bytes).hexdigest()+'\n')
    compress=woff2.brotli.compress
    woff2.brotli.compress=lambda data,**options:compress(data,quality=8,**options)
    covered=set();parts=[]
    for index,codes in enumerate(groups):
        font=TTFont(BytesIO(ttf_bytes),recalcTimestamp=False)
        options=subset.Options();options.glyph_names=True
        options.name_IDs=['*'];options.name_languages=['*'];options.name_legacy=True
        sub=subset.Subsetter(options=options);sub.populate(unicodes=codes);sub.subset(font)
        font.flavor='woff2';buffer=BytesIO();font.save(buffer);binary=buffer.getvalue()
        actual=TTFont(BytesIO(binary)).getBestCmap()
        assert set(actual)==set(codes),'A partition lost or added character mappings'
        assert not covered.intersection(actual),'unicode-range partitions must not overlap'
        covered.update(actual)
        digest=sha256(binary).hexdigest();name=f'runtime-assets/font-{digest[:20]}.woff2'
        (out/name).write_bytes(binary)
        parts.append({'file':name,'bytes':len(binary),'sha256':digest,'codepoints':len(codes),'ranges':ranges(codes)})
        print(f'Font partition {index+1}/{len(groups)}: {len(codes)} mappings, {len(binary)} bytes',flush=True)
    assert covered==all_codes,'The web font set must retain EVERY source character mapping'
    report={'build_key':key,'source_sha256':source_digest,'source_bytes':len(source_bytes),
        'source_codepoints':len(all_codes),'covered_codepoints':len(covered),'all_mappings_preserved':True,
        'source_font_unchanged':True,'generator':'fontTools '+__version__,'license':'OFL-1.1','parts':parts}
    cache.write_bytes((json.dumps(report,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))

if __name__=='__main__':main()
