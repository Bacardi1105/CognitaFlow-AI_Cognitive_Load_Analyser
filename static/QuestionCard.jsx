/**
 * QuestionCard.jsx
 * Renders a single NASA-TLX question with a 1–5 rating scale.
 *
 * Props:
 *   question      {Object}   - { id, label, description }
 *   currentIndex  {number}   - 0-based index of this question
 *   totalCount    {number}   - total number of questions
 *   selectedValue {number|null} - currently selected answer (1–5) or null
 *   onAnswer      {Function} - (questionId, value) => void
 *
 * Exported for use in: speech-test, eye-test, dashboard modules.
 */

import React from "react";

const SCALE = [1, 2, 3, 4, 5];

const SCALE_LABELS = {
  1: "Very Low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Very High",
};

export default function QuestionCard({
  question,
  currentIndex,
  totalCount,
  selectedValue,
  onAnswer,
}) {
  if (!question) return null;

  const progressPercent = ((currentIndex + 1) / totalCount) * 100;

  return (
    <div style={styles.wrapper}>
      {/* ── Progress bar ── */}
      <div style={styles.progressTrack}>
        <div
          style={{ ...styles.progressFill, width: `${progressPercent}%` }}
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria_valuemax={totalCount}
          role="progressbar"
        />
      </div>

      {/* ── Step counter ── */}
      <p style={styles.stepLabel}>
        {currentIndex + 1} / {totalCount}
      </p>

      {/* ── Dimension label ── */}
      <div style={styles.dimensionPill}>{question.label}</div>

      {/* ── Question body ── */}
      <p style={styles.description}>{question.description}</p>

      {/* ── Rating scale ── */}
      <div style={styles.scaleRow} role="group" aria-label="Rating scale">
        {SCALE.map((val) => {
          const isSelected = selectedValue === val;
          return (
            <button
              key={val}
              onClick={() => onAnswer(question.id, val)}
              style={{
                ...styles.scaleButton,
                ...(isSelected ? styles.scaleButtonActive : {}),
              }}
              aria-pressed={isSelected}
              aria-label={`${val} – ${SCALE_LABELS[val]}`}
            >
              <span style={styles.scaleNumber}>{val}</span>
              <span
                style={{
                  ...styles.scaleWord,
                  ...(isSelected ? styles.scaleWordActive : {}),
                }}
              >
                {SCALE_LABELS[val]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.5rem",
    width: "100%",
    maxWidth: 640,
    margin: "0 auto",
    padding: "2.5rem 2rem",
    boxSizing: "border-box",
  },

  progressTrack: {
    width: "100%",
    height: 3,
    background: "#e5e7eb",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#111827",
    borderRadius: 99,
    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  },

  stepLabel: {
    margin: 0,
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "0.75rem",
    letterSpacing: "0.12em",
    color: "#9ca3af",
    textTransform: "uppercase",
    alignSelf: "flex-start",
  },

  dimensionPill: {
    alignSelf: "flex-start",
    padding: "0.25rem 0.75rem",
    border: "1px solid #111827",
    borderRadius: 3,
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "0.7rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#111827",
    background: "transparent",
  },

  description: {
    margin: 0,
    fontFamily: "'Lora', 'Georgia', serif",
    fontSize: "1.15rem",
    lineHeight: 1.65,
    color: "#1f2937",
    textAlign: "left",
    alignSelf: "flex-start",
  },

  scaleRow: {
    display: "flex",
    gap: "0.6rem",
    width: "100%",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "0.5rem",
  },

  scaleButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.9rem 0.6rem",
    minWidth: 70,
    flex: "1 1 0",
    border: "1.5px solid #d1d5db",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    transition: "all 0.18s ease",
    outline: "none",
  },

  scaleButtonActive: {
    background: "#111827",
    borderColor: "#111827",
  },

  scaleNumber: {
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "1.3rem",
    fontWeight: 600,
    color: "inherit",
    lineHeight: 1,
  },

  scaleWord: {
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: "0.6rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6b7280",
    whiteSpace: "nowrap",
  },

  scaleWordActive: {
    color: "#9ca3af",
  },
};
