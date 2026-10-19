import io
import json
import re
import zipfile


def slug(text):
    s = re.sub(r"[^A-Za-z0-9\-]+", "-", text).strip("-").lower()
    return s or "collection"


def item_md(i):
    dump = lambda v: json.dumps(v, ensure_ascii=False)
    lines = [
        "---",
        f"title: {dump(i.title)}",
        f"source: {dump(i.source)}",
        f"category: {dump(i.category.name if i.category else '')}",
        f"tags: {dump([t.name for t in i.tags])}",
        f"favorite: {str(i.is_favorite).lower()}",
        f"created: {i.created_at.isoformat()}",
        "---",
        "",
        f"# {i.title}",
        "",
        "## Prompt",
        "",
        i.prompt.strip(),
        "",
    ]
    if i.response.strip():
        lines += ["## Response", "", i.response.strip(), ""]
    if i.notes.strip():
        lines += ["## Notes", "", i.notes.strip(), ""]
    return "\n".join(lines)


def collection_md(c):
    head = f"# {c.name}\n\n{c.description}\n\n"
    return head + "\n\n".join(item_md(i) for i in c.items)


def build_single(collections):
    return "\n\n".join(collection_md(c) for c in collections)


def build_zip(collections):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for c in collections:
            z.writestr(f"{slug(c.name)}-{c.id}.md", collection_md(c))
    return buf.getvalue()
