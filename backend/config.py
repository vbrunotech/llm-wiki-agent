import os
from dotenv import load_dotenv
import settings_store

load_dotenv()

VALID_MODES = {
    "anthropic_api_key",
    "openai_api_key",
    "openai_codex_oauth",
    "openclaw_api",
    "openrouter_api_key",
}

TOOL_CAPABLE_MODES = {"anthropic_api_key", "openai_api_key", "openrouter_api_key", "openclaw_api", "openai_codex_oauth"}

_DEFAULTS = {
    "anthropic_model": "claude-sonnet-4-20250514",
    "openai_model": "gpt-4o",
    "openai_codex_model": "gpt-5.5",
    "openclaw_model": "openclaw/default",
    "openclaw_base_url": "http://127.0.0.1:18789/v1",
    "openclaw_upstream_model": "openai-codex/gpt-5.5",
    "openrouter_model": "anthropic/claude-sonnet-4",
}


def _get(settings_key: str, env_key: str | None = None, default: str = "") -> str:
    """Priority: wiki_settings.json > .env / env var > default."""
    s = settings_store.load()
    if settings_key in s and s[settings_key]:
        return s[settings_key]
    if env_key and os.getenv(env_key):
        return os.getenv(env_key)
    return default


class Config:
    # ── mode ──────────────────────────────────────────────────────────────────
    @property
    def llm_mode(self) -> str:
        mode = _get("llm_mode", "LLM_MODE", "anthropic_api_key")
        return mode if mode in VALID_MODES else "anthropic_api_key"

    # ── per-provider keys & models ────────────────────────────────────────────
    @property
    def anthropic_api_key(self) -> str:
        return _get("anthropic_api_key", "ANTHROPIC_API_KEY")

    @property
    def anthropic_model(self) -> str:
        return _get("anthropic_model", "ANTHROPIC_MODEL", _DEFAULTS["anthropic_model"])

    @property
    def openai_api_key(self) -> str:
        return _get("openai_api_key", "OPENAI_API_KEY")

    @property
    def openai_model(self) -> str:
        return _get("openai_model", "OPENAI_MODEL", _DEFAULTS["openai_model"])

    @property
    def openai_oauth_token(self) -> str:
        return _get("openai_oauth_token", "OPENAI_OAUTH_TOKEN")

    @property
    def openai_codex_model(self) -> str:
        return _get("openai_codex_model", "OPENAI_CODEX_MODEL", _DEFAULTS["openai_codex_model"])

    @property
    def openclaw_api_key(self) -> str:
        return _get("openclaw_api_key", "OPENCLAW_API_KEY")

    @property
    def openclaw_base_url(self) -> str:
        return _get("openclaw_base_url", "OPENCLAW_BASE_URL", _DEFAULTS["openclaw_base_url"])

    @property
    def openclaw_model(self) -> str:
        return _get("openclaw_model", "OPENCLAW_MODEL", _DEFAULTS["openclaw_model"])

    @property
    def openclaw_upstream_model(self) -> str:
        return _get("openclaw_upstream_model", "OPENCLAW_UPSTREAM_MODEL", _DEFAULTS["openclaw_upstream_model"])

    @property
    def openrouter_api_key(self) -> str:
        return _get("openrouter_api_key", "OPENROUTER_API_KEY")

    @property
    def openrouter_model(self) -> str:
        return _get("openrouter_model", "OPENROUTER_MODEL", _DEFAULTS["openrouter_model"])

    # ── resolved shorthand ────────────────────────────────────────────────────
    @property
    def api_key(self) -> str:
        m = self.llm_mode
        if m == "anthropic_api_key":  return self.anthropic_api_key
        if m == "openai_api_key":     return self.openai_api_key
        if m == "openai_codex_oauth": return self.openai_oauth_token
        if m == "openclaw_api":       return self.openclaw_api_key
        if m == "openrouter_api_key": return self.openrouter_api_key
        return ""

    @property
    def model(self) -> str:
        m = self.llm_mode
        if m == "anthropic_api_key":  return self.anthropic_model
        if m == "openai_api_key":     return self.openai_model
        if m == "openai_codex_oauth": return self.openai_codex_model
        if m == "openclaw_api":       return self.openclaw_model
        if m == "openrouter_api_key": return self.openrouter_model
        return ""

    @property
    def supports_tools(self) -> bool:
        return self.llm_mode in TOOL_CAPABLE_MODES


config = Config()
