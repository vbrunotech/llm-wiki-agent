import json
import requests
from json import JSONDecodeError
from typing import Callable, Dict, Optional


class WikiAIGenerator:
    """LLM client for wiki operations. Supports all 5 provider modes."""

    CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses"

    def __init__(self, llm_mode: str, api_key: str, model: str,
                 openclaw_base_url: str = "", openclaw_upstream_model: str = ""):
        self.llm_mode = llm_mode
        self.model = model
        self.openclaw_upstream_model = openclaw_upstream_model
        self._params = {"model": model, "temperature": 0, "max_tokens": 4096}

        if not api_key:
            raise ValueError(f"Missing credentials for LLM mode '{llm_mode}'")

        if llm_mode == "anthropic_api_key":
            import anthropic
            self.client = anthropic.Anthropic(api_key=api_key)

        elif llm_mode == "openai_api_key":
            import openai
            self.client = openai.OpenAI(api_key=api_key)

        elif llm_mode == "openrouter_api_key":
            import openai
            self.client = openai.OpenAI(
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                default_headers={
                    "HTTP-Referer": "https://github.com/llm-wiki-agent",
                    "X-Title": "llm-wiki-agent",
                },
            )

        elif llm_mode == "openclaw_api":
            import openai
            self.client = openai.OpenAI(api_key=api_key, base_url=openclaw_base_url)

        elif llm_mode == "openai_codex_oauth":
            self.client = None
            self._api_key = api_key
            self._codex_account_id = _extract_codex_account_id(api_key)

        else:
            raise ValueError(f"Unknown LLM mode: '{llm_mode}'")

    @property
    def supports_tools(self) -> bool:
        return self.llm_mode in ("anthropic_api_key", "openai_api_key", "openrouter_api_key", "openclaw_api", "openai_codex_oauth")

    def generate(
        self,
        query: str,
        system_prompt: str,
        tool_manager,
        max_rounds: int = 20,
        progress_callback: Optional[Callable[[str, str], None]] = None,
    ) -> str:
        if not self.supports_tools:
            return (
                f"⚠️ **LLM mode `{self.llm_mode}` does not support tool calling.**\n\n"
                "Wiki operations (ingest, query, lint) require tool calling. "
                "Please switch to **Anthropic**, **OpenAI**, or **OpenRouter** in Settings."
            )

        print(f"\n{'='*60}")
        print(f"[{self.llm_mode}] model={self.model}")
        print(f"[prompt] {system_prompt[:300]}{'...' if len(system_prompt) > 300 else ''}")
        print(f"[query]  {query[:300]}{'...' if len(query) > 300 else ''}")
        print(f"{'='*60}")

        if self.llm_mode == "anthropic_api_key":
            return self._anthropic_loop(query, system_prompt, tool_manager, max_rounds, progress_callback)

        if self.llm_mode == "openai_codex_oauth":
            return self._codex_responses_loop(query, system_prompt, tool_manager, max_rounds, progress_callback)

        # openai_api_key, openrouter_api_key, openclaw_api share the OpenAI-compatible path
        return self._openai_loop(query, system_prompt, tool_manager, max_rounds, progress_callback)

    # ── Anthropic ─────────────────────────────────────────────────────────────

    def _anthropic_loop(self, query, system, tool_manager, max_rounds, progress_cb):
        tools = tool_manager.get_definitions()
        messages = [{"role": "user", "content": query}]

        for round_num in range(max_rounds):
            response = self.client.messages.create(
                **self._params,
                system=system,
                messages=messages,
                tools=tools,
                tool_choice={"type": "auto"},
            )
            print(f"[Anthropic] round={round_num + 1} stop_reason={response.stop_reason}")

            if response.stop_reason != "tool_use":
                return response.content[0].text

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    print(f"  → tool: {block.name}  args: {json.dumps(block.input)[:120]}")
                    if progress_cb:
                        progress_cb("tool_call", block.name)
                    try:
                        result = tool_manager.execute(block.name, **block.input)
                    except Exception as e:
                        result = f"[Tool error: {e}]"
                    print(f"    result: {result[:120]}")
                    if progress_cb:
                        progress_cb("tool_result", result[:160])
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            messages.append({"role": "user", "content": tool_results})

        final = self.client.messages.create(**self._params, system=system, messages=messages)
        return final.content[0].text

    # ── OpenAI / OpenRouter ───────────────────────────────────────────────────

    def _openai_loop(self, query, system, tool_manager, max_rounds, progress_cb):
        openai_tools = [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["input_schema"],
                },
            }
            for t in tool_manager.get_definitions()
        ]
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": query},
        ]

        for round_num in range(max_rounds):
            response = self.client.chat.completions.create(
                **self._params, messages=messages, tools=openai_tools, tool_choice="auto"
            )
            message = response.choices[0].message
            finish_reason = response.choices[0].finish_reason
            print(f"[{self.llm_mode}] round={round_num + 1} finish_reason={finish_reason}")

            if finish_reason != "tool_calls":
                return message.content

            messages.append(message)
            for call in message.tool_calls:
                print(f"  → tool: {call.function.name}  args: {call.function.arguments[:120]}")
                if progress_cb:
                    progress_cb("tool_call", call.function.name)
                try:
                    args = json.loads(call.function.arguments)
                    result = tool_manager.execute(call.function.name, **args)
                except Exception as e:
                    result = f"[Tool error: {e}]"
                print(f"    result: {result[:120]}")
                if progress_cb:
                    progress_cb("tool_result", result[:160])
                messages.append({"role": "tool", "tool_call_id": call.id, "content": result})

        final = self.client.chat.completions.create(**self._params, messages=messages)
        return final.choices[0].message.content

    # ── OpenAI Codex OAuth (Responses API, streaming — mirrors OpenClaw) ───────

    def _codex_responses_loop(self, query, system, tool_manager, max_rounds, progress_cb):
        tools = [
            {
                "type": "function",
                "name": t["name"],
                "description": t.get("description", ""),
                "parameters": t["input_schema"],
            }
            for t in tool_manager.get_definitions()
        ]
        messages = [{"role": "user", "content": query}]
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "chatgpt-account-id": self._codex_account_id,
            "originator": "openclaw",
            "content-type": "application/json",
            "OpenAI-Beta": "responses=experimental",
            "accept": "text/event-stream",
        }

        for round_num in range(max_rounds):
            body = {
                "model": self.model,
                "store": False,
                "stream": True,
                "instructions": system,
                "input": messages,
                "tools": tools,
                "tool_choice": "auto",
                "parallel_tool_calls": True,
            }
            print(f"[Codex] round={round_num + 1}")

            resp = requests.post(
                self.CODEX_RESPONSES_URL, headers=headers, json=body,
                stream=True, timeout=120,
            )
            resp.raise_for_status()

            # Consume SSE stream; final response.completed carries the full output
            output = _parse_codex_sse_output(resp)

            tool_calls = [item for item in output if item.get("type") == "function_call"]

            if not tool_calls:
                for item in output:
                    if item.get("type") == "message":
                        for c in item.get("content", []):
                            if c.get("type") == "output_text":
                                return c["text"]
                return ""

            # Append assistant output then tool results for next round
            messages.extend(output)
            for call in tool_calls:
                print(f"  → tool: {call['name']}  args: {call.get('arguments', '')[:120]}")
                if progress_cb:
                    progress_cb("tool_call", call["name"])
                try:
                    args = json.loads(call.get("arguments", "{}"))
                    result = tool_manager.execute(call["name"], **args)
                except Exception as e:
                    result = f"[Tool error: {e}]"
                print(f"    result: {result[:120]}")
                if progress_cb:
                    progress_cb("tool_result", result[:160])
                messages.append({
                    "type": "function_call_output",
                    "call_id": call.get("call_id") or call.get("id"),
                    "output": result,
                })

        return "[Max rounds reached]"


