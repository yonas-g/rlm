import React from "react";
import type { TokenEntry } from "../types";

interface Props {
  entries: TokenEntry[];
}

export default function TokenChart({ entries }: Props) {
  if (entries.length === 0) return null;

  const maxTokens = Math.max(...entries.map((e) => e.total_tokens));

  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "0.75rem",
        }}
      >
        Token Usage Per Call
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "80px" }}>
        {entries.map((entry, i) => {
          const height = Math.max(4, (entry.total_tokens / maxTokens) * 70);
          const promptPct = entry.prompt_tokens / entry.total_tokens;
          return (
            <div
              key={i}
              title={`Call ${entry.call_number}: ${entry.prompt_tokens} prompt + ${entry.completion_tokens} completion = ${entry.total_tokens} total`}
              style={{
                flex: 1,
                maxWidth: "30px",
                height: `${height}px`,
                borderRadius: "3px 3px 0 0",
                background: `linear-gradient(to top, var(--accent) ${promptPct * 100}%, var(--green) ${promptPct * 100}%)`,
                opacity: 0.8,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
            />
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "0.5rem",
          fontSize: "0.7rem",
          color: "var(--text-dim)",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              background: "var(--accent)",
              borderRadius: "2px",
              marginRight: "4px",
            }}
          />
          Prompt
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              background: "var(--green)",
              borderRadius: "2px",
              marginRight: "4px",
            }}
          />
          Completion
        </span>
        <span style={{ marginLeft: "auto" }}>
          Total: {entries[entries.length - 1].cumulative_total.toLocaleString()} tokens
        </span>
      </div>
    </div>
  );
}
