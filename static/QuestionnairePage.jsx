/**
 * QuestionnairePage.jsx
 * Main orchestrator for the NASA-TLX Questionnaire Engine.
 *
 * Responsibilities:
 *   - Load questions from JSON (via questionnaireService)
 *   - Step through questions one by one
 *   - Track answers in local React state
 *   - On submit: calculate score, persist to localStorage, show result
 *
 * Navigation props (optional — works standalone too):
 *   onComplete  {Function}  - (result) => void — called after submission,
 *                             use to push to /results or notify parent modules
 *   onExit      {Function}  - () => void — called when user exits early
 *
 * Exported for use in: speech-test, eye-test, dashboard modules.
 */

import React, { useEffect, useState, useCallback } from "react";
import QuestionCard from "../components/QuestionCard";
import QuestionnaireResult from "../components/QuestionnaireResult";
import {
  loadQuestions,
  calculateScore,
  saveResult,
} from "../services/questionnaireService";

// ── View states ──────────────────────────────────────────────────────────────
const VIEW = {
  LOADING: "loading",
  INTRO:   "intro",
  QUIZ:    "quiz",
  RESULT:  "result",
  ERROR:   "error",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function QuestionnairePage({ onComplete, onExit }) {
  const [view,       setView]       = useState(VIEW.LOADING);
  const [questions,  setQuestions]  = useState([]);
  const [answers,    setAnswers]    = useState({});   // { [id]: 1–5 }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [result,     setResult]     = useState(null);
  const [errorMsg,   setErrorMsg]   = useState("");

  // ── Load questions on mount ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadQuestions()
      .then((qs) => {
        if (cancelled) return;
        if (!qs || qs.length === 0) {
          setErrorMsg("No questions were found in the questionnaire file.");
          setView(VIEW.ERROR);
        } else {
          setQuestions(qs);
          setView(VIEW.INTRO);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err.message ?? "Failed to load questions.");
          setView(VIEW.ERROR);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    setAnswers({});
    setCurrentIdx(0);
    setView(VIEW.QUIZ);
  }, []);

  const handleAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    }
  }, [currentIdx, questions.length]);

  const handleBack = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
    }
  }, [currentIdx]);

  const handleSubmit = useCallback(() => {
    const score = calculateScore(answers);
    const saved = saveResult(score, answers, questions);
    setResult(saved);
    setView(VIEW.RESULT);
    if (onComplete) onComplete(saved);
  }, [answers, questions, onComplete]);

  const handleRetake = useCallback(() => {
    setResult(null);
    handleStart();
  }, [handleStart]);

  // ── Current question ───────────────────────────────────────────────────────
  const currentQuestion = questions[currentIdx] ?? null;
  const currentAnswer   = currentQuestion ? (answers[currentQuestion.id] ?? null) : null;
  const isLastQuestion  = currentIdx === questions.length - 1;
  const allAnswered     = questions.every((q) => answers[q.id] != null);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* ── Google Fonts inline ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; }
        button:hover { opacity: 0.82; }
        button:active { transform: scale(0.98); }
      `}</style>

      {/* ── LOADING ── */}
      {view === VIEW.LOADING && (
        <div style={styles.centered}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading questionnaire…</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {view === VIEW.ERROR && (
        <div style={styles.centered}>
          <p style={styles.errorIcon}>⚠</p>
          <p style={styles.errorMsg}>{errorMsg}</p>
          <button style={styles.primaryBtn} onClick={() => window.location.reload()}>
            Retry
          </button>
          {onExit && (
            <button style={styles.ghostBtn} onClick={onExit}>
              Exit
            </button>
          )}
        </div>
      )}

      {/* ── INTRO ── */}
      {view === VIEW.INTRO && (
        <div style={styles.introWrapper}>
          <div style={styles.introCard}>
            <p style={styles.tag}>Research Tool</p>
            <h1 style={styles.title}>NASA Task Load Index</h1>
            <p style={styles.subtitle}>
              The NASA-TLX is a multi-dimensional rating procedure that provides
              an overall workload score based on a weighted average of ratings on
              six subscales.
            </p>

            <div style={styles.metaRow}>
              <MetaItem icon="◇" label={`${questions.length} dimensions`} />
              <MetaItem icon="◇" label="1 – 5 scale" />
              <MetaItem icon="◇" label="~2 minutes" />
            </div>

            <div style={styles.scaleKey}>
              {[1,2,3,4,5].map((n) => (
                <div key={n} style={styles.scaleKeyItem}>
                  <span style={styles.scaleKeyNum}>{n}</span>
                  <span style={styles.scaleKeyLabel}>
                    {["Very Low","Low","Moderate","High","Very High"][n - 1]}
                  </span>
                </div>
              ))}
            </div>

            <button style={styles.primaryBtn} onClick={handleStart}>
              Begin Assessment
            </button>
            {onExit && (
              <button style={styles.ghostBtn} onClick={onExit}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── QUIZ ── */}
      {view === VIEW.QUIZ && currentQuestion && (
        <div style={styles.quizWrapper}>
          {/* Top bar */}
          <header style={styles.topBar}>
            <span style={styles.topBarBrand}>NASA-TLX</span>
            {onExit && (
              <button style={styles.exitBtn} onClick={onExit} title="Exit">
                ✕
              </button>
            )}
          </header>

          {/* Question card */}
          <QuestionCard
            question={currentQuestion}
            currentIndex={currentIdx}
            totalCount={questions.length}
            selectedValue={currentAnswer}
            onAnswer={handleAnswer}
          />

          {/* Navigation */}
          <div style={styles.navRow}>
            <button
              style={{ ...styles.navBtn, ...(currentIdx === 0 ? styles.navBtnDisabled : {}) }}
              onClick={handleBack}
              disabled={currentIdx === 0}
            >
              ← Back
            </button>

            {isLastQuestion ? (
              <button
                style={{
                  ...styles.primaryBtn,
                  ...(currentAnswer == null ? styles.primaryBtnDisabled : {}),
                }}
                onClick={handleSubmit}
                disabled={currentAnswer == null}
                title={currentAnswer == null ? "Please select a rating" : "Submit"}
              >
                Submit →
              </button>
            ) : (
              <button
                style={{
                  ...styles.navBtn,
                  ...(currentAnswer == null ? styles.navBtnDisabled : {}),
                }}
                onClick={handleNext}
                disabled={currentAnswer == null}
              >
                Next →
              </button>
            )}
          </div>

          {/* Answer progress dots */}
          <div style={styles.dotRow}>
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                style={{
                  ...styles.dot,
                  ...(i === currentIdx ? styles.dotCurrent : {}),
                  ...(answers[q.id] != null && i !== currentIdx ? styles.dotDone : {}),
                }}
                aria-label={`Go to question ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── RESULT ── */}
      {view === VIEW.RESULT && result && (
        <QuestionnaireResult result={result} onRetake={handleRetake} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helper
// ---------------------------------------------------------------------------
function MetaItem({ icon, label }) {
  return (
    <div style={styles.metaItem}>
      <span style={styles.metaIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = {
  root: {
    minHeight: "100vh",
    background: "#f9fafb",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    color: "#111827",
  },

  // ── Shared ───────────────────────────────────────────────────────────────
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    gap: "1rem",
    padding: "2rem",
  },

  primaryBtn: {
    padding: "0.75rem 2rem",
    background: "#111827",
    color: "#f9fafb",
    border: "none",
    borderRadius: 5,
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "0.75rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },

  primaryBtnDisabled: {
    background: "#d1d5db",
    color: "#9ca3af",
    cursor: "not-allowed",
    opacity: 1,
  },

  ghostBtn: {
    padding: "0.65rem 1.5rem",
    background: "transparent",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    borderRadius: 5,
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
  },

  // ── Loading ────────────────────────────────────────────────────────────────
  spinner: {
    width: 28,
    height: 28,
    border: "2px solid #e5e7eb",
    borderTop: "2px solid #111827",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
  loadingText: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorIcon: { fontSize: "2rem", margin: 0 },
  errorMsg: {
    fontSize: "0.85rem",
    color: "#6b7280",
    textAlign: "center",
    maxWidth: 380,
  },

  // ── Intro ─────────────────────────────────────────────────────────────────
  introWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "2rem 1rem",
  },

  introCard: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "3rem 2.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.4rem",
  },

  tag: {
    margin: 0,
    fontSize: "0.62rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#9ca3af",
  },

  title: {
    margin: 0,
    fontFamily: "'Lora', 'Georgia', serif",
    fontSize: "2rem",
    fontWeight: 700,
    lineHeight: 1.2,
    color: "#111827",
  },

  subtitle: {
    margin: 0,
    fontFamily: "'Lora', 'Georgia', serif",
    fontSize: "0.9rem",
    lineHeight: 1.7,
    color: "#6b7280",
  },

  metaRow: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
  },

  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.72rem",
    color: "#374151",
    letterSpacing: "0.05em",
  },

  metaIcon: { color: "#9ca3af", fontSize: "0.6rem" },

  scaleKey: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    padding: "1rem",
    background: "#f9fafb",
    borderRadius: 6,
  },

  scaleKeyItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.2rem",
    flex: "1 1 0",
  },

  scaleKeyNum: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#111827",
  },

  scaleKeyLabel: {
    fontSize: "0.55rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#9ca3af",
    textAlign: "center",
  },

  // ── Quiz ──────────────────────────────────────────────────────────────────
  quizWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minHeight: "100vh",
    paddingBottom: "3rem",
  },

  topBar: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    borderBottom: "1px solid #f3f4f6",
    background: "#fff",
  },

  topBarBrand: {
    fontSize: "0.68rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#9ca3af",
  },

  exitBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    fontSize: "0.85rem",
    padding: "0.2rem 0.4rem",
  },

  navRow: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 640,
    padding: "0 2rem",
    gap: "1rem",
  },

  navBtn: {
    padding: "0.65rem 1.4rem",
    background: "transparent",
    border: "1.5px solid #d1d5db",
    borderRadius: 5,
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.08em",
    color: "#374151",
    cursor: "pointer",
    transition: "all 0.15s",
  },

  navBtnDisabled: {
    color: "#d1d5db",
    borderColor: "#f3f4f6",
    cursor: "not-allowed",
  },

  dotRow: {
    display: "flex",
    gap: "0.45rem",
    marginTop: "0.5rem",
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#e5e7eb",
    border: "none",
    cursor: "pointer",
    padding: 0,
    transition: "background 0.2s",
  },

  dotCurrent: {
    background: "#111827",
    transform: "scale(1.25)",
  },

  dotDone: {
    background: "#6b7280",
  },
};
