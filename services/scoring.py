"""
Scoring algorithms for webcam, voice, and cognitive load.
All scores are normalized to 0–100 where higher = more stress/load.
"""


def score_webcam(blink_rate: float, eye_openness: float, gaze_stability: float) -> float:
    """
    Convert webcam metrics to a stress score (0–100).

    Blink rate:
      - Normal: 15–20 blinks/min
      - High stress: < 8 (staring) or > 30 (rapid blinking)
    Eye openness:
      - Normal: 0.3–0.5 (relative to face)
      - Stress: very low (squinting) or very high (wide eyes)
    Gaze stability:
      - 0 = perfectly stable, 1 = very unstable
      - Higher instability = more stress
    """
    # Blink rate score: deviation from normal range [15, 20]
    if 15 <= blink_rate <= 20:
        blink_stress = 0
    elif blink_rate < 15:
        blink_stress = min(100, (15 - blink_rate) / 15 * 100)
    else:
        blink_stress = min(100, (blink_rate - 20) / 20 * 100)

    # Eye openness score: deviation from normal [0.3, 0.5]
    if 0.3 <= eye_openness <= 0.5:
        eye_stress = 0
    elif eye_openness < 0.3:
        eye_stress = min(100, (0.3 - eye_openness) / 0.3 * 100)
    else:
        eye_stress = min(100, (eye_openness - 0.5) / 0.5 * 100)

    # Gaze stability: 0=stable=no stress, 1=unstable=max stress
    gaze_stress = min(100, gaze_stability * 100)

    # Weighted combination
    score = 0.4 * blink_stress + 0.3 * eye_stress + 0.3 * gaze_stress
    return round(min(100.0, max(0.0, score)), 2)


def score_voice(
    speech_rate: float,
    pause_count: int,
    speaking_duration: float,
    total_duration: float,
) -> float:
    """
    Convert voice metrics to a stress score (0–100).

    Speech rate (words per minute):
      - Normal: 120–160 wpm
      - Stress: < 80 (hesitant) or > 200 (rushed)
    Pause ratio:
      - silence / total = high ratio → more stress
    Speaking efficiency:
      - speaking_duration / total_duration
    """
    # Speech rate stress
    if 120 <= speech_rate <= 160:
        rate_stress = 0
    elif speech_rate < 120:
        rate_stress = min(100, (120 - speech_rate) / 120 * 100)
    else:
        rate_stress = min(100, (speech_rate - 160) / 160 * 100)

    # Pause stress: more pauses relative to total → more stress
    safe_total = max(total_duration, 1.0)
    pause_ratio = min(1.0, (total_duration - speaking_duration) / safe_total)
    pause_stress = pause_ratio * 100

    # Extra weight for many pauses
    count_stress = min(100, pause_count * 5)

    score = 0.4 * rate_stress + 0.35 * pause_stress + 0.25 * count_stress
    return round(min(100.0, max(0.0, score)), 2)


def calculate_cognitive_load(
    questionnaire_score: float,
    webcam_score: float,
    voice_score: float,
) -> float:
    """
    Final cognitive load formula:

    CognitiveLoad = 0.50 * questionnaireScore
                  + 0.25 * webcamScore
                  + 0.25 * voiceScore

    All inputs and output are 0–100.
    """
    cl = (
        0.50 * questionnaire_score
        + 0.25 * webcam_score
        + 0.25 * voice_score
    )
    return round(min(100.0, max(0.0, cl)), 2)
