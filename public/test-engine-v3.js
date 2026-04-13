/**
 * EPA 608 Practice Test Engine v3
 * - Loads questions from /api/public/quiz (NO answers on client)
 * - Scores via /api/public/score (server-side)
 * - 25 questions, unlimited, all sections free
 * - Spider chart weak-spot diagnosis
 * - Ask AI (guest, 10/day)
 */

function initTestEngine(config) {
    var CATEGORY = config.category;
    var HISTORY_KEY = config.historyKey;
    var PASS_MSG = config.passMsg;
    var FAIL_MSG = config.failMsg;

    var ctrl = {
        quizId: null,
        questions: [],
        currentIdx: 0,
        answers: {},      // questionId → selected option text
        timer: null,
        timeLeft: 1800,

        init: function() {
            var self = this;
            document.getElementById('qText').textContent = 'Loading questions...';

            // Check if we have weak topics from previous tests (for practice mode weighting)
            var savedWeak = [];
            try { savedWeak = JSON.parse(localStorage.getItem('epa608WeakTopics') || '[]'); } catch(e) {}

            // Build request — include weakTopics for adaptive weighting
            var quizBody = { category: CATEGORY, count: CATEGORY === 'Universal' ? 100 : 25 };
            if (savedWeak.length > 0) {
                quizBody.weakTopics = savedWeak;
            }

            fetch('/api/public/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quizBody)
            }).then(function(res) {
                if (!res.ok) throw new Error('Failed to load');
                return res.json();
            }).then(function(data) {
                self.quizId = data.quizId;
                self.questions = data.questions;
                self.timeLeft = data.timeLimit || 1800;
                self.answers = {};

                if (self.questions.length === 0) {
                    document.getElementById('qText').textContent = 'No questions available.';
                    return;
                }

                // Update timer display
                var m = Math.floor(self.timeLeft / 60);
                document.getElementById('countdown').textContent = m + ':00';

                self.render();
                self.startTimer();
            }).catch(function() {
                document.getElementById('qText').innerHTML = 'Error loading questions. <button onclick="location.reload()">Retry</button>';
            });
        },

        render: function() {
            var q = this.questions[this.currentIdx];
            if (!q) return;

            document.getElementById('qText').textContent = q.question;
            document.getElementById('questionNumber').textContent = 'Question ' + (this.currentIdx + 1) + ' of ' + this.questions.length;
            document.getElementById('progressFill').style.width = ((this.currentIdx + 1) / this.questions.length * 100) + '%';

            var list = document.getElementById('ansList');
            list.innerHTML = '';
            var self = this;
            var selectedAnswer = this.answers[q.id] || null;

            q.options.forEach(function(opt) {
                var btn = document.createElement('button');
                btn.className = 'answer-btn' + (selectedAnswer === opt ? ' selected' : '');
                btn.textContent = opt;
                btn.onclick = function() { self.select(q.id, opt); };
                list.appendChild(btn);
            });

            document.getElementById('prevBtn').disabled = this.currentIdx === 0;
            document.getElementById('nextBtn').style.display = this.currentIdx === this.questions.length - 1 ? 'none' : 'block';
            document.getElementById('submitBtn').style.display = this.currentIdx === this.questions.length - 1 ? 'block' : 'none';
        },

        select: function(questionId, optionText) {
            this.answers[questionId] = optionText;
            this.render();
        },

        next: function() { if (this.currentIdx < this.questions.length - 1) { this.currentIdx++; this.render(); } },
        prev: function() { if (this.currentIdx > 0) { this.currentIdx--; this.render(); } },

        finish: function() {
            clearInterval(this.timer);
            var self = this;

            // Show loading
            document.getElementById('testView').style.display = 'none';
            document.getElementById('resultView').style.display = 'block';
            document.getElementById('scoreValue').textContent = '...';
            document.getElementById('feedbackText').textContent = 'Scoring your answers...';
            document.getElementById('resultDetails').innerHTML = '';

            // Submit to server for scoring
            fetch('/api/public/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quizId: self.quizId, answers: self.answers })
            }).then(function(res) {
                if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Scoring failed'); });
                return res.json();
            }).then(function(data) {
                self.showResults(data);
            }).catch(function(err) {
                document.getElementById('scoreValue').textContent = '?';
                document.getElementById('feedbackText').textContent = err.message || 'Could not score. Please retry.';
            });
        },

        showResults: function(data) {
            var pct = data.percentage;
            var score = data.score;
            var total = data.total;
            var passed = data.passed;
            var weakAreas = data.weakAreas || [];
            var strongAreas = data.strongAreas || [];
            var results = data.results || [];

            // Save weak topics for next test auto-weighting
            if (weakAreas.length > 0) {
                var weakPrefixes = weakAreas.map(function(w) { return w.prefix || ''; }).filter(Boolean);
                localStorage.setItem('epa608WeakTopics', JSON.stringify(weakPrefixes));
            } else {
                localStorage.removeItem('epa608WeakTopics');
            }

            document.getElementById('scoreValue').textContent = pct + '%';
            document.getElementById('feedbackText').textContent = passed
                ? PASS_MSG + ' You scored ' + score + '/' + total + '.'
                : FAIL_MSG + ' You scored ' + score + '/' + total + '.';

            var html = '';

            // Spider chart (weak areas diagnosis)
            if (weakAreas.length > 0 || strongAreas.length > 0) {
                html += '<div style="margin:20px 0;padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">';
                html += '<h3 style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:16px;">Your Weak Spots</h3>';

                if (weakAreas.length > 0) {
                    weakAreas.forEach(function(w) {
                        html += '<div style="margin-bottom:8px;">';
                        html += '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">';
                        html += '<span style="color:#991b1b;font-weight:600;">\u26A0 ' + w.topic + '</span>';
                        html += '<span style="color:#991b1b;font-weight:700;">' + w.accuracy + '%</span></div>';
                        html += '<div style="height:8px;background:#fee2e2;border-radius:4px;overflow:hidden;">';
                        html += '<div style="height:100%;width:' + w.accuracy + '%;background:#dc2626;border-radius:4px;"></div></div></div>';
                    });
                    html += '<p style="font-size:13px;color:#64748b;margin-top:12px;">These topics will likely cost you on the real exam.</p>';
                } else {
                    html += '<p style="font-size:14px;color:#16a34a;font-weight:600;">No major weak spots. Looking good!</p>';
                }

                if (strongAreas.length > 0) {
                    html += '<div style="margin-top:14px;padding-top:14px;border-top:1px solid #e2e8f0;">';
                    html += '<p style="font-size:12px;color:#64748b;margin-bottom:6px;">Strong areas:</p>';
                    strongAreas.forEach(function(s) {
                        html += '<span style="display:inline-block;padding:3px 10px;margin:2px;background:#f0fdf4;color:#166534;border-radius:6px;font-size:12px;font-weight:500;">' + s.topic + ' ' + s.accuracy + '%</span>';
                    });
                    html += '</div>';
                }

                // Drill button — fix weak spots immediately
                if (weakAreas.length > 0) {
                    var weakTopicPrefixes = weakAreas.map(function(w) {
                        return w.prefix || w.topic.toLowerCase().replace(/ /g, '-');
                    });
                    html += '<div style="margin-top:16px;text-align:center;">';
                    html += '<button onclick="startDrill()" style="background:#dc2626;color:#fff;border:none;padding:14px 28px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;min-height:48px;">Fix Weak Spots Now — ' + weakAreas.length + ' Topics</button>';
                    html += '<p style="font-size:12px;color:#64748b;margin-top:8px;">10 targeted questions on your weakest areas. Free.</p>';
                    html += '</div>';
                    // Store weak topics for drill function
                    window._weakTopicPrefixes = weakTopicPrefixes;
                }

                // Pro CTA
                html += '<div style="margin-top:20px;padding:16px;background:#1e40af;border-radius:12px;text-align:center;">';
                html += '<p style="color:#93c5fd;font-size:13px;margin-bottom:6px;">Want unlimited drills + AI help + certificates?</p>';
                html += '<a href="/pricing" style="display:inline-block;background:#fff;color:#1e40af;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">Get Pro \u2014 $18.99 (Pass Guarantee)</a>';
                html += '<p style="color:#93c5fd;font-size:11px;margin-top:8px;">Targeted training + Unlimited AI + Certificates</p>';
                html += '</div>';

                html += '</div>';
            }

            // Question results
            html += '<div style="margin-top:16px;text-align:left;">';
            results.forEach(function(r, i) {
                var qText = '';
                // Find question text from our loaded questions
                for (var j = 0; j < ctrl.questions.length; j++) {
                    if (ctrl.questions[j].id === r.questionId) {
                        qText = ctrl.questions[j].question;
                        break;
                    }
                }
                var qShort = qText.substring(0, 80) + (qText.length > 80 ? '...' : '');

                html += '<div style="padding:10px 14px;margin:4px 0;border-radius:10px;font-size:14px;background:' +
                    (r.correct ? '#f0fdf4;color:#166534' : '#fef2f2;color:#991b1b') + '">' +
                    (r.correct ? '\u2713' : '\u2717') + ' Q' + (i + 1) + ': ' + qShort;

                if (!r.correct) {
                    html += '<br><span style="font-size:12px;color:#64748b;">Correct: ' + r.correctAnswer + '</span>';
                    html += ' <button onclick="askGuestAI(\'' + qText.replace(/'/g, "\\'").replace(/"/g, "&quot;") +
                        '\')" style="background:#1e40af;color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-left:4px;">Ask AI</button>';
                }
                html += '</div>';
            });
            html += '</div>';

            // AI answer container
            html += '<div id="guestAiAnswer" style="display:none;margin-top:16px;padding:16px;background:#f0f4ff;border:1px solid #c7d2fe;border-radius:12px;">' +
                '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;"><span style="font-size:14px;">🤖</span><span style="font-size:12px;font-weight:600;color:#4338ca;">AI Study Helper</span>' +
                '<span id="guestAiRemaining" style="margin-left:auto;font-size:11px;color:#6b7280;"></span></div>' +
                '<div id="guestAiText" style="font-size:14px;color:#1e293b;line-height:1.6;"></div></div>';

            document.getElementById('resultDetails').innerHTML = html;

            // Save to localStorage history
            var history = JSON.parse(localStorage.getItem('epa608History') || '[]');
            history.push({
                type: HISTORY_KEY,
                score: pct,
                weak: weakAreas.map(function(w) { return w.topic; }),
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
            });
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

    window.ctrl = ctrl;
    document.addEventListener('DOMContentLoaded', function() { ctrl.init(); });
}

