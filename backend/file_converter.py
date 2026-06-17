from pathlib import Path
from markitdown import MarkItDown

# markitdown handles all of these natively
SUPPORTED_EXTENSIONS = {
    ".md", ".txt",
    ".pdf",
    ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls",
    ".csv", ".json", ".xml",
    ".html", ".htm",
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
    ".mp3", ".wav", ".m4a",
    ".zip",
}

_md = MarkItDown()


def extract_text(path: Path) -> str:
    result = _md.convert(str(path))
    return result.text_content


def extract_title(path: Path, content: str) -> str:
    lines = content.splitlines()

    # Skip YAML frontmatter (--- ... ---)
    start = 0
    if lines and lines[0].strip() == '---':
        for i in range(1, len(lines)):
            if lines[i].strip() in ('---', '...'):
                start = i + 1
                break

    for line in lines[start:]:
        if line.startswith('#'):
            return line.lstrip('#').strip()
        text = line.strip()
        if text and text != '---':
            return text[:120]

    return path.stem
