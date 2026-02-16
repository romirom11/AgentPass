import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---

type AuthStep = "discovery" | "challenge" | "signature" | "verified";

type DemoState =
  | { phase: "idle" }
  | { phase: "waiting"; passportId: string; startedAt: number }
  | {
      phase: "authenticated";
      passportId: string;
      agentName: string;
      sessionToken: string;
      completedSteps: AuthStep[];
    }
  | { phase: "error"; message: string };

interface SessionEntry {
  passport_id: string;
  agent_name: string;
  authenticated_at: string;
  session_token: string;
}

// --- Constants ---

const STEPS: { key: AuthStep; label: string; description: string }[] = [
  {
    key: "discovery",
    label: "Discovery",
    description: "Agent fetches /.well-known/agentpass.json",
  },
  {
    key: "challenge",
    label: "Challenge",
    description: "Service generates 32-byte cryptographic challenge",
  },
  {
    key: "signature",
    label: "Signature",
    description: "Agent signs challenge with Ed25519 private key",
  },
  {
    key: "verified",
    label: "Verified",
    description: "Signature valid — session token issued",
  },
];

const POLL_INTERVAL = 2000;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3846";
const DEMO_AUTH_BASE = `${API_URL}/demo/api/auth/agent`;
const SITE_URL = typeof window !== "undefined" ? window.location.origin : "https://agentpass.space";

// --- Component ---