// Guest AI Chat (reused from v2)
// Adaptive drill — fix weak spots with targeted questions
function startDrill() {
    var prefixes = window._weakTopicPrefixes || [];
    if (prefixes.length === 0) { alert('No weak topics found.'); return; }

    // Map display names back to subtopic prefixes
    // weakAreas come from score API as topic group names like "Env", "Caa", "Rec" etc.
    // We need subtopic prefixes like "core-env", "core-caa"
    // The score API already returns these in a usable format from subtopicStats keys

    document.getElementById('resultView').style.display = 'none';
    document.getElementById('testView').style.display = 'block';
    document.getElementById('qText').textContent = 'Loading targeted drill...';

    fetch('/api/public/drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weakSubtopics: prefixes, count: 10 })
    }).then(function(res) {
        if (!res.ok) {
            // Fallback: try with broader prefixes
            return fetch('/api/public/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: ctrl.questions[0] ? ctrl.questions[0].category : 'Core', count: 10 })
            });
        }
        return res;
    }).then(function(res) { return res.json(); })
    .then(function(data) {
        ctrl.quizId = data.quizId;
        ctrl.questions = data.questions;
        ctrl.timeLeft = 720; // 12 min for drill
        ctrl.answers = {};
        ctrl.currentIdx = 0;
        document.getElementById('countdown').textContent = '12:00';
        ctrl.render();
        ctrl.startTimer();
    }).catch(function() {
        document.getElementById('qText').innerHTML = 'Could not load drill. <button onclick="location.reload()">Retry</button>';
    });
}

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
                        '<a href="/pricing" style="display:inline-block;padding:8px 20px;background:#1e40af;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;">Get Pro \u2014 Unlimited AI</a>';
                } else {
                    textDiv.textContent = data.error || 'Something went wrong.';
                }
            });
        }
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
                            if (content) { fullText += content; textDiv.textContent = fullText; }
                        } catch(e) {}
                    }
                });
                read();
            });
        }
        read();
    }).catch(function() {
        textDiv.textContent = 'Could not connect to AI.';
    });
}
