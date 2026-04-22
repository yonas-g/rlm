import type { ReplEvent, TokenEntry, Session, Query } from "./types";

export function parseJsonl<T>(text: string): T[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

export function buildSession(
  sessionId: string,
  replEvents: ReplEvent[],
  tokenEntries: TokenEntry[]
): Session {
  const queries: Query[] = [];
  let currentEvents: ReplEvent[] = [];
  let currentQuestion = "";
  let currentModel = "";

  for (const event of replEvents) {
    if (event.event === "question") {
      // Flush previous query
      if (currentEvents.length > 0) {
        queries.push(buildQuery(currentQuestion, currentModel, currentEvents, tokenEntries));
      }
      currentQuestion = event.question;
      currentModel = event.model || "";
      currentEvents = [event];
    } else {
      currentEvents.push(event);
    }
  }

  // Flush last query
  if (currentEvents.length > 0) {
    queries.push(buildQuery(currentQuestion, currentModel, currentEvents, tokenEntries));
  }

  const totalTokens = tokenEntries.length > 0
    ? tokenEntries[tokenEntries.length - 1].cumulative_total
    : 0;

  return {
    id: sessionId,
    queries,
    tokenEntries,
    totalTokens,
    totalCalls: tokenEntries.length,
  };
}

function buildQuery(
  question: string,
  model: string,
  events: ReplEvent[],
  tokenEntries: TokenEntry[]
): Query {
  const answerEvent = events.find((e) => e.event === "answer");
  const answer = answerEvent && "answer" in answerEvent ? answerEvent.answer : undefined;

  const codeEvents = events.filter((e) => e.event === "code");
  const iterations = codeEvents.length;

  // Calculate tokens for this query from token entries
  const queryTokenEntries = tokenEntries.filter(
    (t) => t.question.startsWith(question.substring(0, 50))
  );
  const totalTokens = queryTokenEntries.reduce((sum, t) => sum + t.total_tokens, 0);

  // Duration from first to last event
  const timestamps = events.map((e) => new Date(e.timestamp).getTime());
  const durationMs = timestamps.length > 1
    ? Math.max(...timestamps) - Math.min(...timestamps)
    : 0;

  return { question, model, events, answer, totalTokens, iterations, durationMs };
}
