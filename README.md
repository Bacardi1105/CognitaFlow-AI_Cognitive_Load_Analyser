# CognitaFlow — Cognitive Load & Stress Assessment

A science-backed web application inspired by **NASA TLX** and **TSST** stress evaluation protocols. Combines webcam eye-tracking, voice stress analysis, and an AI-generated questionnaire to produce a unified cognitive load score.

---

## Quick Start

### 1. Install dependencies

```bash
cd     CognitaFlow-AI_Cognitive_Load_Analyser
pip install -r requirements.txt
```

### 2. Add your OpenRouter API key *(optional but recommended)*

```bash
cp .env.example .env
```

Open `.env` and replace `your_api_key_here` with your real key:

```
OPENROUTER_API_KEY=sk-or-...
```

> **Where to get a key:** Sign up free at [openrouter.ai/keys](https://openrouter.ai/keys).  
> **The app works without a key** — it falls back to a built-in question bank automatically.

### 3. Run the server

```bash
python main.py
```

Open your browser at **http://localhost:8000**

---

## Assessment Flow

| Step | Page | Duration |
|------|------|----------|
| 1 | Welcome & profession selection | ~30 s |
| 2 | Webcam eye-tracking test | 30 s |
| 3 | Voice stress recording | 30 s |
| 4 | AI-generated questionnaire (20 Qs) | ~3 min |
| 5 | Results dashboard | — |

---

## How Scoring Works

### Webcam Score (0–100)
Derived from three signals captured via your browser camera:

| Metric | Normal Range | Stress Indicator |
|--------|-------------|-----------------|
| Blink rate | 15–20 blinks/min | < 8 or > 30 |
| Eye openness | 30–50 % of face | Squinting or wide eyes |
| Gaze stability | Stable | Frequent gaze shifts |

### Voice Score (0–100)
Measured over a 30-second recording:

| Metric | Normal | Stress Indicator |
|--------|--------|-----------------|
| Speech rate | 120–160 wpm | < 80 or > 200 |
| Pause ratio | < 25 % silence | High silence % |
| Pause count | < 5 | Many hesitations |

### Questionnaire Score (0–100)
20 NASA-TLX-inspired questions rated 1–5 across six dimensions:
- Mental Demand
- Temporal Demand  
- Performance
- Effort
- Frustration
- Physical Demand

### Final Cognitive Load

```
CognitiveLoad = 0.50 × QuestionnaireScore
              + 0.25 × EyeStressScore
              + 0.25 × VoiceStressScore
```

| Range | Level | Interpretation |
|-------|-------|---------------|
| 0–34  | Low | Healthy, focused state |
| 35–64 | Moderate | Normal working load |
| 65–100| High | Elevated — rest recommended |

---

## Project Structure

```
cognitive_load_project/
├── main.py                  # FastAPI app & API routes
├── requirements.txt
├── .env.example             # API key template
├── results.json             # Auto-created — stores session data
├── services/
│   ├── ai_service.py        # OpenRouter API integration
│   ├── scoring.py           # Webcam, voice & CL scoring algorithms
│   └── question_generator.py# Fallback question bank
├── templates/
│   ├── index.html           # Welcome / profession selection
│   ├── webcam.html          # Eye-tracking test
│   ├── voice.html           # Voice recording test
│   ├── questionnaire.html   # Q&A interface
│   └── dashboard.html       # Results & charts
└── static/
    ├── style.css            # Full UI theme
    ├── webcam.js            # Camera capture & analysis
    ├── voice.js             # Microphone recording & analysis
    ├── questionnaire.js     # Question navigation & submission
    └── dashboard.js         # Chart.js visualisations
```

---

## Browser Requirements

| Feature | Requirement |
|---------|------------|
| Webcam | Any modern browser (Chrome, Firefox, Edge, Safari) |
| Microphone | Any modern browser |
| Speech-to-text (WPM) | Chrome / Edge (optional — fallback used otherwise) |

> Use **HTTPS or localhost** — browsers block camera/microphone on plain HTTP.

---

## Data Privacy

- No video or audio is ever stored or transmitted beyond your local machine.
- Session results are saved to `results.json` on your local disk only.
- The OpenRouter API receives only the profession string (to generate questions).

---

## Troubleshooting

**Camera / mic not working?**  
Ensure you are accessing the app via `http://localhost:8000` (not a remote IP).

**Questions not loading?**  
Check your `.env` file has a valid `OPENROUTER_API_KEY`. The app will fall back to built-in questions automatically if the key is missing or invalid.

**Port already in use?**  
Edit the last line of `main.py` and change `port=8000` to another port.
