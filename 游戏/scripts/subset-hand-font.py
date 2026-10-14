"""Compatibility entry point; the workshop now preserves the complete font.

Text-driven subsetting silently lost glyphs when new chapters were added.
"""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name("prepare-hand-font.py")), run_name="__main__")
