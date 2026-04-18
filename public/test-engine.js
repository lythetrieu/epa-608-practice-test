/**
 * EPA 608 Practice Test Engine (Free Demo)
 * - 10 questions per test
 * - 3 attempts per day per category
 * - Fisher-Yates shuffle for questions + options
 * - No explanations (signup CTA instead)
 * - Questions fetched from Supabase (866 questions), fallback to questions.json
 */

var SUPABASE_URL = 'https://sequvmxgtmbirnixeril.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_n0BnJRIVt7eVtekR-B0FnA_7NtQA4g_';

function fetchFromSupabase(category) {
    var select = 'id,category,question,options,answer_text';
    var base = SUPABASE_URL + '/rest/v1/questions?select=' + select;
    var filter = category === 'Universal'
        ? '&question=not.like.True or False*&limit=500'
        : '&category=eq.' + encodeURIComponent(category) + '&question=not.like.True or False*&limit=500';
    return fetch(base + filter, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        }
    }).then(function(res) {
        if (!res.ok) throw new Error('Supabase error');
        return res.json();
    });
}

function fetchQuestions(category) {
    return fetchFromSupabase(category).then(function(data) {
        if (!data || data.length === 0) throw new Error('No data');
        return data;
    }).catch(function() {
        // Fallback to local questions.json
        return fetch('questions.json').then(function(res) { return res.json(); });
    });
}

// Fisher-Yates shuffle
function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
}

// Daily attempt limiter
function checkDailyLimit(category) {
    var key = 'epa608_daily_' + category.replace(/\s+/g, '');
    var data = JSON.parse(localStorage.getItem(key) || '{}');
    var today = new Date().toDateString();
    if (data.date !== today) return { allowed: true, count: 0 };
    return { allowed: data.count < 3, count: data.count };
}
function recordAttempt(category) {
    var key = 'epa608_daily_' + category.replace(/\s+/g, '');
    var today = new Date().toDateString();
    var data = JSON.parse(localStorage.getItem(key) || '{}');
    if (data.date !== today) { data.date = today; data.count = 0; }
    data.count++;
    localStorage.setItem(key, JSON.stringify(data));
    return data.count;
}

