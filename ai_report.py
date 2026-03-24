"""
ai_report.py  — CognitaFlow AI Insight Report Generator
─────────────────────────────────────────────────────────
Drop this file into your cognitive_load_project/ folder.
Run:  python ai_report.py

• Reads results.json and .env from the same folder automatically.
• Calls OpenRouter AI to produce a deep personalised analysis.
• Writes a beautiful self-contained HTML report: report_<session_id>.html
• Opens the report in your browser automatically.

Requirements: same requirements.txt already installed (httpx, python-dotenv).
"""

import os, json, sys, asyncio, webbrowser, re
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import httpx

# ── Config ────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
DATA_FILE  = BASE_DIR / "results.json"
ENV_FILE   = BASE_DIR / ".env"
API_URL    = "https://openrouter.ai/api/v1/chat/completions"
MODEL      = "openai/gpt-4o-mini"

load_dotenv(ENV_FILE)
API_KEY = os.getenv("OPENROUTER_API_KEY", "")


# ── Data loading ──────────────────────────────────────────────────────────
def load_latest_session() -> tuple[str, dict]:
    if not DATA_FILE.exists():
        print("✗  results.json not found. Complete an assessment first.")
        sys.exit(1)
    data = json.loads(DATA_FILE.read_text())
    if not data:
        print("✗  No sessions found in results.json.")
        sys.exit(1)
    # Pick most recently created session
    session_id = max(data, key=lambda k: data[k].get("created_at", ""))
    return session_id, data[session_id]


