import React, { useState, useRef, useEffect } from "react";

const AGENTS = [
  {
    key: "search",
    label: "Search agent",
    desc: "Scanning the web for sources",
    icon: "ti-radar-2",
  },
  {
    key: "reader",
    label: "Reader agent",
    desc: "Reading the most promising source",
    icon: "ti-file-search",
  },
  {
    key: "writer",
    label: "Writer agent",
    desc: "Drafting the report",
    icon: "ti-feather",
  },
  {
    key: "critic",
    label: "Critic agent",
    desc: "Reviewing the draft",
    icon: "ti-target-arrow",
  },
];

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function parseCritic(feedback) {
  if (!feedback) return null;
  const scoreMatch = feedback.match(/Score:\s*([\d.]+)\s*\/\s*(\d+)/i);
  const verdictMatch = feedback.match(/One line verdict:\s*([\s\S]*)/i);
  return {
    score: scoreMatch ? scoreMatch[1] : null,
    maxScore: scoreMatch ? scoreMatch[2] : "10",
    verdict: verdictMatch ? verdictMatch[1].trim() : null,
  };
}

function StageIndicator({ index, status }) {
  // status: 'pending' | 'active' | 'done'
  if (status === "done") {
    return (
      <div className="stage-dot stage-dot-done">
        <i className="ti ti-check" aria-hidden="true"></i>
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="stage-dot stage-dot-active">
        <span className="pulse-ring"></span>
        <span className="pulse-core"></span>
      </div>
    );
  }
  return <div className="stage-dot stage-dot-pending">{index + 1}</div>;
}

export default function App() {
  const [topic, setTopic] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [activeStage, setActiveStage] = useState(-1);
  const [completedStages, setCompletedStages] = useState(-1);
  const intervalRef = useRef(null);
  const reportRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (report && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [report]);

  const startRun = async () => {
    if (!topic.trim() || running) return;
    setRunning(true);
    setError(null);
    setReport(null);
    setFeedback(null);
    setCompletedStages(-1);
    setActiveStage(0);

    const timers = [1800, 2600];
    let stage = 0;
    intervalRef.current = setInterval(() => {
      if (stage < 1) {
        setCompletedStages(stage);
        stage += 1;
        setActiveStage(stage);
      } else if (stage === 1) {
        setCompletedStages(stage);
        stage += 1;
        setActiveStage(stage); // writer — will hold here
        clearInterval(intervalRef.current);
      }
    }, timers[0]);

    try {
      const res = await fetch(
        `${API_URL}?topic=${encodeURIComponent(topic)}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.detail || "Pipeline failed");
      }

      // Walk through remaining stages quickly now that we have results
      setCompletedStages(2);
      setActiveStage(3);
      await new Promise((r) => setTimeout(r, 700));
      setCompletedStages(3);
      setActiveStage(-1);

      setReport(data.report);
      setFeedback(data.feedback);
    } catch (e) {
      clearInterval(intervalRef.current);
      setError(e.message || "Something went wrong while running the pipeline");
      setActiveStage(-1);
    } finally {
      setRunning(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startRun();
    }
  };

  const critic = parseCritic(feedback);

  return (
    <div className="app">
      <div className="grid-overlay" aria-hidden="true"></div>

      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">
              <i className="ti ti-circuit-resistor" aria-hidden="true"></i>
            </span>
            <div className="brand-text">
              <span className="brand-name">Wayfind</span>
              <span className="brand-tag">Multi-agent research console</span>
            </div>
          </div>
          <div className="header-status">
            <span className={`status-led ${running ? "led-active" : "led-idle"}`}></span>
            {running ? "Pipeline running" : "Idle"}
          </div>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <p className="hero-eyebrow">Research topic</p>
          <h1 className="hero-title">
            What should the agents
            <br />
            dig into today?
          </h1>
          <p className="hero-sub">
            Four specialists run in sequence — search, read, write, and
            critique — and hand off their work to one another.
          </p>

          <div className="input-row">
            <input
              className="topic-input"
              type="text"
              placeholder="e.g. The state of solid-state batteries in 2026"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={running}
              aria-label="Research topic"
            />
            <button
              className="run-button"
              onClick={startRun}
              disabled={running || !topic.trim()}
            >
              {running ? (
                <>
                  <i className="ti ti-loader-2 spin" aria-hidden="true"></i>
                  Running
                </>
              ) : (
                <>
                  <i className="ti ti-player-play" aria-hidden="true"></i>
                  Start research
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <i className="ti ti-alert-triangle" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}
        </section>

        <section
          className={`pipeline ${running || completedStages >= 0 ? "pipeline-active" : ""}`}
          aria-label="Agent pipeline status"
        >
          <div className="pipeline-track" aria-hidden="true">
            <div
              className="pipeline-progress"
              style={{
                width:
                  completedStages < 0
                    ? "0%"
                    : `${((completedStages + 1) / AGENTS.length) * 100}%`,
              }}
            ></div>
          </div>

          <div className="pipeline-agents">
            {AGENTS.map((agent, i) => {
              let status = "pending";
              if (i <= completedStages) status = "done";
              else if (i === activeStage) status = "active";
              return (
                <div className={`agent-card agent-${status}`} key={agent.key}>
                  <div className="agent-card-top">
                    <StageIndicator index={i} status={status} />
                    <i className={`ti ${agent.icon} agent-icon`} aria-hidden="true"></i>
                  </div>
                  <p className="agent-label">{agent.label}</p>
                  <p className="agent-desc">
                    {status === "active"
                      ? agent.desc
                      : status === "done"
                      ? "Done"
                      : "Waiting"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {report && (
          <section className="results" ref={reportRef}>
            <div className="results-grid">
              <article className="report-panel">
                <div className="panel-head">
                  <i className="ti ti-file-text" aria-hidden="true"></i>
                  <h2>Research report</h2>
                </div>
                <div className="report-body">
                  {report.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </article>

              <aside className="critic-panel">
                <div className="panel-head">
                  <i className="ti ti-target-arrow" aria-hidden="true"></i>
                  <h2>Critic review</h2>
                </div>

                {critic?.score && (
                  <div className="score-block">
                    <span className="score-value">{critic.score}</span>
                    <span className="score-max">/ {critic.maxScore}</span>
                  </div>
                )}

                {critic?.verdict && (
                  <p className="verdict">{critic.verdict}</p>
                )}

                <div className="critic-raw">
                  {feedback.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </aside>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>Search → Reader → Writer → Critic</span>
        <span className="footer-dot">·</span>
        <span>Mistral-medium-3-5 · Tavily search</span>
      </footer>
    </div>
  );
}
