"""Verify the delivered project snapshot using only Python's standard library."""
from pathlib import Path,PurePosixPath
import hashlib,sys

root=Path(__file__).resolve().parent
manifest=root/'MANIFEST.sha256'
if not manifest.exists():sys.exit('未找到MANIFEST.sha256；本脚本用于解压后的项目交接包。')
errors=[];count=0;declared=set()
for row in manifest.read_text(encoding='utf-8').splitlines():
    if not row.strip():continue
    digest,name=row.split('  ',1)
    rel=PurePosixPath(name)
    if rel.is_absolute() or '..' in rel.parts:sys.exit('不安全的清单路径：'+name)
    file=root.joinpath(*rel.parts);declared.add(name);count+=1
    if not file.is_file():errors.append('缺失：'+name)
    elif hashlib.sha256(file.read_bytes()).hexdigest()!=digest:errors.append('内容已变化：'+name)
if errors:
    print('\n'.join(errors));sys.exit(1)
print(f'通过：{count}个交接文件的SHA256均与清单一致。')
extra=[p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and p.relative_to(root).as_posix() not in declared and p.name!='MANIFEST.sha256']
if extra:print(f'另有{len(extra)}个清单之外的文件（如新构建或运行时缓存），未纳入此次快照校验。')
