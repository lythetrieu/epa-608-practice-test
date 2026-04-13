/**
 * EPA 608 Practice Test Engine (Free Demo)
 * - 10 questions per test
 * - 3 attempts per day per category
 * - Fisher-Yates shuffle for questions + options
 * - No explanations (signup CTA instead)
 */

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
    var QUESTIONS_PER_TEST = 25;
    var TIME_LIMIT = 1800; // 30 min

    var ctrl = {
        questions: [],
        shuffledOptions: [],
        currentIdx: 0,
        answers: [],
        timer: null,
        timeLeft: TIME_LIMIT,

        init: function() {
            var self = this;
            fetch('questions.json').then(function(res) { return res.json(); }).then(function(data) {
                var pool;
                if (CATEGORY === 'Universal') {
                    // Universal: pick from all categories proportionally
                    var cats = [
                        { name: 'Core', n: 3 },
                        { name: 'Type I', n: 2 },
                        { name: 'Type II', n: 3 },
                        { name: 'Type III', n: 2 }
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
                self.render();
                self.startTimer();
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
            var subtopicStats = {};
            var self = this;

            this.questions.forEach(function(q, i) {
                var opts = self.shuffledOptions[i];
                var userAnswer = self.answers[i] !== null ? opts[self.answers[i]] : null;
                var correct = userAnswer === q.answer_text;
                if (correct) score++;
                details.push({ question: q.question, correct: correct });

                // Track subtopic accuracy for spider chart
                var topic = q.subtopic_id ? q.subtopic_id.replace(/-\d+(\.\d+)?$/, '') : 'general';
                if (!subtopicStats[topic]) subtopicStats[topic] = { correct: 0, total: 0 };
                subtopicStats[topic].total++;
                if (correct) subtopicStats[topic].correct++;
            });

            var pct = Math.round((score / this.questions.length) * 100);

            document.getElementById('testView').style.display = 'none';
            document.getElementById('resultView').style.display = 'block';
            document.getElementById('scoreValue').textContent = pct + '%';
            document.getElementById('feedbackText').textContent = pct >= 70
                ? PASS_MSG + ' You scored ' + score + '/' + this.questions.length + '.'
                : FAIL_MSG + ' You scored ' + score + '/' + this.questions.length + '.';

            // Build spider chart + weak areas (DIAGNOSIS)
            var topics = Object.keys(subtopicStats);
            var weakAreas = [];
            var strongAreas = [];
            topics.forEach(function(t) {
                var s = subtopicStats[t];
                var acc = Math.round((s.correct / s.total) * 100);
                var label = t.replace('core-', '').replace('t1-', '').replace('t2-', '').replace('t3-', '').replace(/-/g, ' ');
                label = label.charAt(0).toUpperCase() + label.slice(1);
                if (acc < 60) weakAreas.push({ label: label, acc: acc });
                else strongAreas.push({ label: label, acc: acc });
            });
            weakAreas.sort(function(a, b) { return a.acc - b.acc; });

            var html = '';

            // Spider chart visualization (bar chart style for simplicity)
            if (topics.length >= 3) {
                html += '<div style="margin:20px 0;padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">';
                html += '<h3 style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:16px;">Your Weak Spots</h3>';

                // Weak areas (red)
                if (weakAreas.length > 0) {
                    weakAreas.forEach(function(w) {
                        html += '<div style="margin-bottom:8px;">';
                        html += '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">';
                        html += '<span style="color:#991b1b;font-weight:600;">\u26A0 ' + w.label + '</span>';
                        html += '<span style="color:#991b1b;font-weight:700;">' + w.acc + '%</span></div>';
                        html += '<div style="height:8px;background:#fee2e2;border-radius:4px;overflow:hidden;">';
                        html += '<div style="height:100%;width:' + w.acc + '%;background:#dc2626;border-radius:4px;"></div></div></div>';
                    });
                    html += '<p style="font-size:13px;color:#64748b;margin-top:12px;">You\'ll likely fail the real exam on these topics.</p>';
                } else {
                    html += '<p style="font-size:14px;color:#16a34a;font-weight:600;">No major weak spots found. Looking good!</p>';
                }

                // Strong areas (green, compact)
                if (strongAreas.length > 0) {
                    html += '<div style="margin-top:14px;padding-top:14px;border-top:1px solid #e2e8f0;">';
                    html += '<p style="font-size:12px;color:#64748b;margin-bottom:6px;">Strong areas:</p>';
                    strongAreas.forEach(function(s) {
                        html += '<span style="display:inline-block;padding:3px 10px;margin:2px;background:#f0fdf4;color:#166534;border-radius:6px;font-size:12px;font-weight:500;">' + s.label + ' ' + s.acc + '%</span>';
                    });
                    html += '</div>';
                }

                // CURE CTA
                html += '<div style="margin-top:20px;padding:16px;background:#1e40af;border-radius:12px;text-align:center;">';
                html += '<p style="color:#93c5fd;font-size:13px;margin-bottom:6px;">Fix your weak spots before exam day</p>';
                html += '<a href="/pricing" style="display:inline-block;background:#fff;color:#1e40af;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;min-height:48px;">Get Pro — $18.99 (Pass Guarantee)</a>';
                html += '<p style="color:#93c5fd;font-size:11px;margin-top:8px;">Targeted training + Unlimited AI + Certificates</p>';
                html += '</div>';

                html += '</div>';
            }

            // Question results with Ask AI
            html += '<div style="margin-top:16px;text-align:left;">';
            details.forEach(function(d, i) {
                var qShort = d.question.substring(0, 80) + (d.question.length > 80 ? '...' : '');
                html += '<div style="padding:10px 14px;margin:4px 0;border-radius:10px;font-size:14px;background:' +
                    (d.correct ? '#f0fdf4;color:#166534' : '#fef2f2;color:#991b1b') + '">' +
                    (d.correct ? '\u2713' : '\u2717') + ' Q' + (i + 1) + ': ' + qShort +
                    (d.correct ? '' : ' <button onclick="askGuestAI(\'' + d.question.replace(/'/g, "\\'").replace(/"/g, "&quot;") + '\')" style="background:#1e40af;color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-left:8px;">Ask AI</button>') +
                    '</div>';
            });
            html += '</div>';

            // AI answer container
            html += '<div id="guestAiAnswer" style="display:none;margin-top:16px;padding:16px;background:#f0f4ff;border:1px solid #c7d2fe;border-radius:12px;">' +
                '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;"><span style="font-size:14px;">🤖</span><span style="font-size:12px;font-weight:600;color:#4338ca;">AI Study Helper</span>' +
                '<span id="guestAiRemaining" style="margin-left:auto;font-size:11px;color:#6b7280;"></span></div>' +
                '<div id="guestAiText" style="font-size:14px;color:#1e293b;line-height:1.6;"></div></div>';

            document.getElementById('resultDetails').innerHTML = html;

            // Save history with subtopic data
            var history = JSON.parse(localStorage.getItem('epa608History') || '[]');
            history.push({ type: HISTORY_KEY, score: pct, weak: weakAreas.map(function(w){return w.label}), date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() });
            localStorage.setItem('epa608History', JSON.stringify(history));

            window.scrollTo(0, 0);
        },

        startTimer: function() {
            var self = this;
            this.timer = setInterval(function() {
                self.timeLeft--;
                var m = Math.floor(self.timeLeft / 60);
                var s = self.timeLeft % 60;
                document.getElementById('countdown').textContent = m + ':' + (s < 10 ? '0' : '') + s;
                if (self.timeLeft <= 0) self.finish();
            }, 1000);
        }
    };

    // Expose globally for onclick handlers
    window.ctrl = ctrl;
    document.addEventListener('DOMContentLoaded', function() { ctrl.init(); });
}

// Guest AI Chat — 10 free questions/day, no signup
function askGuestAI(question) {
    var answerDiv = document.getElementById('guestAiAnswer');
    var textDiv = document.getElementById('guestAiText');
    var remainingSpan = document.getElementById('guestAiRemaining');
    if (!answerDiv || !textDiv) return;

    answerDiv.style.display = 'block';
    textDiv.innerHTML = '<span style="color:#6b7280;">Thinking...</span>';
    answerDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    fetch('/api/ai/guest-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Why is this the correct answer? Explain simply: ' + question })
    }).then(function(res) {
        var remaining = res.headers.get('X-AI-Remaining');
        if (remaining !== null && remainingSpan) {
            remainingSpan.textContent = remaining + ' AI questions left today';
        }

        if (!res.ok) {
            return res.json().then(function(data) {
                if (data.upgradeRequired) {
                    textDiv.innerHTML = '<p style="margin-bottom:8px;">You\'ve used all 10 free AI questions today.</p>' +
                        '<a href="/pricing" style="display:inline-block;padding:8px 20px;background:#1e40af;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;">Get Pro — Unlimited AI Help</a>';
                } else {
                    textDiv.textContent = data.error || 'Something went wrong.';
                }
            });
        }

        // Stream response
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        var fullText = '';
        textDiv.textContent = '';

        function read() {
            reader.read().then(function(result) {
                if (result.done) return;
                buffer += decoder.decode(result.value, { stream: true });
                var lines = buffer.split('\n');
                buffer = lines.pop() || '';
                lines.forEach(function(line) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            var json = JSON.parse(line.slice(6));
                            var content = json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
                            if (content) {
                                fullText += content;
                                textDiv.textContent = fullText;
                            }
                        } catch(e) {}
                    }
                });
                read();
            });
        }
        read();
    }).catch(function() {
        textDiv.textContent = 'Could not connect to AI. Check your internet connection.';
    });
}
