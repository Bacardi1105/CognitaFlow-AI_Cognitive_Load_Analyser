import httpx
import json
import re
from services.question_generator import fallback_questions

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


async def generate_questions(profession: str, api_key: str) -> list[dict]:
    """
    Call OpenRouter API to generate 20 NASA-TLX inspired cognitive load questions
    tailored to the given profession.
    """
    prompt = (
        f"Generate 20 cognitive load assessment questions inspired by NASA TLX "
        f"suitable for a {profession}. "
        f"Each question should be relevant to the daily tasks and challenges of a {profession}. "
        f"Return ONLY a JSON array with objects having keys: "
        f"'id' (1-20), 'question' (string), 'dimension' (one of: mental_demand, physical_demand, "
        f"temporal_demand, performance, effort, frustration). "
        f"No markdown, no explanation, just the JSON array."
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "CognitaFlow",
    }

    payload = {
        "model": "openai/gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 3000,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]

            # Strip markdown fences if present
            content = re.sub(r"```(?:json)?", "", content).strip().rstrip("```").strip()

            questions = json.loads(content)
            if isinstance(questions, list) and len(questions) > 0:
                return questions[:20]
    except Exception as e:
        print(f"[ai_service] OpenRouter call failed: {e}. Using fallback questions.")

    return fallback_questions(profession)
