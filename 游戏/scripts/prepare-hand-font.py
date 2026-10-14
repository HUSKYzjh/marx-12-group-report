"""Convert the pinned OFL font without dropping any upstream character mappings.

Run once when updating the bundled font. Uses project-local fontTools if present;
normal game builds use the checked-in binary and coverage map, not Python.
"""
from hashlib import sha256
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tmp/font-tools"))
from fontTools import __version__
from fontTools.ttLib import TTFont
from fontTools.ttLib import woff2

# Full CJK outlines are large. Moderate Brotli quality avoids minutes of
# maximum-compression work; this changes packaging, not characters or outlines.
compress = woff2.brotli.compress
woff2.brotli.compress = lambda data, **options: compress(data, quality=8, **options)

SOURCE = ROOT / "tmp/font-download/LXGWWenKaiGBScreen.ttf"
EXPECTED = "23ec023913e1851925eb94462c4b0ccd1d78bb89533745aaa8cc682ccd339dc0"
URL = "https://github.com/lxgw/LxgwWenKai-Screen/releases/download/v1.522/LXGWWenKaiGBScreen.ttf"
assert sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED, "Unexpected upstream font"
font = TTFont(SOURCE, recalcTimestamp=False)
original = font.getBestCmap()
# Conversion/renaming retains the original outlines, mappings and attribution.
names = {1: "Workshop Hand", 2: "Regular", 3: "WorkshopHand-Regular-1.522-full",
         4: "Workshop Hand Regular", 6: "WorkshopHand-Regular",
         16: "Workshop Hand", 17: "Regular"}
for entry in font["name"].names:
    if entry.nameID in names:
        entry.string = names[entry.nameID].encode(entry.getEncoding())
font.flavor = "woff2"
destination = ROOT / "public/assets/fonts/workshop-hand.woff2"
font.save(destination)
verified = TTFont(destination)
assert verified.getBestCmap() == original, "Conversion changed character mappings"
digest = sha256(destination.read_bytes()).hexdigest()
ranges = []
for code in sorted(original):
    if ranges and code == ranges[-1][1] + 1:
        ranges[-1][1] = code
    else:
        ranges.append([code, code])
manifest = {"family": "Workshop Hand", "css_family": "WorkshopHand", "license": "OFL-1.1",
            "upstream": URL, "upstream_sha256": EXPECTED, "upstream_version": "1.522",
            "modified": "Renamed and WOFF2 conversion; all upstream character mappings and glyph outlines retained.",
            "generator": f"fontTools {__version__}; Brotli quality 8", "codepoints": len(original),
            "bytes": destination.stat().st_size, "sha256": digest}
coverage = {"sha256": digest, "codepoints": len(original), "ranges": ranges}
for name, data in [("provenance.json", manifest), ("coverage.json", coverage)]:
    (destination.parent / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(destination.parent / "OFL.txt").write_bytes((SOURCE.parent / "WenKai-OFL.txt").read_bytes())
print(json.dumps(manifest, ensure_ascii=True))
