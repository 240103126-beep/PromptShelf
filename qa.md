# QA test cases

Run on the deployed site and locally, in KZ, RU, EN and in light and dark theme.

## General
- All menu links work, /about opens, unknown URL shows 404
- No raw translation keys or red errors on any page
- Language switcher changes menu, buttons, placeholders, dates
- Mobile view shows bottom navigation
- Shortcuts: Cmd+K command palette, N new item, / focus search

## Library (/app)
- Search by title, text and tag; unknown word shows empty state
- Filters work alone and together; Clear resets them
- List/grid switch, multi-select, bulk actions, delete asks confirmation

## Editor
- Empty save shows error; with prompt it saves and appears in library
- Edit title, source, category, tags, notes, favorite and check persistence
- Create tag inline, preview, delete item
- AI buttons: error on empty text, result on filled text

## Collections
- Create (empty name shows error), open, add/remove items, rename, delete
- Export .md and ZIP download; open the file and check the content

## Tags and categories
- Create, rename, recolor, delete, merge; duplicate name shows error

## Import
- Paste a User/Assistant chat, split with AI, deselect one item, save

## Assistant and export
- Ask about the library, check source links; improve a prompt
- Export page: choose collections and format; empty selection shows error

## Edge cases
- Very long text and title, special characters and emoji
- Double click on Save creates one item
- /app/items/wrong-id shows a clear error or 404

## Backend
- `pytest -q` in backend passes