function initTestEngine(config) {
    var CATEGORY = config.category;         // 'Core', 'Type I', etc.
    var HISTORY_KEY = config.historyKey;     // 'core', 'type1', etc.
    var PASS_MSG = config.passMsg;
    var FAIL_MSG = config.failMsg;
    var QUESTIONS_PER_TEST = CATEGORY === 'Universal' ? 100 : 25;
    var TIME_LIMIT = CATEGORY === 'Universal' ? 6000 : 1800; // Universal: 100min, others: 30min

    var ctrl = {
        questions: [],
        shuffledOptions: [],
        currentIdx: 0,
        answers: [],
        timer: null,
        timeLeft: TIME_LIMIT,

        init: function() {
            // No daily limit — unlimited practice

            var self = this;
            fetchQuestions(CATEGORY).then(function(data) {
                var pool;
                if (CATEGORY === 'Universal') {
                    // Universal: 100 questions proportionally across all categories
                    var cats = [
                        { name: 'Core', n: 30 },
                        { name: 'Type I', n: 20 },
                        { name: 'Type II', n: 25 },
                        { name: 'Type III', n: 25 }
                    ];
                    var picked = [];
                    cats.forEach(function(c) {
                        var catPool = data.filter(function(q) { return q.category === c.name; });
                        shuffle(catPool);
                        picked = picked.concat(catPool.slice(0, c.n));
                    });
                    self.questions = shuffle(picked);
                } else {
                    pool = data.filter(function(q) { return q.category === CATEGORY; });
                    self.questions = shuffle([].concat(pool)).slice(0, QUESTIONS_PER_TEST);
                }

                if (self.questions.length === 0) {
                    document.getElementById('qText').textContent = 'No questions available.';
                    return;
                }

                // Shuffle options per question
                self.shuffledOptions = self.questions.map(function(q) {
                    var opts = [].concat(q.options);
                    shuffle(opts);
                    return opts;
                });
                self.answers = new Array(self.questions.length).fill(null);
                self.startedAt = Date.now();
                self.render();
                self.startTimer();

                // Ensure anon ID exists before any tracking calls
                try {
                    if (!localStorage.getItem('epa608_anon_id')) {
                        localStorage.setItem('epa608_anon_id',
                            'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
                    }
                    fetch('https://epa608practicetest.net/api/anonymous-sessions/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ anonymous_id: localStorage.getItem('epa608_anon_id'), category: CATEGORY })
                    }).catch(function(){});
                } catch(e) {}
            }).catch(function() {
                document.getElementById('qText').innerHTML = 'Error loading questions. <button onclick="location.reload()">Retry</button>';
            });
        },

        render: function() {
            var q = this.questions[this.currentIdx];
            if (!q) return;
            var opts = this.shuffledOptions[this.currentIdx];
            document.getElementById('qText').textContent = q.question;
            document.getElementById('questionNumber').textContent = 'Question ' + (this.currentIdx + 1) + ' of ' + this.questions.length;
            document.getElementById('progressFill').style.width = ((this.currentIdx + 1) / this.questions.length * 100) + '%';

            var list = document.getElementById('ansList');
            list.innerHTML = '';
            var self = this;
            opts.forEach(function(opt, i) {
                var btn = document.createElement('button');
                btn.className = 'answer-btn' + (self.answers[self.currentIdx] === i ? ' selected' : '');
                btn.textContent = opt;
                btn.onclick = function() { self.select(i); };
                list.appendChild(btn);
            });

            document.getElementById('prevBtn').disabled = this.currentIdx === 0;
            document.getElementById('nextBtn').style.display = this.currentIdx === this.questions.length - 1 ? 'none' : 'block';
            document.getElementById('submitBtn').style.display = this.currentIdx === this.questions.length - 1 ? 'block' : 'none';
        },

        select: function(i) {
            this.answers[this.currentIdx] = i;
            this.render();
        },

        next: function() { if (this.currentIdx < this.questions.length - 1) { this.currentIdx++; this.render(); } },
        prev: function() { if (this.currentIdx > 0) { this.currentIdx--; this.render(); } },

        finish: function() {
            clearInterval(this.timer);
            var score = 0;
            var details = [];
            var self = this;
            this.questions.forEach(function(q, i) {
                var opts = self.shuffledOptions[i];
                var userAnswer = self.answers[i] !== null ? opts[self.answers[i]] : null;
                var isCorrect = userAnswer !== null && userAnswer.trim() === (q.answer_text || '').trim();
                if (isCorrect) score++;
                details.push({
                    questionId: q.id || null,
                    question: q.question,
                    answers: opts,
                    correctAnswer: opts.indexOf(q.answer_text),
                    userAnswerIndex: self.answers[i],
                    isCorrect: isCorrect,
                    topic: q.subtopic_id || q.category || CATEGORY
                });
            });

            var pct = Math.round((score / this.questions.length) * 100);
            var attemptCount = recordAttempt(CATEGORY);
            var remaining = 3 - attemptCount;

            document.getElementById('testView').style.display = 'none';
            document.getElementById('resultView').style.display = 'block';
            document.getElementById('scoreValue').textContent = pct + '%';
            document.getElementById('feedbackText').textContent = pct >= 70
                ? PASS_MSG + ' You scored ' + score + '/' + this.questions.length + '.'
                : FAIL_MSG + ' You scored ' + score + '/' + this.questions.length + '.';

            // Result details — HVAC-friendly: large text, clear pass/fail per question
            var wrongCount = details.filter(function(d){return !d.isCorrect;}).length;
            var html = '';

            // Summary bar
            if (wrongCount > 0) {
                html += '<div style="margin-top:20px;padding:14px 18px;background:#fef2f2;border:2px solid #fecaca;border-radius:12px;display:flex;align-items:center;gap:12px">'
                    + '<span style="font-size:28px">⚠️</span>'
                    + '<div><div style="font-size:17px;font-weight:800;color:#991b1b">' + wrongCount + ' question' + (wrongCount!==1?'s':'') + ' to review</div>'
                    + '<div style="font-size:14px;color:#b91c1c;margin-top:2px">Study these before your next attempt</div></div>'
                    + '</div>';
            } else {
                html += '<div style="margin-top:20px;padding:14px 18px;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;display:flex;align-items:center;gap:12px">'
                    + '<span style="font-size:28px">🎉</span>'
                    + '<div style="font-size:17px;font-weight:800;color:#166534">Perfect score — all answers correct!</div>'
                    + '</div>';
            }

            html += '<div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">';
            details.forEach(function(d, i) {
                var correct = d.isCorrect;
                if (correct) {
                    // Correct — compact green row
                    html += '<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px">';
                    html += '<span style="font-size:22px;line-height:1;flex-shrink:0;margin-top:1px">✅</span>';
                    html += '<div style="font-size:16px;font-weight:600;color:#166534;line-height:1.4">Q' + (i+1) + '. ' + d.question + '</div>';
                    html += '</div>';
                } else {
                    var yourAns = d.userAnswerIndex !== null && d.userAnswerIndex >= 0 ? d.answers[d.userAnswerIndex] : 'Skipped';
                    var corrAns = d.correctAnswer >= 0 ? d.answers[d.correctAnswer] : '—';
                    // Wrong — expanded red card with full detail
                    html += '<div style="background:#fff5f5;border:2px solid #fca5a5;border-radius:12px;padding:16px 18px">';
                    html += '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">';
                    html += '<span style="font-size:22px;line-height:1;flex-shrink:0;margin-top:2px">❌</span>';
                    html += '<div style="font-size:17px;font-weight:700;color:#7f1d1d;line-height:1.4">Q' + (i+1) + '. ' + d.question + '</div>';
                    html += '</div>';
                    html += '<div style="background:#fff;border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">';
                    html += '<div style="display:flex;align-items:baseline;gap-x:8px;gap:8px">'
                        + '<span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0">Your answer</span>'
                        + '<span style="font-size:15px;font-weight:600;color:#dc2626">' + yourAns + '</span>'
                        + '</div>';
                    html += '<div style="display:flex;align-items:baseline;gap:8px">'
                        + '<span style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0">Correct</span>'
                        + '<span style="font-size:15px;font-weight:700;color:#16a34a">' + corrAns + '</span>'
                        + '</div>';
                    if (d.explanation) {
                        html += '<div style="margin-top:4px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:14px;color:#475569;line-height:1.6">'
                            + '<span style="font-weight:700;color:#0f172a">Why: </span>' + d.explanation + '</div>';
                    }
                    html += '</div></div>';
                }
            });
            html += '</div>';

            document.getElementById('resultDetails').innerHTML = html;

            // Social share buttons
            var shareText = 'I scored ' + pct + '% on the EPA 608 ' + CATEGORY + ' Practice Test! Free HVAC certification prep:';
            var shareUrl = 'https://epa608practicetest.net';
            var shareHtml = '<div style="margin-top:20px;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">'
                + '<div style="font-size:14px;font-weight:600;color:#374151;margin-bottom:12px">Share your result</div>'
                + '<div style="display:flex;flex-wrap:wrap;gap:8px">'
                + '<a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(shareUrl) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:10px 16px;background:#000;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;min-height:44px">𝕏 Share on X</a>'
                + '<a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl) + '&quote=' + encodeURIComponent(shareText) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:10px 16px;background:#1877f2;color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;min-height:44px">Facebook</a>'
                + '<button onclick="navigator.clipboard.writeText(\'' + shareUrl + '\').then(function(){this.textContent=\'✓ Copied!\';}.bind(this))" style="display:inline-flex;align-items:center;gap:6px;padding:10px 16px;background:#fff;color:#374151;border:1.5px solid #d1d5db;font-size:14px;font-weight:600;border-radius:8px;cursor:pointer;min-height:44px">🔗 Copy link</button>'
                + '</div></div>';

            var shareContainer = document.getElementById('shareButtons');
            if (shareContainer) shareContainer.innerHTML = shareHtml;

            // Show popup: passed ≥70% OR every 3rd test attempt
            var totalTests = parseInt(localStorage.getItem('epa608TotalTests') || '0') + 1;
            localStorage.setItem('epa608TotalTests', totalTests);
            var alreadyShared = localStorage.getItem('epa608Shared') === '1';
            var shouldShowPopup = !alreadyShared && (pct >= 70 || totalTests % 3 === 0);

            if (shouldShowPopup) {
                var twitterLink = document.getElementById('popupTwitter');
                var facebookLink = document.getElementById('popupFacebook');
                var popupText = pct >= 70
                    ? 'I scored ' + pct + '% on the EPA 608 ' + CATEGORY + ' Practice Test! 🎉 Try it free:'
                    : 'Studying for the EPA 608 HVAC exam? This free practice test is really helpful:';
                if (twitterLink) twitterLink.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(popupText) + '&url=' + encodeURIComponent(shareUrl);
                if (facebookLink) facebookLink.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl) + '&quote=' + encodeURIComponent(popupText);
                setTimeout(function() {
                    var popup = document.getElementById('sharePopup');
                    if (popup) {
                        popup.style.display = 'flex';
                        // Mark as shown so it doesn't spam every session
                        localStorage.setItem('epa608Shared', '1');
                    }
                }, 2500);
            }

            // Save history with detailed results for review.html
            var history = JSON.parse(localStorage.getItem('epa608History') || '[]');
            history.push({
                type: HISTORY_KEY,
                category: CATEGORY,
                score: pct,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                detailedResults: details
            });
            localStorage.setItem('epa608History', JSON.stringify(history));

            // ── Anonymous session tracking ──────────────────────────────
            (function() {
                try {
                    var anonId = localStorage.getItem('epa608_anon_id') || null;
                    var timeSpent = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : null;
                    fetch('https://epa608practicetest.net/api/anonymous-sessions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            anonymous_id: anonId,
                            category: CATEGORY,
                            score: score,
                            total: this.questions.length,
                            time_spent: timeSpent,
                        })
                    }).catch(function(){});
                } catch(e) {}
            }).call(this);

            window.scrollTo(0, 0);
        },

        startTimer: function() {
            var self = this;
            this.timer = setInterval(function() {
                self.timeLeft--;
                var m = Math.floor(self.timeLeft / 60);
                var s = self.timeLeft % 60;
                var el = document.getElementById('countdown');
                el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
                if (self.timeLeft <= 60) el.style.color = '#dc2626';
                if (self.timeLeft <= 0) self.finish();
            }, 1000);
        }
    };

    // Expose globally for onclick handlers
    window.ctrl = ctrl;
    document.addEventListener('DOMContentLoaded', function() { ctrl.init(); });
}
