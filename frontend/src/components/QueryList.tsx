import React from "react";
import { MessageCircle, CheckCircle, AlertTriangle } from "lucide-react";
import type { Query } from "../types";

interface Props {
  queries: Query[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function QueryList({ queries, selectedIndex, onSelect }: Props) {
  return (
    <div
      style={{
        width: "320px",
        minWidth: "320px",
        borderRight: "1px solid var(--border)",
        overflowY: "auto",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          padding: "0.75rem 1rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderBottom: "1px solid var(--border)",
        }}
      >
        Queries ({queries.length})
      </div>
      {queries.map((q, i) => {
        const isSelected = i === selectedIndex;
        const hasAnswer = !!q.answer;
        return (
          <div
            key={i}
            onClick={() => onSelect(i)}
            style={{
              padding: "0.85rem 1rem",
              cursor: "pointer",
              borderBottom: "1px solid var(--border)",
              borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
              background: isSelected ? "var(--bg-card)" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <MessageCircle
                size={14}
                style={{
                  color: isSelected ? "var(--accent)" : "var(--text-dim)",
                  marginTop: "2px",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: isSelected ? "var(--text)" : "var(--text-muted)",
                  }}
                >
                  {q.question}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    marginTop: "0.35rem",
                    fontSize: "0.7rem",
                    color: "var(--text-dim)",
                  }}
                >
                  <span>{q.iterations} iterations</span>
                  <span>{q.totalTokens.toLocaleString()} tokens</span>
                  {hasAnswer ? (
                    <CheckCircle size={11} style={{ color: "var(--green)" }} />
                  ) : (
                    <AlertTriangle size={11} style={{ color: "var(--red)" }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
