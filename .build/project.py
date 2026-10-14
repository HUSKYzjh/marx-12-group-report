"""Locate the installed Codex runtime and build/review/deliver this project."""
from pathlib import Path
import argparse,json,os,re,shutil,subprocess,sys
from datetime import datetime

ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/'.build'
config_file=ROOT/'runtime.local.json'
config=json.loads(config_file.read_text(encoding='utf-8-sig')) if config_file.exists() else {}

def configured(value):
    if not value:return None
    p=Path(value).expanduser()
    return p if p.is_absolute() else ROOT/p

deps=configured(os.environ.get('PPT_DEPENDENCIES_DIR') or config.get('dependencies')) or Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies'
candidates=[configured(os.environ.get('PPT_NODE') or config.get('node')),deps/'node/bin/node.exe',deps/'node/bin/node',configured(shutil.which('node'))]
node=next((p for p in candidates if p and p.is_file()),None)
if not node:sys.exit('未找到Node.js。请在runtime.local.json中填写node和dependencies路径。')

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('command',choices=['doctor','build','deliver'])
parser.add_argument('--revision',help='新构建编号，如d9或handoff-check')
args=parser.parse_args()
info=subprocess.run([str(node),str(BUILD/'project-runtime.mjs')],cwd=ROOT,check=True,text=True,encoding='utf-8',capture_output=True)
runtime=json.loads(info.stdout)
python=runtime['python']
if args.command=='doctor':
    print(json.dumps(runtime,ensure_ascii=False,indent=2))
    subprocess.run([python,'-c','import PIL; print("Pillow", PIL.__version__)'],check=True)
    sys.exit(0)
if not args.revision or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,48}',args.revision):
    parser.error('--revision必须是1—49位字母、数字、连字符或下划线。')
folder=BUILD/('roman-structure-'+args.revision)
if args.command=='build':
    if folder.exists():sys.exit('该构建编号已存在；请换一个编号，保留已有构建。')
    subprocess.run([str(node),str(BUILD/'dense-layout.mjs'),'--revision='+args.revision],cwd=ROOT,check=True)
    subprocess.run([python,'-X','utf8',str(BUILD/'review-dense.py'),args.revision],cwd=ROOT,check=True)
    print('构建与结构检查完成。查看 '+str(folder/'预览')+'，记录实际视觉检查结果后再运行deliver。')
else:
    if not (folder/'visual-review.json').exists():sys.exit('尚无视觉检查记录。请先查看预览，并按README记录实际检查结果。')
    review=json.loads((folder/'visual-review.json').read_text(encoding='utf-8'))
    audit=json.loads((folder/'audit.json').read_text(encoding='utf-8'))
    if not review.get('passed') or review.get('sha256')!=audit.get('sha256'):sys.exit('视觉检查记录未通过，或与本次构建不对应。')
    backup=ROOT/'制作'/('交付前-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    backup.mkdir(parents=True)
    for p in list((ROOT/'成品').glob('*.pptx'))+[ROOT/n for n in ['内容与来源.json','共用讲稿.md','汇报提纲-每页一个重点.md','逐页内容方案.md','论证逻辑与章节衔接.md']]:
        if p.is_file():shutil.copy2(p,backup/p.name)
    subprocess.run([python,'-X','utf8',str(BUILD/'deliver-dense.py'),args.revision],cwd=ROOT,check=True)
