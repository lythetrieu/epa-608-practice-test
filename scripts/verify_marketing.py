#!/usr/bin/env python3
"""
Rule-based verifier for EPA 608 marketing pages.
ONE script checks EVERY page against the voice-guide rules (root-cause, not per-page patching).
Usage: python3 scripts/verify_marketing.py <dir-or-files...>
Exit 0 if all pass, 1 if any rule fails.
"""
import re, sys, os, glob

# Pages where an embedded sample-question / quiz block IS on-topic (rule 7).
QUIZ_OK = {
    'core.html', 'type-1.html', 'type-2.html', 'type-3.html', 'universal.html',
    'epa-608-practice-questions.html', 'practice-test-with-answers.html', 'review.html',
    'flashcards.html', 'tutor.html',
    'study-guide-core.html', 'study-guide-type-1.html', 'study-guide-type-2.html',
    'study-guide-type-3.html', 'study-guide-universal.html',
}
BIO_OK = {'about.html'}

# Compound hyphen words to flag (rule 6b). Refrigerant IDs (R-410A etc.) are NOT here.
HYPHEN_WORDS = [
    'step-by-step', 'closed-book', 'open-book', 'high-pressure', 'low-pressure',
    'small-appliance', 'system-dependent', 'first-attempt', 'wrong-answer',
    'multiple-section', 'mail-in', '5-pound', 'type-specific', 'three-tier',
    'self-contained', 'sub-atmospheric', 'in-person',
]

# Bank-size claims: must NEVER appear, in any context.
STRICT_BAD = [
    (r'\b866\b', '866 (bank size)'),
    (r'\b532\b', '532 (bank size)'),
    (r'200\+\s*(free\s*)?question', '200+ questions'),
    (r'500\s*(free|practice|verified)?\s*question', '500 questions (bank)'),
]
# Wrong exam/reg values: a page may legitimately cite these as the WRONG answer
# ("the older $37,500 is outdated, do not pick it"). Only fail when presented as
# correct, i.e. NOT near a wrong-flag word or a quiz-option letter on the same line.
CONTEXT_BAD = [
    (r'\$37,?500', '$37,500 penalty (should be $44,539)'),
    (r'Type I[^.]{0,40}\b10 questions', 'Type I = 10 questions'),
    (r'\b20 questions each', '20 questions each (II/III)'),
    (r'\b75 questions\b', '75 questions (Universal should be 100)'),
    (r'15% per year', '15%/yr leak (comfort should be 10%)'),
    (r'30% per year', '30%/yr leak (commercial should be 20%)'),
]
WRONG_FLAG = re.compile(
    r'outdated|wrong|incorrect|do not|don.t|not the|older?|avoid|mistake|trap|'
    r'\b[A-D]\)|instead of|rather than|no longer', re.I)

def strip_style(h):
    return re.sub(r'<style.*?</style>', ' ', h, flags=re.S | re.I)

def visible(h):
    h = re.sub(r'<(style|script)\b.*?</\1>', ' ', h, flags=re.S | re.I)
    return re.sub(r'<[^>]+>', ' ', h)

def check(path):
    name = os.path.basename(path)
    h = open(path, encoding='utf-8', errors='ignore').read()
    nostyle = strip_style(h)
    vis = visible(h)
    fails = []

    # rule 6a: no em/en dash in non-style content
    n = len(re.findall(r'[—–]', nostyle))
    if n: fails.append(f'{n} em/en-dash')

    # rule 6b: hyphenated compound words
    for w in HYPHEN_WORDS:
        if re.search(re.escape(w), vis, re.I):
            fails.append(f'hyphen-word "{w}"')

    # rule 5: no "Direct Answer" label
    if re.search(r'Direct Answer', h, re.I): fails.append('"Direct Answer" label')

    # rule 2: exactly one TL;DR, and no separate Quick Facts box alongside it
    tldr = len(re.findall(r'TL;DR', h))
    qf = len(re.findall(r'Quick Facts', h, re.I))
    if tldr == 0: fails.append('no TL;DR block')
    if tldr and qf: fails.append('both TL;DR and Quick Facts (should merge)')

    # rule 4: compact author CARD ok; long inline bio story is not (outside about.html)
    if name not in BIO_OK and re.search(r'my uncle|immigrant|career chang|our story|about the author', h, re.I):
        fails.append('long inline author bio (use the compact sidebar card instead)')

    # rule 5: external nofollow links capped at 3
    nf = len(re.findall(r'rel=["\']nofollow', h))
    if nf > 3: fails.append(f'{nf} nofollow links (>3)')

    # rule 7: off-topic embedded quiz/sample-question block
    if name not in QUIZ_OK:
        if re.search(r'data-quiz|Question 1 of|quiz-embed', h, re.I) or \
           re.search(r'sample question', vis, re.I):
            fails.append('off-topic sample-question/quiz block')

    # facts: bank-size claims are never allowed in any context
    for rx, lab in STRICT_BAD:
        if re.search(rx, vis, re.I): fails.append(f'BAD FACT: {lab}')
    # facts: wrong exam/reg values only fail when presented as CORRECT
    # (allowed when flagged as the wrong answer within a ~100-char window)
    for rx, lab in CONTEXT_BAD:
        for m in re.finditer(rx, vis, re.I):
            window = vis[max(0, m.start() - 100):m.end() + 100]
            if not WRONG_FLAG.search(window):
                fails.append(f'BAD FACT (as correct): {lab}')
                break

    return fails

def main():
    args = sys.argv[1:] or ['.']
    files = []
    for a in args:
        if os.path.isdir(a): files += glob.glob(os.path.join(a, '*.html'))
        else: files.append(a)
    files = sorted(set(files))
    bad = 0
    for f in files:
        fails = check(f)
        if fails:
            bad += 1
            print(f'FAIL  {os.path.basename(f)}')
            for x in fails: print(f'        - {x}')
        else:
            print(f'pass  {os.path.basename(f)}')
    print(f'\n{len(files)-bad}/{len(files)} pass')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
