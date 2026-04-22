import React, { useCallback } from "react";
import { Upload } from "lucide-react";
import type { Session } from "../types";
import type { ReplEvent, TokenEntry } from "../types";
import { parseJsonl, buildSession } from "../parser";

interface Props {
  onSessionLoaded: (session: Session) => void;
}

export default function FileUploader({ onSessionLoaded }: Props) {
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const items = Array.from(e.dataTransfer.items);
      // Check if a directory was dropped
      const entries = items
        .map((item) => item.webkitGetAsEntry?.())
        .filter(Boolean) as FileSystemEntry[];

      if (entries.length === 1 && entries[0].isDirectory) {
        await loadDirectory(entries[0] as FileSystemDirectoryEntry, onSessionLoaded);
      } else {
        // Multiple files dropped
        const files = Array.from(e.dataTransfer.files);
        await loadFiles(files, onSessionLoaded);
      }
    },
    [onSessionLoaded]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        await loadFiles(files, onSessionLoaded);
      }
    },
    [onSessionLoaded]
  );

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div
        style={{
          border: "2px dashed var(--border-active)",
          borderRadius: "16px",
          padding: "4rem 3rem",
          textAlign: "center",
          maxWidth: "520px",
          width: "100%",
          background: "var(--bg-card)",
          cursor: "pointer",
          transition: "border-color 0.2s",
        }}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <Upload
          size={48}
          strokeWidth={1.5}
          style={{ color: "var(--accent)", marginBottom: "1.5rem" }}
        />
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          RLM Trajectory Explorer
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Drop a session log directory or select JSONL files
        </p>
        <label
          style={{
            display: "inline-block",
            padding: "0.6rem 1.5rem",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          Browse files
          <input
            id="file-input"
            type="file"
            multiple
            accept=".jsonl"
            onChange={handleFileInput}
            style={{ display: "none" }}
          />
        </label>
        <p style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: "1rem" }}>
          Accepts rlm_log.jsonl and rlm_repl_log.jsonl
        </p>
      </div>
    </div>
  );
}

async function loadDirectory(
  dirEntry: FileSystemDirectoryEntry,
  onLoaded: (s: Session) => void
) {
  const files = await readDirectoryFiles(dirEntry);
  await loadFiles(files, onLoaded, dirEntry.name);
}

async function loadFiles(
  files: File[],
  onLoaded: (s: Session) => void,
  sessionId?: string
) {
  let replEvents: ReplEvent[] = [];
  let tokenEntries: TokenEntry[] = [];
  let sid = sessionId || "uploaded";

  for (const file of files) {
    const text = await file.text();
    if (file.name.includes("repl")) {
      replEvents = parseJsonl<ReplEvent>(text);
    } else if (file.name.includes("log")) {
      tokenEntries = parseJsonl<TokenEntry>(text);
    }
  }

  if (replEvents.length > 0 && replEvents[0].session) {
    sid = replEvents[0].session;
  }

  onLoaded(buildSession(sid, replEvents, tokenEntries));
}

function readDirectoryFiles(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
  return new Promise((resolve) => {
    const reader = dirEntry.createReader();
    reader.readEntries(async (entries) => {
      const files: File[] = [];
      for (const entry of entries) {
        if (entry.isFile && entry.name.endsWith(".jsonl")) {
          const file = await new Promise<File>((res) =>
            (entry as FileSystemFileEntry).file(res)
          );
          files.push(file);
        }
      }
      resolve(files);
    });
  });
}
