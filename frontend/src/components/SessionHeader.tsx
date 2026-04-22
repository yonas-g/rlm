import React from "react";
import { RotateCcw, MessageSquare, Zap, Clock } from "lucide-react";
import type { Session } from "../types";

interface Props {
  session: Session;
  onReset: () => void;
}

export default function SessionHeader({ session, onReset }: Props) {
  const stats = [
    {
      icon: <MessageSquare size={14} />,
      label: "Queries",
      value: session.queries.length,
    },
    {
      icon: <Zap size={14} />,
      label: "LLM Calls",
      value: session.totalCalls,
    },
    {
      icon: <Clock size={14} />,
      label: "Tokens",
      value: session.totalTokens.toLocaleString(),
    },
  ];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 1.5rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "0.95rem", fontWeight: 600 }}>
          <span style={{ color: "var(--accent)" }}>RLM</span>{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
            {session.id}
          </span>
        </h1>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
              }}
            >
              {s.icon}
              <span style={{ fontWeight: 500, color: "var(--text)" }}>{s.value}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onReset}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.4rem 0.8rem",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: "0.8rem",
        }}
      >
        <RotateCcw size={13} />
        Load another
      </button>
    </header>
  );
}
