#!/usr/bin/env python3
"""RLM CLI — Interactive chat over a document using Recursive Language Models.

Usage:
    python cli.py <document_path>
    python cli.py test.md
"""

import sys
import os
import time

from rlm import RLMEngine
from rlm.config import ROOT_MODEL, SUB_MODEL, MAX_DEPTH, MAX_ITERATIONS
from rlm.logging import Logger


def interactive_loop(engine: RLMEngine, doc_path: str):
    """REPL-style interactive chat over the loaded document."""
    context = engine.document

    print()
    print(Logger._c("bold", "═" * 60))
    print(Logger._c("bold", "  RLM — Recursive Language Model"))
    print(Logger._c("grey",  f"  Document: {doc_path}"))
    print(Logger._c("grey",  f"  Size: {len(context):,} chars, {context.count(chr(10)) + 1:,} lines"))
    print(Logger._c("grey",  f"  Model: {ROOT_MODEL} (sub: {SUB_MODEL})"))
    print(Logger._c("grey",  f"  Max depth: {MAX_DEPTH}, Max iterations: {MAX_ITERATIONS}"))
    print(Logger._c("grey",  f"  Logs: {engine.tracker.log_file.name}, {engine.repl_logger.log_file.name}"))
    print(Logger._c("bold", "═" * 60))
    print(Logger._c("grey",  "  Type your question. The document is NOT in the model's"))
    print(Logger._c("grey",  "  context — it will inspect it through code execution."))
    print(Logger._c("grey",  "  Type 'quit' or Ctrl+C to exit."))
    print(Logger._c("bold", "═" * 60))
    print()

    while True:
        try:
            question = input(Logger._c("bold", "You: ")).strip()
        except (KeyboardInterrupt, EOFError):
            print("\nBye!")
            break

        if not question:
            continue
        if question.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break

        print()
        start = time.time()
        answer = engine.query(question)
        elapsed = time.time() - start

        print()
        print(Logger._c("bold", "─" * 60))
        print(Logger._c("bold", "Answer:"))
        print(answer)
        print(Logger._c("grey", f"({elapsed:.1f}s)"))
        print(Logger._c("bold", "─" * 60))
        print()


def main():
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} <document_path>", file=sys.stderr)
        sys.exit(1)

    doc_path = sys.argv[1]
    if not os.path.isfile(doc_path):
        print(f"Error: File not found: {doc_path}", file=sys.stderr)
        sys.exit(1)

    with open(doc_path, "r") as f:
        context = f.read()

    if not context.strip():
        print(f"Error: File is empty: {doc_path}", file=sys.stderr)
        sys.exit(1)

    engine = RLMEngine(document=context)
    interactive_loop(engine, doc_path)

    # Session summary
    print()
    print(Logger._c("cyan", f"[RLM] {engine.tracker.summary()}"))
    print(Logger._c("grey", f"[RLM] Token log: {engine.tracker.log_file}"))
    print(Logger._c("grey", f"[RLM] REPL log:  {engine.repl_logger.log_file}"))


if __name__ == "__main__":
    main()
