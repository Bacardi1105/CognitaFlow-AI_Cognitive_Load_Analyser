/**
 * questionnaireService.js
 * Service layer for the NASA-TLX Questionnaire Engine.
 * Handles question loading, answer persistence, scoring, and
 * localStorage integration. Designed to be consumed by
 * speech-test, eye-test, and dashboard modules.
 */

const STORAGE_KEY = "nasa_tlx_score";

/**
 * Loads questions from the NASA-TLX JSON file.
 * Path is relative to the project root as specified.
 * @returns {Promise<Array>} Array of question objects
 */
export async function loadQuestions() {
  try {
    const response = await fetch(
      "../../../../research/questionnaires/nasa_tlx.json"
    );
    if (!response.ok) {
      throw new Error(`Failed to load questions: ${response.statusText}`);
    }
    const data = await response.json();
    // Support both { questions: [...] } and a bare array
    return Array.isArray(data) ? data : data.questions ?? [];
  } catch (error) {
    console.error("[questionnaireService] loadQuestions error:", error);
    // Return built-in NASA-TLX fallback so the app stays functional
    // even when the JSON file path isn't resolved in the current env.
    return getDefaultNasaTlxQuestions();
  }
}

/**
 * Calculates the total score from an answers map.
 * @param {Object} answers - { [questionId]: number (1–5) }
 * @returns {number} Total score
 */
export function calculateScore(answers) {
  return Object.values(answers).reduce((sum, val) => sum + Number(val), 0);
}

/**
 * Returns a human-readable interpretation of the total score.
 * @param {number} score
 * @returns {{ label: string, description: string, level: 'low'|'moderate'|'high' }}
 */
export function interpretScore(score) {
  if (score <= 10) {
    return {
      level: "low",
      label: "Low Workload",
      description:
        "Task demands were minimal. Performance was achieved with little perceived effort.",
    };
  } else if (score <= 20) {
    return {
      level: "moderate",
      label: "Moderate Workload",
      description:
        "Task demands were manageable. Some cognitive resources were engaged.",
    };
  } else {
    return {
      level: "high",
      label: "High Workload",
      description:
        "Task demands were significant. High mental and physical resources were required.",
    };
  }
}

/**
 * Persists the result payload to localStorage.
 * @param {number} score
 * @param {Object} answers - raw answer map
 * @param {Array}  questions - question definitions
 */
export function saveResult(score, answers, questions) {
  const result = {
    score,
    answers,
    interpretation: interpretScore(score),
    completedAt: new Date().toISOString(),
    questions: questions.map((q) => ({
      id: q.id,
      label: q.label,
      answer: answers[q.id] ?? null,
    })),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch (e) {
    console.error("[questionnaireService] saveResult error:", e);
  }
  return result;
}

/**
 * Retrieves the most recent saved result from localStorage.
 * @returns {Object|null}
 */
export function loadSavedResult() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clears stored results from localStorage.
 */
export function clearResult() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Fallback question bank (standard NASA-TLX dimensions)
// ---------------------------------------------------------------------------
function getDefaultNasaTlxQuestions() {
  return [
    {
      id: "mental_demand",
      label: "Mental Demand",
      description:
        "How mentally demanding was the task? (thinking, deciding, calculating, remembering, looking, searching, etc.)",
    },
    {
      id: "physical_demand",
      label: "Physical Demand",
      description:
        "How physically demanding was the task? (pushing, pulling, turning, controlling, activating, etc.)",
    },
    {
      id: "temporal_demand",
      label: "Temporal Demand",
      description:
        "How much time pressure did you feel due to the rate or pace at which the tasks occurred?",
    },
    {
      id: "performance",
      label: "Performance",
      description:
        "How successful were you in accomplishing what you were asked to do?",
    },
    {
      id: "effort",
      label: "Effort",
      description:
        "How hard did you have to work (mentally and physically) to accomplish your level of performance?",
    },
    {
      id: "frustration",
      label: "Frustration Level",
      description:
        "How insecure, discouraged, irritated, stressed, and annoyed were you during the task?",
    },
  ];
}
