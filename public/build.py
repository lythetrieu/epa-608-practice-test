#!/usr/bin/env python3
"""
Build script: injects header.html and footer.html into all pages at build time.
Run before every deploy: python3 build.py
Single source of truth: edit header.html or footer.html only.
"""
import os, re

DIR = os.path.dirname(os.path.abspath(__file__))
HEADER_FILE = os.path.join(DIR, 'header.html')
FOOTER_FILE = os.path.join(DIR, 'footer.html')
SKIP = {'header.html', 'footer.html', 'favicon.html', 'tracking.html',
        'google68ec010432371dbf.html', 'build.py', 'fix_nav.py', 'refactor_header.py',
        'reset_footer.py'}

# Read the header content
with open(HEADER_FILE, 'r', encoding='utf-8') as f:
    header_content = f.read().strip()

fixed = 0
skipped = 0

for fname in sorted(os.listdir(DIR)):
    if not fname.endswith('.html') or fname in SKIP:
        continue
    fpath = os.path.join(DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    if '<div id="header-placeholder"></div>' not in content:
        skipped += 1
        continue

    # Replace placeholder with full header content
    new_content = content.replace(
        '<div id="header-placeholder"></div>',
        header_content
    )

    if new_content != content:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        fixed += 1
        print(f'  header ✓ {fname}')

print(f'\nHeader: {fixed} pages updated, {skipped} skipped (no placeholder)')

# Also inject footer
with open(FOOTER_FILE, 'r', encoding='utf-8') as f:
    footer_content = f.read().strip()

footer_fixed = 0
for fname in sorted(os.listdir(DIR)):
    if not fname.endswith('.html') or fname in SKIP:
        continue
    fpath = os.path.join(DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    if '<div id="footer-placeholder"></div>' not in content:
        continue
    new_content = content.replace('<div id="footer-placeholder"></div>', footer_content)
    if new_content != content:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        footer_fixed += 1
        print(f'  footer ✓ {fname}')

print(f'Footer: {footer_fixed} pages updated')
