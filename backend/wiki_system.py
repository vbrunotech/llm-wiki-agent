from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional

from ai_generator import WikiAIGenerator
from wiki_tools import WikiToolManager

INGEST_PROMPT = """You are a wiki maintenance agent. Integrate a new source document into the persistent wiki.

Steps:
1. Read the source content provided in the user message
2. Read `index.md` to understand the current wiki structure
3. Identify every important entity, concept, claim, or fact in the source
4. For each one:
   - Check the index or search to see if a page already exists
   - If it exists: read it, then update it — add new info and flag contradictions with > [CONFLICT: ...]
   - If it doesn't exist: create a new page under the right category (topics/, sources/)
5. Write a summary page under `sources/` for the source itself, with cross-links
6. Update `index.md` to include any new pages
7. Append to `log.md`:  ## [YYYY-MM-DD] ingest | <source title>

Wiki conventions:
- Filenames: lowercase, hyphens, e.g. `topics/rag.md`, `topics/vector-search.md`
- Page structure: # Title then ## sections
- Cross-references: [[page-name]] wikilink style
- One source may update 5–15 pages — be thorough
- Always finish by updating index.md and log.md
"""

QUERY_PROMPT = """You are a wiki query agent. Answer the user's question strictly from wiki content.

Steps:
1. Read `index.md` to locate relevant pages
2. Read those pages (use `search_wiki` for broad terms)
3. Synthesize a precise answer with citations like [[page-name]]
4. If the answer is a valuable analysis, save it as a new page under `answers/` and mention it

Do not invent facts not in the wiki. If the wiki lacks the information, say so clearly.
"""

LINT_PROMPT = """You are a wiki health auditor. Audit the wiki and fix what you can.

Check for:
1. Orphan pages — in the file system but not linked from index.md
2. Missing cross-references — a page mentions an entity that has its own page but no link
3. Contradiction pairs — conflicting claims between pages; add > [CONFLICT: ...] notes
4. Frequently mentioned concepts lacking a dedicated page — create stubs
5. Broken index entries pointing to non-existent files — remove them

Fix issues inline. Flag anything needing human judgment with > [NEEDS REVIEW: ...]
End by appending to log.md:  ## [YYYY-MM-DD] lint | <summary>
"""


class WikiSystem:
    def __init__(self, config, wiki_dir: Path):
        self.config = config
        self.wiki_dir = wiki_dir
        self.wiki_dir.mkdir(parents=True, exist_ok=True)
        self._bootstrap()

    def _bootstrap(self):
        index = self.wiki_dir / "index.md"
        if not index.exists():
            index.write_text(
                "# Wiki Index\n\n## Sources\n\n## Topics\n\n## Answers\n",
                encoding="utf-8",
            )
        log = self.wiki_dir / "log.md"
        if not log.exists():
            log.write_text("# Wiki Log\n\n", encoding="utf-8")

    def _ai(self) -> WikiAIGenerator:
        """Create a fresh AI generator from current config (picks up settings changes)."""
        return WikiAIGenerator(
            llm_mode=self.config.llm_mode,
            api_key=self.config.api_key,
            model=self.config.model,
            openclaw_base_url=self.config.openclaw_base_url,
            openclaw_upstream_model=self.config.openclaw_upstream_model,
        )

    def _tm(self) -> WikiToolManager:
        return WikiToolManager(self.wiki_dir)

    def ingest(self, title: str, content: str, progress_callback=None) -> str:
        date = datetime.now().strftime("%Y-%m-%d")
        query = f"Ingest this source into the wiki.\n\nTitle: {title}\nDate: {date}\n\n---\n\n{content}"
        return self._ai().generate(query, INGEST_PROMPT, self._tm(), max_rounds=25, progress_callback=progress_callback)

    def query(self, question: str, progress_callback=None) -> str:
        return self._ai().generate(question, QUERY_PROMPT, self._tm(), max_rounds=10, progress_callback=progress_callback)

    def lint(self, progress_callback=None) -> str:
        return self._ai().generate("Audit and fix the wiki.", LINT_PROMPT, self._tm(), max_rounds=25, progress_callback=progress_callback)

    def list_pages(self) -> List[dict]:
        pages = []
        if not self.wiki_dir.exists():
            return pages
        for path in sorted(self.wiki_dir.rglob("*.md")):
            rel = str(path.relative_to(self.wiki_dir))
            lines = path.read_text(encoding="utf-8").splitlines()
            title = next((l.lstrip("#").strip() for l in lines if l.startswith("#")), rel)
            pages.append({"filename": rel, "title": title, "size": path.stat().st_size})
        return pages

    def read_page(self, filename: str) -> Optional[str]:
        path = self.wiki_dir / filename
        return path.read_text(encoding="utf-8") if path.exists() else None
