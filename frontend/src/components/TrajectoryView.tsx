import React, { useState } from "react";
import {
  Code2,
  Terminal,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Cpu,
} from "lucide-react";
import type { Query, ReplEvent, CodeEvent, OutputEvent, AnswerEvent, ErrorEvent, SubcallEvent } from "../types";

interface Props {
  query: Query;
}

export default function TrajectoryView({ query }: Props) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
      {/* Question header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--text-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
          }}
        >
          Question
        </div>
        <div
          style={{
            fontSize: "1.1rem",
            fontWeight: 500,
            padding: "1rem 1.25rem",
            background: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          {query.question}
        </div>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginTop: "0.5rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          {query.model && (
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Cpu size={12} /> {query.model}
            </span>
          )}
          <span>{query.iterations} iterations</span>
          <span>{query.totalTokens.toLocaleString()} tokens</span>
          {query.durationMs > 0 && <span>{(query.durationMs / 1000).toFixed(1)}s</span>}
        </div>
      </div>

      {/* Event timeline */}
      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: "15px",
            top: "0",
            bottom: "0",
            width: "2px",
            background: "var(--border)",
          }}
        />

        {query.events
          .filter((e) => e.event !== "question")
          .map((event, i) => (
            <EventCard key={i} event={event} />
          ))}
      </div>

      {/* Final answer */}
      {query.answer && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1.25rem",
            background: "var(--green-dim)",
            border: "1px solid var(--green)",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--green)",
            }}
          >
            <CheckCircle size={16} />
            Final Answer
          </div>
          <div style={{ fontSize: "0.9rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {query.answer}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: ReplEvent }) {
  switch (event.event) {
    case "code":
      return <CodeCard event={event as CodeEvent} />;
    case "output":
      return <OutputCard event={event as OutputEvent} />;
    case "answer":
      return null; // Rendered separately above
    case "error":
      return <ErrorCard event={event as ErrorEvent} />;
    case "subcall":
      return <SubcallCard event={event as SubcallEvent} />;
    default:
      return null;
  }
}

function CodeCard({ event }: { event: CodeEvent }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ marginLeft: "36px", marginBottom: "0.5rem", position: "relative" }}>
      {/* Dot on timeline */}
      <div
        style={{
          position: "absolute",
          left: "-28px",
          top: "12px",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: "var(--yellow)",
          border: "2px solid var(--bg)",
        }}
      />
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            cursor: "pointer",
            fontSize: "0.75rem",
            color: "var(--yellow)",
            fontWeight: 500,
            userSelect: "none",
          }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Code2 size={14} />
          <span>Code</span>
          <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
            iteration {event.iteration}
            {event.depth > 0 && ` / depth ${event.depth}`}
          </span>
        </div>
        {expanded && (
          <pre
            style={{
              padding: "0.75rem 1rem",
              background: "var(--bg-code)",
              fontSize: "0.78rem",
              lineHeight: 1.6,
              overflowX: "auto",
              borderTop: "1px solid var(--border)",
              color: "var(--text)",
              margin: 0,
            }}
          >
            {event.code}
          </pre>
        )}
      </div>
    </div>
  );
}

function OutputCard({ event }: { event: OutputEvent }) {
  const [expanded, setExpanded] = useState(false);
  const lines = event.output.split("\n");
  const preview = lines.slice(0, 5).join("\n");
  const hasMore = lines.length > 5;

  return (
    <div style={{ marginLeft: "36px", marginBottom: "0.75rem", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: "-28px",
          top: "12px",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: "var(--green)",
          border: "2px solid var(--bg)",
        }}
      />
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            cursor: "pointer",
            fontSize: "0.75rem",
            color: "var(--green)",
            fontWeight: 500,
            userSelect: "none",
          }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Terminal size={14} />
          <span>Output</span>
          <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
            {lines.length} lines
            {event.truncated && " (truncated)"}
          </span>
        </div>
        <pre
          style={{
            padding: "0.75rem 1rem",
            background: "var(--bg-code)",
            fontSize: "0.75rem",
            lineHeight: 1.5,
            overflowX: "auto",
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
            margin: 0,
            maxHeight: expanded ? "none" : "160px",
            overflow: expanded ? "auto" : "hidden",
          }}
        >
          {expanded ? event.output : preview}
          {!expanded && hasMore && (
            <span style={{ color: "var(--text-dim)" }}>
              {"\n"}... click to expand ({lines.length} lines)
            </span>
          )}
        </pre>
      </div>
    </div>
  );
}

function ErrorCard({ event }: { event: ErrorEvent }) {
  return (
    <div style={{ marginLeft: "36px", marginBottom: "0.75rem", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: "-28px",
          top: "12px",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: "var(--red)",
          border: "2px solid var(--bg)",
        }}
      />
      <div
        style={{
          padding: "0.6rem 0.85rem",
          background: "var(--red-dim)",
          border: "1px solid var(--red)",
          borderRadius: "8px",
          fontSize: "0.8rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <AlertTriangle size={14} style={{ color: "var(--red)" }} />
        {event.error}
      </div>
    </div>
  );
}

function SubcallCard({ event }: { event: SubcallEvent }) {
  return (
    <div style={{ marginLeft: "36px", marginBottom: "0.75rem", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: "-28px",
          top: "12px",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: "var(--cyan)",
          border: "2px solid var(--bg)",
        }}
      />
      <div
        style={{
          padding: "0.6rem 0.85rem",
          background: "var(--cyan-dim)",
          border: "1px solid var(--cyan)",
          borderRadius: "8px",
          fontSize: "0.8rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--cyan)",
            fontWeight: 500,
            marginBottom: "0.3rem",
            fontSize: "0.75rem",
          }}
        >
          <GitBranch size={14} />
          Recursive sub-call at depth {event.depth}
          <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
            ({event.snippet_length.toLocaleString()} chars)
          </span>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          {event.question}
        </div>
      </div>
    </div>
  );
}
