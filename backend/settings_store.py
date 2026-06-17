import json
from pathlib import Path

SETTINGS_FILE = Path(__file__).parent / "wiki_settings.json"


def load() -> dict:
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save(data: dict):
    SETTINGS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
