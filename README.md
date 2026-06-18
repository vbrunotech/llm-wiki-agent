# LLM Wiki Agent

LLM Wiki Agent is a local web app for building a persistent markdown wiki from source documents. Instead of answering every question directly from raw files, an LLM reads new sources, updates wiki pages, cross-links related ideas, tracks conflicts, and answers future questions from the maintained wiki.

The project implements the [LLM Wiki pattern](llm-wiki.md): the wiki becomes a compounding knowledge artifact, while raw source files remain untouched.

## Features

- Ingest pasted text or uploaded source files into a structured markdown wiki.
- Query the wiki with streamed progress as the LLM reads and writes pages.
- Maintain `index.md` and `log.md` as navigation and audit files.
- Run a wiki lint pass to find orphan pages, missing links, stale index entries, and contradictions.
- Explore an interactive graph view of wiki pages and their connections, similar to Obsidian's graph view.
- Configure LLM providers from the UI or environment variables.
- Upload many common file types using MarkItDown extraction.
- Use the generated wiki directly in markdown tools such as Obsidian.

## Tech Stack

- Backend: FastAPI, Python 3.11+, uv, Server-Sent Events
- Frontend: Next.js, React, Tailwind CSS
- LLM providers: Anthropic, OpenAI, OpenRouter, OpenClaw, OpenAI Codex OAuth
- File extraction: MarkItDown

## Project Structure

```text
llm-wiki-agent/
|-- backend/              # FastAPI app and LLM/tool orchestration
|-- frontend/             # Next.js + React UI
|-- sources/
|   |-- raw/              # Uploaded source documents
|   `-- wiki/             # LLM-maintained markdown wiki
|-- CLAUDE.md             # Detailed agent/developer notes
|-- llm-wiki.md           # Pattern overview
|-- query-flow.md         # Detailed request flow diagrams
|-- run.sh                # Starts the backend on port 8789
`-- README.md
```

The backend creates `sources/raw/` and `sources/wiki/` automatically if they do not exist.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- Node.js and npm
- API credentials for a tool-capable LLM provider if you want ingest/query/lint operations to modify the wiki

## Setup

Install backend dependencies:

```bash
cd backend
uv sync
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Create your local backend environment file:

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env` with the provider mode, model, and API key you want to use.

## Configuration

Settings are resolved in this order:

1. `backend/wiki_settings.json`, written by the Settings page
2. `backend/.env` or process environment variables
3. Built-in defaults from `backend/config.py`

Supported `LLM_MODE` values:

| Mode | Tool calling | Notes |
| --- | --- | --- |
| `anthropic_api_key` | Yes | Default mode |
| `openai_api_key` | Yes | Uses OpenAI-compatible tool calls |
| `openrouter_api_key` | Yes | Uses OpenRouter with tool calls |
| `openclaw_api` | No | Chat-only mode; wiki operations that need tools will not work |
| `openai_codex_oauth` | No | Chat-only mode; wiki operations that need tools will not work |

Common environment variables:

```bash
LLM_MODE=anthropic_api_key
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o

OPENROUTER_API_KEY=...
OPENROUTER_MODEL=anthropic/claude-sonnet-4
```

The app also exposes these fields in the Settings page, and changes there are picked up without restarting the backend.

## Running

Start the backend:

```bash
./run.sh
```

The backend runs at:

```text
http://localhost:8789
```

For frontend development with hot reload, run this in another terminal:

```bash
cd frontend
npm run dev
```

The Next.js dev server runs at:

```text
http://localhost:3000
```

To build the frontend for production:

```bash
cd frontend
npm run build
```

After a production build, the FastAPI backend serves the built frontend from `/`.

## Using The App

1. Open the web UI.
2. Go to Settings and choose a tool-capable provider.
3. Upload a source document or paste text into the ingest modal.
4. Run ingest to let the LLM update the wiki.
5. Ask questions from the Ask view.
6. Browse generated pages from the sidebar.
7. Click the Graph tab to visualize page connections as an interactive force-directed graph.
8. Run lint occasionally to clean up links, index entries, and conflicts.

Uploaded source files are stored under `sources/raw/`. Generated wiki pages are stored under `sources/wiki/`.

## Supported Upload Types

The backend uses MarkItDown and currently accepts:

```text
.md, .txt, .pdf, .docx, .doc, .pptx, .ppt, .xlsx, .xls,
.csv, .json, .xml, .html, .htm,
.jpg, .jpeg, .png, .gif, .webp, .bmp,
.mp3, .wav, .m4a, .zip
```

## Wiki Conventions

The LLM follows these conventions when writing wiki files:

- Filenames are lowercase and hyphenated, such as `topics/rag.md`.
- Pages use `# Title` followed by `## Section` headings.
- Cross-references use wikilink syntax, such as `[[vector-search]]`.
- Contradictions are marked with `> [CONFLICT: ...]`.
- Human review notes are marked with `> [NEEDS REVIEW: ...]`.
- `index.md` catalogs pages by category.
- `log.md` records ingests and lint passes chronologically.

Common wiki categories:

- `sources/` for source summaries
- `topics/` for people, places, things, ideas, techniques, and themes
- `answers/` for valuable synthesized query results

## API Overview

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/ingest` | Ingest pasted text via SSE |
| `POST` | `/api/ingest-file` | Ingest a file from `sources/raw/` via SSE |
| `POST` | `/api/query` | Ask a question against the wiki via SSE |
| `POST` | `/api/lint` | Audit and repair the wiki via SSE |
| `GET` | `/api/pages` | List wiki pages |
| `GET` | `/api/page?filename=` | Read a wiki page |
| `GET` | `/api/graph` | Get wiki graph (nodes + links from wikilinks) |
| `GET` | `/api/sources` | List uploaded source files |
| `POST` | `/api/upload` | Upload a source file |
| `GET` | `/api/settings` | Read current settings |
| `POST` | `/api/settings` | Save runtime settings |

## Development Notes

- `backend/app.py` defines the FastAPI app and streaming endpoints.
- `backend/wiki_system.py` defines ingest, query, and lint prompts.
- `backend/wiki_tools.py` exposes page read/write/list/search tools to the LLM.
- `backend/ai_generator.py` contains provider-specific agent loops.
- `frontend/src/components/GraphView.jsx` renders the interactive wiki graph using `react-force-graph-2d`.
- `frontend/src/app/page.jsx` owns the main UI state and view switching.
- `frontend/src/utils/sse.js` consumes streaming operation events.

Runtime secrets are intentionally ignored by git:

- `backend/.env`
- `backend/wiki_settings.json`

Generated dependencies and builds are also ignored:

- `backend/.venv/`
- `frontend/node_modules/`
- `frontend/.next/`
