"""Build the site's small, renamed OFL font from the vendored upstream font.

Run with: uv run --with 'fonttools[woff]' python scripts/subset-font.py
Re-run after changing visible copy. Missing glyphs fall back to the system font.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
upstream = root / 'assets/pretendard-variable.woff2'
output = root / 'assets/lotto-sans.woff2'
text = ''.join(path.read_text() for extension in ('*.html', '*.js', '*.css') for path in sorted(root.glob(extension)))
codepoints = set(map(ord, text)) | set(range(32, 127))
font = TTFont(upstream)
supported = set(font.getBestCmap())
options = subset.Options()
options.flavor = 'woff2'
options.recalc_timestamp = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=codepoints)
subsetter.subset(font)
# The original has Reserved Font Names; the derivative gets its own internal names.
names = {1: 'Lotto Sans', 2: 'Regular', 3: 'Lotto Sans Subset 1', 4: 'Lotto Sans', 6: 'LottoSans', 16: 'Lotto Sans', 17: 'Regular', 25: 'LottoSans'}
for record in font['name'].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
font.save(output)
rebuilt = TTFont(output)
missing = (codepoints & supported) - set(rebuilt.getBestCmap())
assert not missing, f'Missing rendered glyphs: {missing}'
assert 'fvar' in rebuilt, 'Preserve variable font weights'
print(f'{len(codepoints & supported)} glyphs: {upstream.stat().st_size:,} -> {output.stat().st_size:,} bytes')
