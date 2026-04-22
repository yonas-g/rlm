# RLM -- Recursive Language Model

A Python implementation of Recursive Language Models: instead of stuffing an entire document into the LLM context window, RLM lets the model **programmatically explore** the document through a code-execution REPL loop, reading only the parts it needs.

---

## Paper Reference

This project is an implementation of the approach described in:

> **Recursive Language Models**
> Alex L. Zhang, Tim Kraska, Omar Khattab
> MIT CSAIL
>
> *"We propose Recursive Language Models (RLMs), a general inference paradigm that treats long prompts as part of an external environment and allows the LLM to programmatically examine, decompose, and recursively call itself over snippets of the prompt."*
>
> RLM-Qwen3-8B outperforms Qwen3-8B by 28.3% and approaches GPT-5 quality.

- **arXiv:** [2512.24601](https://arxiv.org/abs/2512.24601)
- **Published:** December 31, 2025 (v1), revised January 28, 2026 (v2)

---

## How It Works

RLM operates as a multi-turn REPL (Read-Eval-Print Loop). The document is **never placed in the model's context**. Instead, the model writes Python code to slice, search, and inspect the document string, then decides whether to answer or keep exploring.

```
                         +--------------------+
                         |   User Question    |
                         +--------+-----------+
                                  |
                                  v
                    +-------------+---------------+
                    |  LLM generates Python code  |
                    |  to inspect `context`        |
                    +-------------+---------------+
                                  |
                                  v
                    +-------------+---------------+
                    |  Sandboxed REPL executes     |
                    |  code against the document   |
                    +-------------+---------------+
                                  |
                                  v
                         +--------+---------+
                         | Output returned  |
                         | to LLM           |
                         +--------+---------+
                                  |
                          +-------+-------+
                          |               |
                    Enough info?    Need more?
                          |               |
                          v               v
                   FINAL ANSWER     Next iteration
                                  (back to top)
                                        |
                              [or recursive sub-call
                               via query_llm() at
                               depth + 1]
```

At each iteration the model can:

1. **Slice** the document (`context[start:end]`) to read specific regions.
2. **Search** with `find_new(pattern)` to locate keywords in unexplored regions.
3. **Recurse** by calling `query_llm(snippet, question)` to spawn a sub-RLM on a smaller snippet at a deeper depth level.
4. **Answer** by emitting `FINAL ANSWER: <answer>`.

The engine tracks which character ranges have been visited and prevents the model from re-reading the same regions, pushing it toward unexplored territory.

---

## Why RLM (vs. Traditional RAG)

Traditional Retrieval-Augmented Generation relies on embedding-based chunking to find relevant passages before prompting the LLM. This has well-known limitations:

- **Chunking is lossy.** Fixed-size chunks break mid-sentence or miss cross-section references.
- **Embedding similarity is fragile.** Semantic search can miss passages that use different wording.
- **No iterative refinement.** The model gets one shot at the retrieved context.

RLM takes a different approach:

- The LLM itself decides what to read, using code execution rather than vector similarity.
- It can iteratively refine its search -- reading a table of contents first, then drilling into the relevant section.
- It can recurse on large sections, breaking them into sub-problems.
- No embedding model, no vector database, no chunking pipeline required.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yonas-g/rlm.git
cd rlm

# Configure your API key
cp .env.example .env
# Edit .env and set RLM_API_KEY to your Gemini (or compatible) API key

# Install the only dependency
pip install openai

# Run the CLI
python cli.py path/to/your-document.txt
```

---

## CLI Usage

```bash
python cli.py <document_path>
```

This launches an interactive chat session over the given document. The CLI displays a banner with the document size, active models, depth/iteration limits, and log file paths, then enters a question-answer loop.

**Example session:**

```
============================================================
  RLM -- Recursive Language Model
  Document: report.md
  Size: 48,231 chars, 1,204 lines
  Model: gemini-3-flash-preview (sub: gemini-3-flash-preview)
  Max depth: 5, Max iterations: 8
  Logs: rlm_log.jsonl, rlm_repl_log.jsonl
============================================================
  Type your question. The document is NOT in the model's
  context -- it will inspect it through code execution.
  Type 'quit' or Ctrl+C to exit.
============================================================

You: What is the main finding of section 3?

[depth=0] LLM call -> gemini-3-flash-preview (iteration 1)
[depth=0] tokens: 1,842 in + 156 out = 1,998
[depth=0] > Executing code:
  | print(context[:3000])
[depth=0] < Output:
  | # Annual Report ...

[depth=0] LLM call -> gemini-3-flash-preview (iteration 2)
...

------------------------------------------------------------
Answer:
Section 3 finds that ... (the model's synthesized answer)
(4.2s)
------------------------------------------------------------

You: quit
Bye!

[RLM] Session: 4 calls, 8,231 prompt + 612 completion = 8,843 total tokens (9s)
[RLM] Token log: logs/rlm_log.jsonl
[RLM] REPL log:  logs/rlm_repl_log.jsonl
```

Type `quit`, `exit`, `q`, or press Ctrl+C to end the session. A token usage summary is printed on exit.

---

## Programmatic Usage (Python API)

```python
from rlm import RLMEngine

# Load your document
with open("report.md") as f:
    document = f.read()

# Create the engine (reads config from .env or pass explicitly)
engine = RLMEngine(document=document)

# Ask questions
answer = engine.query("What is the VAT rate mentioned in the document?")
print(answer)

# Follow-up questions use conversation history automatically
answer2 = engine.query("How does that compare to last year?")
print(answer2)

# Access token usage stats
print(engine.tracker.summary())
```

### RLMEngine constructor parameters

| Parameter       | Default              | Description                              |
|-----------------|----------------------|------------------------------------------|
| `document`      | (required)           | The full document text to query against  |
| `root_model`    | from config          | Model name for depth-0 (top-level) calls |
| `sub_model`     | from config          | Model name for recursive sub-calls       |
| `root_api_key`  | from config          | API key for the root model               |
| `root_base_url` | from config          | Base URL for the root model API          |
| `sub_api_key`   | from config          | API key for the sub model                |
| `sub_base_url`  | from config          | Base URL for the sub model API           |
| `max_depth`     | 5                    | Maximum recursion depth                  |
| `max_iterations`| 8                    | Maximum REPL iterations per depth level  |

---

## Configuration

All configuration is driven by environment variables, with an optional `.env` file in the project root loaded automatically (no external dependency needed -- the loader is built in).

### Environment variables

| Variable              | Default                                                        | Description                                |
|-----------------------|----------------------------------------------------------------|--------------------------------------------|
| `RLM_API_KEY`         | (none)                                                         | Shared API key (used if root/sub not set)  |
| `RLM_BASE_URL`        | `https://generativelanguage.googleapis.com/v1beta/openai/`     | Shared base URL (used if root/sub not set) |
| `RLM_ROOT_MODEL`      | `gemini-3-flash-preview`                                       | Model for top-level (depth 0) queries      |
| `RLM_ROOT_API_KEY`    | falls back to `RLM_API_KEY`                                    | API key for root model                     |
| `RLM_ROOT_BASE_URL`   | falls back to `RLM_BASE_URL`                                   | Base URL for root model                    |
| `RLM_SUB_MODEL`       | falls back to `RLM_ROOT_MODEL`                                 | Model for recursive sub-calls (depth > 0)  |
| `RLM_SUB_API_KEY`     | falls back to `RLM_ROOT_API_KEY`                               | API key for sub model                      |
| `RLM_SUB_BASE_URL`    | falls back to `RLM_ROOT_BASE_URL`                              | Base URL for sub model                     |

### Fallback chain

The configuration uses a two-tier fallback so you only need to set one API key and one base URL in the common case:

```
RLM_SUB_API_KEY  -->  RLM_ROOT_API_KEY  -->  RLM_API_KEY
RLM_SUB_BASE_URL -->  RLM_ROOT_BASE_URL -->  RLM_BASE_URL
RLM_SUB_MODEL    -->  RLM_ROOT_MODEL
```

This means you can use a single `RLM_API_KEY` and `RLM_BASE_URL` for everything, or override at the root/sub level to use different providers or models for top-level vs. recursive calls (e.g., a stronger model at depth 0 and a cheaper model for sub-calls).

### Hardcoded limits (in `rlm/config.py`)

| Constant              | Value  | Description                                         |
|-----------------------|--------|-----------------------------------------------------|
| `MAX_DEPTH`           | 5      | Maximum recursion depth for sub-calls               |
| `MAX_ITERATIONS`      | 8      | Maximum REPL iterations per query per depth level    |
| `MAX_OUTPUT_CHARS`    | 8000   | REPL output truncation threshold (chars shown to model) |
| `MAX_CONTEXT_MESSAGES`| 8      | Max iteration messages before older ones are trimmed |

---

## Project Structure

```
rlm/
|-- cli.py                  # CLI entry point: interactive chat loop
|-- .env.example            # Example environment configuration
|-- LICENSE                 # CC BY 4.0 license
|-- README.md               # This file
|-- logs/                   # Auto-created; per-session JSONL logs
|   |-- rlm_log.jsonl       # Token usage log
|   +-- rlm_repl_log.jsonl  # Full REPL trace log
+-- rlm/                    # Core library package
    |-- __init__.py          # Package init; exports RLMEngine
    |-- config.py            # Configuration, .env loader, constants
    |-- engine.py            # RLMEngine: the recursive query loop
    |-- prompts.py           # System prompt and few-shot examples
    |-- repl.py              # Sandboxed Python REPL for code execution
    +-- logging.py           # Console logger, TokenTracker, ReplLogger
```

---

## Logging

Every session produces two JSONL log files in the `logs/` directory:

### Token log (`rlm_log.jsonl`)

One line per LLM API call. Each entry records:

- Timestamp, session ID, and call number
- Model name, recursion depth, and iteration number
- The question (truncated to 200 chars)
- Prompt tokens, completion tokens, and running cumulative totals

This log is useful for monitoring cost and understanding how many calls a question required.

### REPL trace log (`rlm_repl_log.jsonl`)

A full trace of every event in the REPL loop. Event types:

| Event       | Fields                                           |
|-------------|--------------------------------------------------|
| `question`  | depth, model, question text                      |
| `code`      | depth, iteration, model, the Python code executed |
| `output`    | depth, iteration, model, execution output, whether truncated |
| `answer`    | depth, iteration, model, token counts, final answer text |
| `error`     | depth, iteration, error message                  |
| `subcall`   | depth, snippet length, sub-question              |

This log lets you replay exactly what the model did: what code it wrote, what output it saw, and how it arrived at its answer. Both logs use session IDs (timestamp-based) so multiple sessions append cleanly to the same files.

---

## Key Features

- **No document in context.** The document lives in a Python variable; the model explores it through code, not by reading a giant prompt.
- **Sandboxed REPL execution.** Model-generated code runs in a restricted namespace with whitelisted builtins (`len`, `range`, `sorted`, etc.) and modules (`re`, `json`, `math`, `collections`). No filesystem access, no network calls.
- **Recursive sub-calls.** The model can call `query_llm(snippet, question)` to spawn a child RLM on a smaller excerpt, enabling hierarchical decomposition of complex documents.
- **Visited-range tracking.** The engine records which byte ranges the model has already inspected and exposes a `find_new(pattern)` helper that skips visited regions, preventing redundant reads.
- **Dual-model support.** Use a capable model for top-level queries and a cheaper/faster model for recursive sub-calls, controlled independently via environment variables.
- **Conversation history.** Follow-up questions carry context from the last 5 Q&A pairs, enabling multi-turn dialogue over the same document.
- **Automatic iteration pressure.** When the model nears the iteration limit, the engine forces it to produce a best-effort answer rather than running out of turns silently.
- **Context window management.** Older iteration messages are trimmed to keep the conversation within token limits, with a summary of how many prior code executions were dropped.
- **Zero-dependency .env loading.** Configuration is read from a `.env` file using a built-in parser -- no `python-dotenv` required.
- **Structured JSONL logging.** Both token usage and full REPL traces are logged per session for debugging, cost tracking, and reproducibility.
- **OpenAI-compatible API.** Uses the OpenAI Python client, so it works with any provider that exposes an OpenAI-compatible endpoint (Gemini, OpenRouter, local models, etc.).

---

## License

This project is licensed under the [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) license. See [LICENSE](LICENSE) for details.