# ── Codex SSE parser ─────────────────────────────────────────────────────────

def _parse_codex_sse_output(response) -> list:
    """Consume an SSE stream from the Codex Responses API.

    Waits for the response.completed / response.done event (same as OpenClaw's
    mapCodexEvents) and returns the output[] array it carries.
    """
    buf = ""
    for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
        if not chunk:
            continue
        buf += chunk
        while "\n\n" in buf:
            raw, buf = buf.split("\n\n", 1)
            data = "\n".join(
                line[5:].strip()
                for line in raw.splitlines()
                if line.startswith("data:")
            ).strip()
            if not data or data == "[DONE]":
                continue
            try:
                event = json.loads(data)
            except json.JSONDecodeError:
                continue

            t = event.get("type", "")
            if t in ("response.completed", "response.done", "response.incomplete"):
                return event.get("response", {}).get("output", [])
            if t == "response.failed":
                err = event.get("response", {}).get("error", {})
                raise RuntimeError(f"Codex response failed: {err.get('message', err)}")
            if t == "error":
                raise RuntimeError(f"Codex error: {event.get('message', event)}")
    return []


# ── JWT helper ────────────────────────────────────────────────────────────────

def _extract_codex_account_id(token: str) -> str:
    import base64 as _b64
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT — expected 3 parts")
    padding = (4 - len(parts[1]) % 4) % 4
    payload = json.loads(_b64.urlsafe_b64decode(parts[1] + "=" * padding))
    account_id = payload.get("https://api.openai.com/auth", {}).get("chatgpt_account_id", "")
    if not account_id:
        raise ValueError("chatgpt_account_id not found in JWT payload")
    return account_id
