import os, re

DIR = '/Users/trieu/Desktop/epa-608-practice-test-main'
SKIP = {'header.html', 'footer.html', 'favicon.html', 'tracking.html',
        'google68ec010432371dbf.html', 'build.py', 'fix_nav.py',
        'refactor_header.py', 'reset_footer.py'}

# Match the full footer block
FOOTER_PATTERN = re.compile(r'<!-- Footer -->\s*<footer>.*?</footer>', re.DOTALL)
PLACEHOLDER = '<div id="footer-placeholder"></div>'

fixed = 0
for fname in sorted(os.listdir(DIR)):
    if not fname.endswith('.html') or fname in SKIP:
        continue
    fpath = os.path.join(DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    if PLACEHOLDER in content and '<footer>' not in content:
        continue  # already placeholder
    if '<footer>' not in content:
        continue
    new_content = FOOTER_PATTERN.sub(PLACEHOLDER, content)
    if new_content != content:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        fixed += 1
        print(f'  reset ✓ {fname}')
print(f'Reset: {fixed} pages')
