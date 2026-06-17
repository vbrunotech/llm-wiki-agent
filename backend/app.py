import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import settings_store
from config import config, VALID_MODES, TOOL_CAPABLE_MODES
from wiki_system import WikiSystem
from file_converter import extract_text, extract_title, SUPPORTED_EXTENSIONS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="LLM Wiki Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
SOURCES_DIR = Path(os.environ.get("SOURCES_DIR", Path(__file__).parent.parent / "sources"))
WIKI_DIR = SOURCES_DIR / "wiki"
RAW_DIR = SOURCES_DIR / "raw"
WIKI_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)

wiki = WikiSystem(config, WIKI_DIR)


# ── Models ────────────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    title: str
    content: str


class QueryRequest(BaseModel):
    question: str


class IngestFileRequest(BaseModel):
    filename: str


# ── SSE helper ────────────────────────────────────────────────────────────────

async def _sse(operation_fn, *args):
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def progress(event_type: str, message: str):
        loop.call_soon_threadsafe(queue.put_nowait, {"type": event_type, "message": message})

    async def run():
        try:
            result = await asyncio.to_thread(operation_fn, *args, progress)
            queue.put_nowait({"type": "done", "result": result})
        except Exception as e:
            logger.exception("Wiki operation failed")
            queue.put_nowait({"type": "error", "message": str(e)})

    asyncio.create_task(run())

    async def generate():
        while True:
            item = await asyncio.wait_for(queue.get(), timeout=600)
            yield f"data: {json.dumps(item)}\n\n"
            if item.get("type") in ("done", "error"):
                break

    return StreamingResponse(generate(), media_type="text/event-stream")


# ── Wiki endpoints ─────────────────────────────────────────────────────────────

@app.post("/api/ingest")
async def ingest(req: IngestRequest):
    return await _sse(wiki.ingest, req.title, req.content)


@app.post("/api/ingest-file")
async def ingest_file(req: IngestFileRequest):
    path = RAW_DIR / req.filename
    if not path.exists() or path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise HTTPException(404, "Source file not found")
    try:
        content = extract_text(path)
    except Exception as e:
        raise HTTPException(422, f"Could not extract text: {e}")
    title = extract_title(path, content)
    return await _sse(wiki.ingest, title, content)


@app.post("/api/ingest-upload")
async def ingest_upload(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
    tmp = RAW_DIR / file.filename
    tmp.write_bytes(await file.read())
    try:
        content = extract_text(tmp)
    except Exception as e:
        tmp.unlink(missing_ok=True)
        raise HTTPException(422, f"Could not extract text: {e}")
    title = extract_title(tmp, content)
    return await _sse(wiki.ingest, title, content)


@app.post("/api/query")
async def query(req: QueryRequest):
    return await _sse(wiki.query, req.question)


@app.post("/api/lint")
async def lint():
    return await _sse(wiki.lint)


@app.get("/api/pages")
async def pages():
    return {"pages": wiki.list_pages()}


@app.get("/api/page")
async def page(filename: str):
    content = wiki.read_page(filename)
    if content is None:
        raise HTTPException(404, "Page not found")
    return {"filename": filename, "content": content}


@app.get("/api/sources")
async def sources():
    files = []
    for path in sorted(RAW_DIR.iterdir()):
        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        title = path.stem.replace("-", " ").replace("_", " ")
        files.append({"filename": path.name, "title": title, "size": path.stat().st_size, "ext": path.suffix.lower()})
    return {"sources": sorted(files, key=lambda f: f["filename"])}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
    dest = RAW_DIR / file.filename
    dest.write_bytes(await file.read())
    return {"filename": file.filename}


# ── Settings endpoints ────────────────────────────────────────────────────────

@app.get("/api/settings")
async def get_settings():
    """Return current settings (file values take precedence, env vars as fallback)."""
    return {
        "llm_mode": config.llm_mode,
        "supported_modes": list(VALID_MODES),
        "tool_capable_modes": list(TOOL_CAPABLE_MODES),
        "supports_tools": config.supports_tools,
        # Per-provider fields (full values — this is a local personal tool)
        "anthropic_api_key": config.anthropic_api_key,
        "anthropic_model": config.anthropic_model,
        "openai_api_key": config.openai_api_key,
        "openai_model": config.openai_model,
        "openai_oauth_token": config.openai_oauth_token,
        "openai_codex_model": config.openai_codex_model,
        "openclaw_api_key": config.openclaw_api_key,
        "openclaw_base_url": config.openclaw_base_url,
        "openclaw_model": config.openclaw_model,
        "openclaw_upstream_model": config.openclaw_upstream_model,
        "openrouter_api_key": config.openrouter_api_key,
        "openrouter_model": config.openrouter_model,
    }


@app.post("/api/settings")
async def save_settings(body: Dict[str, Any]):
    """Persist settings to wiki_settings.json. Config reloads automatically on next request."""
    allowed_keys = {
        "llm_mode",
        "anthropic_api_key", "anthropic_model",
        "openai_api_key", "openai_model",
        "openai_oauth_token", "openai_codex_model",
        "openclaw_api_key", "openclaw_base_url", "openclaw_model", "openclaw_upstream_model",
        "openrouter_api_key", "openrouter_model",
    }
    filtered = {k: v for k, v in body.items() if k in allowed_keys}

    if "llm_mode" in filtered and filtered["llm_mode"] not in VALID_MODES:
        raise HTTPException(400, f"Invalid llm_mode. Must be one of: {sorted(VALID_MODES)}")

    # Merge with existing settings (keep keys not in this request)
    existing = settings_store.load()
    existing.update(filtered)
    settings_store.save(existing)

    return {
        "status": "saved",
        "llm_mode": config.llm_mode,
        "supports_tools": config.supports_tools,
    }


# Frontend is served by Next.js (npm start on port 3000)
