// ── questionnaire.js ──────────────────────────────────────────────────────

let questions = [];
let answers   = [];
let current   = 0;
let sessionId = '';

const DIMENSION_LABELS = {
  mental_demand:   'Mental Demand',
  physical_demand: 'Physical Demand',
  temporal_demand: 'Time Pressure',
  performance:     'Performance',
  effort:          'Effort',
  frustration:     'Frustration',
};

async function loadQuestions(sid) {
  sessionId = sid;
  try {
    const res  = await fetch(`/api/questions/${sid}`);
    const data = await res.json();
    questions  = data.questions;
    answers    = new Array(questions.length).fill(0);

    document.getElementById('loading-section').style.display   = 'none';
    document.getElementById('questionnaire-section').style.display = 'block';
    renderQuestion(0);
  } catch (e) {
    document.getElementById('loading-section').innerHTML =
      '<div class="alert alert-danger">Failed to load questions. Please refresh.</div>';
  }
}

function renderQuestion(idx) {
  const q = questions[idx];
  const total = questions.length;

  document.getElementById('q-counter').textContent =
    `Question ${idx + 1} / ${total}`;

  const dimKey = q.dimension || '';
  const dimTag = document.getElementById('q-dimension-tag');
  dimTag.textContent  = DIMENSION_LABELS[dimKey] || dimKey;
  dimTag.className    = `dimension-tag dim-${dimKey}`;

  document.getElementById('q-text').textContent = q.question;

  // Progress bar
  document.getElementById('q-progress-fill').style.width =
    `${((idx) / total) * 100}%`;

  // Highlight selected answer
  const btns = document.querySelectorAll('.rating-btn');
  btns.forEach((btn, i) => {
    btn.classList.toggle('selected', answers[idx] === i + 1);
  });

  // Nav buttons
  document.getElementById('prev-btn').disabled = idx === 0;
  document.getElementById('next-btn').disabled = answers[idx] === 0;

  const nextBtn = document.getElementById('next-btn');
  if (idx === total - 1) {
    nextBtn.textContent = answers[idx] > 0 ? 'Submit →' : 'Next →';
  } else {
    nextBtn.textContent = 'Next →';
  }

  current = idx;
}

function selectRating(val) {
  answers[current] = val;

  // Highlight
  const btns = document.querySelectorAll('.rating-btn');
  btns.forEach((btn, i) => {
    btn.classList.toggle('selected', i + 1 === val);
  });

  document.getElementById('next-btn').disabled = false;

  const nextBtn = document.getElementById('next-btn');
  if (current === questions.length - 1) {
    nextBtn.textContent = 'Submit →';
  }
}

function nextQuestion() {
  if (answers[current] === 0) return;

  if (current === questions.length - 1) {
    submitQuestionnaire();
  } else {
    renderQuestion(current + 1);
  }
}

function prevQuestion() {
  if (current > 0) renderQuestion(current - 1);
}

async function submitQuestionnaire() {
  // Check all answered
  const unanswered = answers.filter(a => a === 0).length;
  if (unanswered > 0) {
    alert(`Please answer all questions. ${unanswered} question(s) remaining.`);
    return;
  }

  document.getElementById('questionnaire-section').style.display = 'none';
  document.getElementById('submitting-section').style.display    = 'block';

  try {
    const res = await fetch('/api/questionnaire/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, session_id: sessionId })
    });
    const data = await res.json();
    window.location.href = `/dashboard?session_id=${sessionId}`;
  } catch (e) {
    document.getElementById('submitting-section').innerHTML =
      '<div class="alert alert-danger">Failed to submit. Please refresh and try again.</div>';
  }
}
