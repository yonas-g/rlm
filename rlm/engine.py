"""Core RLM engine — the recursive query loop."""

import os
import re

from openai import OpenAI

from .config import (
    ROOT_MODEL, SUB_MODEL, MAX_DEPTH, MAX_ITERATIONS,
    MAX_OUTPUT_CHARS, MAX_CONTEXT_MESSAGES,
    ROOT_API_KEY, ROOT_BASE_URL, SUB_API_KEY, SUB_BASE_URL,
)
from .prompts import SYSTEM_PROMPT, FEW_SHOT
from .repl import execute_in_repl
from .logging import Logger, TokenTracker, ReplLogger


class RLMEngine:
    """Recursive Language Model engine.

    Provides the core RLM loop: loads a document, accepts questions,
    and returns answers by iteratively inspecting the document through
    model-generated code.

    Usage:
        engine = RLMEngine(api_key="...", document="...")
        answer = engine.query("What is the VAT rate?")
    """

    def __init__(self, document: str,
                 root_model: str = ROOT_MODEL, sub_model: str = SUB_MODEL,
                 root_api_key: str = ROOT_API_KEY, root_base_url: str = ROOT_BASE_URL,
                 sub_api_key: str = SUB_API_KEY, sub_base_url: str = SUB_BASE_URL,
                 max_depth: int = MAX_DEPTH, max_iterations: int = MAX_ITERATIONS):
        self.document = document
        self.root_model = root_model
        self.sub_model = sub_model
        self.max_depth = max_depth
        self.max_iterations = max_iterations
        self.conversation_history: list[dict] = []

        if not root_api_key:
            raise ValueError(
                "No API key provided. Set RLM_API_KEY (or RLM_ROOT_API_KEY) in .env"
            )
        self.root_client = OpenAI(api_key=root_api_key, base_url=root_base_url)

        sub_api_key = sub_api_key or root_api_key
        sub_base_url = sub_base_url or root_base_url
        if sub_api_key == root_api_key and sub_base_url == root_base_url:
            self.sub_client = self.root_client
        else:
            self.sub_client = OpenAI(api_key=sub_api_key, base_url=sub_base_url)

        import time
        session_id = time.strftime("%Y%m%d_%H%M%S")
        self.tracker = TokenTracker(session_id=session_id)
        self.repl_logger = ReplLogger(session_id=session_id)

    def query(self, question: str) -> str:
        """Ask a question about the loaded document.

        Maintains conversation history for follow-up questions.
        Returns the answer string.
        """
        answer = self._query_llm(self.document, question, depth=0)
        self.conversation_history.append({"question": question, "answer": answer})
        return answer

    def _query_llm(self, context: str, question: str, depth: int = 0) -> str:
        """The recursive LLM query loop."""
        if depth >= self.max_depth:
            Logger.error(depth, "MAX DEPTH reached — returning truncated context summary")
            return f"(max recursion depth) First 500 chars: {context[:500]}"

        model = self.root_model if depth == 0 else self.sub_model
        client = self.root_client if depth == 0 else self.sub_client
        context_lines = context.count("\n") + 1

        force_answer_at = max(self.max_iterations - 2, 3)
        system = SYSTEM_PROMPT.format(
            context_length=len(context),
            context_lines=context_lines,
            max_iterations=self.max_iterations,
            force_answer_at=force_answer_at,
        )

        # Inject conversation history at depth 0
        if depth == 0 and self.conversation_history:
            history_text = "\n".join(
                f"Q: {h['question']}\nA: {h['answer']}"
                for h in self.conversation_history[-5:]
            )
            system += f"\n\n## Prior conversation\n{history_text}"

        messages = [
            {"role": "system", "content": system},
            *FEW_SHOT,
            {"role": "user", "content": f"Question: {question}\n\nRespond with a ```python code block to inspect the context."},
        ]

        self.repl_logger.log_question(question, depth, model=model)
        visited_ranges: list[tuple[int, int, str]] = []

        for iteration in range(1, self.max_iterations + 1):
            Logger.llm_call(depth, model, iteration)

            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.2,
                )
            except Exception as e:
                Logger.error(depth, f"API error: {e}")
                return f"API error: {e}"

            p, c, t = self.tracker.record(
                response, depth=depth, iteration=iteration,
                model=model, question=question,
            )
            Logger.tokens(depth, p, c, t)

            reply = response.choices[0].message.content
            if not reply:
                Logger.error(depth, "Empty response from model")
                messages.append({"role": "assistant", "content": ""})
                messages.append({"role": "user", "content": "Your response was empty. Write another ```python code block or provide FINAL ANSWER: <answer>"})
                continue

            # Check for final answer
            if "FINAL ANSWER:" in reply:
                answer = reply.split("FINAL ANSWER:", 1)[-1].strip()
                Logger.answer(depth, answer)
                self.repl_logger.log_answer(answer, depth, iteration, model=model,
                                            prompt_tokens=p, completion_tokens=c)
                return answer

            # Extract and execute code blocks
            code_blocks = re.findall(r"```(?:python)?\n(.*?)```", reply, re.DOTALL)
            if code_blocks:
                code = "\n".join(code_blocks)
                Logger.code(depth, code)
                self.repl_logger.log_code(code, depth, iteration, model=model)

                output = execute_in_repl(
                    code, context, question, depth,
                    visited=visited_ranges,
                    query_llm_fn=self._query_llm,
                    logger=self.repl_logger,
                )

                # Track visited ranges from context slices in the code
                for m in re.finditer(r'context\[(\d+)\s*:\s*(\d+)\]', code):
                    start, end = int(m.group(1)), int(m.group(2))
                    summary = context[start:min(start + 80, end)].replace('\n', ' ').strip()
                    visited_ranges.append((start, end, summary))

                truncated = False
                if len(output) > MAX_OUTPUT_CHARS:
                    output = output[:MAX_OUTPUT_CHARS] + f"\n... (truncated, {len(output)} chars total)"
                    truncated = True

                Logger.output(depth, output, truncated)
                self.repl_logger.log_output(output, depth, iteration, model=model, truncated=truncated)

                messages.append({"role": "assistant", "content": reply})

                # Build visited ranges summary
                visited_info = ""
                if visited_ranges:
                    ranges_str = ", ".join(f"[{s}:{e}]" for s, e, _ in visited_ranges[-10:])
                    visited_info = f"\n\nAlready inspected regions: {ranges_str}\nUse find_new() to skip these."

                # Late iterations: pressure the model to answer
                if iteration >= force_answer_at:
                    remaining = self.max_iterations - iteration
                    followup = (
                        f"Execution output:\n```\n{output}\n```\n{visited_info}\n\n"
                        f"⚠️ You have {remaining} iteration(s) left. "
                        "You MUST respond with FINAL ANSWER: <your answer> now. "
                        "Use whatever information you have gathered so far."
                    )
                else:
                    followup = (
                        f"Execution output:\n```\n{output}\n```\n{visited_info}\n\n"
                        "If you have enough information, respond with FINAL ANSWER: <your answer>\n"
                        "Otherwise, write another ```python code block to search a DIFFERENT region."
                    )
                messages.append({"role": "user", "content": followup})

                # Trim older messages
                fixed = 6  # system + few-shot + initial question
                iteration_msgs = messages[fixed:]
                if len(iteration_msgs) > MAX_CONTEXT_MESSAGES:
                    dropped = iteration_msgs[:-MAX_CONTEXT_MESSAGES]
                    code_count = sum(1 for m in dropped if "```" in m.get("content", ""))
                    summary_msg = f"[{code_count} prior code executions trimmed for efficiency]"
                    messages = messages[:fixed] + [{"role": "user", "content": summary_msg}] + iteration_msgs[-MAX_CONTEXT_MESSAGES:]
            else:
                messages.append({"role": "assistant", "content": reply})
                messages.append({"role": "user", "content": "Please write Python code in a ```python block to inspect the context, or provide your answer as FINAL ANSWER: <answer>"})

        Logger.error(depth, "Max iterations reached")
        return "(max iterations — no answer found)"