# ── AI calls ─────────────────────────────────────────────────────────────
async def ai_call(prompt: str, system: str = "") -> str:
    if not API_KEY or API_KEY == "your_api_key_here":
        return "[AI analysis unavailable — add your OPENROUTER_API_KEY to .env]"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "CognitaFlow Report",
    }
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    payload = {"model": MODEL, "messages": messages, "max_tokens": 1000, "temperature": 0.7}
    async with httpx.AsyncClient(timeout=40.0) as client:
        r = await client.post(API_URL, headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


async def generate_insights(session_id: str, session: dict) -> dict:
    profession   = session.get("profession", "professional")
    cl           = session.get("cognitive_load") or 0
    qs           = session.get("questionnaire_score") or 0
    ws           = session.get("webcam_score") or 0
    vs           = session.get("voice_score") or 0
    wm           = session.get("webcam_metrics", {})
    vm           = session.get("voice_metrics", {})
    created_at   = session.get("created_at", "")[:10]

    level = "Low" if cl < 35 else ("Moderate" if cl < 65 else "High")

    base_context = f"""
User profile:
- Profession: {profession}
- Assessment date: {created_at}
- Overall Cognitive Load: {cl:.1f}/100 ({level})
- Questionnaire score (self-report): {qs:.1f}/100
- Eye stress score (webcam): {ws:.1f}/100
- Voice stress score (audio): {vs:.1f}/100
- Blink rate: {wm.get('blink_rate', 'N/A')} blinks/min
- Eye openness: {wm.get('eye_openness', 'N/A')}
- Gaze stability: {wm.get('gaze_stability', 'N/A')}
- Speech rate: {vm.get('speech_rate', 'N/A')} wpm
- Pause count: {vm.get('pause_count', 'N/A')}
- Speaking duration: {vm.get('speaking_duration', 'N/A')}s of {vm.get('total_duration', 30)}s
"""

    print("  → Generating executive summary…")
    summary = await ai_call(
        base_context + "\nWrite a 3-sentence executive summary of this person's cognitive state. "
        "Be specific and clinical. Reference actual numbers. Do not use bullet points.",
        "You are a cognitive neuroscience expert interpreting stress and cognitive load assessments."
    )

    print("  → Analysing biometric patterns…")
    biometrics = await ai_call(
        base_context + f"\nAnalyse the biometric signals in detail:\n"
        f"1. What does the blink rate of {wm.get('blink_rate','N/A')} bpm suggest?\n"
        f"2. What does the eye openness of {wm.get('eye_openness','N/A')} indicate?\n"
        f"3. What does a speech rate of {vm.get('speech_rate','N/A')} wpm with "
        f"{vm.get('pause_count','N/A')} pauses reveal?\n"
        "Give a paragraph for each. Be analytical, not generic.",
        "You are a psychophysiologist specialising in stress biomarkers."
    )

    print("  → Generating profession-specific recommendations…")
    recommendations = await ai_call(
        base_context + f"\nGenerate 5 highly specific, actionable recommendations for a {profession} "
        f"with a {level.lower()} cognitive load score of {cl:.1f}. "
        "Each recommendation must reference their specific profession and specific score values. "
        "Format: numbered list, each item 2-3 sentences. No generic wellness advice.",
        "You are an occupational psychologist specialising in cognitive performance."
    )

    print("  → Predicting risk factors…")
    risks = await ai_call(
        base_context + f"\nBased on the pattern of scores (self-report: {qs:.1f}, eye: {ws:.1f}, "
        f"voice: {vs:.1f}), identify: (a) which score diverges most from the others and what that "
        f"divergence suggests about the person's coping mechanisms, (b) 2 specific burnout risk factors "
        f"for a {profession} with this profile, (c) one protective factor visible in the data. "
        "Be specific and insightful, not generic.",
        "You are a burnout researcher and clinical psychologist."
    )

    print("  → Generating weekly action plan…")
    action_plan = await ai_call(
        base_context + f"\nCreate a 5-day action plan (Monday–Friday) for a {profession} "
        f"to reduce their {level.lower()} cognitive load. "
        "Each day: one morning technique (2 min), one work-session strategy, one end-of-day ritual. "
        "Make every item concrete and time-specific. Format as a table with columns: Day | Morning | During work | Evening.",
        "You are an evidence-based productivity coach specialising in cognitive load reduction."
    )

    print("  → Generating neurological interpretation…")
    neuro = await ai_call(
        base_context + "\nGive a brief (4-5 sentences) neurological interpretation: which brain regions and "
        "neurotransmitter systems are likely implicated by these scores? Connect prefrontal cortex workload, "
        "HPA axis activation, and dopamine/norepinephrine balance to the specific numbers. "
        "Write for an educated non-specialist.",
        "You are a cognitive neuroscientist."
    )

    return {
        "summary": summary,
        "biometrics": biometrics,
        "recommendations": recommendations,
        "risks": risks,
        "action_plan": action_plan,
        "neuro": neuro,
        "meta": {
            "profession": profession,
            "cl": cl, "qs": qs, "ws": ws, "vs": vs,
            "level": level,
            "created_at": created_at,
            "session_id": session_id,
            "wm": wm, "vm": vm,
        }
    }


# ── HTML generation ────────────────────────────────────────────────────────
def render_html(insights: dict) -> str:
    m     = insights["meta"]
    level = m["level"]
    cl    = m["cl"]
    qs    = m["qs"]
    ws    = m["ws"]
    vs    = m["vs"]

    level_color = {"Low": "#00c896", "Moderate": "#f59e0b", "High": "#ef4444"}[level]
    ring_offset = 527.8 * (1 - cl / 100)

    def fmt(text: str) -> str:
        """Convert numbered lists and newlines to basic HTML."""
        text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        lines = text.split("\n")
        out, in_list = [], False
        for line in lines:
            stripped = line.strip()
            if re.match(r"^\d+\.", stripped):
                if not in_list:
                    out.append("<ol>"); in_list = True
                out.append(f"<li>{re.sub(r'^\d+\.\s*', '', stripped)}</li>")
            else:
                if in_list:
                    out.append("</ol>"); in_list = False
                if stripped:
                    if stripped.startswith("Day |") or stripped.startswith("---") or "|" in stripped:
                        out.append(f'<span class="mono-line">{stripped}</span><br>')
                    else:
                        out.append(f"<p>{stripped}</p>")
        if in_list:
            out.append("</ol>")
        return "\n".join(out)

    def table_fmt(text: str) -> str:
        """Convert pipe-table text to HTML table."""
        lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
        rows = [l for l in lines if l.startswith("|") and not re.match(r"^\|[-| ]+\|$", l)]
        if len(rows) < 2:
            return fmt(text)
        html = ['<table class="action-table"><thead>']
        headers = [c.strip() for c in rows[0].split("|") if c.strip()]
        html.append("<tr>" + "".join(f"<th>{h}</th>" for h in headers) + "</tr>")
        html.append("</thead><tbody>")
        for row in rows[1:]:
            cells = [c.strip() for c in row.split("|") if c.strip()]
            while len(cells) < len(headers): cells.append("")
            html.append("<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
        html.append("</tbody></table>")
        return "\n".join(html)

    generated_at = datetime.now().strftime("%B %d, %Y at %H:%M")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CognitaFlow AI Report — {m['profession']}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
<style>
:root {{
  --bg: #08090d;
  --surface: #0f1117;
  --surface2: #181c26;
  --border: #1e2535;
  --accent: #00e5c3;
  --accent2: #7c6af7;
  --accent3: #f25c9b;
  --text: #e8eaf2;
  --muted: #6b7394;
  --font-head: 'Syne', sans-serif;
  --font-mono: 'Space Mono', monospace;
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.8;
}}
body::before {{
  content:'';
  position:fixed; inset:0;
  background-image:
    linear-gradient(rgba(0,229,195,.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,229,195,.03) 1px,transparent 1px);
  background-size:40px 40px;
  pointer-events:none; z-index:0;
}}
.wrap {{ max-width:860px; margin:0 auto; padding:0 24px; position:relative; z-index:1; }}

/* HEADER */
header {{
  padding: 60px 0 40px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 48px;
}}
.report-tag {{
  display:inline-block;
  font-size:11px; letter-spacing:2px; text-transform:uppercase;
  color:var(--accent); border:1px solid rgba(0,229,195,.3);
  border-radius:100px; padding:4px 14px; margin-bottom:20px;
}}
header h1 {{
  font-family:var(--font-head); font-weight:800;
  font-size:clamp(28px,5vw,48px); letter-spacing:-1px;
  margin-bottom:8px;
}}
header h1 em {{ font-style:normal; color:var(--accent); }}
.report-meta {{ color:var(--muted); font-size:12px; }}

/* SCORE HERO */
.score-hero {{
  display:grid; grid-template-columns:200px 1fr; gap:40px; align-items:center;
  background:var(--surface); border:1px solid var(--border);
  border-radius:16px; padding:36px; margin-bottom:32px;
}}
.ring-wrap {{ position:relative; width:180px; height:180px; flex-shrink:0; }}
.ring-wrap svg {{ transform:rotate(-90deg); }}
.ring-inner {{
  position:absolute; inset:0;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
}}
.ring-inner .big {{ font-family:var(--font-head); font-size:48px; font-weight:800; color:{level_color}; line-height:1; }}
.ring-inner .lbl {{ font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); }}
.score-info h2 {{
  font-family:var(--font-head); font-size:22px; font-weight:700;
  margin-bottom:8px;
}}
.level-pill {{
  display:inline-block; padding:4px 16px; border-radius:100px;
  font-size:12px; font-weight:700; margin-bottom:16px;
  background:rgba({','.join(str(int(level_color.lstrip('#')[i:i+2],16)) for i in (0,2,4))},.15);
  color:{level_color}; border:1px solid rgba({','.join(str(int(level_color.lstrip('#')[i:i+2],16)) for i in (0,2,4))},.35);
}}
.score-bars {{ display:flex; flex-direction:column; gap:10px; }}
.bar-row {{ display:flex; align-items:center; gap:12px; font-size:12px; }}
.bar-row .bar-lbl {{ width:120px; color:var(--muted); flex-shrink:0; }}
.bar-track {{ flex:1; height:6px; background:var(--border); border-radius:3px; overflow:hidden; }}
.bar-fill {{ height:100%; border-radius:3px; transition:width 1s ease; }}
.bar-val {{ width:36px; text-align:right; font-family:var(--font-head); font-weight:700; font-size:13px; }}

/* SECTIONS */
section {{ margin-bottom:40px; }}
.section-head {{
  display:flex; align-items:center; gap:10px;
  margin-bottom:20px; padding-bottom:12px;
  border-bottom:1px solid var(--border);
}}
.section-head h2 {{ font-family:var(--font-head); font-weight:700; font-size:18px; }}
.section-icon {{
  width:36px; height:36px; border-radius:8px;
  background:rgba(0,229,195,.1); border:1px solid rgba(0,229,195,.2);
  display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;
}}
.card {{ background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:28px; margin-bottom:16px; }}
.card p {{ margin-bottom:12px; color:var(--text); }}
.card p:last-child {{ margin-bottom:0; }}
.card ol {{ padding-left:20px; }}
.card ol li {{ margin-bottom:10px; }}
.mono-line {{ font-family:var(--font-mono); font-size:12px; color:var(--muted); }}

/* ACTION TABLE */
.action-table {{ width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }}
.action-table th {{
  background:var(--surface2); color:var(--muted);
  font-size:11px; letter-spacing:1px; text-transform:uppercase;
  padding:10px 14px; text-align:left; border-bottom:1px solid var(--border);
}}
.action-table td {{ padding:10px 14px; border-bottom:1px solid var(--border); vertical-align:top; }}
.action-table tr:last-child td {{ border-bottom:none; }}
.action-table tr:hover td {{ background:var(--surface2); }}

/* BIOMETRIC GRID */
.bio-grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:20px; }}
.bio-box {{
  background:var(--surface2); border:1px solid var(--border);
  border-radius:10px; padding:20px;
}}
.bio-box .val {{ font-family:var(--font-head); font-size:30px; font-weight:800; color:var(--accent); }}
.bio-box .lbl {{ font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-top:4px; }}
.bio-box .sub {{ font-size:12px; color:var(--muted); margin-top:6px; }}

