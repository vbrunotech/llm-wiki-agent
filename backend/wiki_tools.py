from pathlib import Path
from typing import List


class WikiTool:
    name: str

    def definition(self) -> dict:
        raise NotImplementedError

    def execute(self, **kwargs) -> str:
        raise NotImplementedError


class ReadPage(WikiTool):
    name = "read_wiki_page"

    def __init__(self, wiki_dir: Path):
        self.wiki_dir = wiki_dir

    def definition(self) -> dict:
        return {
            "name": self.name,
            "description": "Read a wiki page by its filename. Returns the full markdown content.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "Relative path within the wiki, e.g. 'index.md' or 'topics/rag.md'",
                    }
                },
                "required": ["filename"],
            },
        }

    def execute(self, filename: str) -> str:
        path = self.wiki_dir / filename
        if not path.exists():
            return f"[Page not found: {filename}]"
        return path.read_text(encoding="utf-8")


class WritePage(WikiTool):
    name = "write_wiki_page"

    def __init__(self, wiki_dir: Path):
        self.wiki_dir = wiki_dir

    def definition(self) -> dict:
        return {
            "name": self.name,
            "description": "Write or update a wiki page. Creates the file and parent directories if needed.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "Relative path, e.g. 'topics/rag.md'",
                    },
                    "content": {
                        "type": "string",
                        "description": "Full markdown content for the page",
                    },
                },
                "required": ["filename", "content"],
            },
        }

    def execute(self, filename: str, content: str) -> str:
        path = self.wiki_dir / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return f"[Written: {filename} ({len(content)} chars)]"


class ListPages(WikiTool):
    name = "list_wiki_pages"

    def __init__(self, wiki_dir: Path):
        self.wiki_dir = wiki_dir

    def definition(self) -> dict:
        return {
            "name": self.name,
            "description": "List all pages in the wiki with their titles.",
            "input_schema": {"type": "object", "properties": {}, "required": []},
        }

    def execute(self) -> str:
        if not self.wiki_dir.exists():
            return "[Wiki is empty]"
        pages = []
        for path in sorted(self.wiki_dir.rglob("*.md")):
            rel = str(path.relative_to(self.wiki_dir))
            lines = path.read_text(encoding="utf-8").splitlines()
            title = next((l.lstrip("#").strip() for l in lines if l.startswith("#")), rel)
            pages.append(f"- {rel}: {title}")
        return "\n".join(pages) if pages else "[No pages yet]"


class SearchWiki(WikiTool):
    name = "search_wiki"

    def __init__(self, wiki_dir: Path):
        self.wiki_dir = wiki_dir

    def definition(self) -> dict:
        return {
            "name": self.name,
            "description": "Search wiki pages for a keyword. Returns matching excerpts with filenames.",
            "input_schema": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Search term"}},
                "required": ["query"],
            },
        }

    def execute(self, query: str) -> str:
        if not self.wiki_dir.exists():
            return "[Wiki is empty]"
        results = []
        q = query.lower()
        for path in sorted(self.wiki_dir.rglob("*.md")):
            rel = str(path.relative_to(self.wiki_dir))
            lines = path.read_text(encoding="utf-8").splitlines()
            for i, line in enumerate(lines):
                if q in line.lower():
                    start, end = max(0, i - 1), min(len(lines), i + 3)
                    excerpt = "\n".join(lines[start:end])
                    results.append(f"**{rel}** (line {i + 1}):\n{excerpt}")
                    break
        return ("\n\n---\n\n".join(results[:10])) if results else f"[No results for: {query!r}]"


class WikiToolManager:
    def __init__(self, wiki_dir: Path):
        tools: List[WikiTool] = [
            ReadPage(wiki_dir),
            WritePage(wiki_dir),
            ListPages(wiki_dir),
            SearchWiki(wiki_dir),
        ]
        self._tools = {t.name: t for t in tools}

    def get_definitions(self) -> List[dict]:
        return [t.definition() for t in self._tools.values()]

    def execute(self, name: str, **kwargs) -> str:
        if name not in self._tools:
            return f"[Unknown tool: {name}]"
        return self._tools[name].execute(**kwargs)
