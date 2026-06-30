/**
 * EPA 608 Practice Test Engine v2
 * - Immediate feedback per question (select → reveal → next)
 * - Explanations shown inline after each answer
 * - Result screen: weak area analysis + study links + gentle Pro hint
 */

var SUPABASE_URL = 'https://sequvmxgtmbirnixeril.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_n0BnJRIVt7eVtekR-B0FnA_7NtQA4g_';

var TOPIC_LABELS = {
  'core-env':'Environmental Impact & Ozone','core-caa':'Clean Air Act Regulations',
  'core-regs':'EPA Regulations & Compliance','core-sub':'Refrigerant Substitutes',
  'core-ref':'Refrigerant Types','core-3rs':'Recovery, Recycling & Reclamation',
  'core-rec':'Recovery Equipment','core-evac':'System Evacuation',
  'core-safe':'Safety & Handling','core-ship':'Shipping & Storage',
  't1-tech':'Type I Techniques','t1-rec':'Type I Recovery','t1-safe':'Type I Safety',
  't2-ref':'Type II Refrigerants','t2-leak':'Leak Detection','t2-tech':'Type II Techniques',
  't2-rec':'Type II Recovery','t2-repair':'System Repair',
  't3-ref':'Type III Refrigerants','t3-rech':'Type III Recharge',
  't3-rec':'Type III Recovery','t3-leak':'Type III Leak Detection','t3-repair':'Type III Repair'
};

var STUDY_LINKS = {
  'Core':    { guide: '/study-guide-core.html',    practice: '/core.html',    flash: '/flashcards.html' },
  'Type I':  { guide: '/study-guide-type-1.html',  practice: '/type-1.html',  flash: '/flashcards.html' },
  'Type II': { guide: '/study-guide-type-2.html',  practice: '/type-2.html',  flash: '/flashcards.html' },
  'Type III':{ guide: '/study-guide-type-3.html',  practice: '/type-3.html',  flash: '/flashcards.html' }
};

function getTopicLabel(subtopicId) {
  if (!subtopicId) return null;
  var prefix = subtopicId.replace(/-[\d.]+$/, '');
  return TOPIC_LABELS[prefix] || null;
}

function fetchFromSupabase(category) {
  var select = 'id,category,question,options,answer_text,explanation,subtopic_id,question_type';
  var base = SUPABASE_URL + '/rest/v1/questions?select=' + select;
  // Exam-format only: this is a single-answer, immediate-feedback test (the real
  // EPA 608 exam is single-choice). question_type=eq.single_choice excludes BOTH
  // true_false AND multi_select — multi_select stores answer_text as a JSON array,
  // which the single-click grader can never match, so those questions would lock
  // as "wrong" on first click. (The app's /test API filters them out the same way;
  // multi-select questions live in Study mode, which supports them.)
  var filter = category === 'Universal'
    ? '&question_type=eq.single_choice&limit=500'
    : '&category=eq.' + encodeURIComponent(category) + '&question_type=eq.single_choice&limit=500';
  return fetch(base + filter, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
  }).then(function(res) {
    if (!res.ok) throw new Error('Supabase error');
    return res.json();
  });
}

function fetchQuestions(category) {
  return fetchFromSupabase(category).catch(function() {
    return fetch('questions.json').then(function(res) { return res.json(); });
  });
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
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

function isLoggedIn() {
  try {
    var key = 'sb-sequvmxgtmbirnixeril-auth-token';
    // @supabase/ssr v0.4+ stores session in document.cookie, not localStorage
    var parts = document.cookie.split('; ');
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(key + '=') || parts[i].startsWith(key + '.0=')) return true;
    }
    // legacy localStorage fallback
    var raw = localStorage.getItem(key);
    return !!(raw && JSON.parse(raw)?.access_token);
  } catch(e) { return false; }
}

