import StatusBadge from "../components/StatusBadge.js";
import { apiClient } from "../api/client.js";
import { useApi } from "../hooks/useApi.js";

function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDuration(durationMs: number): string {
  if (durationMs === 0) return "—";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

const activityLog = [
  {
    id: "act-001",
    timestamp: "2025-02-10 14:32:01",
    agent: "web-scraper-01",
    action: "register",
    service: "GitHub",
    result: "success" as const,
    duration: "3.2s",
  },
  {
    id: "act-002",
    timestamp: "2025-02-10 14:17:45",
    agent: "email-assistant",
    action: "solve_captcha",
    service: "LinkedIn",
    result: "success" as const,
    duration: "12.8s",
  },
  {
    id: "act-003",
    timestamp: "2025-02-10 14:02:12",
    agent: "data-collector",
    action: "login",
    service: "Notion",
    result: "pending" as const,
    duration: "—",
  },
  {
    id: "act-004",
    timestamp: "2025-02-10 13:45:33",
    agent: "web-scraper-01",
    action: "verify_email",
    service: "GitHub",
    result: "success" as const,
    duration: "45.1s",
  },
  {
    id: "act-005",
    timestamp: "2025-02-10 12:30:10",
    agent: "research-bot",
    action: "register",
    service: "Twitter",
    result: "error" as const,
    duration: "8.4s",
  },
  {
    id: "act-006",
    timestamp: "2025-02-10 12:15:22",
    agent: "email-assistant",
    action: "send_email",
    service: "Gmail",
    result: "success" as const,
    duration: "1.1s",
  },
  {
    id: "act-007",
    timestamp: "2025-02-10 11:50:08",
    agent: "web-scraper-01",
    action: "login",
    service: "Slack",
    result: "success" as const,
    duration: "2.3s",
  },
  {
    id: "act-008",
    timestamp: "2025-02-10 11:30:55",
    agent: "data-collector",
    action: "register",
    service: "HuggingFace",
    result: "success" as const,
    duration: "5.7s",
  },
  {
    id: "act-009",
    timestamp: "2025-02-10 10:22:18",
    agent: "research-bot",
    action: "solve_captcha",
    service: "Twitter",
    result: "error" as const,
    duration: "30.0s",
  },
  {
    id: "act-010",
    timestamp: "2025-02-10 09:15:42",
    agent: "email-assistant",
    action: "login",
    service: "Outlook",
    result: "success" as const,
    duration: "1.8s",
  },
];

function resultToStatus(result: "success" | "failure" | "pending_approval" | "resolved_by_owner" | "pending" | "error") {
  if (result === "success") return "active" as const;
  if (result === "pending" || result === "pending_approval") return "pending" as const;
  return "error" as const;
}

export default function ActivityPage() {
  const { data: auditData, loading, error } = useApi(() => apiClient.getAllAuditLogs({ limit: 100 }), []);

  // Fallback to mock data if API not available (temporary during development)
  const entries = auditData?.entries || activityLog;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
        <p className="mt-1 text-sm text-gray-500">
          Full audit log of all agent actions
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="text-center">
            <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600"></div>
            <p className="text-sm text-gray-500">Loading activity...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-900">Failed to load activity</h3>
              <p className="mt-0.5 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && entries.length === 0 && (
        <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mx-auto">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No activity yet</h3>
            <p className="mt-1 text-sm text-gray-500">Agent actions will appear here once they start working.</p>
          </div>
        </div>
      )}

      {/* Activity Table */}
      {!loading && !error && entries.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Timestamp
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Agent
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Action
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Service
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Result
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => {
                const timestamp = "timestamp" in entry ? entry.timestamp : formatTimestamp(entry.created_at);
                const duration = "duration" in entry ? entry.duration : formatDuration(entry.duration_ms);
                const agent = "agent" in entry ? entry.agent : entry.passport_id.slice(0, 12);
                const result = entry.result as "success" | "failure" | "pending_approval" | "resolved_by_owner" | "pending" | "error";

                return (
                  <tr
                    key={entry.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {timestamp}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {agent}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-700">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entry.service || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={resultToStatus(result)} />
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums text-gray-500">
                      {duration}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
