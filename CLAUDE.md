# LLM Wiki Agent

A web app that implements the [LLM Wiki pattern](llm-wiki.md): an LLM incrementally builds and maintains a persistent markdown wiki from source documents, rather than doing RAG from scratch on every query.

## Architecture

```
llm-wiki-agent/
├── backend/          # FastAPI + Python (uv)
├── frontend/         # Next.js + React + Tailwind
├── sources/
│   ├── raw/          # Immutable source documents (.md) — LLM reads, never writes
│   └── wiki/         # LLM-maintained wiki pages — index.md, log.md, topics/, sources/, answers/
└── run.sh            # Starts backend on :8789
```

## Running the project

**Backend** (serves built frontend in production):
```bash
./run.sh
# or: cd backend && uv run uvicorn app:app --reload --port 8789
```

**Frontend dev server** (hot reload at :5173):
```bash
cd frontend && npm run dev
```

**Build frontend**:
```bash
cd frontend && npm run build
```

The backend serves the built frontend at `/` via static files. CORS allows `:5173` and `:4173` for dev.

See [query-flow.md](query-flow.md) for detailed request flow diagrams.

## Configuration

Copy `backend/.env.example` to `backend/.env` and set your chosen LLM mode and credentials.

Settings priority: `backend/wiki_settings.json` (runtime, written by the UI) > `.env` / env vars > defaults.

**LLM modes:**

| Mode | Tool calling | Notes |
|---|---|---|
| `anthropic_api_key` | Yes | Default |
| `openai_api_key` | Yes | |
| `openrouter_api_key` | Yes | |
| `openclaw_api` | No | Wiki ops won't work |
| `openai_codex_oauth` | No | Wiki ops won't work |

Wiki operations (ingest, query, lint) require tool calling. The UI warns if the selected mode doesn't support it.

## Key backend files

- `app.py` — FastAPI app; SSE streaming via `_sse()` helper; all wiki ops stream `tool_call`/`tool_result`/`done` events
- `wiki_system.py` — `WikiSystem` class; holds prompts for ingest, query, lint; creates `index.md` and `log.md` on first run
- `wiki_tools.py` — Four LLM tools: `read_wiki_page`, `write_wiki_page`, `list_wiki_pages`, `search_wiki`
- `ai_generator.py` — `WikiAIGenerator`; agentic tool-call loop for Anthropic and OpenAI-compatible providers
- `config.py` — `Config` class with properties that re-read settings on every access (picks up UI changes live)
- `settings_store.py` — Reads/writes `backend/wiki_settings.json`

## API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/ingest` | Ingest text (title + content) — SSE |
| POST | `/api/ingest-file` | Ingest a file from `sources/raw/` by filename — SSE |
| POST | `/api/query` | Ask a question against the wiki — SSE |
| POST | `/api/lint` | Audit and fix the wiki — SSE |
| GET | `/api/pages` | List all wiki pages |
| GET | `/api/page?filename=` | Read a wiki page |
| GET | `/api/sources` | List raw source files |
| POST | `/api/upload` | Upload a `.md` file to `sources/raw/` |
| GET | `/api/settings` | Get current config |
| POST | `/api/settings` | Save settings to `wiki_settings.json` |

## Frontend components

- `app/page.jsx` — Root; owns all state; four views: `query` (Ask), `page` (Pages), `progress`, `settings`
- `Sidebar` — Source list (upload/ingest per file) + wiki page list + lint button
- `QueryView` — Chat interface for wiki questions (Ask tab); renders `[[wikilinks]]` as clickable links
- `PageViewer` — Markdown renderer for wiki pages; supports wiki link navigation with back history
- `ProgressPanel` — Live SSE log during ingest/lint
- `SettingsPage` — LLM provider config UI
- `IngestModal` — Paste text to ingest
- `UploadModal` — Upload files to raw sources
- `utils/sse.js` — `streamSSE()` helper for consuming SSE endpoints

## Wiki conventions

The LLM maintains these conventions (defined in `wiki_system.py` prompts):

- **Filenames**: lowercase, hyphens — `topics/rag.md`, `topics/vector-search.md`, `sources/article-title.md`, `answers/my-query.md`
- **Page structure**: `# Title` then `## Sections`
- **Cross-references**: `[[page-name]]` wikilink style
- **Conflicts**: `> [CONFLICT: ...]`
- **Needs review**: `> [NEEDS REVIEW: ...]`
- **`index.md`**: catalog of all pages by category; LLM reads this first on every query
- **`log.md`**: append-only; entries prefixed `## [YYYY-MM-DD] ingest | <title>` or `## [YYYY-MM-DD] lint | <summary>`

Ingest touches 5–15 pages per source (max 25 tool-call rounds). Query uses up to 10 rounds. Lint uses up to 25 rounds.
