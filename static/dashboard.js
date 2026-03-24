// ── dashboard.js ──────────────────────────────────────────────────────────

async function loadDashboard(sessionId) {
  try {
    const res  = await fetch(`/api/results/${sessionId}`);
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();

    document.getElementById('loading-results').style.display  = 'none';
    document.getElementById('results-content').style.display  = 'block';

    const cl = data.cognitive_load ?? 0;
    const qs = data.questionnaire_score ?? 0;
    const ws = data.webcam_score ?? 0;
    const vs = data.voice_score ?? 0;

    renderRing(cl);
    renderBreakdown(qs, ws, vs);
    renderLevel(cl);
    renderCharts(qs, ws, vs, cl);
    renderRecommendations(cl, qs, ws, vs);
  } catch (e) {
    document.getElementById('loading-results').innerHTML =
      '<div class="alert alert-danger">Could not load results. Did you complete the full assessment?</div>';
  }
}

// ─── Ring ──────────────────────────────────────────────────────────────────
function renderRing(cl) {
  document.getElementById('cl-score').textContent = Math.round(cl);

  const circumference = 2 * Math.PI * 84; // ≈ 527.8
  const offset = circumference * (1 - cl / 100);
  const ring = document.getElementById('ring-fill');

  setTimeout(() => {
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = scoreColor(cl);
  }, 200);

  document.getElementById('cl-score').style.color = scoreColor(cl);
}

// ─── Breakdown ─────────────────────────────────────────────────────────────
function renderBreakdown(qs, ws, vs) {
  document.getElementById('q-score').textContent = Math.round(qs);
  document.getElementById('e-score').textContent = Math.round(ws);
  document.getElementById('v-score').textContent = Math.round(vs);

  setTimeout(() => {
    document.getElementById('q-bar').style.width = qs + '%';
    document.getElementById('e-bar').style.width = ws + '%';
    document.getElementById('v-bar').style.width = vs + '%';
  }, 400);
}

// ─── Level Badge ───────────────────────────────────────────────────────────
function renderLevel(cl) {
  let level, cls, desc;
  if (cl < 35) {
    level = 'Low Load';  cls = 'level-low';
    desc = 'Your cognitive load is within a healthy range. You appear well-rested and focused. Maintain current habits.';
  } else if (cl < 65) {
    level = 'Moderate Load'; cls = 'level-moderate';
    desc = 'You are experiencing moderate cognitive strain. Consider short breaks, prioritisation, and stress-management techniques.';
  } else {
    level = 'High Load'; cls = 'level-high';
    desc = 'Your cognitive load is elevated. This level of sustained stress may impact decision-making and wellbeing. Rest and recovery are recommended.';
  }
  document.getElementById('level-badge-container').innerHTML =
    `<span class="level-badge ${cls}">${level}</span>`;
  document.getElementById('level-description').textContent = desc;
}

// ─── Charts ────────────────────────────────────────────────────────────────
function renderCharts(qs, ws, vs, cl) {
  const accent  = '#00e5c3';
  const accent2 = '#7c6af7';
  const accent3 = '#f25c9b';
  const warn    = '#ffa94d';
  const grid    = '#1e2535';
  const text    = '#6b7394';

  Chart.defaults.color = text;
  Chart.defaults.borderColor = grid;

  // Radar
  new Chart(document.getElementById('radar-chart'), {
    type: 'radar',
    data: {
      labels: ['Questionnaire', 'Eye Stress', 'Voice Stress', 'Overall Load'],
      datasets: [{
        label: 'Your Scores',
        data: [qs, ws, vs, cl],
        backgroundColor: 'rgba(0,229,195,0.1)',
        borderColor: accent,
        borderWidth: 2,
        pointBackgroundColor: accent,
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { stepSize: 25, font: { family: 'Space Mono', size: 10 } },
          grid: { color: grid },
          angleLines: { color: grid },
          pointLabels: { font: { family: 'Syne', size: 12 }, color: text }
        }
      },
      plugins: { legend: { display: false } }
    }
  });

  // Bar – weighted contribution
  new Chart(document.getElementById('bar-chart'), {
    type: 'bar',
    data: {
      labels: ['Questionnaire (50%)', 'Eye Stress (25%)', 'Voice Stress (25%)'],
      datasets: [{
        label: 'Weighted Contribution',
        data: [qs * 0.5, ws * 0.25, vs * 0.25],
        backgroundColor: [accent2 + 'cc', accent + 'cc', accent3 + 'cc'],
        borderColor:     [accent2, accent, accent3],
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      scales: {
        x: { min: 0, max: 100, grid: { color: grid } },
        y: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ─── Recommendations ───────────────────────────────────────────────────────
function renderRecommendations(cl, qs, ws, vs) {
  const recs = [];

  if (qs > 60) recs.push({ icon: '📋', text: 'Your self-reported task load is high. Try breaking large tasks into smaller milestones and use time-blocking to manage mental demand.' });
  if (ws > 55) recs.push({ icon: '👁️', text: 'Eye stress indicators suggest screen fatigue. Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.' });
  if (vs > 55) recs.push({ icon: '🎤', text: 'Your speech patterns indicate tension. Practice diaphragmatic breathing before meetings and take vocal rest breaks throughout the day.' });
  if (cl > 65) recs.push({ icon: '⚡', text: 'High overall load detected. Schedule at least one 15-minute restorative break today with no screens or work-related thinking.' });
  if (cl < 35) recs.push({ icon: '✅', text: 'Excellent cognitive state! This is a great time to tackle complex creative or analytical work that benefits from peak mental clarity.' });
  if (recs.length === 0) recs.push({ icon: '🔄', text: 'Moderate load is normal. Maintain regular breaks, hydration, and sleep hygiene to sustain this balance.' });

  const container = document.getElementById('recommendations-list');
  container.innerHTML = recs.map(r =>
    `<div class="alert alert-info" style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px">
      <span style="font-size:20px">${r.icon}</span>
      <span>${r.text}</span>
    </div>`
  ).join('');
}

// ─── Helper ────────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score < 35) return '#00e5c3';
  if (score < 65) return '#ffa94d';
  return '#ff4d6d';
}
