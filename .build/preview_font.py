from pathlib import Path
import os
from PIL import ImageFont

def preview_font(size=20):
    paths=[os.environ.get('PPT_PREVIEW_FONT'),str(Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts/arial.ttf'),'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/System/Library/Fonts/Supplemental/Arial.ttf']
    for p in paths:
        if p and Path(p).is_file():return ImageFont.truetype(p,size)
    return ImageFont.load_default(size=size)
