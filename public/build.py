#!/usr/bin/env python3
"""
Build script: injects header.html and footer.html into all pages at build time.
Run before every deploy: python3 build.py
Single source of truth: edit header.html or footer.html only.

Marker strategy:
  <!-- HEADER:START --> ... <!-- HEADER:END -->   ← replaced every run
  <!-- FOOTER:START --> ... <!-- FOOTER:END -->   ← replaced every run

Migration: pages with old placeholder or old baked-in header (starts with <!-- Favicon -->)
are automatically upgraded to use markers on first run.
"""
import os, re

DIR = os.path.dirname(os.path.abspath(__file__))
HEADER_FILE = os.path.join(DIR, 'header.html')
FOOTER_FILE  = os.path.join(DIR, 'footer.html')
SKIP = {
    'header.html', 'footer.html', 'favicon.html', 'tracking.html',
    'google68ec010432371dbf.html', 'build.py', 'fix_nav.py',
    'refactor_header.py', 'reset_footer.py',
}

with open(HEADER_FILE, 'r', encoding='utf-8') as f:
    HEADER = f.read().strip()

with open(FOOTER_FILE,  'r', encoding='utf-8') as f:
    FOOTER = f.read().strip()

H_START = '<!-- HEADER:START -->'
H_END   = '<!-- HEADER:END -->'
F_START = '<!-- FOOTER:START -->'
F_END   = '<!-- FOOTER:END -->'

# ── Old placeholder fallback (first run after switching strategy) ──
OLD_H_PLACEHOLDER = '<div id="header-placeholder"></div>'
OLD_F_PLACEHOLDER = '<div id="footer-placeholder"></div>'

def inject_header(content):
    """Replace or migrate header block. Returns new content or None if unchanged."""

    # 1. New marker approach
    if H_START in content and H_END in content:
        new = re.sub(
            re.escape(H_START) + r'.*?' + re.escape(H_END),
            H_START + '\n' + HEADER + '\n' + H_END,
            content, flags=re.DOTALL
        )
        return new if new != content else None

    # 2. Old placeholder → upgrade to markers
    if OLD_H_PLACEHOLDER in content:
        new = content.replace(
            OLD_H_PLACEHOLDER,
            H_START + '\n' + HEADER + '\n' + H_END
        )
        return new

    # 3. Old baked-in header (starts with <!-- Favicon --> in <body>)
    #    Wrap from <!-- Favicon --> to the closing </script> of the header block.
    #    The header block ends just before the first <section, <main, <div class="about,
    #    or <!-- ═ (content separator comment).
    body_start = content.find('<body>')
    if body_start == -1:
        return None
    favicon_pos = content.find('<!-- Favicon -->', body_start)
    if favicon_pos == -1:
        return None

    # Find where the header block ends — after </header> plus its inline scripts
    header_close = content.find('</header>', favicon_pos)
    if header_close == -1:
        return None

    # Walk forward past any <script> blocks that follow </header>
    pos = header_close + len('</header>')
    while True:
        # skip whitespace
        stripped = content[pos:].lstrip()
        if stripped.startswith('<script'):
            script_end = content.find('</script>', pos)
            if script_end == -1:
                break
            pos = script_end + len('</script>')
        else:
            break

    # Include any trailing newline
    if pos < len(content) and content[pos] == '\n':
        pos += 1

    old_block = content[favicon_pos:pos]
    new = content[:favicon_pos] + H_START + '\n' + HEADER + '\n' + H_END + '\n' + content[pos:]
    return new if new != content else None


def inject_footer(content):
    """Replace or migrate footer block."""

    if F_START in content and F_END in content:
        new = re.sub(
            re.escape(F_START) + r'.*?' + re.escape(F_END),
            F_START + '\n' + FOOTER + '\n' + F_END,
            content, flags=re.DOTALL
        )
        return new if new != content else None

    if OLD_F_PLACEHOLDER in content:
        new = content.replace(
            OLD_F_PLACEHOLDER,
            F_START + '\n' + FOOTER + '\n' + F_END
        )
        return new

    return None


h_fixed = h_skip = 0
f_fixed = 0

for fname in sorted(os.listdir(DIR)):
    if not fname.endswith('.html') or fname in SKIP:
        continue
    fpath = os.path.join(DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False

    new_content = inject_header(content)
    if new_content is not None:
        content = new_content
        changed = True
        h_fixed += 1
        print(f'  header ✓ {fname}')
    else:
        h_skip += 1

    new_content = inject_footer(content)
    if new_content is not None:
        content = new_content
        changed = True
        f_fixed += 1
        print(f'  footer ✓ {fname}')

    if changed:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)

print(f'\nHeader: {h_fixed} pages updated, {h_skip} skipped')
print(f'Footer: {f_fixed} pages updated')
