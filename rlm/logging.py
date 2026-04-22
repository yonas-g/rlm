"""Logging: console output, token tracking, and REPL trace logging."""

import json
import time
from pathlib import Path

from .config import LOG_DIR


# ── Console logger ──────────────────────────────────────────────────────────

class Logger:
    """Colored, indented logging for RLM internals."""

    COLORS = {
        "grey": "\033[90m",
        "cyan": "\033[36m",
        "yellow": "\033[33m",
        "green": "\033[32m",
        "red": "\033[31m",
        "magenta": "\033[35m",
        "bold": "\033[1m",
        "reset": "\033[0m",
    }

    @staticmethod
    def _c(color: str, text: str) -> str:
        return f"{Logger.COLORS.get(color, '')}{text}{Logger.COLORS['reset']}"

    @staticmethod
    def system(msg: str):
        print(Logger._c("cyan", f"[RLM] {msg}"))

    @staticmethod
    def llm_call(depth: int, model: str, iteration: int):
        indent = "  " * depth
        print(Logger._c("magenta", f"{indent}[depth={depth}] LLM call → {model} (iteration {iteration})"))

    @staticmethod
    def code(depth: int, code: str):
        indent = "  " * depth
        print(Logger._c("yellow", f"{indent}[depth={depth}] ▶ Executing code:"))
        for line in code.strip().splitlines():
            print(Logger._c("grey", f"{indent}  │ {line}"))

    @staticmethod
    def output(depth: int, output: str, truncated: bool = False):
        indent = "  " * depth
        label = " (truncated)" if truncated else ""
        print(Logger._c("green", f"{indent}[depth={depth}] ◀ Output{label}:"))
        for line in output.strip().splitlines()[:20]:
            print(Logger._c("grey", f"{indent}  │ {line}"))
        if len(output.strip().splitlines()) > 20:
            print(Logger._c("grey", f"{indent}  │ ... ({len(output.strip().splitlines())} lines total)"))

    @staticmethod
    def answer(depth: int, answer: str):
        indent = "  " * depth
        print(Logger._c("green", f"{indent}[depth={depth}] ✔ FINAL ANSWER"))

    @staticmethod
    def error(depth: int, msg: str):
        indent = "  " * depth
        print(Logger._c("red", f"{indent}[depth={depth}] ✘ {msg}"))

    @staticmethod
    def tokens(depth: int, prompt_tok: int, completion_tok: int, total_tok: int):
        indent = "  " * depth
        print(Logger._c("grey", f"{indent}[depth={depth}] tokens: {prompt_tok:,} in + {completion_tok:,} out = {total_tok:,}"))

    @staticmethod
    def subcall(depth: int, snippet_len: int, question: str):
        indent = "  " * depth
        q_short = question[:80] + ("..." if len(question) > 80 else "")
        print(Logger._c("magenta", f"{indent}[depth={depth}] ↳ recursive sub-call (snippet={snippet_len} chars): {q_short}"))


# ── Token tracker ───────────────────────────────────────────────────────────

class TokenTracker:
    """Tracks token usage across a session and logs each call to JSONL."""

    def __init__(self, session_id: str | None = None):
        self.session_id = session_id or time.strftime("%Y%m%d_%H%M%S")
        self.session_dir = LOG_DIR / self.session_id
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.session_dir / "rlm_log.jsonl"
        self.total_prompt = 0
        self.total_completion = 0
        self.total_calls = 0
        self.session_start = time.time()

    def record(self, response, *, depth: int, iteration: int, model: str, question: str):
        usage = getattr(response, "usage", None)
        prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
        completion_tokens = getattr(usage, "completion_tokens", 0) or 0
        total_tokens = prompt_tokens + completion_tokens

        self.total_prompt += prompt_tokens
        self.total_completion += completion_tokens
        self.total_calls += 1

        entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "session": self.session_id,
            "call_number": self.total_calls,
            "model": model,
            "depth": depth,
            "iteration": iteration,
            "question": question[:200],
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cumulative_prompt": self.total_prompt,
            "cumulative_completion": self.total_completion,
            "cumulative_total": self.total_prompt + self.total_completion,
        }

        with open(self.log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")

        return prompt_tokens, completion_tokens, total_tokens

    def summary(self) -> str:
        elapsed = time.time() - self.session_start
        return (
            f"Session: {self.total_calls} calls, "
            f"{self.total_prompt:,} prompt + {self.total_completion:,} completion "
            f"= {self.total_prompt + self.total_completion:,} total tokens "
            f"({elapsed:.0f}s)"
        )


# ── REPL trace logger ──────────────────────────────────────────────────────

class ReplLogger:
    """Logs full REPL traces — code, outputs, answers — to JSONL."""

    def __init__(self, session_id: str | None = None):
        self.session_id = session_id or time.strftime("%Y%m%d_%H%M%S")
        self.session_dir = LOG_DIR / self.session_id
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.session_dir / "rlm_repl_log.jsonl"
        self.step = 0

    def _write(self, entry: dict):
        entry = {"timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                 "session": self.session_id, "step": self.step, **entry}
        with open(self.log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
        self.step += 1

    def log_question(self, question: str, depth: int, model: str = ""):
        self._write({"event": "question", "depth": depth, "model": model, "question": question})

    def log_code(self, code: str, depth: int, iteration: int, model: str = ""):
        self._write({"event": "code", "depth": depth, "iteration": iteration, "model": model, "code": code})

    def log_output(self, output: str, depth: int, iteration: int, model: str = "", truncated: bool = False):
        self._write({"event": "output", "depth": depth, "iteration": iteration,
                      "model": model, "output": output, "truncated": truncated})

    def log_answer(self, answer: str, depth: int, iteration: int, model: str = "",
                   prompt_tokens: int = 0, completion_tokens: int = 0):
        self._write({"event": "answer", "depth": depth, "iteration": iteration,
                      "model": model, "prompt_tokens": prompt_tokens,
                      "completion_tokens": completion_tokens, "answer": answer})

    def log_error(self, error: str, depth: int, iteration: int):
        self._write({"event": "error", "depth": depth, "iteration": iteration, "error": error})

    def log_subcall(self, snippet_len: int, question: str, depth: int):
        self._write({"event": "subcall", "depth": depth,
                      "snippet_length": snippet_len, "question": question})
