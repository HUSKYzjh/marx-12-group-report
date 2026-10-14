"""Share byte-identical embedded images without resampling or altering pixels."""
from pathlib import Path
import hashlib, posixpath, sys, zipfile
import xml.etree.ElementTree as ET

file=Path(sys.argv[1]).resolve()
assert file.name=='candidate.pptx' and '.build' in file.parts
with zipfile.ZipFile(file) as src:
    blobs={i.filename:src.read(i.filename) for i in src.infolist()}
    info={i.filename:i for i in src.infolist()}
seen={}; aliases={}
for name in sorted(blobs):
    if name.startswith('ppt/media/'):
        key=(Path(name).suffix,hashlib.sha256(blobs[name]).digest())
        if key in seen:
            assert blobs[name]==blobs[seen[key]]
            aliases[name]=seen[key]
        else:seen[key]=name
rel_ns='http://schemas.openxmlformats.org/package/2006/relationships'
ET.register_namespace('',rel_ns)
for name in list(blobs):
    if not name.endswith('.rels'):continue
    tree=ET.fromstring(blobs[name]); changed=False
    base=posixpath.dirname(posixpath.dirname(name))
    for rel in tree:
        if rel.attrib.get('TargetMode')=='External':continue
        target=rel.attrib.get('Target','')
        resolved=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(base,target))
        if resolved in aliases:
            rel.set('Target',('/'+aliases[resolved]) if target.startswith('/') else posixpath.relpath(aliases[resolved],base))
            changed=True
    if changed:blobs[name]=ET.tostring(tree,encoding='utf-8',xml_declaration=True)
ct_ns='http://schemas.openxmlformats.org/package/2006/content-types'
ET.register_namespace('',ct_ns)
ct=ET.fromstring(blobs['[Content_Types].xml']); changed=False
for item in list(ct):
    if item.attrib.get('PartName','').lstrip('/') in aliases:ct.remove(item);changed=True
if changed:blobs['[Content_Types].xml']=ET.tostring(ct,encoding='utf-8',xml_declaration=True)
before=file.stat().st_size
staged=file.with_name('candidate-media-deduplicated.pptx')
with zipfile.ZipFile(staged,'w',compression=zipfile.ZIP_DEFLATED) as out:
    for name,blob in blobs.items():
        if name not in aliases:out.writestr(info[name],blob)
with zipfile.ZipFile(staged) as check:assert check.testzip() is None
staged.replace(file)
print(f'Shared {len(aliases)} identical embedded images: {before} -> {file.stat().st_size} bytes')
