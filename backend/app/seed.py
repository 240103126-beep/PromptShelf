from .models import Category, Collection, Item, Tag

CATEGORIES = [("Coding", "#5B5BF0"), ("Writing", "#E5484D"), ("Study", "#30A46C"), ("Business", "#F5A524"), ("General", "#8E8E93")]
TAGS = ["python", "email", "summary", "debug", "translation", "marketing", "exam", "sql"]
ITEMS = [
    ("Explain a Python traceback", "Explain this Python error step by step and suggest a fix:\n\nTypeError: 'NoneType' object is not iterable", "The error means a function returned None where a list was expected. Check that every code path returns a value.", "ChatGPT", "Coding", ["python", "debug"]),
    ("Polite follow-up email", "Write a polite follow-up email to a client who has not replied in a week. Keep it under 100 words.", "Subject: Quick follow-up\n\nHi Anna, I wanted to check whether you had a chance to review my previous message...", "Claude", "Writing", ["email"]),
    ("Summarize an article", "Summarize the following article in 5 bullet points and list 3 open questions.", "1. Main claim...\n2. Evidence...", "Gemini", "Study", ["summary"]),
    ("SQL join helper", "Write a SQL query that returns the 10 customers with the highest total order amount.", "SELECT c.name, SUM(o.amount) AS total FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.name ORDER BY total DESC LIMIT 10;", "ChatGPT", "Coding", ["sql"]),
    ("Exam study plan", "Create a 7-day study plan for a databases exam, 2 hours per day, with active recall tasks.", "Day 1: relational model...", "Claude", "Study", ["exam"]),
    ("Product description", "Write a persuasive product description for a reusable water bottle for students.", "Stay hydrated between lectures...", "Other", "Business", ["marketing"]),
]


def seed(db):
    cats = {n: Category(name=n, color=c) for n, c in CATEGORIES}
    tags = {n: Tag(name=n) for n in TAGS}
    db.add_all(list(cats.values()) + list(tags.values()))
    items = []
    for title, prompt, response, source, cat, tg in ITEMS:
        item = Item(title=title, prompt=prompt, response=response, source=source, category=cats[cat], tags=[tags[t] for t in tg])
        items.append(item)
    db.add_all(items)
    db.add(Collection(name="Coding helpers", description="Prompts for programming tasks", items=[items[0], items[3]]))
    db.add(Collection(name="Study toolkit", description="Prompts for learning", items=[items[2], items[4]]))
    db.commit()
