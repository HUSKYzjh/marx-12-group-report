"""Generate bakery-themed, deterministic SVG QR artwork. Requires qrcode>=8."""
from pathlib import Path
import json
import qrcode

ROOT = Path(__file__).resolve().parents[1] / '分享'
URL = 'https://zjh-d0ginayd0c9cbf350-1345006689.tcloudbaseapp.com/'
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=0)
qr.add_data(URL)
qr.make(fit=True)
matrix = qr.get_matrix()
n = len(matrix)
u = 13
size = n * u
origin = (1000 - size) / 2
top = 220
paper = '#fcfaf3'
ink = '#45483f'

def rect(x, y, w, h, fill, radius=0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}"/>'

def bread(x, y, w):
    return f'''<g transform="translate({x} {y}) scale({w/100})">
    <path d="M4 62 C4 30 22 14 49 14 C78 13 96 33 96 62 Q96 76 81 77 L19 77 Q4 77 4 62Z" fill="#d7b66e" stroke="{ink}" stroke-width="5"/>
    <path d="M28 31 L36 48 M47 25 L55 44 M68 30 L76 48" fill="none" stroke="{ink}" stroke-width="4" stroke-linecap="round"/></g>'''

def finder(x, y, mode):
    x, y = origin+x*u, top+y*u
    # The 7:5:3 nested finder geometry is retained; only the corner silhouette changes.
    if mode == '面包烙印':
        return (rect(x,y,7*u,7*u,ink,1.5*u)
            + rect(x+u,y+u,5*u,5*u,paper,.9*u)
            + rect(x+2*u,y+2*u,3*u,3*u,ink,.65*u)
            + f'<path d="M{x+2.8*u} {y+2.6*u} l{.35*u} {.55*u} M{x+3.8*u} {y+2.6*u} l{.35*u} {.55*u}" stroke="{paper}" stroke-width="2.8" stroke-linecap="round"/>')
    return (rect(x,y,7*u,7*u,'#795e31',.65*u)
        + rect(x+u,y+u,5*u,5*u,paper,.45*u)
        + rect(x+2*u,y+2*u,3*u,3*u,ink,.25*u))

