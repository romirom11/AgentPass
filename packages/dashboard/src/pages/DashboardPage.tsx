import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge.js";
import { apiClient } from "../api/client.js";
import { useApi } from "../hooks/useApi.js";

function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default function DashboardPage() {
  const { data: passports, loading: passportsLoading } = useApi(
    () => apiClient.listPassports(),
    []
  );
  const { data: auditData, loading: auditLoading } = useApi(
    () => apiClient.getAllAuditLogs({ limit: 10 }),
    []
  );

  const loading = passportsLoading || auditLoading;

  // Calculate stats
  const totalAgents = passports?.length || 0;
  const activeAgents =
    passports?.filter((p) => p.status === "active").length || 0;
  const avgTrustScore =
    totalAgents > 0
      ? Math.round(
          passports!.reduce((sum, p) => sum + p.trust_score, 0) / totalAgents
        )
      : 0;
  const totalEvents = auditData?.total || 0;

  const recentActivity = auditData?.entries || [];

  // Map audit result to status badge
  const getStatusForResult = (
    result: string
  ): "active" | "pending" | "error" => {
    if (result === "success") return "active";
    if (result === "pending_approval") return "pending";
    return "error";
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your agent fleet
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="text-center">
            <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600"></div>
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {!loading && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Agents</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalAgents}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {activeAgents} active
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Active Agents</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {activeAgents}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {totalAgents - activeAgents} inactive
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Avg Trust Score
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {avgTrustScore}
              </p>
              <p className="mt-1 text-xs text-gray-400">out of 100</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Events</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalEvents}
              </p>
              <p className="mt-1 text-xs text-gray-400">all time</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/agents"
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
                    View All Agents
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Manage your agent fleet
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/activity"
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                    Activity Feed
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    View all agent actions
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/approvals"
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-amber-600">
                    Pending Approvals
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Review agent requests
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Activity
              </h2>
            </div>
            {recentActivity.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
            {recentActivity.length > 0 && (
              <div className="divide-y divide-gray-100">
                {recentActivity.map((entry) => {
                  const passport = passports?.find(
                    (p) => p.id === entry.passport_id
                  );
                  const agentName = passport?.name || entry.passport_id;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                          {agentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            <span className="font-mono text-xs uppercase text-gray-500">
                              {entry.action}
                            </span>
                            {entry.service && ` on ${entry.service}`}
                          </p>
                          <p className="text-xs text-gray-500">{agentName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <StatusBadge status={getStatusForResult(entry.result)} />
                        <span className="whitespace-nowrap text-xs text-gray-400">
                          {formatTimeAgo(entry.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
