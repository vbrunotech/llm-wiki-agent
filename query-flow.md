# Query Flow

How the app answers a user question, end to end.

```
USER
 │
 │  types a question + hits Enter
 ▼
QueryView.jsx  (onSend → handleQuery)
 │
 │  POST /api/query  { question: "..." }
 │  Content-Type: application/json
 ▼
sse.js  streamSSE()
 │  opens a streaming fetch, reads SSE events in a loop
 │  emits: tool_call | tool_result | done | error
 ▼
─────────────────────────────────────────────────────
FastAPI  backend  (app.py)
─────────────────────────────────────────────────────
 │
 ▼
@app.post("/api/query")
 │  calls _sse(wiki.query, question)
 │  spins up asyncio.Queue  ←──────────────────────────────────┐
 │  runs wiki.query() in a background thread                   │
 │  yields SSE frames from the queue as they arrive            │
 ▼                                                             │
wiki_system.py  WikiSystem.query()                             │
 │                                                             │
 │  system prompt = QUERY_PROMPT                               │
 │  ("read index.md first, then drill into pages,              │
 │    synthesize answer with citations,                        │
 │    save valuable answers under answers/")                   │
 │                                                             │
 ▼                                                             │
ai_generator.py  WikiAIGenerator.generate()                    │
 │                                                             │
 │  logs prompt + query to terminal                            │
 │                                                             │
 ▼                                                             │
┌──────────────────────────────────────────────────┐          │
│  Agentic tool-call loop  (max 10 rounds)          │          │
│                                                   │          │
│  round 1                                          │          │
│   ├─ send messages + tools to LLM API             │          │
│   │                                               │          │
│   │         ┌─────────────────────┐              │          │
│   │         │  LLM API            │              │          │
│   │  ──────►│  Anthropic / OpenAI │              │          │
│   │         │  / OpenRouter / … │              │          │
│   │  ◄──────│                     │              │          │
│   │         └─────────────────────┘              │          │
│   │                                               │          │
│   ├─ stop_reason = tool_use ?                     │          │
│   │                                               │          │
│   │   YES → for each tool call:                   │          │
│   │          ├─ progress_cb("tool_call", name) ───┼──────────┤
│   │          │   SSE: { type:"tool_call", message: name }    │
│   │          │                                    │          │
│   │          ├─ wiki_tools.py  WikiToolManager    │          │
│   │          │   .execute(name, **args)            │          │
│   │          │                                    │          │
│   │          │   read_wiki_page  ──► sources/wiki/<file>.md  │
│   │          │   write_wiki_page ──► sources/wiki/<file>.md  │
│   │          │   list_wiki_pages ──► sources/wiki/**/*.md    │
│   │          │   search_wiki     ──► grep sources/wiki/      │
│   │          │                                    │          │
│   │          ├─ progress_cb("tool_result", result)┼──────────┤
│   │          │   SSE: { type:"tool_result", message: … }     │
│   │          │                                    │          │
│   │          └─ append result to messages         │          │
│   │              loop → round 2, 3 …              │          │
│   │                                               │          │
│   └─ stop_reason = end_turn                       │          │
│       → return final text                         │          │
└──────────────────────────────────────────────────┘          │
 │                                                             │
 │  SSE: { type:"done", result: "<answer markdown>" } ─────────┘
 │
 ▼
─────────────────────────────────────────────────────
Frontend
─────────────────────────────────────────────────────
 │
 ▼
streamSSE()  receives  type:"done"
 │  answer = event.result
 ▼
handleQuery()
 │  setMessages([...prev, { role:"assistant", content: answer }])
 │  loadPages()  ← refresh sidebar (LLM may have written answers/)
 ▼
QueryView.jsx
 │  renders answer with ReactMarkdown + remark-gfm
 │  [[wikilinks]] → clickable buttons → open PageViewer
 ▼
USER reads the answer
```

## What the LLM typically does in the loop

```
round 1 ── read_wiki_page("index.md")
            → discover which pages exist

round 2 ── search_wiki("keyword")          ← if question is broad
        or read_wiki_page("topics/x.md")   ← if index pointed directly

round 3 ── read_wiki_page("topics/y.md")
            → cross-reference related pages

round 4 ── (optional) write_wiki_page("answers/my-query.md")
            → save the synthesis as a new wiki page

round 5 ── final text answer with [[wikilink]] citations
```

## Key files involved

| Layer | File | Role |
|---|---|---|
| UI | `src/components/QueryView.jsx` | Input + message rendering |
| State | `src/app/page.jsx` | `handleQuery`, SSE wiring |
| SSE client | `src/utils/sse.js` | Streaming fetch helper |
| API | `backend/app.py` | `/api/query` route + SSE queue |
| Orchestration | `backend/wiki_system.py` | `QUERY_PROMPT` + calls generator |
| LLM loop | `backend/ai_generator.py` | Agentic tool-call loop |
| Tools | `backend/wiki_tools.py` | Read/write/list/search wiki files |
| Wiki data | `sources/wiki/` | Markdown pages the LLM reads |

---

# Wiki Operation Flow (ingest / lint)

Same SSE pipeline as query, but with different prompts and higher round limits.

```
User action (clicks "Ingest" or "Lint")
  │
  ▼
page.jsx  handleIngestSubmit() / handleIngestFile() / handleLint()
  │  sets view='progress', calls runOperation()
  │
  ▼
utils/sse.js  streamSSE(url, body, onEvent)
  │  POST /api/ingest (or /api/ingest-file, /api/lint)
  │  reads EventSource stream, calls onEvent() per SSE event
  │
  ▼
backend/app.py  _sse() → asyncio.Queue → background thread
  │  yields SSE frames: tool_call | tool_result | done | error
  │
  ▼
backend/wiki_system.py  WikiSystem.ingest() / lint()
  │  INGEST_PROMPT or LINT_PROMPT + WikiAIGenerator.generate(max_rounds=25)
  │
  ▼
backend/ai_generator.py  agentic loop (same as query)
  │  LLM reads/writes wiki pages via wiki_tools.py
  │
  ▼
SSE stream closes → page.jsx runOperation() resolves → loadPages()
ProgressPanel shows tool_call / tool_result log in real time
```

# Read a Wiki Page

```
User clicks a page in the sidebar
  │
  ▼
page.jsx  handleViewPage(filename)
  │  GET /api/page?filename=topics/wagashi.md
  │
  ▼
backend/app.py  @app.get("/api/page")
  │  WikiSystem.read_page(filename) → reads sources/wiki/<filename>.md
  │
  ▼
page.jsx  sets currentPage, switches view to 'page'
  │
  ▼
PageViewer.jsx  renders markdown via react-markdown + remark-gfm
  │  [[wikilinks]] → clickable buttons → navigate to linked page
```

# Settings Change

```
User edits a field in SettingsPage and saves
  │
  ▼
SettingsPage.jsx  POST /api/settings { llm_mode, anthropic_api_key, ... }
  │
  ▼
backend/app.py  @app.post("/api/settings") → merges with existing
  │
  ▼
backend/settings_store.py  save(dict) → writes backend/wiki_settings.json
  │
  ▼
backend/config.py  Config (dynamic @property reads)
  │  next wiki operation picks up new values — no restart needed
```

# Upload a Source File

```
User selects a file in UploadModal
  │
  ▼
UploadModal.jsx  POST /api/upload (multipart/form-data)
  │
  ▼
backend/app.py  @app.post("/api/upload")
  │  writes file to sources/raw/<filename>
  │
  ▼
page.jsx  loadSources() → GET /api/sources → refreshes sidebar
  (user can then click "Ingest" next to the file)
```