def make(mode):
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1080" viewBox="0 0 1000 1080"><title>饥馑的盛宴 · {mode}二维码</title>',
        rect(0,0,1000,1080,paper)]
    if mode == '面包烙印':
        s += ['<path d="M75 347 Q62 81 237 56 Q500 -5 763 56 Q938 81 925 347 L925 905 Q929 946 886 950 L114 950 Q71 946 75 905 Z" fill="#e8cf95" stroke="#595a4b" stroke-width="4"/>',
            f'<path d="M94 344 Q78 101 246 77 Q500 18 754 77 Q922 101 906 344 L906 906 Q908 930 884 931 L116 931 Q92 930 94 906Z" fill="{paper}" stroke="#a98c55" stroke-width="1.5"/>',
            '<path d="M360 110 l20 32 M485 92 l20 35 M612 108 l20 33" fill="none" stroke="#b49a62" stroke-width="4" stroke-linecap="round"/>']
    else:
        s += ['<path d="M78 62 L916 54 L930 929 L82 945Z" fill="none" stroke="#636658" stroke-width="3"/>',
            '<path d="M91 76 L904 69 M101 914 L906 900" fill="none" stroke="#b6b8a8" stroke-width="1.4"/>']
        # Banknote-like engraving remains well outside the QR quiet zone.
        for y in range(116,887,16):
            s += [f'<path d="M96 {y} q14 -11 26 0 M878 {y} q14 11 26 0" fill="none" stroke="#b1a47d" stroke-width="1.1"/>']
    qr_start = len(s)
    for y, row in enumerate(matrix):
        for x, dark in enumerate(row):
            if not dark or ((x<7 and y<7) or (x>=n-7 and y<7) or (x<7 and y>=n-7)):
                continue
            # Small center medallion uses a local portion of H error correction.
            if abs(x-(n-1)/2)<=3.5 and abs(y-(n-1)/2)<=3.5:
                continue
            px, py = origin+x*u, top+y*u
            if mode == '面包烙印':
                color = '#796035' if ((x*17+y*13)%31<3) else ink
                s.append(rect(px+.4,py+.4,u-.8,u-.8,color,3.7))
                # Join neighboring modules into carved, flowing islands.
                if x+1<n and matrix[y][x+1] and not (abs(x+1-(n-1)/2)<=3.5 and abs(y-(n-1)/2)<=3.5):
                    s.append(rect(px+u-4,py+3.4,8,u-6.8,color,1))
                if y+1<n and matrix[y+1][x] and not (abs(x-(n-1)/2)<=3.5 and abs(y+1-(n-1)/2)<=3.5):
                    s.append(rect(px+3.4,py+u-4,u-6.8,8,color,1))
            else:
                color = '#7a6134' if ((x+y)%7==0) else ink
                alignment = any(abs(x-a)<=2 and abs(y-b)<=2 for a in qrcode.util.pattern_position(qr.version) for b in qrcode.util.pattern_position(qr.version))
                if x==6 or y==6 or alignment:
                    s.append(rect(px,py,u,u,color,1))
                else:
                    s.append(rect(px+.25,py+.25,u-.5,u-.5,color,u*.43))
    for x,y in [(0,0),(n-7,0),(0,n-7)]:
        s.append(finder(x,y,mode))
    cx, cy = 500, top+size/2
    s.append(rect(cx-4.15*u,cy-4.15*u,8.3*u,8.3*u,paper,20))
    if mode == '面包烙印':
        s.append(bread(cx-49,cy-41,98))
        s.append(f'<path d="M{cx-20} {cy-39} q-8 -10 -2 -18 M{cx+4} {cy-40} q-8 -10 -2 -18" fill="none" stroke="#8c8e7d" stroke-width="2.5" stroke-linecap="round"/>')
    else:
        s += [f'<circle cx="{cx}" cy="{cy}" r="47" fill="#dbc178" stroke="{ink}" stroke-width="3"/><circle cx="{cx}" cy="{cy}" r="38" fill="none" stroke="#968149" stroke-width="1.6"/>',bread(cx-33,cy-29,66)]
    if mode == '面包烙印':
        quiet = 4*u
        span = size+2*quiet
        core = f'<svg xmlns="http://www.w3.org/2000/svg" width="{span}" height="{span}" viewBox="{origin-quiet} {top-quiet} {span} {span}"><title>饥馑的盛宴 · 群像版码芯</title>'
        core += ''.join(s[qr_start:]) + '</svg>'
        (ROOT/'试玩二维码-群像码芯.svg').write_text(core,encoding='utf-8')
    # Caption is outside the full four-module quiet zone.
    s += [f'<text x="500" y="1014" text-anchor="middle" font-family="KaiTi,serif" font-size="42" fill="{ink}" letter-spacing="5">饥馑的盛宴</text>',
        '<text x="500" y="1054" text-anchor="middle" font-family="KaiTi,serif" font-size="21" fill="#7e806e" letter-spacing="4">扫码 · 从一车面包开始</text></svg>']
    (ROOT/f'试玩二维码-{mode}.svg').write_text(''.join(s),encoding='utf-8')

for mode in ['面包烙印','金币票据']:
    make(mode)
(ROOT/'艺术二维码制作参数.json').write_text(json.dumps({
    'url':URL,'date':'2026-10-16','method':'Deterministic QR matrix + native SVG bakery motifs; no raster editing or AI-generated QR modules.',
    'library':'qrcode 8.2','error_correction':'H','data_modules':n,'module_px':u,
    'quiet_zone_modules':4,'center_medallion_modules':8.3,
    'finder_geometry':'7:5:3 nested shapes, rounded corners; decorative internal slits',
    'variants':['面包烙印','金币票据'],
    'note':'H is nominal codeword-level recovery, not permission to obscure 30% of the area. Scan validation is separate.'
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Wrote two native SVG artworks, {n}x{n} modules; central art and modified finder details require decode checks.')
