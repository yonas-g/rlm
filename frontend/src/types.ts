// ── REPL log event types ────────────────────────────────────────────────

export interface BaseEvent {
  timestamp: string;
  session: string;
  step: number;
  event: string;
}

export interface QuestionEvent extends BaseEvent {
  event: "question";
  depth: number;
  model: string;
  question: string;
}

export interface CodeEvent extends BaseEvent {
  event: "code";
  depth: number;
  iteration: number;
  model: string;
  code: string;
}

export interface OutputEvent extends BaseEvent {
  event: "output";
  depth: number;
  iteration: number;
  model: string;
  output: string;
  truncated: boolean;
}

export interface AnswerEvent extends BaseEvent {
  event: "answer";
  depth: number;
  iteration: number;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  answer: string;
}

export interface ErrorEvent extends BaseEvent {
  event: "error";
  depth: number;
  iteration: number;
  error: string;
}

export interface SubcallEvent extends BaseEvent {
  event: "subcall";
  depth: number;
  snippet_length: number;
  question: string;
}

export type ReplEvent =
  | QuestionEvent
  | CodeEvent
  | OutputEvent
  | AnswerEvent
  | ErrorEvent
  | SubcallEvent;

// ── Token log event ─────────────────────────────────────────────────────

export interface TokenEntry {
  timestamp: string;
  session: string;
  call_number: number;
  model: string;
  depth: number;
  iteration: number;
  question: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cumulative_prompt: number;
  cumulative_completion: number;
  cumulative_total: number;
}

// ── Parsed session ──────────────────────────────────────────────────────

export interface Query {
  question: string;
  model: string;
  events: ReplEvent[];
  answer?: string;
  totalTokens: number;
  iterations: number;
  durationMs: number;
}

export interface Session {
  id: string;
  queries: Query[];
  tokenEntries: TokenEntry[];
  totalTokens: number;
  totalCalls: number;
}
