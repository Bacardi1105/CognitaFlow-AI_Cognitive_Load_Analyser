"""
Fallback question bank when the OpenRouter API is unavailable.
Returns 20 NASA-TLX-inspired questions customised by profession.
"""

BASE_QUESTIONS = [
    {"id": 1, "dimension": "mental_demand",   "question": "How much mental activity was required for your tasks today?"},
    {"id": 2, "dimension": "mental_demand",   "question": "How hard did you have to work mentally to accomplish your work?"},
    {"id": 3, "dimension": "mental_demand",   "question": "How complex were the decisions you had to make today?"},
    {"id": 4, "dimension": "temporal_demand", "question": "How much time pressure did you feel while doing your tasks?"},
    {"id": 5, "dimension": "temporal_demand", "question": "How rushed or hurried was the pace of your work today?"},
    {"id": 6, "dimension": "temporal_demand", "question": "Did you feel like you had enough time to complete each task carefully?"},
    {"id": 7, "dimension": "performance",     "question": "How satisfied were you with your performance today?"},
    {"id": 8, "dimension": "performance",     "question": "How often did you make errors or need to redo work?"},
    {"id": 9, "dimension": "performance",     "question": "How well did you accomplish the goals set for you today?"},
    {"id": 10,"dimension": "effort",          "question": "How hard did you have to work to achieve your level of performance?"},
    {"id": 11,"dimension": "effort",          "question": "How much effort did maintaining focus require today?"},
    {"id": 12,"dimension": "effort",          "question": "How much energy did you expend on your tasks today?"},
    {"id": 13,"dimension": "frustration",     "question": "How irritated or stressed did you feel during your work?"},
    {"id": 14,"dimension": "frustration",     "question": "How often were you interrupted or distracted while working?"},
    {"id": 15,"dimension": "frustration",     "question": "How much did unexpected problems add to your stress today?"},
    {"id": 16,"dimension": "physical_demand", "question": "How physically demanding was your work today?"},
    {"id": 17,"dimension": "physical_demand", "question": "How much did physical fatigue affect your mental performance?"},
    {"id": 18,"dimension": "mental_demand",   "question": "How much information did you have to keep in mind simultaneously?"},
    {"id": 19,"dimension": "effort",          "question": "How much did switching between tasks drain your cognitive resources?"},
    {"id": 20,"dimension": "frustration",     "question": "Overall, how overwhelmed did you feel at any point during the day?"},
]

PROFESSION_OVERRIDES = {
    "software engineer": [
        "How mentally demanding was debugging today's code issues?",
        "How often did you context-switch between different codebases or projects?",
        "How much cognitive effort did code reviews require?",
        "How stressed were you by deployment deadlines or production incidents?",
        "How hard was it to maintain focus during long coding sessions?",
    ],
    "doctor": [
        "How cognitively demanding were your patient consultations today?",
        "How much mental effort was required to process diagnostic information?",
        "How stressful were time-critical clinical decisions?",
        "How often did interruptions affect your concentration during patient care?",
        "How emotionally draining were your interactions with patients today?",
    ],
    "student": [
        "How mentally exhausting was studying or attending classes today?",
        "How much effort did understanding new concepts require?",
        "How stressed did exam or assignment deadlines make you feel?",
        "How hard was it to retain information across multiple subjects?",
        "How overwhelmed did you feel by the volume of material to learn?",
    ],
    "manager": [
        "How cognitively demanding were the meetings you attended today?",
        "How mentally taxing was coordinating across multiple teams?",
        "How stressful were resource allocation and prioritisation decisions?",
        "How much effort did conflict resolution or personnel issues require?",
        "How often did shifting priorities disrupt your focus today?",
    ],
    "designer": [
        "How mentally demanding was the creative problem-solving required today?",
        "How stressful was receiving and implementing design feedback?",
        "How much cognitive effort did balancing aesthetics with functionality take?",
        "How often did you feel creatively blocked during your work?",
        "How draining was it to produce high-quality visual work under time pressure?",
    ],
}


def fallback_questions(profession: str) -> list[dict]:
    """
    Return 20 questions. The first 15 are generic; the last 5 are
    profession-specific where available, otherwise generic.
    """
    questions = [q.copy() for q in BASE_QUESTIONS[:15]]
    key = profession.lower().strip()
    overrides = PROFESSION_OVERRIDES.get(key, [])

    for i, extra_q in enumerate(BASE_QUESTIONS[15:], start=16):
        q = extra_q.copy()
        override_idx = i - 16
        if override_idx < len(overrides):
            q["question"] = overrides[override_idx]
        questions.append(q)

    return questions