function initTestEngine(config) {
  var CATEGORY = config.category;
  var HISTORY_KEY = config.historyKey;
  var PASS_MSG = config.passMsg;
  var FAIL_MSG = config.failMsg;
  var QUESTIONS_PER_TEST = CATEGORY === 'Universal' ? 100 : 25;
  var TIME_LIMIT = CATEGORY === 'Universal' ? 6000 : 1800;

  // Inject inline explanation div after answer list
  var ansList = document.getElementById('ansList');
  if (ansList && !document.getElementById('inlineExplanation')) {
    var expDiv = document.createElement('div');
    expDiv.id = 'inlineExplanation';
    expDiv.style.display = 'none';
    ansList.parentNode.insertBefore(expDiv, ansList.nextSibling);
  }
  // "Check answer" button for multi-select questions (created once, hidden by default)
  if (ansList && !document.getElementById('checkBtn')) {
    var cb = document.createElement('button');
    cb.id = 'checkBtn';
    cb.textContent = 'Check answer';
    cb.className = 'answer-btn';
    cb.style.cssText = 'display:none;margin-top:12px;background:#0369a1;color:#fff;font-weight:700;cursor:pointer';
    cb.onclick = function(){ if (window.ctrl) window.ctrl.checkMulti(); };
    var expRef = document.getElementById('inlineExplanation');
    if (expRef) expRef.parentNode.insertBefore(cb, expRef);
    else ansList.parentNode.insertBefore(cb, ansList.nextSibling);
  }

  var ctrl = {
    questions: [],
    shuffledOptions: [],
    currentIdx: 0,
    answers: [],    // stores selected option index per question
    timer: null,
    timeLeft: TIME_LIMIT,
    startedAt: null,

    init: function() {
      var self = this;
      var embedded = this.loadEmbedded();
      var build = function(data) {
        data = data || [];
        var pool = (CATEGORY === 'Universal')
          ? [].concat(data)
          : data.filter(function(q){ return !q.category || q.category === CATEGORY; });
        self.questions = shuffle([].concat(pool)).slice(0, QUESTIONS_PER_TEST);
        if (self.questions.length === 0) {
          document.getElementById('qText').textContent = 'No questions available.';
          return;
        }
        self.shuffledOptions = self.questions.map(function(q){ var o = [].concat(q.options); shuffle(o); return o; });
        self.answers = new Array(self.questions.length).fill(null);
        self.pendingMulti = [];
        self.startedAt = Date.now();
        self.render();
        self.startTimer();
        self.trackStart();
      };
      // Primary source: the build-time-baked questions embedded in the page
      // (the SAME content Google indexes). The user gets a randomized draw from it.
      if (embedded) { build(embedded); return; }
      // Fallback only if no embedded data: fetch single-answer from DB.
      fetchQuestions(CATEGORY).then(function(data) {
        data = (data || [])
          .filter(function(q){ return !q.question_type || q.question_type === 'single_choice'; })
          .map(function(q){ return self.normalize(q); });
        build(data);
      }).catch(function() {
        document.getElementById('qText').innerHTML = 'Error loading questions. <button onclick="location.reload()">Retry</button>';
      });
    },

    loadEmbedded: function() {
      var el = document.getElementById('pq-data');
      if (!el) return null;
      try {
        var arr = JSON.parse(el.textContent);
        if (!Array.isArray(arr) || !arr.length) return null;
        return arr.map(function(d){
          return { id:d.id, question:d.q, options:d.o, correct:d.c,
                   answer_text:(d.c && d.c[0]) || '', explanation:d.e,
                   question_type:d.t || 'single_choice', category:CATEGORY };
        });
      } catch(e) { return null; }
    },

    normalize: function(q) {
      return { id:q.id, question:q.question, options:q.options,
        correct:[q.answer_text], answer_text:q.answer_text,
        explanation:q.explanation, question_type:q.question_type || 'single_choice',
        category:q.category, subtopic_id:q.subtopic_id };
    },

    trackStart: function() {
      try {
        if (!localStorage.getItem('epa608_anon_id'))
          localStorage.setItem('epa608_anon_id', 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
        fetch('https://epa608practicetest.net/api/anonymous-sessions/start', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anonymous_id: localStorage.getItem('epa608_anon_id'), category: CATEGORY })
        }).catch(function(){});
      } catch(e) {}
    },

    // Format-aware correctness for question index i.
    isCorrect: function(i) {
      var q = this.questions[i], opts = this.shuffledOptions[i], a = this.answers[i];
      if (a === null || a === undefined) return false;
      var correct = (q.correct || [q.answer_text]).map(function(s){ return String(s).trim(); });
      if (q.question_type === 'multi_select') {
        var sel = (Array.isArray(a) ? a : []).map(function(idx){ return String(opts[idx]).trim(); });
        if (sel.length !== correct.length) return false;
        return correct.every(function(c){ return sel.indexOf(c) >= 0; });
      }
      return opts[a] !== undefined && String(opts[a]).trim() === correct[0];
    },

    toggleMulti: function(i) {
      this.pendingMulti = this.pendingMulti || [];
      var k = this.pendingMulti.indexOf(i);
      if (k >= 0) this.pendingMulti.splice(k, 1); else this.pendingMulti.push(i);
      this.render();
    },

    checkMulti: function() {
      if (!this.pendingMulti || !this.pendingMulti.length) return;
      this.answers[this.currentIdx] = this.pendingMulti.slice();
      this.pendingMulti = [];
      this.trackAnswer(this.currentIdx);
      this.render();
    },

    trackAnswer: function(i) {
      var q = this.questions[i];
      if (isLoggedIn() && q.id) {
        fetch('https://epa608practicetest.net/api/practice/track', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: q.id, correct: this.isCorrect(i) })
        }).catch(function(){});
      }
    },

    render: function() {
      var q = this.questions[this.currentIdx];
      if (!q) return;
      var opts = this.shuffledOptions[this.currentIdx];
      var isLast = this.currentIdx === this.questions.length - 1;
      var alreadyAnswered = this.answers[this.currentIdx] !== null;

      var isMulti = q.question_type === 'multi_select';
      var self = this;
      this.pendingMulti = this.pendingMulti || [];

      var qText = q.question;
      if (isMulti && !/select all that apply/i.test(qText)) qText += '  (Select all that apply)';
      document.getElementById('qText').textContent = qText;
      document.getElementById('questionNumber').textContent =
        'Question ' + (this.currentIdx + 1) + ' of ' + this.questions.length;
      document.getElementById('progressFill').style.width =
        ((this.currentIdx + 1) / this.questions.length * 100) + '%';

      // Answer buttons (format-aware)
      var list = document.getElementById('ansList');
      list.innerHTML = '';
      var correctSet = (q.correct || [q.answer_text]).map(function(s){ return String(s).trim(); });
      opts.forEach(function(opt, i) {
        var btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = opt;
        if (alreadyAnswered) {
          btn.disabled = true;
          var isCorr = correctSet.indexOf(String(opt).trim()) >= 0;
          var picked = isMulti ? ((self.answers[self.currentIdx] || []).indexOf(i) >= 0)
                               : (i === self.answers[self.currentIdx]);
          if (isCorr) btn.classList.add('correct');
          else if (picked) btn.classList.add('incorrect');
        } else if (isMulti) {
          if (self.pendingMulti.indexOf(i) >= 0) { btn.classList.add('selected'); btn.style.outline = '2px solid #0369a1'; }
          btn.onclick = function() { self.toggleMulti(i); };
        } else {
          btn.onclick = function() { self.selectAndReveal(i); };
        }
        list.appendChild(btn);
      });

      // "Check answer" button: only for multi-select, before it's submitted
      var checkBtn = document.getElementById('checkBtn');
      if (checkBtn) {
        checkBtn.style.display = (isMulti && !alreadyAnswered) ? 'block' : 'none';
        checkBtn.disabled = this.pendingMulti.length === 0;
      }

      // Navigation buttons
      document.getElementById('prevBtn').style.display = 'none'; // no going back in immediate mode
      document.getElementById('nextBtn').style.display = alreadyAnswered && !isLast ? 'block' : 'none';
      document.getElementById('nextBtn').textContent = 'Next Question →';
      document.getElementById('submitBtn').style.display = alreadyAnswered && isLast ? 'block' : 'none';
      document.getElementById('submitBtn').textContent = 'See My Results →';

      // Inline explanation
      var expEl = document.getElementById('inlineExplanation');
      if (expEl) {
        if (alreadyAnswered) {
          this.renderExplanation(expEl, q, opts);
          expEl.style.display = 'block';
        } else {
          expEl.style.display = 'none';
          expEl.innerHTML = '';
        }
      }
    },

    renderExplanation: function(el, q, opts) {
      var isCorrect = this.isCorrect(this.currentIdx);
      var html = '';
      if (isCorrect) {
        html = '<div style="margin-top:12px;padding:12px 16px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;display:flex;align-items:center;gap:10px">'
          + '<span style="font-size:20px">✅</span>'
          + '<span style="font-size:15px;font-weight:700;color:#166534">Correct!</span>'
          + '</div>';
      } else {
        html = '<div style="margin-top:12px;padding:12px 16px;background:#fff5f5;border:1.5px solid #fca5a5;border-radius:10px">'
          + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
          + '<span style="font-size:20px">❌</span>'
          + '<span style="font-size:15px;font-weight:700;color:#991b1b">Incorrect</span>'
          + '</div>'
          + '<div style="font-size:14px;color:#7f1d1d;margin-bottom:4px">'
          + 'Correct answer: <strong style="color:#16a34a">' + (q.correct || [q.answer_text]).join(', ') + '</strong></div>';
        if (q.explanation) {
          html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #fecaca;font-size:13px;color:#475569;line-height:1.6">'
            + '<strong style="color:#0f172a">Why: </strong>' + q.explanation + '</div>';
        }
        html += '</div>';
      }
      el.innerHTML = html;
    },

    selectAndReveal: function(i) {
      if (this.answers[this.currentIdx] !== null) return;
      // Blur immediately — prevents mobile browser from auto-scrolling to focused button
      if (document.activeElement) document.activeElement.blur();
      var savedY = window.scrollY;
      this.answers[this.currentIdx] = i;
      // Track per-question answer for logged-in users (powers Weak Spots + Review Wrong)
      this.trackAnswer(this.currentIdx);
      this.render(); // re-render with locked state + feedback
      // Restore scroll position after render (stops any layout-shift-induced scroll)
      requestAnimationFrame(function() {
        window.scrollTo({ top: savedY, behavior: 'instant' });
      });
    },

    next: function() {
      if (this.currentIdx < this.questions.length - 1) {
        this.currentIdx++;
        if (document.activeElement) document.activeElement.blur();
        this.render();
        // Scroll to absolute top instantly — question always visible, no header overlap
        requestAnimationFrame(function() {
          window.scrollTo({ top: 0, behavior: 'instant' });
        });
      }
    },

    prev: function() { /* disabled in immediate mode */ },

    finish: function() {
      clearInterval(this.timer);
      var score = 0;
      var wrongByTopic = {};   // topic label → count
      var wrongByCategory = {}; // category → count
      var details = [];
      var self = this;

      this.questions.forEach(function(q, i) {
        var opts = self.shuffledOptions[i];
        var isCorrect = self.isCorrect(i);
        if (isCorrect) score++;

        if (!isCorrect) {
          // Group by readable topic
          var topicLabel = getTopicLabel(q.subtopic_id) || q.category || CATEGORY;
          wrongByTopic[topicLabel] = (wrongByTopic[topicLabel] || 0) + 1;
          var cat = q.category || CATEGORY;
          wrongByCategory[cat] = (wrongByCategory[cat] || 0) + 1;
        }

        details.push({
          questionId: q.id || null,
          question: q.question,
          answers: opts,
          correctAnswer: opts.indexOf((q.correct || [q.answer_text])[0]),
          userAnswerIndex: self.answers[i],
          isCorrect: isCorrect,
          topic: q.subtopic_id || q.category || CATEGORY
        });
      });

      var pct = Math.round((score / this.questions.length) * 100);
      var passed = pct >= 72;
      recordAttempt(CATEGORY);

      document.getElementById('testView').style.display = 'none';
      document.getElementById('resultView').style.display = 'block';

      var wrongCount = this.questions.length - score;

      // Score display
      document.getElementById('scoreValue').textContent = pct + '%';
      document.getElementById('feedbackText').innerHTML = passed
        ? '<span style="color:#16a34a;font-weight:700">✓ Passed!</span> ' + score + '/' + this.questions.length + ' correct'
        : '<span style="color:#dc2626;font-weight:700">✗ Not passed</span> — ' + score + '/' + this.questions.length + ' correct · need ' + Math.ceil(this.questions.length * 0.72);

      // Weak area analysis
      var html = '';

      if (wrongCount === 0) {
        html = '<div style="margin:20px 0;padding:16px 20px;background:#f0fdf4;border:2px solid #86efac;border-radius:14px;display:flex;align-items:center;gap:12px">'
          + '<span style="font-size:32px">🎉</span>'
          + '<div><div style="font-size:17px;font-weight:800;color:#166534">Perfect score!</div>'
          + '<div style="font-size:13px;color:#15803d;margin-top:2px">Ready to try the next section or Universal exam.</div></div>'
          + '</div>';
      } else {
        // Weak areas section
        var topicsSorted = Object.keys(wrongByTopic).sort(function(a,b){ return wrongByTopic[b]-wrongByTopic[a]; });
        var catsSorted = Object.keys(wrongByCategory).sort(function(a,b){ return wrongByCategory[b]-wrongByCategory[a]; });

        html += '<div style="margin:20px 0">';
        html += '<div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:10px">📌 Where you need work</div>';

        // Topic breakdown
        topicsSorted.slice(0, 5).forEach(function(topic) {
          var count = wrongByTopic[topic];
          var bar = Math.round((count / wrongCount) * 100);
          html += '<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:8px">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
          html += '<span style="font-size:13px;font-weight:600;color:#0f172a">' + topic + '</span>';
          html += '<span style="font-size:12px;font-weight:700;color:#dc2626">' + count + ' wrong</span>';
          html += '</div>';
          html += '<div style="height:6px;background:#f1f5f9;border-radius:4px;overflow:hidden">';
          html += '<div style="height:100%;width:' + bar + '%;background:#ef4444;border-radius:4px"></div>';
          html += '</div></div>';
        });

        // Study links per category — guide only (flashcards = Pro)
        html += '<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px">';
        catsSorted.forEach(function(cat) {
          var links = STUDY_LINKS[cat];
          if (links) {
            html += '<a href="' + links.guide + '" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">'
              + '📖 ' + cat + ' Study Guide</a>';
          }
        });
        html += '</div>';

        // Pro hint — only if ≥3 wrong, subtle, inline
        if (wrongCount >= 3) {
          html += '<div style="margin-top:12px;display:flex;align-items:center;gap-x:10px;gap:10px;flex-wrap:wrap">';
          html += '<span style="font-size:18px">⚡</span>';
          html += '<span style="font-size:12px;color:#64748b;flex:1">';
          html += '<strong style="color:#0f172a">Blind Spot Drill</strong> auto-builds a test targeting exactly these '
            + topicsSorted.slice(0,3).join(', ') + '.';
          html += ' <a href="https://epa608practicetest.net/checkout.html" style="color:#1d4ed8;font-weight:600;text-decoration:underline">Unlock Pro — $14.99</a>';
          html += '</span></div>';
        }

        html += '</div>';
      }

      document.getElementById('resultDetails').innerHTML = html;

      // Share — single discreet link injected into score area
      var shareText = 'I scored ' + pct + '% on the EPA 608 ' + CATEGORY + ' Practice Test! Free HVAC certification prep:';
      var shareContainer = document.getElementById('shareButtons');
      if (shareContainer) {
        shareContainer.innerHTML = '<a href="https://twitter.com/intent/tweet?text='
          + encodeURIComponent(shareText) + '&url=' + encodeURIComponent('https://epa608practicetest.net')
          + '" target="_blank" rel="noopener" style="font-size:12px;color:rgba(255,255,255,0.6);text-decoration:underline">Share on X</a>';
      }

      // Signup nudge (cookie user) — already injected by HTML, just show/hide
      var nudge = document.getElementById('signup-nudge');
      if (nudge) nudge.style.display = isLoggedIn() ? 'none' : 'flex';

      // Save history
      var history = JSON.parse(localStorage.getItem('epa608History') || '[]');
      history.push({
        type: HISTORY_KEY, category: CATEGORY, score: pct,
        date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(),
        detailedResults: details
      });
      localStorage.setItem('epa608History', JSON.stringify(history));

      // Anonymous tracking
      try {
        var anonId = localStorage.getItem('epa608_anon_id') || null;
        var timeSpent = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : null;
        fetch('https://epa608practicetest.net/api/anonymous-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anonymous_id: anonId, category: CATEGORY, score: score,
            total: this.questions.length, time_spent: timeSpent })
        }).catch(function(){});
      } catch(e) {}

      // AI Tutor nudge — show only to logged-in users with wrong answers
      if (isLoggedIn() && wrongCount > 0) {
        var tutorNudge = document.getElementById('tutor-nudge');
        if (!tutorNudge) {
          tutorNudge = document.createElement('div');
          tutorNudge.id = 'tutor-nudge';
          tutorNudge.style.cssText = 'margin-top:16px;padding:14px 16px;background:#f5f3ff;border:1.5px solid #c4b5fd;border-radius:12px;display:flex;align-items:center;gap:12px';
          tutorNudge.innerHTML = '<span style="font-size:22px">🤖</span>'
            + '<div style="flex:1">'
            + '<div style="font-size:13px;font-weight:700;color:#4c1d95">Ask the AI Tutor why you got those wrong</div>'
            + '<div style="font-size:12px;color:#6d28d9;margin-top:2px">Get instant explanations for any question</div>'
            + '</div>'
            + '<a href="https://epa608practicetest.net/tutor" style="background:#7c3aed;color:#fff;font-size:12px;font-weight:700;padding:8px 14px;border-radius:8px;text-decoration:none;white-space:nowrap">Open Tutor →</a>';
          var resultDetails = document.getElementById('resultDetails');
          if (resultDetails) resultDetails.appendChild(tutorNudge);
        }
        tutorNudge.style.display = 'flex';
      }

      window.scrollTo(0, 0);
    },

    startTimer: function() {
      var self = this;
      this.timer = setInterval(function() {
        self.timeLeft--;
        var m = Math.floor(self.timeLeft / 60);
        var s = self.timeLeft % 60;
        var el = document.getElementById('countdown');
        if (el) {
          el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
          if (self.timeLeft <= 60) el.style.color = '#dc2626';
        }
        if (self.timeLeft <= 0) self.finish();
      }, 1000);
    }
  };

  window.ctrl = ctrl;
  document.addEventListener('DOMContentLoaded', function() { ctrl.init(); });
}
