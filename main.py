import os
import json
import uuid
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

from services.ai_service import generate_questions
from services.scoring import calculate_cognitive_load, score_webcam, score_voice
from services.question_generator import fallback_questions

load_dotenv()

app = FastAPI(title="CognitaFlow - Cognitive Load Assessment")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

DATA_FILE = "results.json"


def load_results():
    if Path(DATA_FILE).exists():
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {}


def save_results(data: dict):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ─── Models ──────────────────────────────────────────────────────────────────

class WebcamMetrics(BaseModel):
    blink_rate: float
    eye_openness: float
    gaze_stability: float
    session_id: str

class VoiceMetrics(BaseModel):
    speech_rate: float
    pause_count: int
    speaking_duration: float
    total_duration: float
    session_id: str

class QuestionnaireRequest(BaseModel):
    profession: str
    session_id: str

class QuestionnaireAnswers(BaseModel):
    answers: List[int]
    session_id: str

class StartSession(BaseModel):
    profession: str


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/webcam", response_class=HTMLResponse)
async def webcam_page(request: Request, session_id: str = ""):
    return templates.TemplateResponse("webcam.html", {"request": request, "session_id": session_id})


@app.get("/voice", response_class=HTMLResponse)
async def voice_page(request: Request, session_id: str = ""):
    return templates.TemplateResponse("voice.html", {"request": request, "session_id": session_id})


@app.get("/questionnaire", response_class=HTMLResponse)
async def questionnaire_page(request: Request, session_id: str = ""):
    return templates.TemplateResponse("questionnaire.html", {"request": request, "session_id": session_id})


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request, session_id: str = ""):
    return templates.TemplateResponse("dashboard.html", {"request": request, "session_id": session_id})


# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.post("/api/session/start")
async def start_session(body: StartSession):
    session_id = str(uuid.uuid4())[:8]
    results = load_results()
    results[session_id] = {
        "profession": body.profession,
        "created_at": datetime.now().isoformat(),
        "webcam_score": None,
        "voice_score": None,
        "questionnaire_score": None,
        "cognitive_load": None,
        "webcam_metrics": {},
        "voice_metrics": {},
    }
    save_results(results)
    return {"session_id": session_id}


@app.post("/api/webcam/submit")
async def submit_webcam(metrics: WebcamMetrics):
    score = score_webcam(
        blink_rate=metrics.blink_rate,
        eye_openness=metrics.eye_openness,
        gaze_stability=metrics.gaze_stability,
    )
    results = load_results()
    if metrics.session_id in results:
        results[metrics.session_id]["webcam_score"] = score
        results[metrics.session_id]["webcam_metrics"] = metrics.dict()
        save_results(results)
    return {"webcam_score": score, "session_id": metrics.session_id}


@app.post("/api/voice/submit")
async def submit_voice(metrics: VoiceMetrics):
    score = score_voice(
        speech_rate=metrics.speech_rate,
        pause_count=metrics.pause_count,
        speaking_duration=metrics.speaking_duration,
        total_duration=metrics.total_duration,
    )
    results = load_results()
    if metrics.session_id in results:
        results[metrics.session_id]["voice_score"] = score
        results[metrics.session_id]["voice_metrics"] = metrics.dict()
        save_results(results)
    return {"voice_score": score, "session_id": metrics.session_id}


@app.get("/api/questions/{session_id}")
async def get_questions(session_id: str):
    results = load_results()
    profession = results.get(session_id, {}).get("profession", "professional")
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if api_key and api_key != "your_api_key_here":
        questions = await generate_questions(profession, api_key)
    else:
        questions = fallback_questions(profession)
    return {"questions": questions, "profession": profession}


@app.post("/api/questionnaire/submit")
async def submit_questionnaire(body: QuestionnaireAnswers):
    if not body.answers:
        raise HTTPException(status_code=400, detail="No answers provided")
    raw_score = sum(body.answers) / len(body.answers)
    normalized = round(((raw_score - 1) / 4) * 100, 2)

    results = load_results()
    if body.session_id in results:
        results[body.session_id]["questionnaire_score"] = normalized

        ws = results[body.session_id].get("webcam_score") or 50.0
        vs = results[body.session_id].get("voice_score") or 50.0
        cl = calculate_cognitive_load(
            questionnaire_score=normalized,
            webcam_score=ws,
            voice_score=vs,
        )
        results[body.session_id]["cognitive_load"] = cl
        save_results(results)
        return {
            "questionnaire_score": normalized,
            "cognitive_load": cl,
            "session_id": body.session_id,
        }
    return {"questionnaire_score": normalized, "session_id": body.session_id}


@app.get("/api/results/{session_id}")
async def get_results(session_id: str):
    results = load_results()
    if session_id not in results:
        raise HTTPException(status_code=404, detail="Session not found")
    return results[session_id]


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
