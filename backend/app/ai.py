import json
import os
import re
from collections import Counter

import httpx

LANGS = {"kk": "Kazakh", "ru": "Russian", "en": "English"}
MSG = {
    "empty": {
        "en": "Nothing relevant found in your library.",
        "ru": "В вашей библиотеке ничего подходящего не найдено.",
        "kk": "Кітапханаңызда сәйкес ештеңе табылмады.",
    },
    "found": {
        "en": "Most relevant items:",
        "ru": "Наиболее подходящие записи:",
        "kk": "Ең сәйкес жазбалар:",
    },
}
STOP = set(
    "that this with from have your will would there their about which what when "
    "were been into than then them they just like some more also only very make".split()
)


def _llm(system, user, json_mode=False):
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        return None
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
    }
    if json_mode:
        body["generationConfig"] = {"responseMimeType": "application/json"}
    try:
        r = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={"x-goog-api-key": key},
            json=body,
            timeout=40,
        )
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        return None


def _json(text):
    if not text:
        return None
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    try:
        return json.loads(text)
    except Exception:
        return None


def _keywords(text, n=4):
    words = [w for w in re.findall(r"[^\W\d_]{4,}", text.lower()) if w not in STOP]
    return [w for w, _ in Counter(words).most_common(n)]


def analyze(prompt, response, lang):
    L = LANGS.get(lang, "English")
    system = (
        "You organize saved AI prompts. Reply ONLY with JSON: "
        '{"title": string (max 8 words), "summary": string (max 2 sentences), '
        '"tags": [3-5 short lowercase tags], "category": string (1-2 words)}. '
        f"Write all values in {L}."
    )
    data = _json(_llm(system, f"PROMPT:\n{prompt[:4000]}\n\nRESPONSE:\n{response[:4000]}", True))
    if isinstance(data, dict) and data.get("title"):
        data["tags"] = [str(t)[:30] for t in data.get("tags", [])][:5]
        data["provider"] = "gemini"
        return data
    first = prompt.strip().splitlines()[0] if prompt.strip() else "Untitled"
    return {
        "title": first[:60],
        "summary": (response or prompt).strip()[:200],
        "tags": _keywords(prompt + " " + response),
        "category": "General",
        "provider": "fallback",
    }


def improve(prompt, lang):
    L = LANGS.get(lang, "English")
    system = (
        "You are a prompt engineer. Improve the user's prompt: add role, context, "
        "output format and constraints without changing the intent. Reply ONLY with JSON: "
        '{"improved": string, "changes": [short strings]}. '
        f"Write 'changes' in {L}; keep the improved prompt in the original language."
    )
    data = _json(_llm(system, prompt[:6000], True))
    if isinstance(data, dict) and data.get("improved"):
        data["provider"] = "gemini"
        return data
    improved = (
        "Role: You are an expert assistant.\n"
        f"Task: {prompt.strip()}\n"
        "Context: <add relevant background>\n"
        "Format: <describe the desired output format>\n"
        "Constraints: be concise, state your assumptions, ask if something is unclear."
    )
    return {
        "improved": improved,
        "changes": ["Added a role", "Separated task, context, format and constraints"],
        "provider": "fallback",
    }


def ask(question, items, lang):
    L = LANGS.get(lang, "English")
    if not items:
        return {"answer": MSG["empty"].get(lang, MSG["empty"]["en"]), "citations": [], "provider": "fallback"}
    context = "\n\n".join(
        f"[{i.id}] {i.title}\nPrompt: {i.prompt[:800]}\nResponse: {i.response[:800]}" for i in items
    )
    system = (
        "Answer the question using ONLY the library items provided. Reply ONLY with JSON: "
        '{"answer": string, "citations": [item ids used as integers]}. '
        f"Answer in {L}. If the items do not help, say so."
    )
    data = _json(_llm(system, f"QUESTION: {question}\n\nITEMS:\n{context}", True))
    if isinstance(data, dict) and data.get("answer"):
        valid = {i.id for i in items}
        data["citations"] = [c for c in data.get("citations", []) if c in valid]
        data["provider"] = "gemini"
        return data
    lines = "\n".join(f"- {i.title}" for i in items)
    return {
        "answer": f"{MSG['found'].get(lang, MSG['found']['en'])}\n{lines}",
        "citations": [i.id for i in items],
        "provider": "fallback",
    }


USER_RE = re.compile(r"^\s*(user|you|human|me|пользователь|я)\s*[:：]\s*(.*)", re.I)
BOT_RE = re.compile(r"^\s*(assistant|chatgpt|gpt|claude|gemini|ai|bot|ассистент)\s*[:：]\s*(.*)", re.I)


def _guess_source(name):
    n = name.lower()
    if "claude" in n:
        return "Claude"
    if "gpt" in n:
        return "ChatGPT"
    if "gemini" in n:
        return "Gemini"
    return "Other"


def parse_chat(raw, lang):
    L = LANGS.get(lang, "English")
    system = (
        "Split the pasted AI chat into separate prompt/response pairs. Reply ONLY with JSON: "
        '{"items": [{"title": string, "prompt": string, "response": string, '
        '"source": "ChatGPT"|"Claude"|"Gemini"|"Other"}]}. '
        f"Write titles in {L}; keep prompt and response text unchanged."
    )
    data = _json(_llm(system, raw[:20000], True))
    if isinstance(data, dict) and isinstance(data.get("items"), list) and data["items"]:
        return {"items": data["items"], "provider": "gemini"}

    turns, current = [], None
    for line in raw.splitlines():
        u, b = USER_RE.match(line), BOT_RE.match(line)
        if u:
            current = ["user", u.group(2), ""]
            turns.append(current)
        elif b:
            if current is None or current[0] != "user":
                current = ["user", "", ""]
                turns.append(current)
            current[2] = b.group(2)
            current.append(b.group(1))
            current = ["bot-open", current]
        elif current is not None:
            if current[0] == "bot-open":
                current[1][2] += "\n" + line
            elif current[0] == "user":
                current[1] += "\n" + line
    items = []
    for t in turns:
        prompt, response = t[1].strip(), t[2].strip()
        if not (prompt or response):
            continue
        src = _guess_source(t[3]) if len(t) > 3 else "Other"
        items.append(
            {"title": (prompt.splitlines() or ["Imported chat"])[0][:60] or "Imported chat",
             "prompt": prompt, "response": response, "source": src}
        )
    if not items:
        items = [{"title": raw.strip().splitlines()[0][:60], "prompt": raw.strip(), "response": "", "source": "Other"}]
    return {"items": items, "provider": "fallback"}
