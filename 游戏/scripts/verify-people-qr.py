"""Check the final illustrated QR, including its characters and lettering."""
from pathlib import Path
import hashlib
import json
from PIL import Image
import zxingcpp

root=Path(__file__).resolve().parents[1]/'分享'
files=['试玩二维码-群像居中修正版.png','试玩二维码-面包工坊群像.png']
url='https://zjh-d0ginayd0c9cbf350-1345006689.tcloudbaseapp.com/'
results=[]
for name in files:
    path=root/name
    source=Image.open(path).convert('RGB')
    for width in [1440,720,540,360,324]:
        image=source.resize((width,round(width*source.height/source.width)),Image.Resampling.BICUBIC)
        result=zxingcpp.read_barcode(image)
        results.append({'file':path.name,'width':image.width,'height':image.height,
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'decoded_url':result.text if result else None,
            'passed':bool(result and result.valid and result.text==url)})
report={'date':'2026-10-16','decoder':'zxing-cpp 3.1.1',
    'resampling':'Pillow BICUBIC','results':results,
    'limitation':'软件解码检查；未进行实体手机或微信扫一扫实测。'}
(root/'群像二维码扫码校验.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert all(row['passed'] for row in results), 'Some sizes failed decoding; inspect the report.'
print(f'Passed all {len(results)} illustrated QR decode checks.')
