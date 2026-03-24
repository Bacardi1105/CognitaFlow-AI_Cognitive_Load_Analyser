/**
 * QuestionnaireResult.jsx
 * Displays the computed NASA-TLX score and its interpretation.
 * Can be rendered standalone or embedded in dashboard / speech-test / eye-test.
 *
 * Props (two modes):
 *   Mode A – pass result directly:
 *     result   {Object}  - { score, interpretation, questions, completedAt }
 *     onRetake {Function} - () => void  (optional)
 *
 *   Mode B – no props (reads from localStorage automatically)
 *     onRetake {Function} - () => void  (optional)
 *
 * Exported for use in: speech-test, eye-test, dashboard modules.
 */

import React, { useEffect, useState } from "react";
import { loadSavedResult, interpretScore } from "../services/questionnaireService";

// ---------------------------------------------------------------------------
// Level → visual config
// ---------------------------------------------------------------------------
const LEVEL_CONFIG = {
  low: {
    accent: "#059669",      // emerald
    bgAccent: "#ecfdf5",
    icon: "○",
    band: "LOW",
  },
  moderate: {
    accent: "#d97706",      // amber
    bgAccent: "#fffbeb",
    icon: "◑",
    band: "MODERATE",
  },
  high: {
    accent: "#dc2626",      // red
    bgAccent: "#fef2f2",
    icon: "●",
    band: "HIGH",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function QuestionnaireResult({ result: propResult, onRetake }) {
  const [result, setResult] = useState(propResult ?? null);

  useEffect(() => {
    if (!propResult) {
      const saved = loadSavedResult();
      if (saved) setResult(saved);
    }
  }, [propResult]);

  if (!result) {
    return (
      <div style={styles.centered}>
        <p style={styles.emptyMsg}>No result found. Please complete the questionnaire first.</p>
        {onRetake && (
          <button style={styles.retakeBtn} onClick={onRetake}>
            Start Questionnaire
          </button>
        )}
      </div>
    );
  }

  const interp = result.interpretation ?? interpretScore(result.score);
  const config = LEVEL_CONFIG[interp.level] ?? LEVEL_CONFIG.moderate;
  const maxPossible = (result.questions?.length ?? 6) * 5;

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* ── Header band ── */}
        <div style={{ ...styles.headerBand, background: config.bgAccent }}>
          <span style={{ ...styles.levelIcon, color: config.accent }}>
            {config.icon}
          </span>
          <span style={{ ...styles.levelBand, color: config.accent }}>
            {config.band} WORKLOAD
          </span>
        </div>

        {/* ── Score ── */}
        <div style={styles.scoreBlock}>
          <span style={styles.scoreValue}>{result.score}</span>
          <span style={styles.scoreMax}>/ {maxPossible}</span>
        </div>
        <p style={styles.scoreCaption}>NASA-TLX Total Score</p>

        {/* ── Gauge bar ── */}
        <div style={styles.gaugeTrack}>
          <div
            style={{
              ...styles.gaugeFill,
              width: `${Math.min((result.score / maxPossible) * 100, 100)}%`,
              background: config.accent,
            }}
          />
          {/* zone markers */}
          <div style={{ ...styles.gaugeMarker, left: `${(10 / maxPossible) * 100}%` }} />
          <div style={{ ...styles.gaugeMarker, left: `${(20 / maxPossible) * 100}%` }} />
        </div>
        <div style={styles.gaugeLabels}>
          <span>Low (0–10)</span>
          <span>Moderate (11–20)</span>
          <span>High (&gt;20)</span>
        </div>

        {/* ── Interpretation ── */}
        <p style={styles.interpretation}>{interp.description}</p>

        {/* ── Per-dimension breakdown ── */}
        {result.questions && result.questions.length > 0 && (
          <div style={styles.breakdown}>
            <p style={styles.breakdownTitle}>Dimension Breakdown</p>
            {result.questions.map((q) => (
              <div key={q.id} style={styles.breakdownRow}>
                <span style={styles.breakdownLabel}>{q.label}</span>
                <div style={styles.breakdownBarTrack}>
                  <div
                    style={{
                      ...styles.breakdownBarFill,
                      width: `${((q.answer ?? 0) / 5) * 100}%`,
                      background: config.accent,
                    }}
                  />
                </div>
                <span style={styles.breakdownScore}>{q.answer ?? "–"}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Timestamp ── */}
        {result.completedAt && (
          <p style={styles.timestamp}>
            Completed{" "}
            {new Date(result.completedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}

        {/* ── Retake button ── */}
        {onRetake && (
          <button style={styles.retakeBtn} onClick={onRetake}>
            Retake Questionnaire
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    background: "#f9fafb",
    padding: "3rem 1rem",
    boxSizing: "border-box",
    fontFamily: "'DM Mono', 'Courier New', monospace",
  },

  card: {
    width: "100%",
    maxWidth: 580,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.4rem",
    paddingBottom: "2.5rem",
  },

  headerBand: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.6rem",
    padding: "1rem",
  },

  levelIcon: {
    fontSize: "1.1rem",
  },

  levelBand: {
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "0.7rem",
    letterSpacing: "0.18em",
    fontWeight: 700,
  },

  scoreBlock: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.25rem",
    marginTop: "0.5rem",
  },

  scoreValue: {
    fontFamily: "'Lora', 'Georgia', serif",
    fontSize: "5rem",
    fontWeight: 700,
    lineHeight: 1,
    color: "#111827",
  },

  scoreMax: {
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "1.2rem",
    color: "#9ca3af",
  },

  scoreCaption: {
    margin: 0,
    fontSize: "0.68rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#9ca3af",
  },

  gaugeTrack: {
    position: "relative",
    width: "calc(100% - 4rem)",
    height: 6,
    background: "#f3f4f6",
    borderRadius: 99,
    overflow: "visible",
  },

  gaugeFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
  },

  gaugeMarker: {
    position: "absolute",
    top: -3,
    width: 1,
    height: 12,
    background: "#d1d5db",
  },

  gaugeLabels: {
    display: "flex",
    justifyContent: "space-between",
    width: "calc(100% - 4rem)",
    fontSize: "0.58rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ca3af",
  },

  interpretation: {
    margin: 0,
    padding: "0 2rem",
    fontFamily: "'Lora', 'Georgia', serif",
    fontSize: "0.95rem",
    lineHeight: 1.7,
    color: "#374151",
    textAlign: "center",
  },

  breakdown: {
    width: "calc(100% - 4rem)",
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
    borderTop: "1px solid #f3f4f6",
    paddingTop: "1.4rem",
  },

  breakdownTitle: {
    margin: 0,
    fontSize: "0.62rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#9ca3af",
  },

  breakdownRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },

  breakdownLabel: {
    width: 130,
    fontSize: "0.72rem",
    color: "#374151",
    flexShrink: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  breakdownBarTrack: {
    flex: 1,
    height: 5,
    background: "#f3f4f6",
    borderRadius: 99,
    overflow: "hidden",
  },

  breakdownBarFill: {
    height: "100%",
    borderRadius: 99,
    opacity: 0.75,
    transition: "width 0.6s ease",
  },

  breakdownScore: {
    width: 18,
    textAlign: "right",
    fontSize: "0.72rem",
    color: "#6b7280",
    flexShrink: 0,
  },

  timestamp: {
    margin: 0,
    fontSize: "0.65rem",
    letterSpacing: "0.08em",
    color: "#d1d5db",
    textTransform: "uppercase",
  },

  retakeBtn: {
    marginTop: "0.5rem",
    padding: "0.65rem 1.8rem",
    background: "#111827",
    color: "#f9fafb",
    border: "none",
    borderRadius: 5,
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
  },

  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "1.5rem",
    fontFamily: "'DM Mono', 'Courier New', monospace",
  },

  emptyMsg: {
    color: "#6b7280",
    fontSize: "0.85rem",
  },
};
