import os
import re

DIR = '/Users/trieu/Desktop/epa-608-practice-test-main'

# Old nav-menu block to find (simplified regex anchor)
OLD_NAV = '''            <ul class="nav-menu">
                <!-- Practice Tests dropdown -->
                <li class="dropdown">
                    <button class="dropdown-toggle">Practice Tests</button>
                    <ul class="dropdown-menu">
                        <div class="dropdown-menu-inner">
                        <li class="menu-label">Choose Exam Type</li>
                        <li><a href="/universal.html">🎓 Universal — All Sections</a></li>
                        <li class="divider"></li>
                        <li><a href="/core.html">📝 Core — Regulations</a></li>
                        <li><a href="/type-1.html">❄️ Type I — Small Appliances</a></li>
                        <li><a href="/type-2.html">🔧 Type II — High Pressure</a></li>
                        <li><a href="/type-3.html">🏭 Type III — Low Pressure</a></li>
                        </div>
                    </ul>
                </li>

                <!-- Study Tools dropdown -->
                <li class="dropdown">
                    <button class="dropdown-toggle">Study Tools</button>
                    <ul class="dropdown-menu">
                        <div class="dropdown-menu-inner">
                        <li class="menu-label">Learn Smarter</li>
                        <li><a href="/tutor.html">🤖 AI Tutor</a></li>
                        <li><a href="/flashcards.html">🃏 Flashcards</a></li>
                        <li><a href="/weak-spots.html">🎯 Weak Spots</a></li>
                        </div>
                    </ul>
                </li>

                <!-- My Progress -->
                <li><a href="/progress.html">My Progress</a></li>

                <!-- Pricing -->
                <li><a href="/pricing.html">Pricing</a></li>
            </ul>'''

NEW_NAV = '''            <ul class="nav-menu">
                <li class="dropdown">
                    <button class="dropdown-toggle">Practice Tests</button>
                    <ul class="dropdown-menu">
                        <div class="dropdown-menu-inner">
                        <li><a href="/universal.html">Universal — All Sections</a></li>
                        <li class="divider"></li>
                        <li><a href="/core.html">Core — Regulations</a></li>
                        <li><a href="/type-1.html">Type I — Small Appliances</a></li>
                        <li><a href="/type-2.html">Type II — High Pressure</a></li>
                        <li><a href="/type-3.html">Type III — Low Pressure</a></li>
                        </div>
                    </ul>
                </li>
                <li><a href="/progress.html">My Progress</a></li>
                <li><a href="/history.html">History</a></li>
                <li><a href="/pricing.html" class="nav-pricing">Pricing</a></li>
            </ul>'''

OLD_AUTH = '''        <!-- Auth / CTA buttons -->
        <div id="nav-auth-area" style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <!-- Default: not logged in -->
            <a href="https://epa608practicetest.net/login" class="nav-signin" id="nav-btn-signin">Sign In</a>
            <a href="https://epa608practicetest.net/signup" class="nav-signup" id="nav-btn-signup">Sign Up Free</a>
            <a href="/pricing.html" class="nav-cta" id="nav-btn-gopro">⚡ Go Pro</a>
            <!-- Logged-in state (hidden by default, shown by JS) -->
            <a href="https://epa608practicetest.net/dashboard" class="nav-dashboard" id="nav-btn-dashboard" style="display:none;">Dashboard →</a>
        </div>'''

NEW_AUTH = '''        <div id="nav-auth-area" style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <a href="https://epa608practicetest.net/login" class="nav-signin" id="nav-btn-signin">Sign In</a>
            <a href="https://epa608practicetest.net/signup" class="nav-signup" id="nav-btn-signup">Sign Up</a>
            <a href="https://epa608practicetest.net/dashboard" class="nav-dashboard" id="nav-btn-dashboard" style="display:none;">Dashboard →</a>
        </div>'''

OLD_JS_GOPRO = "        document.getElementById('nav-btn-gopro').style.display = 'none';\n"
NEW_JS_GOPRO = ""

fixed = 0
skipped = 0

for fname in os.listdir(DIR):
    if not fname.endswith('.html'):
        continue
    fpath = os.path.join(DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_NAV not in content:
        skipped += 1
        continue

    new_content = content
    new_content = new_content.replace(OLD_NAV, NEW_NAV)
    new_content = new_content.replace(OLD_AUTH, NEW_AUTH)
    new_content = new_content.replace(OLD_JS_GOPRO, NEW_JS_GOPRO)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    fixed += 1
    print(f'FIXED: {fname}')

print(f'\nDone: {fixed} fixed, {skipped} skipped (no standard nav)')
