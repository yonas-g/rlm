import React, { useState } from "react";
import type { Session } from "./types";
import FileUploader from "./components/FileUploader";
import SessionHeader from "./components/SessionHeader";
import QueryList from "./components/QueryList";
import TrajectoryView from "./components/TrajectoryView";
import TokenChart from "./components/TokenChart";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [selectedQuery, setSelectedQuery] = useState(0);

  if (!session) {
    return <FileUploader onSessionLoaded={(s) => { setSession(s); setSelectedQuery(0); }} />;
  }

  const query = session.queries[selectedQuery];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <SessionHeader session={session} onReset={() => setSession(null)} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <QueryList
          queries={session.queries}
          selectedIndex={selectedQuery}
          onSelect={setSelectedQuery}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {query ? (
            <>
              <TrajectoryView query={query} />
              <TokenChart entries={session.tokenEntries} />
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
              }}
            >
              Select a query to view its trajectory
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
