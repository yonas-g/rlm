"""RLM configuration and environment loading."""

import os
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"


def load_dotenv():
    """Load .env file from project root — no external dependency."""
    env_path = PROJECT_DIR / ".env"
    if env_path.is_file():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


# Load .env early so env vars are available for defaults below
load_dotenv()

# ── Root model config ────────────────────────────────────────────────────────

ROOT_MODEL = os.environ.get("RLM_ROOT_MODEL", "gemini-3-flash-preview")
ROOT_API_KEY = os.environ.get("RLM_ROOT_API_KEY", os.environ.get("RLM_API_KEY", ""))
ROOT_BASE_URL = os.environ.get("RLM_ROOT_BASE_URL", os.environ.get("RLM_BASE_URL", GEMINI_BASE_URL))

# ── Sub model config (falls back to root) ────────────────────────────────────

SUB_MODEL = os.environ.get("RLM_SUB_MODEL", ROOT_MODEL)
SUB_API_KEY = os.environ.get("RLM_SUB_API_KEY", ROOT_API_KEY)
SUB_BASE_URL = os.environ.get("RLM_SUB_BASE_URL", ROOT_BASE_URL)

# ── Limits ──────────────────────────────────────────────────────────────────

MAX_DEPTH = 5
MAX_ITERATIONS = 8
MAX_OUTPUT_CHARS = 8000  # truncate REPL output shown to model
MAX_CONTEXT_MESSAGES = 8  # max iteration messages before trimming

# ── Log paths ───────────────────────────────────────────────────────────────

LOG_DIR = PROJECT_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
