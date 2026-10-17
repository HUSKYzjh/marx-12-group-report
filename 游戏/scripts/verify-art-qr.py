"""Decode the final PNGs at their intended sharing sizes. Requires Pillow, zxing-cpp."""
from pathlib import Path
import hashlib
import json
from PIL import Image
import zxingcpp

root = Path(__file__).resolve().parents[1] / '分享'
url = 'https://zjh-d0ginayd0c9cbf350-1345006689.tcloudbaseapp.com/'
results = []
for name in ['面包烙印', '金币票据']:
    path = root / f'试玩二维码-{name}.png'
    source = Image.open(path).convert('RGB')
    for width in [1000, 500, 360, 280]:
        image = source.resize((width, round(width * source.height / source.width)), Image.Resampling.BICUBIC)
        result = zxingcpp.read_barcode(image)
        results.append({
            'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'width': image.width, 'height': image.height,
            'decoded_url': result.text if result else None,
            'passed': bool(result and result.valid and result.text == url)
        })
report = {'date': '2026-10-16', 'decoder': 'zxing-cpp 3.1.1',
    'resampling': 'Pillow BICUBIC', 'results': results,
    'limitation': '软件解码检查；未进行实体手机或微信扫一扫实测。'}
(root/'艺术二维码扫码校验.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
assert all(row['passed'] for row in results), 'At least one QR failed decoding; inspect the report.'
print(f'Passed {len(results)} decode checks; every result matches the live game URL.')