export default function DemoPage() {
  const [state, setState] = useState<DemoState>({ phase: "idle" });
  const [passportInput, setPassportInput] = useState("");
  const [animatingStep, setAnimatingStep] = useState(-1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  const startWaiting = () => {
    const pid = passportInput.trim();
    if (!pid) return;
    setState({ phase: "waiting", passportId: pid, startedAt: Date.now() });
    startPolling(pid);
  };

  const startPolling = (passportId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${DEMO_AUTH_BASE}/sessions`);
        if (!res.ok) return;
        const data = await res.json();
        const sessions: SessionEntry[] = data.sessions ?? [];
        const match = sessions.find((s) => s.passport_id === passportId);
        if (match) {
          stopPolling();
          animateSteps(match);
        }
      } catch {
        // Silently retry
      }
    }, POLL_INTERVAL);
  };

  const animateSteps = async (session: SessionEntry) => {
    const completed: AuthStep[] = [];
    for (let i = 0; i < STEPS.length; i++) {
      setAnimatingStep(i);
      await sleep(500);
      completed.push(STEPS[i].key);
      setAnimatingStep(-1);
      setState({
        phase: "authenticated",
        passportId: session.passport_id,
        agentName: session.agent_name,
        sessionToken: session.session_token,
        completedSteps: [...completed],
      });
      if (i < STEPS.length - 1) await sleep(300);
    }
  };

  const reset = async () => {
    stopPolling();
    try {
      await fetch(`${DEMO_AUTH_BASE}/sessions`, { method: "DELETE" });
    } catch {
      // Best effort
    }
    setState({ phase: "idle" });
    setPassportInput("");
    setAnimatingStep(-1);
  };

  const isAuthenticated = state.phase === "authenticated";
  const isWaiting = state.phase === "waiting";
  const completedSteps: AuthStep[] =
    state.phase === "authenticated" ? state.completedSteps : [];

  return (
    <div className="relative min-h-screen bg-gray-950 pt-28 pb-20">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        <div
          className="absolute top-40 right-1/4 h-[300px] w-[500px] rounded-full bg-cyan-500/5 blur-3xl"
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live Demo
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Native Auth with{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              AgentPass
            </span>
          </h1>
          <p className="mt-3 text-gray-400">
            Watch an AI agent authenticate to &ldquo;Acme Cloud&rdquo; using
            Ed25519 challenge-response — no passwords, no API keys.
          </p>
        </div>

        {/* Main auth panel */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          {/* Service banner */}
          <div className="mb-8 flex items-center gap-3 border-b border-gray-800 pb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
              <svg
                className="h-6 w-6 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Acme Cloud</h2>
              <p className="text-sm text-gray-500">
                demo-service.agentpass.dev
              </p>
            </div>
            <div className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              AgentPass Enabled
            </div>
          </div>

          {/* Input / Status area */}
          {state.phase === "idle" && (
            <div className="mb-8">
              <label
                htmlFor="passport-id"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Agent Passport ID
              </label>
              <div className="flex gap-3">
                <input
                  id="passport-id"
                  type="text"
                  value={passportInput}
                  onChange={(e) => setPassportInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startWaiting()}
                  placeholder="ap_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-mono text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                />
                <button
                  onClick={startWaiting}
                  disabled={!passportInput.trim()}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  Login with AgentPass
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Enter the passport ID of your agent, then trigger{" "}
                <code className="rounded bg-gray-800 px-1 py-0.5 text-emerald-400">
                  authenticate("{SITE_URL}")
                </code>{" "}
                from your agent.
              </p>
            </div>
          )}

          {state.phase === "error" && (
            <div className="mb-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {state.message}
              <button
                onClick={reset}
                className="ml-4 underline transition-colors hover:text-red-200"
              >
                Retry
              </button>
            </div>
          )}

          {(isWaiting || isAuthenticated) && (
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="font-mono text-xs text-gray-500">ID:</span>
                  <span className="font-mono text-emerald-400">
                    {state.phase === "waiting"
                      ? state.passportId
                      : state.passportId}
                  </span>
                </div>
                {isAuthenticated && (
                  <button
                    onClick={reset}
                    className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-white"
                  >
                    Reset Demo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Waiting pulse */}
          {isWaiting && (
            <div className="mb-8 flex flex-col items-center gap-4 py-6">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute h-full w-full animate-ping rounded-full bg-emerald-500/20" />
                <div className="absolute h-full w-full animate-pulse rounded-full bg-emerald-500/10" />
                <svg
                  className="relative h-8 w-8 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-400">
                Waiting for agent authentication&hellip;
              </p>
              <p className="text-xs text-gray-600">
                Run{" "}
                <code className="rounded bg-gray-800 px-1.5 py-0.5 text-emerald-400">
                  authenticate("{SITE_URL}")
                </code>{" "}
                from your agent
              </p>
            </div>
          )}

          {/* Auth timeline */}
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isDone = completedSteps.includes(step.key);
              const isAnimating = animatingStep === i;
              const isActive =
                isWaiting && i === 0
                  ? false
                  : isDone || isAnimating;

              return (
                <div key={step.key} className="flex gap-4">
                  {/* Vertical line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                        isDone
                          ? "border-emerald-500 bg-emerald-500/20"
                          : isAnimating
                            ? "border-cyan-400 bg-cyan-400/20 animate-pulse"
                            : "border-gray-700 bg-gray-800"
                      }`}
                    >
                      {isDone ? (
                        <svg
                          className="h-4 w-4 text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      ) : isAnimating ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      ) : (
                        <span className="text-xs font-medium text-gray-500">
                          {i + 1}
                        </span>
                      )}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`w-0.5 grow transition-colors duration-500 ${
                          isDone ? "bg-emerald-500/40" : "bg-gray-800"
                        }`}
                        style={{ minHeight: "2rem" }}
                      />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="pb-6">
                    <p
                      className={`text-sm font-semibold transition-colors duration-500 ${
                        isDone
                          ? "text-emerald-400"
                          : isAnimating
                            ? "text-cyan-300"
                            : isActive
                              ? "text-white"
                              : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`mt-0.5 text-xs transition-colors duration-500 ${
                        isDone || isAnimating ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Authenticated result */}
          {isAuthenticated && completedSteps.length === STEPS.length && (
            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-semibold text-emerald-300">
                  Authentication Successful
                </span>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 text-gray-500">
                    Passport ID
                  </span>
                  <span className="text-white">{state.passportId}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 text-gray-500">
                    Agent Name
                  </span>
                  <span className="text-white">{state.agentName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 text-gray-500">
                    Session Token
                  </span>
                  <span className="truncate text-cyan-400">
                    {state.sessionToken.slice(0, 16)}&hellip;
                    {state.sessionToken.slice(-8)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* "What just happened?" explanation */}
        <div className="mt-12 rounded-2xl border border-gray-800 bg-gray-900/60 p-6 sm:p-8">
          <h3 className="mb-6 text-center text-xl font-bold text-white">
            What Just Happened?
          </h3>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Agent side */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/20">
                  <svg
                    className="h-4 w-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-emerald-400">
                  Agent Side
                </h4>
              </div>
              <ol className="space-y-3 text-sm text-gray-400">
                <li className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    1.
                  </span>
                  <span>
                    Fetches{" "}
                    <code className="rounded bg-gray-800 px-1 py-0.5 text-xs text-emerald-400">
                      /.well-known/agentpass.json
                    </code>{" "}
                    to discover auth endpoint
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    2.
                  </span>
                  <span>
                    Requests a random challenge from the service
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    3.
                  </span>
                  <span>
                    Signs the challenge with its{" "}
                    <span className="text-white">Ed25519 private key</span>{" "}
                    (never leaves the agent)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    4.
                  </span>
                  <span>
                    Sends{" "}
                    <code className="rounded bg-gray-800 px-1 py-0.5 text-xs text-cyan-400">
                      {"{ passport_id, challenge, signature }"}
                    </code>{" "}
                    to verify endpoint
                  </span>
                </li>
              </ol>
            </div>

            {/* Service side */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/20">
                  <svg
                    className="h-4 w-4 text-cyan-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
                    />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-cyan-400">
                  Service Side
                </h4>
              </div>
              <ol className="space-y-3 text-sm text-gray-400">
                <li className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    1.
                  </span>
                  <span>
                    Serves discovery metadata at well-known endpoint
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    2.
                  </span>
                  <span>
                    Generates a random{" "}
                    <span className="text-white">32-byte hex challenge</span>{" "}
                    (expires after 5 min)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    3.
                  </span>
                  <span>
                    Looks up agent&apos;s{" "}
                    <span className="text-white">public key</span> from
                    AgentPass registry
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    4.
                  </span>
                  <span>
                    Verifies Ed25519 signature → issues{" "}
                    <span className="text-white">session token</span>
                  </span>
                </li>
              </ol>
            </div>
          </div>

          {/* Code snippet */}
          <div className="mt-8 rounded-xl border border-gray-800 bg-gray-950 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
              <div className="flex gap-1">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              </div>
              <span>agent.ts</span>
            </div>
            <pre className="overflow-x-auto text-xs leading-relaxed">
              <code>
                <span className="text-gray-500">{"// One line. That's it."}</span>
                {"\n"}
                <span className="text-purple-400">const</span>{" "}
                <span className="text-cyan-300">session</span>{" "}
                <span className="text-gray-500">=</span>{" "}
                <span className="text-purple-400">await</span>{" "}
                <span className="text-emerald-400">authenticate</span>
                <span className="text-gray-300">(</span>
                <span className="text-amber-300">"{SITE_URL}"</span>
                <span className="text-gray-300">);</span>
                {"\n\n"}
                <span className="text-gray-500">
                  {"// Agent now has a valid session token for Acme Cloud"}
                </span>
                {"\n"}
                <span className="text-gray-500">
                  {"// No passwords. No API keys. Just cryptography."}
                </span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
