#!/usr/bin/env python3
"""
Refactor all HTML pages: replace inline <header> with <div id="header-placeholder"></div>
- Removes inline <header>...</header>
- Removes the auth JS block that follows (localStorage/Supabase token check)
- Removes the dropdown hover JS block that follows
- Strips nav/header CSS from inline <style> blocks (lines matching nav selectors)
- Adds <link rel="stylesheet" href="/site.css"> to <head> if missing
"""

import os
import re

DIR = '/Users/trieu/Desktop/epa-608-practice-test-main'
SKIP = {
    'header.html', 'footer.html', 'favicon.html', 'tracking.html',
    'google68ec010432371dbf.html', 'checkout.html', 'refactor_header.py'
}

PLACEHOLDER = '<div id="header-placeholder"></div>'
SITE_CSS_LINK = '    <link rel="stylesheet" href="/site.css">'

# ── 1. Remove <header>...</header> block ────────────────────────────────────
HEADER_BLOCK_RE = re.compile(r'<header>.*?</header>', re.DOTALL)

# ── 2. Remove auth JS (Supabase localStorage token check) ──────────────────
# Matches: <script>\n(function() {\n    var KEY = '...'\n    ...\n})();\n</script>
AUTH_JS_RE = re.compile(
    r'<script>\s*\(function\(\)\s*\{[^{]*var KEY\s*=\s*[\'"][^\'"]*[\'"].*?\}\)\(\);?\s*</script>',
    re.DOTALL
)

# ── 3. Remove dropdown hover JS ─────────────────────────────────────────────
# Matches: <script>\n(function(){\n    var timers={};\n    ...\n})();\n</script>
DROPDOWN_JS_RE = re.compile(
    r'<script>\s*\(function\(\)\{[^{]*var timers=\{\};.*?\}\)\(\);?\s*</script>',
    re.DOTALL
)

# ── 4. CSS selector prefixes to strip (line-by-line approach) ───────────────
NAV_CSS_LINE_PATTERNS = [
    re.compile(r'^\s*header\s*\{'),
    re.compile(r'^\s*\.header-content\s*[\{,]'),
    re.compile(r'^\s*\.logo\s*[\{,]'),
    re.compile(r'^\s*\.logo\s+img\s*[\{,]'),
    re.compile(r'^\s*nav\s*\{'),
    re.compile(r'^\s*\.nav-menu'),
    re.compile(r'^\s*\.dropdown'),
    re.compile(r'^\s*\.nav-cta'),
    re.compile(r'^\s*\.nav-signin'),
    re.compile(r'^\s*\.nav-signup'),
    re.compile(r'^\s*\.nav-dashboard'),
    re.compile(r'^\s*\.nav-pricing'),
    # Comments about these sections
    re.compile(r'^\s*/\*\s*(Header|Nav|Dropdown|CTA|Auth)', re.IGNORECASE),
]

# These are properties that only appear in nav CSS, used to detect continuation lines
NAV_CSS_PROPS = re.compile(
    r'white-space:\s*nowrap.*flex-shrink|'
    r'content:\s*"▾"|'
    r'transform:\s*rotate\(180deg\)',
    re.DOTALL
)

def strip_nav_css_from_style(style_content):
    """
    Remove nav/header CSS lines from a style block content (between <style> tags).
    Uses line-by-line removal: skip lines that belong to nav/header selectors.
    """
    lines = style_content.split('\n')
    result = []
    in_nav_block = False
    brace_depth = 0

    for line in lines:
        stripped = line.strip()

        # Check if this line starts a nav CSS block
        is_nav_start = any(p.match(line) for p in NAV_CSS_LINE_PATTERNS)

        if is_nav_start and not in_nav_block:
            in_nav_block = True
            brace_depth = stripped.count('{') - stripped.count('}')
            if brace_depth <= 0:
                in_nav_block = False
            continue  # skip this line

        if in_nav_block:
            brace_depth += stripped.count('{') - stripped.count('}')
            if brace_depth <= 0:
                in_nav_block = False
            continue  # skip lines inside nav block

        result.append(line)

    return '\n'.join(result)


def strip_nav_media_lines(style_content):
    """
    Within @media blocks, remove lines referencing nav selectors.
    This handles the condensed single-line nav CSS in media queries.
    """
    lines = style_content.split('\n')
    result = []
    for line in lines:
        # Skip lines in @media that reference nav-specific classes
        if re.search(r'\.nav-|\.dropdown|\.header-content|\.logo\s+img', line):
            continue
        result.append(line)
    return '\n'.join(result)


def process_style_blocks(content):
    """Process all <style>...</style> blocks to remove nav CSS."""
    def replace_style(m):
        inner = m.group(1)
        inner = strip_nav_css_from_style(inner)
        inner = strip_nav_media_lines(inner)
        # Clean up excessive blank lines
        inner = re.sub(r'\n{3,}', '\n\n', inner)
        return '<style>' + inner + '</style>'

    return re.sub(r'<style>(.*?)</style>', replace_style, content, flags=re.DOTALL)


def process_file(fpath, fname):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Skip if already refactored
    if PLACEHOLDER in content and '<header>' not in content:
        print(f'  SKIP (already done): {fname}')
        return False

    # Skip if no header tag
    if '<header>' not in content:
        print(f'  SKIP (no <header>): {fname}')
        return False

    # Step 1: Replace <header>...</header> with placeholder
    content = HEADER_BLOCK_RE.sub(PLACEHOLDER, content)

    # Step 2: Remove auth JS block
    content = AUTH_JS_RE.sub('', content)

    # Step 3: Remove dropdown hover JS block
    content = DROPDOWN_JS_RE.sub('', content)

    # Step 4: Strip nav/header CSS from <style> blocks
    content = process_style_blocks(content)

    # Step 5: Add site.css link if missing
    if '/site.css' not in content and '</head>' in content:
        content = content.replace('</head>', SITE_CSS_LINK + '\n</head>')

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


fixed = 0
skipped = 0

print(f'Processing HTML files in: {DIR}\n')

for fname in sorted(os.listdir(DIR)):
    if fname in SKIP:
        continue
    if not fname.endswith('.html'):
        continue
    fpath = os.path.join(DIR, fname)
    result = process_file(fpath, fname)
    if result:
        fixed += 1
        print(f'  FIXED: {fname}')
    else:
        skipped += 1

print(f'\n{"="*50}')
print(f'Files fixed:   {fixed}')
print(f'Files skipped: {skipped}')