/* CHART */
.chart-wrap {{
  background:var(--surface); border:1px solid var(--border);
  border-radius:12px; padding:24px; margin-bottom:16px;
}}
.chart-wrap h3 {{ font-family:var(--font-head); font-size:14px; color:var(--muted); margin-bottom:20px; }}

/* RISK BADGES */
.risk-good {{ color:#00e5c3; }}
.risk-warn {{ color:#f59e0b; }}
.risk-bad  {{ color:#ef4444; }}

/* FOOTER */
footer {{
  text-align:center; padding:40px 0;
  border-top:1px solid var(--border);
  color:var(--muted); font-size:11px;
}}

@media (max-width:600px) {{
  .score-hero {{ grid-template-columns:1fr; }}
  .ring-wrap {{ margin:0 auto; }}
}}
</style>
</head>
<body>
<div class="wrap">

<header>
  <div class="report-tag">CognitaFlow AI Analysis Report</div>
  <h1>Cognitive Load Report<br>for <em>{m['profession']}</em></h1>
  <p class="report-meta">Session {m['session_id']} · Assessed {m['created_at']} · Generated {generated_at}</p>
</header>

<!-- SCORE HERO -->
<div class="score-hero">
  <div class="ring-wrap">
    <svg viewBox="0 0 180 180" width="180" height="180">
      <circle cx="90" cy="90" r="80" fill="none" stroke="#1e2535" stroke-width="14"/>
      <circle cx="90" cy="90" r="80" fill="none"
        stroke="{level_color}" stroke-width="14"
        stroke-dasharray="502.7" stroke-dashoffset="{502.7 * (1 - cl/100):.1f}"
        stroke-linecap="round"/>
    </svg>
    <div class="ring-inner">
      <span class="big">{cl:.0f}</span>
      <span class="lbl">/ 100</span>
    </div>
  </div>
  <div class="score-info">
    <h2>Overall Cognitive Load</h2>
    <span class="level-pill">{level} Load</span>
    <div class="score-bars">
      <div class="bar-row">
        <span class="bar-lbl">Questionnaire (50%)</span>
        <div class="bar-track"><div class="bar-fill" style="width:{qs:.0f}%;background:#7c6af7"></div></div>
        <span class="bar-val" style="color:#7c6af7">{qs:.0f}</span>
      </div>
      <div class="bar-row">
        <span class="bar-lbl">Eye Stress (25%)</span>
        <div class="bar-track"><div class="bar-fill" style="width:{ws:.0f}%;background:#00e5c3"></div></div>
        <span class="bar-val" style="color:#00e5c3">{ws:.0f}</span>
      </div>
      <div class="bar-row">
        <span class="bar-lbl">Voice Stress (25%)</span>
        <div class="bar-track"><div class="bar-fill" style="width:{vs:.0f}%;background:#f25c9b"></div></div>
        <span class="bar-val" style="color:#f25c9b">{vs:.0f}</span>
      </div>
    </div>
  </div>
</div>

<!-- BIOMETRICS RAW -->
<div class="bio-grid">
  <div class="bio-box">
    <div class="val">{m['wm'].get('blink_rate','—')}</div>
    <div class="lbl">Blinks / min</div>
    <div class="sub">Normal: 15–20</div>
  </div>
  <div class="bio-box">
    <div class="val">{float(m['wm'].get('eye_openness',0))*100:.0f}%</div>
    <div class="lbl">Eye openness</div>
    <div class="sub">Normal: 30–50%</div>
  </div>
  <div class="bio-box">
    <div class="val">{m['vm'].get('speech_rate','—')}</div>
    <div class="lbl">Words / min</div>
    <div class="sub">Normal: 120–160</div>
  </div>
  <div class="bio-box">
    <div class="val">{m['vm'].get('pause_count','—')}</div>
    <div class="lbl">Pauses detected</div>
    <div class="sub">Low = better</div>
  </div>
  <div class="bio-box">
    <div class="val">{float(m['vm'].get('speaking_duration',0)):.1f}s</div>
    <div class="lbl">Speaking time</div>
    <div class="sub">of {m['vm'].get('total_duration',30)}s total</div>
  </div>
  <div class="bio-box">
    <div class="val">{float(m['wm'].get('gaze_stability',0)):.3f}</div>
    <div class="lbl">Gaze instability</div>
    <div class="sub">Lower = more stable</div>
  </div>
</div>

<!-- CHARTS -->
<div class="chart-wrap">
  <h3>Score breakdown (weighted contribution)</h3>
  <div style="position:relative;height:220px"><canvas id="barChart"></canvas></div>
</div>
<div class="chart-wrap">
  <h3>Modality comparison radar</h3>
  <div style="position:relative;height:280px"><canvas id="radarChart"></canvas></div>
</div>

<!-- AI SECTIONS -->
<section>
  <div class="section-head"><div class="section-icon">🧠</div><h2>Executive Summary</h2></div>
  <div class="card">{fmt(insights['summary'])}</div>
</section>

<section>
  <div class="section-head"><div class="section-icon">📡</div><h2>Biometric Signal Analysis</h2></div>
  <div class="card">{fmt(insights['biometrics'])}</div>
</section>

<section>
  <div class="section-head"><div class="section-icon">💡</div><h2>Profession-Specific Recommendations</h2></div>
  <div class="card">{fmt(insights['recommendations'])}</div>
</section>

<section>
  <div class="section-head"><div class="section-icon">⚠️</div><h2>Risk Factor Analysis</h2></div>
  <div class="card">{fmt(insights['risks'])}</div>
</section>

<section>
  <div class="section-head"><div class="section-icon">📅</div><h2>5-Day Action Plan</h2></div>
  <div class="card">{table_fmt(insights['action_plan'])}</div>
</section>

<section>
  <div class="section-head"><div class="section-icon">🔬</div><h2>Neurological Interpretation</h2></div>
  <div class="card">{fmt(insights['neuro'])}</div>
</section>

<footer>
  <p>CognitaFlow AI Report · Session {m['session_id']} · Powered by OpenRouter</p>
  <p style="margin-top:6px">Based on NASA TLX (Hart &amp; Staveland, 1988) · TSST protocol · Biometric stress markers</p>
</footer>

</div><!-- /wrap -->

<script>
Chart.defaults.color = '#6b7394';
Chart.defaults.borderColor = '#1e2535';

new Chart(document.getElementById('barChart'), {{
  type: 'bar',
  data: {{
    labels: ['Questionnaire (50%)', 'Eye Stress (25%)', 'Voice Stress (25%)'],
    datasets: [{{
      data: [{qs*0.5:.1f}, {ws*0.25:.1f}, {vs*0.25:.1f}],
      backgroundColor: ['rgba(124,106,247,0.7)', 'rgba(0,229,195,0.7)', 'rgba(242,92,155,0.7)'],
      borderColor:     ['#7c6af7', '#00e5c3', '#f25c9b'],
      borderWidth: 1, borderRadius: 6,
    }}]
  }},
  options: {{
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    scales: {{
      x: {{ min:0, max:55, grid:{{ color:'#1e2535' }} }},
      y: {{ grid:{{ display:false }} }}
    }},
    plugins: {{ legend:{{ display:false }} }}
  }}
}});

new Chart(document.getElementById('radarChart'), {{
  type: 'radar',
  data: {{
    labels: ['Questionnaire', 'Eye Stress', 'Voice Stress', 'Overall CL'],
    datasets: [{{
      label: 'Your scores',
      data: [{qs:.1f}, {ws:.1f}, {vs:.1f}, {cl:.1f}],
      backgroundColor: 'rgba(0,229,195,0.1)',
      borderColor: '#00e5c3', borderWidth: 2,
      pointBackgroundColor: '#00e5c3', pointRadius: 4,
    }}]
  }},
  options: {{
    responsive: true, maintainAspectRatio: false,
    scales: {{
      r: {{
        min:0, max:100, ticks:{{ stepSize:25, font:{{size:10}} }},
        grid:{{ color:'#1e2535' }}, angleLines:{{ color:'#1e2535' }},
        pointLabels:{{ font:{{size:12}}, color:'#6b7394' }}
      }}
    }},
    plugins: {{ legend:{{ display:false }} }}
  }}
}});
</script>
</body>
</html>"""


# ── Main ──────────────────────────────────────────────────────────────────
async def main():
    print("\n╔══════════════════════════════════════════╗")
    print("║   CognitaFlow — AI Report Generator     ║")
    print("╚══════════════════════════════════════════╝\n")

    print("→  Loading latest session from results.json…")
    session_id, session = load_latest_session()
    profession = session.get("profession", "professional")
    cl = session.get("cognitive_load") or 0
    print(f"   Session: {session_id} | Profession: {profession} | CL: {cl:.1f}")

    if not API_KEY or API_KEY == "your_api_key_here":
        print("\n⚠  No API key found in .env — report will show placeholder text.")
        print("   Add OPENROUTER_API_KEY=sk-or-... to your .env file for full AI analysis.\n")

    print("\n→  Calling AI for deep analysis (6 passes)…")
    insights = await generate_insights(session_id, session)

    out_path = BASE_DIR / f"report_{session_id}.html"
    print(f"\n→  Writing report to {out_path.name}…")
    out_path.write_text(render_html(insights), encoding="utf-8")

    print(f"✓  Report ready: {out_path}")
    print("→  Opening in browser…\n")
    webbrowser.open(out_path.as_uri())


if __name__ == "__main__":
    asyncio.run(main())
