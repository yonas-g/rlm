"""Sandboxed Python REPL for executing model-generated code."""

import io
import re
import json


def execute_in_repl(code: str, context: str, question: str, depth: int,
                    visited: list | None = None,
                    query_llm_fn=None, logger=None) -> str:
    """Execute model-generated code in a sandboxed namespace.

    Args:
        code: Python code to execute.
        context: The full document string.
        question: The user's question.
        depth: Current recursion depth.
        visited: List of (start, end, summary) tuples of already-inspected ranges.
        query_llm_fn: Callable for recursive sub-calls.
        logger: ReplLogger instance for logging sub-calls.
    """
    stdout_buf = io.StringIO()
    if visited is None:
        visited = []

    def sub_query(snippet: str, q: str = question) -> str:
        if query_llm_fn is None:
            return "(recursive calls not available at this depth)"
        if logger:
            from .logging import Logger
            Logger.subcall(depth, len(snippet), q)
            logger.log_subcall(len(snippet), q, depth)
        return query_llm_fn(snippet, q, depth=depth + 1)

    # Allowed modules
    allowed_modules = {
        "re": re, "json": json,
        "math": __import__("math"),
        "collections": __import__("collections"),
    }

    def safe_import(name, *args, **kwargs):
        if name in allowed_modules:
            return allowed_modules[name]
        raise ImportError(f"Module '{name}' is not available. Available: {', '.join(allowed_modules)}")

    def find_new(pattern, flags=0):
        """Like re.finditer but skips already-visited ranges."""
        for m in re.finditer(pattern, context, flags):
            pos = m.start()
            if not any(s <= pos <= e for s, e, _ in visited):
                yield m

    namespace = {
        "context": context,
        **allowed_modules,
        "query_llm": sub_query,
        "find_new": find_new,
        "visited": visited,
        "print": lambda *args, **kwargs: print(*args, file=stdout_buf, **kwargs),
        "result": None,
        "__builtins__": {
            "__import__": safe_import,
            "len": len,
            "range": range,
            "enumerate": enumerate,
            "zip": zip,
            "map": map,
            "filter": filter,
            "sorted": sorted,
            "reversed": reversed,
            "list": list,
            "dict": dict,
            "set": set,
            "tuple": tuple,
            "str": str,
            "int": int,
            "float": float,
            "bool": bool,
            "min": min,
            "max": max,
            "sum": sum,
            "abs": abs,
            "round": round,
            "isinstance": isinstance,
            "type": type,
            "repr": repr,
            "print": lambda *args, **kwargs: print(*args, file=stdout_buf, **kwargs),
            "True": True,
            "False": False,
            "None": None,
            "ValueError": ValueError,
            "TypeError": TypeError,
            "KeyError": KeyError,
            "IndexError": IndexError,
            "Exception": Exception,
        },
    }

    try:
        exec(code, namespace)
    except Exception as e:
        return f"Error: {type(e).__name__}: {e}"

    parts = []
    stdout_val = stdout_buf.getvalue()
    if stdout_val.strip():
        parts.append(stdout_val.strip())
    if namespace.get("result") is not None:
        parts.append(f"result = {namespace['result']}")

    return "\n".join(parts) if parts else "(no output — use print() or assign to `result`)"
